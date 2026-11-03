BEGIN;
CREATE OR REPLACE FUNCTION private.catalog_rows(f jsonb,at_time timestamptz) RETURNS TABLE(variant_id uuid,product_id uuid,title text,created_at timestamptz,color_label text,size_label text,regular bigint,effective bigint,available boolean) LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT v.id,p.id,p.title,p.created_at,coalesce(c.label,''),coalesce(s.label,''),v.regular_price_minor,
 greatest(0,v.regular_price_minor-coalesce(CASE pr.discount_type WHEN 'fixed' THEN pr.amount_minor ELSE round(v.regular_price_minor*pr.percent_bps::numeric/10000)::bigint END,0)),coalesce(a.in_stock,false)
 FROM public.products p JOIN public.product_variants v ON v.product_id=p.id AND v.status='active'
 LEFT JOIN public.variant_availability a ON a.variant_id=v.id
 LEFT JOIN public.promotion_targets t ON t.product_id=p.id AND t.enabled AND t.active_window @> at_time
 LEFT JOIN public.promotions pr ON pr.id=t.promotion_id
 LEFT JOIN public.product_options color_option ON color_option.product_id=p.id AND color_option.filter_role='color'
 LEFT JOIN public.variant_option_values color_value ON color_value.variant_id=v.id AND color_value.option_id=color_option.id
 LEFT JOIN public.option_values c ON c.id=color_value.value_id
 LEFT JOIN public.product_options size_option ON size_option.product_id=p.id AND size_option.filter_role='size'
 LEFT JOIN public.variant_option_values size_value ON size_value.variant_id=v.id AND size_value.option_id=size_option.id
 LEFT JOIN public.option_values s ON s.id=size_value.value_id
 WHERE p.status='published'
 AND ((f->>'category') IS NULL OR EXISTS(SELECT 1 FROM public.product_categories pc WHERE pc.product_id=p.id AND pc.category_id=(f->>'category')::uuid))
 AND ((f->>'categorySlug') IS NULL OR EXISTS(SELECT 1 FROM public.product_categories pc JOIN public.categories ca ON ca.id=pc.category_id WHERE pc.product_id=p.id AND ca.slug=f->>'categorySlug' AND ca.archived_at IS NULL))
 AND ((f->>'collection') IS NULL OR EXISTS(SELECT 1 FROM public.collection_products cp JOIN public.collections co ON co.id=cp.collection_id WHERE cp.product_id=p.id AND cp.collection_id=(f->>'collection')::uuid AND co.status='published'))
 AND ((f->>'collectionSlug') IS NULL OR EXISTS(SELECT 1 FROM public.collection_products cp JOIN public.collections co ON co.id=cp.collection_id WHERE cp.product_id=p.id AND co.slug=f->>'collectionSlug' AND co.status='published'))
 AND (coalesce(f->>'search','')='' OR position(lower(f->>'search') IN lower(p.title||' '||p.description))>0)
 AND (NOT coalesce((f->>'promotional')::boolean,false) OR t.promotion_id IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION private.catalog_list(f jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE at_time timestamptz:=statement_timestamp(); result jsonb; page_number integer:=greatest(1,least(1000000,coalesce((f->>'page')::integer,1)));
BEGIN
 IF jsonb_typeof(f)<>'object' OR octet_length(f::text)>20000 THEN RAISE EXCEPTION 'Invalid catalog query'; END IF;
 WITH rows AS MATERIALIZED(SELECT * FROM private.catalog_rows(f,at_time)),
 variants AS MATERIALIZED(SELECT r.*,
  (coalesce(jsonb_array_length(f->'colors'),0)=0 OR f->'colors' @> jsonb_build_array(r.color_label)) color_match,
  (coalesce(jsonb_array_length(f->'sizes'),0)=0 OR f->'sizes' @> jsonb_build_array(r.size_label)) size_match,
  ((NOT coalesce((f->>'inStock')::boolean,false) OR r.available) AND ((f->>'min') IS NULL OR r.effective>=(f->>'min')::bigint) AND ((f->>'max') IS NULL OR r.effective<=(f->>'max')::bigint)) base_match
 FROM rows r),
 products_in_scope AS MATERIALIZED(SELECT DISTINCT product_id FROM rows),
 attribute_conditions AS MATERIALIZED(
  SELECT q.*,d.id definition_id,d.field_type FROM(
   SELECT key,value,'choices' kind FROM jsonb_each(coalesce(f->'attributes','{}'::jsonb)) WHERE jsonb_array_length(value)>0
   UNION ALL SELECT key,value,'numeric' FROM jsonb_each(coalesce(f->'numeric','{}'::jsonb))
  ) q LEFT JOIN public.attribute_definitions d ON d.key=q.key AND d.filterable AND d.archived_at IS NULL
 ),
 attribute_checks AS MATERIALIZED(SELECT p.product_id,c.key,EXISTS(
  SELECT 1 FROM public.product_attribute_values v WHERE v.product_id=p.product_id AND v.definition_id=c.definition_id AND (
   (c.kind='numeric' AND c.field_type='number' AND ((c.value->>'min') IS NULL OR v.number_value>=(c.value->>'min')::numeric) AND ((c.value->>'max') IS NULL OR v.number_value<=(c.value->>'max')::numeric))
   OR (c.kind='choices' AND ((c.field_type='boolean' AND c.value @> jsonb_build_array(v.boolean_value::text))
    OR (c.field_type='number' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(c.value) n WHERE v.number_value=CASE WHEN n.value ~ '^-?[0-9]+(\.[0-9]+)?$' THEN n.value::numeric END))
    OR EXISTS(SELECT 1 FROM public.product_attribute_selections sel JOIN public.attribute_choices choice ON choice.id=sel.choice_id WHERE sel.value_id=v.id AND c.value @> jsonb_build_array(choice.label))))
  )
 ) matches FROM products_in_scope p CROSS JOIN attribute_conditions c),
 failures AS(SELECT product_id,array_agg(DISTINCT key) FILTER(WHERE NOT matches) failed FROM attribute_checks GROUP BY product_id),
 product_flags AS MATERIALIZED(SELECT p.product_id,coalesce(cardinality(x.failed),0)=0 match_all,x.failed FROM products_in_scope p LEFT JOIN failures x USING(product_id)),
 matched AS MATERIALIZED(SELECT r.variant_id,r.product_id,r.title,r.created_at,r.color_label,r.size_label,r.regular,r.effective,r.available FROM variants r JOIN product_flags af USING(product_id) WHERE r.base_match AND r.color_match AND r.size_match AND af.match_all),
 grouped AS MATERIALIZED(SELECT product_id,min(title) title,max(created_at) created_at,min(effective) min_price,max(effective) max_price,(array_agg(regular ORDER BY effective,variant_id))[1] regular_price,bool_or(effective<regular) on_sale,bool_or(available) in_stock,array_agg(variant_id) variants FROM matched GROUP BY product_id),
 page AS(SELECT * FROM grouped ORDER BY CASE WHEN f->>'sort'='price_asc' THEN min_price END ASC,CASE WHEN f->>'sort'='price_desc' THEN min_price END DESC,CASE WHEN f->>'sort'='title' THEN title END ASC,CASE WHEN coalesce(f->>'sort','newest') NOT IN('price_asc','price_desc','title') THEN created_at END DESC,product_id LIMIT 24 OFFSET (page_number-1)*24),
 colors AS(SELECT color_label value,count(DISTINCT product_id) n FROM variants r JOIN product_flags af USING(product_id) WHERE r.base_match AND r.size_match AND af.match_all GROUP BY color_label),
 sizes AS(SELECT size_label value,count(DISTINCT product_id) n FROM variants r JOIN product_flags af USING(product_id) WHERE r.base_match AND r.color_match AND af.match_all GROUP BY size_label)
 SELECT jsonb_build_object('page',page_number,'pageSize',24,'total',(SELECT count(*) FROM grouped),'serverTime',at_time,
 'nextBoundary',(SELECT min(boundary) FROM(SELECT starts_at boundary FROM public.promotions WHERE enabled AND starts_at>at_time UNION ALL SELECT ends_at FROM public.promotions WHERE enabled AND ends_at>at_time) b),
 'matches',coalesce((SELECT jsonb_agg(jsonb_build_object('product',doc,'variants',(SELECT jsonb_agg(v.value) FROM jsonb_array_elements(doc->'variants') v WHERE (v.value->>'id')::uuid=ANY(p.variants)),'minPrice',min_price,'maxPrice',max_price,'regularPrice',regular_price,'onSale',on_sale,'inStock',in_stock) ORDER BY row_order) FROM (SELECT p.*,row_number() OVER() row_order FROM page p) p CROSS JOIN LATERAL(SELECT private.product_document(p.product_id,false,at_time) doc) d),'[]'::jsonb),
 'facets',jsonb_build_object('colors',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM colors),'[]'::jsonb),'sizes',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM sizes),'[]'::jsonb),
 'attributes',coalesce((SELECT jsonb_object_agg(d.key,private.attribute_facet(d.id,coalesce((SELECT array_agg(DISTINCT r.product_id) FROM variants r JOIN product_flags af USING(product_id) WHERE r.base_match AND r.color_match AND r.size_match AND (af.match_all OR (cardinality(af.failed)=1 AND af.failed[1]=d.key))),'{}'::uuid[]))) FROM public.attribute_definitions d WHERE d.filterable AND d.archived_at IS NULL),'{}'::jsonb))) INTO result;
 RETURN result;
END $$;


COMMIT;

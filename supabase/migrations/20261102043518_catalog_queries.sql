BEGIN;
CREATE FUNCTION private.product_document(pid uuid,admin_read boolean,at_time timestamptz) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object(
   'id',p.id,'title',p.title,'slug',p.slug,'description',p.description,'image',p.image_ref,'images','[]'::jsonb,
   'status',p.status,'createdAt',p.created_at,
   'categoryIds',coalesce((SELECT jsonb_agg(pc.category_id ORDER BY pc.category_id) FROM public.product_categories pc WHERE pc.product_id=p.id),'[]'::jsonb),
   'collectionIds',coalesce((SELECT jsonb_agg(cp.collection_id ORDER BY cp.collection_id) FROM public.collection_products cp JOIN public.collections c ON c.id=cp.collection_id WHERE cp.product_id=p.id AND (admin_read OR c.status='published')),'[]'::jsonb),
   'attributes',coalesce((SELECT jsonb_object_agg(d.key,CASE v.field_type
    WHEN 'short_text' THEN to_jsonb(v.text_value) WHEN 'long_text' THEN to_jsonb(v.text_value) WHEN 'number' THEN to_jsonb(v.number_value) WHEN 'boolean' THEN to_jsonb(v.boolean_value)
    WHEN 'single_select' THEN (SELECT to_jsonb(c.label) FROM public.product_attribute_selections s JOIN public.attribute_choices c ON c.id=s.choice_id WHERE s.value_id=v.id LIMIT 1)
    ELSE coalesce((SELECT jsonb_agg(c.label ORDER BY c.position) FROM public.product_attribute_selections s JOIN public.attribute_choices c ON c.id=s.choice_id WHERE s.value_id=v.id),'[]'::jsonb) END)
    FROM public.product_attribute_values v JOIN public.attribute_definitions d ON d.id=v.definition_id WHERE v.product_id=p.id AND (admin_read OR ((d.visible OR d.filterable) AND d.archived_at IS NULL))),'{}'::jsonb),
   'variants',coalesce((SELECT jsonb_agg(jsonb_build_object('id',v.id,'sku',CASE WHEN admin_read THEN v.sku ELSE '' END,
    'color',coalesce((SELECT ov.label FROM public.variant_option_values vv JOIN public.product_options o ON o.id=vv.option_id JOIN public.option_values ov ON ov.id=vv.value_id WHERE vv.variant_id=v.id AND o.filter_role='color'),''),
    'size',coalesce((SELECT ov.label FROM public.variant_option_values vv JOIN public.product_options o ON o.id=vv.option_id JOIN public.option_values ov ON ov.id=vv.value_id WHERE vv.variant_id=v.id AND o.filter_role='size'),''),
    'price',v.regular_price_minor,
    'stock',CASE WHEN admin_read THEN coalesce(b.quantity,0) ELSE CASE WHEN a.in_stock THEN 1 ELSE 0 END END
   ) || CASE WHEN admin_read THEN '{}'::jsonb ELSE jsonb_build_object('effectivePrice',greatest(0,v.regular_price_minor-coalesce((SELECT CASE pr.discount_type WHEN 'fixed' THEN pr.amount_minor ELSE round(v.regular_price_minor*pr.percent_bps::numeric/10000)::bigint END FROM public.promotion_targets t JOIN public.promotions pr ON pr.id=t.promotion_id WHERE t.product_id=p.id AND pr.enabled AND pr.active_window @> at_time LIMIT 1),0))) END ORDER BY v.position,v.id)
   FROM public.product_variants v LEFT JOIN private.inventory_balances b ON b.variant_id=v.id LEFT JOIN public.variant_availability a ON a.variant_id=v.id WHERE v.product_id=p.id AND v.status='active'),'[]'::jsonb)
  ) FROM public.products p WHERE p.id=pid
$$;
REVOKE ALL ON FUNCTION private.product_document(uuid,boolean,timestamptz) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION private.home_product_ids(at_time timestamptz) RETURNS uuid[] LANGUAGE sql STABLE SET search_path='' AS $$
 WITH sections AS (
  SELECT s.value FROM public.site_publication sp JOIN public.site_revisions r ON r.id=sp.revision_id CROSS JOIN LATERAL jsonb_array_elements(r.sections) s
  WHERE (s.value->>'enabled')::boolean AND s.value->>'type' IN('collection','products','promotions')
 ), picked AS (
  SELECT ids.id FROM sections s CROSS JOIN LATERAL (
   SELECT p.id FROM public.products p WHERE p.status='published' AND (
    (s.value->>'type'='collection' AND EXISTS(SELECT 1 FROM public.collection_products cp WHERE cp.product_id=p.id AND cp.collection_id=nullif(s.value->>'collectionId','')::uuid))
    OR (s.value->>'type'='products' AND (s.value->'productIds') @> jsonb_build_array(p.id::text))
    OR (s.value->>'type'='promotions' AND EXISTS(SELECT 1 FROM public.promotion_targets t WHERE t.product_id=p.id AND t.enabled AND t.active_window @> at_time))
   ) ORDER BY p.created_at DESC,p.id LIMIT least(24,greatest(1,(s.value->>'count')::integer))
  ) ids
 ) SELECT coalesce(array_agg(DISTINCT id),'{}'::uuid[]) FROM picked
$$;
CREATE FUNCTION private.attributes_match(pid uuid,f jsonb,skip_key text DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT NOT EXISTS(
  SELECT 1 FROM jsonb_each(coalesce(f->'attributes','{}'::jsonb)) q WHERE q.key IS DISTINCT FROM skip_key AND jsonb_array_length(q.value)>0 AND NOT EXISTS(
   SELECT 1 FROM public.attribute_definitions d JOIN public.product_attribute_values v ON v.definition_id=d.id
   WHERE d.key=q.key AND d.filterable AND d.archived_at IS NULL AND v.product_id=pid AND (
    (d.field_type='boolean' AND q.value @> jsonb_build_array(v.boolean_value::text))
    OR (d.field_type='number' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(q.value) n WHERE v.number_value=n.value::numeric))
    OR EXISTS(SELECT 1 FROM public.product_attribute_selections s JOIN public.attribute_choices c ON c.id=s.choice_id WHERE s.value_id=v.id AND q.value @> jsonb_build_array(c.label))
   )
  )
 ) AND NOT EXISTS(
  SELECT 1 FROM jsonb_each(coalesce(f->'numeric','{}'::jsonb)) q WHERE q.key IS DISTINCT FROM skip_key AND NOT EXISTS(
   SELECT 1 FROM public.attribute_definitions d JOIN public.product_attribute_values v ON v.definition_id=d.id WHERE d.key=q.key AND d.filterable AND d.archived_at IS NULL AND d.field_type='number' AND v.product_id=pid
   AND ((q.value->>'min') IS NULL OR v.number_value>=(q.value->>'min')::numeric) AND ((q.value->>'max') IS NULL OR v.number_value<=(q.value->>'max')::numeric)
  )
 )
$$;
CREATE FUNCTION private.variant_matches(color_label text,size_label text,effective bigint,available boolean,f jsonb,skip_dimension text DEFAULT NULL) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT (skip_dimension='color' OR coalesce(jsonb_array_length(f->'colors'),0)=0 OR f->'colors' @> jsonb_build_array(color_label))
 AND (skip_dimension='size' OR coalesce(jsonb_array_length(f->'sizes'),0)=0 OR f->'sizes' @> jsonb_build_array(size_label))
 AND (NOT coalesce((f->>'inStock')::boolean,false) OR available)
 AND ((f->>'min') IS NULL OR effective>=(f->>'min')::bigint)
 AND ((f->>'max') IS NULL OR effective<=(f->>'max')::bigint)
$$;
CREATE FUNCTION private.catalog_rows(f jsonb,at_time timestamptz) RETURNS TABLE(variant_id uuid,product_id uuid,title text,created_at timestamptz,color_label text,size_label text,regular bigint,effective bigint,available boolean) LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT v.id,p.id,p.title,p.created_at,coalesce(c.label,''),coalesce(s.label,''),v.regular_price_minor,
 greatest(0,v.regular_price_minor-coalesce(CASE pr.discount_type WHEN 'fixed' THEN pr.amount_minor ELSE round(v.regular_price_minor*pr.percent_bps::numeric/10000)::bigint END,0)),coalesce(a.in_stock,false)
 FROM public.products p JOIN public.product_variants v ON v.product_id=p.id AND v.status='active'
 LEFT JOIN public.variant_availability a ON a.variant_id=v.id
 LEFT JOIN public.promotion_targets t ON t.product_id=p.id AND t.enabled AND t.active_window @> at_time
 LEFT JOIN public.promotions pr ON pr.id=t.promotion_id
 LEFT JOIN LATERAL(SELECT ov.label FROM public.variant_option_values vv JOIN public.product_options o ON o.id=vv.option_id AND o.filter_role='color' JOIN public.option_values ov ON ov.id=vv.value_id WHERE vv.variant_id=v.id) c ON true
 LEFT JOIN LATERAL(SELECT ov.label FROM public.variant_option_values vv JOIN public.product_options o ON o.id=vv.option_id AND o.filter_role='size' JOIN public.option_values ov ON ov.id=vv.value_id WHERE vv.variant_id=v.id) s ON true
 WHERE p.status='published'
 AND ((f->>'category') IS NULL OR EXISTS(SELECT 1 FROM public.product_categories pc WHERE pc.product_id=p.id AND pc.category_id=(f->>'category')::uuid))
 AND ((f->>'categorySlug') IS NULL OR EXISTS(SELECT 1 FROM public.product_categories pc JOIN public.categories ca ON ca.id=pc.category_id WHERE pc.product_id=p.id AND ca.slug=f->>'categorySlug' AND ca.archived_at IS NULL))
 AND ((f->>'collection') IS NULL OR EXISTS(SELECT 1 FROM public.collection_products cp JOIN public.collections co ON co.id=cp.collection_id WHERE cp.product_id=p.id AND cp.collection_id=(f->>'collection')::uuid AND co.status='published'))
 AND ((f->>'collectionSlug') IS NULL OR EXISTS(SELECT 1 FROM public.collection_products cp JOIN public.collections co ON co.id=cp.collection_id WHERE cp.product_id=p.id AND co.slug=f->>'collectionSlug' AND co.status='published'))
 AND (coalesce(f->>'search','')='' OR position(lower(f->>'search') IN lower(p.title||' '||p.description))>0)
 AND (NOT coalesce((f->>'promotional')::boolean,false) OR t.promotion_id IS NOT NULL)
$$;
CREATE FUNCTION private.attribute_facet(definition uuid,product_ids uuid[]) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN d.field_type='number' THEN jsonb_build_object('type','number','min',(SELECT min(number_value) FROM public.product_attribute_values WHERE definition_id=d.id AND product_id=ANY(product_ids)),'max',(SELECT max(number_value) FROM public.product_attribute_values WHERE definition_id=d.id AND product_id=ANY(product_ids)))
 ELSE jsonb_build_object('type',CASE d.field_type WHEN 'single_select' THEN 'select' WHEN 'multi_select' THEN 'multi' ELSE d.field_type END,'choices',coalesce((
  SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM(
   SELECT value,count(DISTINCT product_id) n FROM (
    SELECT v.product_id,v.boolean_value::text value FROM public.product_attribute_values v WHERE v.definition_id=d.id AND v.product_id=ANY(product_ids) AND v.field_type='boolean'
    UNION ALL SELECT v.product_id,c.label FROM public.product_attribute_values v JOIN public.product_attribute_selections s ON s.value_id=v.id JOIN public.attribute_choices c ON c.id=s.choice_id WHERE v.definition_id=d.id AND v.product_id=ANY(product_ids)
   ) values_by_product GROUP BY value
  ) counts
 ),'[]'::jsonb)) END FROM public.attribute_definitions d WHERE d.id=definition
$$;
CREATE FUNCTION private.catalog_list(f jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE at_time timestamptz:=statement_timestamp(); result jsonb; page_number integer:=greatest(1,least(1000000,coalesce((f->>'page')::integer,1)));
BEGIN
 IF jsonb_typeof(f)<>'object' OR octet_length(f::text)>20000 THEN RAISE EXCEPTION 'Invalid catalog query'; END IF;
 WITH rows AS MATERIALIZED(SELECT * FROM private.catalog_rows(f,at_time)),
 matched AS MATERIALIZED(SELECT * FROM rows r WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f) AND private.attributes_match(r.product_id,f)),
 grouped AS MATERIALIZED(SELECT product_id,min(title) title,max(created_at) created_at,min(effective) min_price,max(effective) max_price,(array_agg(regular ORDER BY effective,variant_id))[1] regular_price,bool_or(effective<regular) on_sale,bool_or(available) in_stock,array_agg(variant_id) variants FROM matched GROUP BY product_id),
 page AS(SELECT * FROM grouped ORDER BY CASE WHEN f->>'sort'='price_asc' THEN min_price END ASC,CASE WHEN f->>'sort'='price_desc' THEN min_price END DESC,CASE WHEN f->>'sort'='title' THEN title END ASC,CASE WHEN coalesce(f->>'sort','newest') NOT IN('price_asc','price_desc','title') THEN created_at END DESC,product_id LIMIT 24 OFFSET (page_number-1)*24),
 colors AS(SELECT color_label value,count(DISTINCT product_id) n FROM rows r WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f,'color') AND private.attributes_match(r.product_id,f) GROUP BY color_label),
 sizes AS(SELECT size_label value,count(DISTINCT product_id) n FROM rows r WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f,'size') AND private.attributes_match(r.product_id,f) GROUP BY size_label)
 SELECT jsonb_build_object('page',page_number,'pageSize',24,'total',(SELECT count(*) FROM grouped),'serverTime',at_time,
 'nextBoundary',(SELECT min(boundary) FROM(SELECT starts_at boundary FROM public.promotions WHERE enabled AND starts_at>at_time UNION ALL SELECT ends_at FROM public.promotions WHERE enabled AND ends_at>at_time) b),
 'matches',coalesce((SELECT jsonb_agg(jsonb_build_object('product',doc,'variants',(SELECT jsonb_agg(v.value) FROM jsonb_array_elements(doc->'variants') v WHERE (v.value->>'id')::uuid=ANY(p.variants)),'minPrice',min_price,'maxPrice',max_price,'regularPrice',regular_price,'onSale',on_sale,'inStock',in_stock) ORDER BY row_order) FROM (SELECT p.*,row_number() OVER() row_order FROM page p) p CROSS JOIN LATERAL(SELECT private.product_document(p.product_id,false,at_time) doc) d),'[]'::jsonb),
 'facets',jsonb_build_object('colors',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM colors),'[]'::jsonb),'sizes',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM sizes),'[]'::jsonb),
 'attributes',coalesce((SELECT jsonb_object_agg(d.key,private.attribute_facet(d.id,coalesce((SELECT array_agg(DISTINCT r.product_id) FROM rows r WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f) AND private.attributes_match(r.product_id,f,d.key)),'{}'::uuid[]))) FROM public.attribute_definitions d WHERE d.filterable AND d.archived_at IS NULL),'{}'::jsonb))) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.catalog_list(query jsonb DEFAULT '{}'::jsonb) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.catalog_list(query)$$;

CREATE OR REPLACE FUNCTION private.snapshot(admin_read boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; published jsonb; draft jsonb; at_time timestamptz:=statement_timestamp();
BEGIN
 IF admin_read THEN PERFORM private.require_admin(); END IF;
 SELECT private.site_json(r) INTO published FROM public.site_publication p JOIN public.site_revisions r ON r.id=p.revision_id;
 published:=coalesce(published,private.empty_site());
 IF admin_read THEN SELECT private.site_json(r) INTO draft FROM public.site_revisions r WHERE state='draft'; END IF;
 SELECT jsonb_build_object(
  'revision',CASE WHEN admin_read THEN (SELECT version FROM public.store_settings WHERE singleton) ELSE 0 END,
  'serverTime',at_time,
  'nextBoundary',(SELECT min(boundary) FROM (SELECT starts_at AS boundary FROM public.promotions WHERE enabled AND starts_at>at_time UNION ALL SELECT ends_at FROM public.promotions WHERE enabled AND ends_at>at_time) b),
  'data',jsonb_build_object('schemaVersion',1,
  'products',coalesce((SELECT jsonb_agg(private.product_document(p.id,admin_read,at_time) ORDER BY p.created_at DESC,p.id) FROM public.products p WHERE admin_read OR (p.status='published' AND p.id=ANY(private.home_product_ids(at_time)))),'[]'::jsonb),
  'categories',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',name,'slug',slug,'description',description,'image',image_ref) ORDER BY position,id) FROM public.categories WHERE archived_at IS NULL),'[]'::jsonb),
  'collections',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'title',title,'slug',slug,'description',description,'image',image_ref) ORDER BY created_at,id) FROM public.collections WHERE admin_read OR status='published'),'[]'::jsonb),
  'attributes',coalesce((SELECT jsonb_agg(jsonb_build_object('id',d.id,'key',d.key,'label',d.label,'type',CASE d.field_type WHEN 'short_text' THEN 'text' WHEN 'long_text' THEN 'text' WHEN 'single_select' THEN 'select' WHEN 'multi_select' THEN 'multi' ELSE d.field_type END,
   'choices',coalesce((SELECT jsonb_agg(c.label ORDER BY c.position) FROM public.attribute_choices c WHERE c.definition_id=d.id AND c.archived_at IS NULL),'[]'::jsonb),
   'unit',coalesce(d.unit,''),'visible',d.visible,'filterable',d.filterable,
   'categoryIds',coalesce((SELECT jsonb_agg(c.category_id ORDER BY c.category_id) FROM public.attribute_categories c WHERE c.definition_id=d.id),'[]'::jsonb)) ORDER BY d.created_at,d.id)
   FROM public.attribute_definitions d WHERE d.archived_at IS NULL AND (admin_read OR d.visible OR d.filterable)),'[]'::jsonb),
  'promotions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',pr.id,'title',pr.title,'kind',pr.discount_type,'amount',CASE pr.discount_type WHEN 'fixed' THEN pr.amount_minor::numeric ELSE pr.percent_bps::numeric/100 END,'enabled',pr.enabled,'serverActive',NOT admin_read,'startsAt',pr.starts_at,'endsAt',coalesce(pr.ends_at,'9999-12-31'::timestamptz),
   'productIds',coalesce((SELECT jsonb_agg(t.product_id ORDER BY t.product_id) FROM public.promotion_targets t JOIN public.products p ON p.id=t.product_id WHERE t.promotion_id=pr.id AND (admin_read OR p.status='published')),'[]'::jsonb)) ORDER BY pr.starts_at,pr.id)
   FROM public.promotions pr WHERE admin_read OR (pr.enabled AND pr.active_window @> at_time)),'[]'::jsonb),
  'adjustments',CASE WHEN admin_read THEN coalesce((SELECT jsonb_agg(x.row ORDER BY x.created_at DESC) FROM (SELECT s.created_at,jsonb_build_object('id',s.id,'variantId',s.variant_id,'delta',s.delta,'reason',coalesce(s.note,s.reason),'balance',s.balance_after,'date',s.created_at,'productTitle',p.title,'variantLabel',v.sku) row FROM private.stock_adjustments s JOIN public.product_variants v ON v.id=s.variant_id JOIN public.products p ON p.id=v.product_id ORDER BY s.created_at DESC LIMIT 500) x),'[]'::jsonb) ELSE '[]'::jsonb END,
  'siteDraft',CASE WHEN admin_read THEN coalesce(draft,published) ELSE published END,'sitePublished',published)
 ) INTO result;
 RETURN result;
END $$;


CREATE FUNCTION private.product_snapshot(focus_slug text) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; focus_id uuid; related_ids uuid[]; at_time timestamptz:=statement_timestamp();
BEGIN
 result:=private.snapshot(false);
 SELECT id INTO focus_id FROM public.products WHERE slug=focus_slug AND status='published';
 IF focus_id IS NULL THEN RETURN jsonb_set(result,'{data,products}','[]'::jsonb); END IF;
 SELECT coalesce(array_agg(id),'{}'::uuid[]) INTO related_ids FROM (
  SELECT p.id FROM public.products p WHERE p.status='published' AND p.id<>focus_id AND EXISTS(
   SELECT 1 FROM public.product_categories pc WHERE pc.product_id=p.id AND pc.category_id=(SELECT category_id FROM public.product_categories WHERE product_id=focus_id ORDER BY category_id LIMIT 1)
  ) ORDER BY p.created_at DESC,p.id LIMIT 4
 ) candidates;
 RETURN jsonb_set(result,'{data,products}',(SELECT jsonb_agg(private.product_document(p.id,false,at_time) ORDER BY p.id) FROM public.products p WHERE p.id=focus_id OR p.id=ANY(related_ids)));
END $$;
CREATE FUNCTION public.product_snapshot(slug text) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.product_snapshot(slug)$$;
REVOKE ALL ON FUNCTION private.home_product_ids(timestamptz),private.attributes_match(uuid,jsonb,text),private.variant_matches(text,text,bigint,boolean,jsonb,text),private.catalog_rows(jsonb,timestamptz),private.attribute_facet(uuid,uuid[]),private.catalog_list(jsonb),private.product_snapshot(text),public.catalog_list(jsonb),public.product_snapshot(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.catalog_list(jsonb),private.product_snapshot(text),public.catalog_list(jsonb),public.product_snapshot(text) TO anon,authenticated;
COMMIT;

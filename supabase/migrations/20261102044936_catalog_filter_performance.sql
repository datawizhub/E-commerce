BEGIN;
CREATE OR REPLACE FUNCTION private.catalog_list(f jsonb) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE at_time timestamptz:=statement_timestamp(); result jsonb; page_number integer:=greatest(1,least(1000000,coalesce((f->>'page')::integer,1)));
BEGIN
 IF jsonb_typeof(f)<>'object' OR octet_length(f::text)>20000 THEN RAISE EXCEPTION 'Invalid catalog query'; END IF;
 WITH rows AS MATERIALIZED(SELECT * FROM private.catalog_rows(f,at_time)),
 product_matches AS MATERIALIZED(SELECT p.product_id,private.attributes_match(p.product_id,f) match_all FROM (SELECT DISTINCT product_id FROM rows) p),
 product_flags AS MATERIALIZED(SELECT pm.*,coalesce((SELECT jsonb_object_agg(d.key,private.attributes_match(pm.product_id,f,d.key)) FROM public.attribute_definitions d WHERE d.filterable AND d.archived_at IS NULL AND (coalesce(f->'attributes','{}'::jsonb)?d.key OR coalesce(f->'numeric','{}'::jsonb)?d.key)),'{}'::jsonb) match_without FROM product_matches pm),
 matched AS MATERIALIZED(SELECT r.* FROM rows r JOIN product_flags af USING(product_id) WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f) AND af.match_all),
 grouped AS MATERIALIZED(SELECT product_id,min(title) title,max(created_at) created_at,min(effective) min_price,max(effective) max_price,(array_agg(regular ORDER BY effective,variant_id))[1] regular_price,bool_or(effective<regular) on_sale,bool_or(available) in_stock,array_agg(variant_id) variants FROM matched GROUP BY product_id),
 page AS(SELECT * FROM grouped ORDER BY CASE WHEN f->>'sort'='price_asc' THEN min_price END ASC,CASE WHEN f->>'sort'='price_desc' THEN min_price END DESC,CASE WHEN f->>'sort'='title' THEN title END ASC,CASE WHEN coalesce(f->>'sort','newest') NOT IN('price_asc','price_desc','title') THEN created_at END DESC,product_id LIMIT 24 OFFSET (page_number-1)*24),
 colors AS(SELECT color_label value,count(DISTINCT product_id) n FROM rows r JOIN product_flags af USING(product_id) WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f,'color') AND af.match_all GROUP BY color_label),
 sizes AS(SELECT size_label value,count(DISTINCT product_id) n FROM rows r JOIN product_flags af USING(product_id) WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f,'size') AND af.match_all GROUP BY size_label)
 SELECT jsonb_build_object('page',page_number,'pageSize',24,'total',(SELECT count(*) FROM grouped),'serverTime',at_time,
 'nextBoundary',(SELECT min(boundary) FROM(SELECT starts_at boundary FROM public.promotions WHERE enabled AND starts_at>at_time UNION ALL SELECT ends_at FROM public.promotions WHERE enabled AND ends_at>at_time) b),
 'matches',coalesce((SELECT jsonb_agg(jsonb_build_object('product',doc,'variants',(SELECT jsonb_agg(v.value) FROM jsonb_array_elements(doc->'variants') v WHERE (v.value->>'id')::uuid=ANY(p.variants)),'minPrice',min_price,'maxPrice',max_price,'regularPrice',regular_price,'onSale',on_sale,'inStock',in_stock) ORDER BY row_order) FROM (SELECT p.*,row_number() OVER() row_order FROM page p) p CROSS JOIN LATERAL(SELECT private.product_document(p.product_id,false,at_time) doc) d),'[]'::jsonb),
 'facets',jsonb_build_object('colors',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM colors),'[]'::jsonb),'sizes',coalesce((SELECT jsonb_agg(jsonb_build_object('value',value,'count',n) ORDER BY value) FROM sizes),'[]'::jsonb),
 'attributes',coalesce((SELECT jsonb_object_agg(d.key,private.attribute_facet(d.id,coalesce((SELECT array_agg(DISTINCT r.product_id) FROM rows r JOIN product_flags af USING(product_id) WHERE private.variant_matches(r.color_label,r.size_label,r.effective,r.available,f) AND coalesce((af.match_without->>d.key)::boolean,af.match_all)),'{}'::uuid[]))) FROM public.attribute_definitions d WHERE d.filterable AND d.archived_at IS NULL),'{}'::jsonb))) INTO result;
 RETURN result;
END $$;

COMMIT;

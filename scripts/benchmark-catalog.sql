-- Isolated synthetic scale fixture. Every row is rolled back in this transaction.
BEGIN;
DO $$BEGIN IF EXISTS(SELECT 1 FROM public.products WHERE slug LIKE 'integration-benchmark-%') OR EXISTS(SELECT 1 FROM public.attribute_definitions WHERE key LIKE 'qa_bench_%') THEN RAISE EXCEPTION 'Benchmark namespace already exists'; END IF; END$$;
INSERT INTO public.categories(name,slug) VALUES('Integration benchmark','integration-benchmark-category');
INSERT INTO public.products(title,slug,status,first_published_at,image_ref)
 SELECT 'Integration benchmark '||n,'integration-benchmark-'||n,'published',now(),'/images/oxford.jpg' FROM generate_series(1,1000) n;
INSERT INTO public.product_categories(product_id,category_id) SELECT p.id,c.id FROM public.products p CROSS JOIN public.categories c WHERE p.slug LIKE 'integration-benchmark-%' AND c.slug='integration-benchmark-category';
INSERT INTO public.product_options(product_id,key,label,position,filter_role)
 SELECT p.id,o.key,o.label,o.position,o.key FROM public.products p CROSS JOIN(VALUES('color','Colour',0),('size','Size',1)) o(key,label,position) WHERE p.slug LIKE 'integration-benchmark-%';
INSERT INTO public.option_values(option_id,key,label,position)
 SELECT o.id,CASE o.key WHEN 'color' THEN 'c' ELSE 's' END||n,initcap(o.key)||' '||n,n FROM public.product_options o JOIN public.products p ON p.id=o.product_id CROSS JOIN generate_series(0,4) n WHERE p.slug LIKE 'integration-benchmark-%' AND n<CASE o.key WHEN 'color' THEN 2 ELSE 5 END;
INSERT INTO public.product_variants(product_id,sku,option_signature,regular_price_minor,position)
 SELECT p.id,'BENCH-'||p.id||'-'||n,(n/5)::text||'|'||(n%5)::text,8000+n*100,n FROM public.products p CROSS JOIN generate_series(0,9) n WHERE p.slug LIKE 'integration-benchmark-%';
INSERT INTO public.variant_option_values(variant_id,product_id,option_id,value_id)
 SELECT v.id,p.id,o.id,ov.id FROM public.products p JOIN public.product_variants v ON v.product_id=p.id JOIN public.product_options o ON o.product_id=p.id JOIN public.option_values ov ON ov.option_id=o.id AND ov.position=CASE o.key WHEN 'color' THEN v.position/5 ELSE v.position%5 END WHERE p.slug LIKE 'integration-benchmark-%';
INSERT INTO private.inventory_balances(variant_id,quantity) SELECT v.id,CASE v.position WHEN 9 THEN 0 ELSE 10 END FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE p.slug LIKE 'integration-benchmark-%';
INSERT INTO public.variant_availability(variant_id,in_stock) SELECT v.id,v.position<>9 FROM public.product_variants v JOIN public.products p ON p.id=v.product_id WHERE p.slug LIKE 'integration-benchmark-%';
INSERT INTO public.attribute_definitions(key,label,field_type,filterable) VALUES('qa_bench_weight','Benchmark weight','number',true),('qa_bench_organic','Benchmark organic','boolean',true),('qa_bench_fabric','Benchmark fabric','single_select',true);
INSERT INTO public.attribute_choices(definition_id,field_type,key,label,position) SELECT d.id,'single_select',c.key,c.label,c.position FROM public.attribute_definitions d CROSS JOIN(VALUES('cotton','Cotton',0),('linen','Linen',1)) c(key,label,position) WHERE d.key='qa_bench_fabric';
INSERT INTO public.product_attribute_values(product_id,definition_id,field_type,number_value,boolean_value)
 SELECT p.id,d.id,d.field_type,CASE WHEN d.field_type='number' THEN substring(p.slug FROM '([0-9]+)$')::integer%200 END,CASE WHEN d.field_type='boolean' THEN substring(p.slug FROM '([0-9]+)$')::integer%2=0 END FROM public.products p CROSS JOIN public.attribute_definitions d WHERE p.slug LIKE 'integration-benchmark-%' AND d.key LIKE 'qa_bench_%';
INSERT INTO public.product_attribute_selections(value_id,definition_id,field_type,choice_id)
 SELECT v.id,d.id,'single_select',c.id FROM public.product_attribute_values v JOIN public.attribute_definitions d ON d.id=v.definition_id JOIN public.attribute_choices c ON c.definition_id=d.id JOIN public.products p ON p.id=v.product_id WHERE d.key='qa_bench_fabric' AND c.position=substring(p.slug FROM '([0-9]+)$')::integer%2;
ANALYZE public.products,public.product_variants,public.product_options,public.option_values,public.variant_option_values,public.product_categories,public.categories,public.variant_availability,public.attribute_definitions,public.attribute_choices,public.product_attribute_values,public.product_attribute_selections,private.inventory_balances;
DO $benchmark$
DECLARE started timestamptz; timings numeric[]:='{}'; run integer; payload jsonb;
BEGIN
 FOR run IN 1..21 LOOP
  started:=clock_timestamp();
  payload:=public.catalog_list('{"categorySlug":"integration-benchmark-category","colors":["Color 0"],"inStock":true,"numeric":{"qa_bench_weight":{"max":100}},"page":1}'::jsonb);
  IF run>1 THEN timings:=array_append(timings,extract(epoch FROM clock_timestamp()-started)*1000); END IF;
 END LOOP;
 PERFORM set_config('qa.catalog_benchmark',jsonb_build_object('products',1000,'variants',10000,'samples',20,'returned',jsonb_array_length(payload->'matches'),'total',payload->'total','p95DatabaseMs',(SELECT percentile_cont(0.95) WITHIN GROUP(ORDER BY t) FROM unnest(timings) t),'maxDatabaseMs',(SELECT max(t) FROM unnest(timings) t))::text,true);
END $benchmark$;
SELECT current_setting('qa.catalog_benchmark')::jsonb result;
ROLLBACK;
ANALYZE public.products,public.product_variants,public.product_options,public.option_values,public.variant_option_values,public.product_categories,public.categories,public.variant_availability,public.attribute_definitions,public.attribute_choices,public.product_attribute_values,public.product_attribute_selections,private.inventory_balances;

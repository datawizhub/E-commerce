BEGIN;
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
  'products',coalesce((SELECT jsonb_agg(jsonb_build_object(
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
  ) ORDER BY p.created_at DESC,p.id) FROM public.products p WHERE admin_read OR p.status='published'),'[]'::jsonb),
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

CREATE OR REPLACE FUNCTION private.save_product(p jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE pid uuid:=(p->>'id')::uuid; old public.products; v jsonb; opt text; choice_label text; oid uuid; vid uuid; choice uuid; signature text; definition public.attribute_definitions; entry record; value_id uuid; selected text; media uuid; retained_choices jsonb;
BEGIN
 SELECT * INTO old FROM public.products WHERE id=pid;
 IF old.first_published_at IS NOT NULL AND old.slug<>p->>'slug' THEN RAISE EXCEPTION 'A published product URL slug cannot change'; END IF;
 IF jsonb_array_length(p->'variants')<1 OR jsonb_array_length(p->'variants')>200 THEN RAISE EXCEPTION 'Add between 1 and 200 variants'; END IF;
 PERFORM private.assert_media(p->>'image');
 IF p->>'status'='published' AND (p->>'image'='' OR jsonb_array_length(p->'categoryIds')=0) THEN RAISE EXCEPTION 'Published products need an image and category'; END IF;
 INSERT INTO public.products(id,title,slug,description,status,first_published_at,image_ref) VALUES(pid,p->>'title',p->>'slug',p->>'description',p->>'status',CASE WHEN p->>'status'='published' THEN now() END,p->>'image')
 ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,description=excluded.description,status=excluded.status,first_published_at=coalesce(products.first_published_at,excluded.first_published_at),image_ref=excluded.image_ref,updated_at=now(),version=products.version+1;
 DELETE FROM public.product_media WHERE product_id=pid;
 IF p->>'image' LIKE '/api/media/%' THEN media:=substring(p->>'image' FROM 12)::uuid; INSERT INTO public.product_media(product_id,asset_id,position) VALUES(pid,media,0); END IF;
 DELETE FROM public.product_categories WHERE product_id=pid;
 INSERT INTO public.product_categories(product_id,category_id) SELECT pid,value::uuid FROM jsonb_array_elements_text(p->'categoryIds');
 DELETE FROM public.collection_products WHERE product_id=pid;
 INSERT INTO public.collection_products(collection_id,product_id,position) SELECT value::uuid,pid,coalesce((SELECT max(position)+1 FROM public.collection_products WHERE collection_id=value::uuid),0) FROM jsonb_array_elements_text(p->'collectionIds');
 -- Removed variants are archived, retaining inventory and history.
 UPDATE public.product_variants SET status='archived',version=version+1 WHERE product_id=pid AND id NOT IN(SELECT (value->>'id')::uuid FROM jsonb_array_elements(p->'variants'));
 FOR v IN SELECT value FROM jsonb_array_elements(p->'variants') LOOP
  vid:=(v->>'id')::uuid;
  IF EXISTS(SELECT 1 FROM public.product_variants WHERE id=vid AND product_id<>pid) THEN RAISE EXCEPTION 'Variant belongs to another product'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.product_variants WHERE id=vid) AND (v->>'stock')::integer<>0 THEN RAISE EXCEPTION 'New variants start at zero stock; record a receipt in Inventory'; END IF;
  IF btrim(v->>'color')='' OR btrim(v->>'size')='' THEN RAISE EXCEPTION 'Each variant needs a size and colour'; END IF;
  signature:=lower(btrim(v->>'color'))||'|'||lower(btrim(v->>'size'));
  INSERT INTO public.product_variants(id,product_id,sku,option_signature,regular_price_minor,position) VALUES(vid,pid,btrim(v->>'sku'),signature,(v->>'price')::bigint,(SELECT ordinality::integer-1 FROM jsonb_array_elements(p->'variants') WITH ORDINALITY WHERE value=v))
  ON CONFLICT(id) DO UPDATE SET sku=excluded.sku,option_signature=excluded.option_signature,regular_price_minor=excluded.regular_price_minor,status='active',position=excluded.position,updated_at=now(),version=product_variants.version+1;
  INSERT INTO private.inventory_balances(variant_id) VALUES(vid) ON CONFLICT DO NOTHING;
  INSERT INTO public.variant_availability(variant_id) VALUES(vid) ON CONFLICT DO NOTHING;
  DELETE FROM public.variant_option_values WHERE variant_id=vid;
  FOREACH opt IN ARRAY ARRAY['color','size'] LOOP
   choice_label:=btrim(v->>opt);
   INSERT INTO public.product_options(product_id,key,label,position,filter_role) VALUES(pid,opt,initcap(opt),CASE WHEN opt='color' THEN 0 ELSE 1 END,opt) ON CONFLICT(product_id,key) DO NOTHING;
   SELECT id INTO oid FROM public.product_options WHERE product_id=pid AND key=opt;
   SELECT id INTO choice FROM public.option_values WHERE option_id=oid AND key='v'||md5(lower(choice_label));
   IF choice IS NULL THEN INSERT INTO public.option_values(option_id,key,label,position) VALUES(oid,'v'||md5(lower(choice_label)),choice_label,coalesce((SELECT max(position)+1 FROM public.option_values WHERE option_id=oid),0)) RETURNING id INTO choice; END IF;
   INSERT INTO public.variant_option_values(variant_id,product_id,option_id,value_id) VALUES(vid,pid,oid,choice);
  END LOOP;
 END LOOP;
 SELECT coalesce(jsonb_object_agg(d.key,(SELECT jsonb_agg(s.choice_id::text) FROM public.product_attribute_selections s WHERE s.value_id=pv.id)),'{}'::jsonb) INTO retained_choices
 FROM public.product_attribute_values pv JOIN public.attribute_definitions d ON d.id=pv.definition_id WHERE pv.product_id=pid;
 DELETE FROM public.product_attribute_values WHERE product_id=pid;
 FOR entry IN SELECT * FROM jsonb_each(p->'attributes') LOOP
  SELECT * INTO definition FROM public.attribute_definitions WHERE key=entry.key AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown attribute %',entry.key; END IF;
  IF entry.value IN ('""'::jsonb,'[]'::jsonb) THEN CONTINUE; END IF;
  IF NOT definition.applies_to_all AND NOT EXISTS(SELECT 1 FROM public.attribute_categories ac JOIN public.product_categories pc ON pc.category_id=ac.category_id WHERE ac.definition_id=definition.id AND pc.product_id=pid) THEN RAISE EXCEPTION 'Attribute % does not apply to these categories',entry.key; END IF;
  INSERT INTO public.product_attribute_values(product_id,definition_id,field_type,text_value,number_value,boolean_value) VALUES(pid,definition.id,definition.field_type,
    CASE WHEN definition.field_type IN('short_text','long_text') THEN entry.value#>>'{}' END,
    CASE WHEN definition.field_type='number' THEN (entry.value#>>'{}')::numeric END,
    CASE WHEN definition.field_type='boolean' THEN (entry.value#>>'{}')::boolean END) RETURNING id INTO value_id;
  IF definition.field_type IN('single_select','multi_select') THEN
   FOR selected IN SELECT value FROM jsonb_array_elements_text(CASE WHEN definition.field_type='single_select' THEN jsonb_build_array(entry.value) ELSE entry.value END) LOOP
    SELECT c.id INTO choice FROM public.attribute_choices c WHERE c.definition_id=definition.id AND c.label=selected AND (c.archived_at IS NULL OR coalesce(retained_choices->entry.key,'[]'::jsonb) @> jsonb_build_array(c.id::text));
    IF choice IS NULL THEN RAISE EXCEPTION 'Invalid choice for %',entry.key; END IF;
    INSERT INTO public.product_attribute_selections(value_id,definition_id,field_type,choice_id) VALUES(value_id,definition.id,definition.field_type,choice);
   END LOOP;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.promotion_targets t JOIN public.promotions pr ON pr.id=t.promotion_id JOIN public.product_variants v ON v.product_id=t.product_id WHERE t.product_id=pid AND pr.enabled AND v.status='active' AND (pr.amount_minor>v.regular_price_minor OR (pr.discount_type='percentage' AND round(v.regular_price_minor*pr.percent_bps::numeric/10000)<1))) THEN RAISE EXCEPTION 'Price does not fit an enabled promotion'; END IF;
END $$;


-- Only the dedicated signer may issue public image URLs. Public callers cannot
-- choose an arbitrary expiry by calling the Storage signing API directly.
ALTER POLICY reachable_media_read ON storage.objects TO authenticated USING(bucket_id='catalog-media' AND (SELECT private.is_admin()));
COMMIT;

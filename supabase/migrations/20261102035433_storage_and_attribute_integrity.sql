BEGIN;
CREATE FUNCTION private.can_read_storage(object_path text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.assets a WHERE a.storage_path=object_path AND private.media_access(a.id) IS NOT NULL)
$$;
REVOKE ALL ON FUNCTION private.can_read_storage(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_storage(text) TO anon,authenticated;
ALTER POLICY reachable_media_read ON storage.objects USING(bucket_id='catalog-media' AND private.can_read_storage(name));
CREATE INDEX attribute_choices_definition_type_idx ON public.attribute_choices(definition_id,field_type);
CREATE INDEX promotion_targets_parent_schedule_idx ON public.promotion_targets(promotion_id,active_window,enabled);
CREATE INDEX variant_options_variant_product_idx ON public.variant_option_values(variant_id,product_id);
CREATE OR REPLACE FUNCTION private.mutate(kind text,p jsonb,expected bigint,request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE revision bigint; receipt private.mutation_receipts; body jsonb:=jsonb_build_object('kind',kind,'payload',p,'expected',expected); result jsonb; entity uuid; v jsonb; choice_label text; dtype text; cid uuid; count_before integer; delta integer; site jsonb; draft_id uuid; sealed_id uuid; note text;
BEGIN
 PERFORM private.require_admin();
 -- One lock order for all catalog/inventory/site mutations prevents cross-feature races.
 SELECT version INTO revision FROM public.store_settings WHERE singleton FOR UPDATE;
 SELECT * INTO receipt FROM private.mutation_receipts WHERE request_key=request;
 IF FOUND THEN IF receipt.actor_id<>auth.uid() OR receipt.payload<>body THEN RAISE EXCEPTION 'Retry request key was reused with a different payload'; END IF; RETURN receipt.result; END IF;
 IF revision<>expected THEN RAISE EXCEPTION 'The store changed in another tab. Reload before saving again.' USING ERRCODE='40001'; END IF;
 SET CONSTRAINTS ALL DEFERRED;
 entity:=nullif(p->>'id','')::uuid;
 IF kind='product' THEN PERFORM private.save_product(p);
 ELSIF kind IN('category','collection') THEN
  PERFORM private.assert_media(p->>'image');
  IF kind='category' THEN
   IF EXISTS(SELECT 1 FROM public.categories WHERE id=entity AND first_published_at IS NOT NULL AND slug<>p->>'slug') THEN RAISE EXCEPTION 'A published category URL slug cannot change'; END IF;
   INSERT INTO public.categories(id,name,slug,description,image_ref,first_published_at) VALUES(entity,p->>'title',p->>'slug',p->>'description',p->>'image',now()) ON CONFLICT(id) DO UPDATE SET name=excluded.name,slug=excluded.slug,description=excluded.description,image_ref=excluded.image_ref,updated_at=now(),version=categories.version+1;
   DELETE FROM public.product_categories WHERE category_id=entity;
   INSERT INTO public.product_categories(product_id,category_id) SELECT value::uuid,entity FROM jsonb_array_elements_text(p->'members');
   IF EXISTS(SELECT 1 FROM public.products x WHERE x.status='published' AND NOT EXISTS(SELECT 1 FROM public.product_categories c WHERE c.product_id=x.id)) THEN RAISE EXCEPTION 'Published products must keep a category'; END IF;
  ELSE
   IF EXISTS(SELECT 1 FROM public.collections WHERE id=entity AND first_published_at IS NOT NULL AND slug<>p->>'slug') THEN RAISE EXCEPTION 'A published collection URL slug cannot change'; END IF;
   INSERT INTO public.collections(id,title,slug,description,image_ref,status,first_published_at) VALUES(entity,p->>'title',p->>'slug',p->>'description',p->>'image','published',now()) ON CONFLICT(id) DO UPDATE SET title=excluded.title,slug=excluded.slug,description=excluded.description,image_ref=excluded.image_ref,updated_at=now(),version=collections.version+1;
   DELETE FROM public.collection_products WHERE collection_id=entity;
   INSERT INTO public.collection_products(collection_id,product_id,position) SELECT entity,value::uuid,ordinality::integer-1 FROM jsonb_array_elements_text(p->'members') WITH ORDINALITY;
  END IF;
 ELSIF kind='attribute' THEN
  dtype:=CASE p->>'type' WHEN 'text' THEN 'short_text' WHEN 'select' THEN 'single_select' WHEN 'multi' THEN 'multi_select' ELSE p->>'type' END;
  IF EXISTS(SELECT 1 FROM public.attribute_definitions WHERE id=entity AND key<>p->>'key') THEN RAISE EXCEPTION 'An attribute key cannot change after creation'; END IF;
  INSERT INTO public.attribute_definitions(id,key,label,field_type,unit,applies_to_all,visible,filterable) VALUES(entity,p->>'key',p->>'label',dtype,nullif(p->>'unit',''),jsonb_array_length(p->'categoryIds')=0,(p->>'visible')::boolean,(p->>'filterable')::boolean)
  ON CONFLICT(id) DO UPDATE SET label=excluded.label,field_type=excluded.field_type,unit=excluded.unit,applies_to_all=excluded.applies_to_all,visible=excluded.visible,filterable=excluded.filterable,updated_at=now(),version=attribute_definitions.version+1;
  DELETE FROM public.attribute_categories WHERE definition_id=entity;
  INSERT INTO public.attribute_categories(definition_id,category_id) SELECT entity,value::uuid FROM jsonb_array_elements_text(p->'categoryIds');
  WITH old_positions AS (SELECT id,row_number() OVER(ORDER BY id)::integer AS n FROM public.attribute_choices WHERE definition_id=entity)
  UPDATE public.attribute_choices c SET archived_at=now(),position=50000+o.n FROM old_positions o WHERE c.id=o.id;
  FOR choice_label IN SELECT value FROM jsonb_array_elements_text(p->'choices') LOOP
   INSERT INTO public.attribute_choices(definition_id,field_type,key,label,position) VALUES(entity,dtype,'v'||md5(choice_label),choice_label,(SELECT ordinality::integer-1 FROM jsonb_array_elements_text(p->'choices') WITH ORDINALITY WHERE value=choice_label))
   ON CONFLICT(definition_id,key) DO UPDATE SET archived_at=NULL,label=excluded.label,position=excluded.position,version=attribute_choices.version+1;
  END LOOP;
 ELSIF kind='stock' THEN
  delta:=(p->>'delta')::integer; note:=btrim(p->>'reason');
  IF delta=0 OR note='' OR char_length(note)>2000 THEN RAISE EXCEPTION 'Enter a nonzero stock adjustment and a reason'; END IF;
  SELECT quantity INTO count_before FROM private.inventory_balances WHERE variant_id=(p->>'variantId')::uuid FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Variant does not exist'; END IF;
  IF count_before::bigint+delta::bigint<0 THEN RAISE EXCEPTION 'Stock cannot be negative'; END IF;
  UPDATE private.inventory_balances SET quantity=quantity+delta,version=version+1,updated_at=now() WHERE variant_id=(p->>'variantId')::uuid;
  INSERT INTO private.stock_adjustments(id,variant_id,delta,reason,note,balance_before,balance_after,request_key,payload_hash,actor_id) VALUES(entity,(p->>'variantId')::uuid,delta,'correction',note,count_before,count_before+delta,request,md5(body::text)||md5('stock'||body::text),auth.uid());
  UPDATE public.variant_availability SET in_stock=count_before+delta>0,updated_at=now() WHERE variant_id=(p->>'variantId')::uuid;
 ELSIF kind='promotion' THEN
  IF jsonb_array_length(p->'productIds')=0 THEN RAISE EXCEPTION 'Select at least one product'; END IF;
  IF (p->>'enabled')::boolean AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(p->'productIds') s WHERE NOT EXISTS(SELECT 1 FROM public.products WHERE id=s.value::uuid AND status='published')) THEN RAISE EXCEPTION 'Select published products for enabled promotions'; END IF;
  DELETE FROM public.promotion_targets WHERE promotion_id=entity;
  INSERT INTO public.promotions(id,title,discount_type,percent_bps,amount_minor,starts_at,ends_at,enabled) VALUES(entity,p->>'title',p->>'kind',CASE WHEN p->>'kind'='percentage' THEN ((p->>'amount')::numeric*100)::integer END,CASE WHEN p->>'kind'='fixed' THEN (p->>'amount')::bigint END,(p->>'startsAt')::timestamptz,(p->>'endsAt')::timestamptz,(p->>'enabled')::boolean)
  ON CONFLICT(id) DO UPDATE SET title=excluded.title,discount_type=excluded.discount_type,percent_bps=excluded.percent_bps,amount_minor=excluded.amount_minor,starts_at=excluded.starts_at,ends_at=excluded.ends_at,enabled=excluded.enabled,updated_at=now(),version=promotions.version+1;
  INSERT INTO public.promotion_targets(promotion_id,product_id,active_window,enabled) SELECT pr.id,s.value::uuid,pr.active_window,pr.enabled FROM public.promotions pr CROSS JOIN jsonb_array_elements_text(p->'productIds') s WHERE pr.id=entity;
  IF EXISTS(SELECT 1 FROM public.product_variants v JOIN public.promotion_targets t ON t.product_id=v.product_id JOIN public.promotions pr ON pr.id=t.promotion_id WHERE pr.id=entity AND v.status='active' AND (pr.amount_minor>v.regular_price_minor OR (pr.discount_type='percentage' AND round(v.regular_price_minor*pr.percent_bps::numeric/10000)<1))) THEN RAISE EXCEPTION 'Discount must fit every variant and save at least one sen'; END IF;
 ELSIF kind='site' THEN
  site:=p->'site'; PERFORM private.assert_media(site->>'heroImage');
  IF NOT private.valid_href(site->>'heroHref') THEN RAISE EXCEPTION 'Choose a valid storefront link'; END IF;
  IF jsonb_array_length(site->'sections')>20 OR jsonb_array_length(site->'navigation')>12 THEN RAISE EXCEPTION 'Too many site sections or navigation links'; END IF;
  FOR v IN SELECT value FROM jsonb_array_elements(site->'navigation') LOOP IF NOT private.valid_href(v->>'href') THEN RAISE EXCEPTION 'Invalid navigation link'; END IF; END LOOP;
  FOR v IN SELECT value FROM jsonb_array_elements(site->'sections') LOOP
   IF v->>'type' NOT IN('collection','promotions','products','image-text') THEN RAISE EXCEPTION 'Choose a preset section'; END IF;
   PERFORM private.assert_media(v->>'image');
   IF v->>'href'<>'' AND NOT private.valid_href(v->>'href') THEN RAISE EXCEPTION 'Invalid section link'; END IF;
   IF (v->>'enabled')::boolean AND v->>'type'='collection' AND NOT EXISTS(SELECT 1 FROM public.collections WHERE id=nullif(v->>'collectionId','')::uuid AND status='published') THEN RAISE EXCEPTION 'Choose a published collection'; END IF;
   IF (v->>'enabled')::boolean AND v->>'type'='products' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(v->'productIds') s WHERE NOT EXISTS(SELECT 1 FROM public.products WHERE id=s.value::uuid AND status='published')) THEN RAISE EXCEPTION 'Sections can feature published products only'; END IF;
  END LOOP;
  SELECT id INTO draft_id FROM public.site_revisions WHERE state='draft';
  IF draft_id IS NULL THEN INSERT INTO public.site_revisions(created_by) VALUES(auth.uid()) RETURNING id INTO draft_id; END IF;
  UPDATE public.site_revisions SET sections=site->'sections',navigation=site->'navigation',settings=site-'sections'-'navigation',version=version+1,updated_at=now() WHERE id=draft_id;
  IF (p->>'publish')::boolean THEN
   INSERT INTO public.site_revisions(state,sections,navigation,settings,created_by,sealed_at) SELECT 'sealed',sections,navigation,settings,auth.uid(),now() FROM public.site_revisions WHERE id=draft_id RETURNING id INTO sealed_id;
   INSERT INTO public.site_publication(revision_id) VALUES(sealed_id) ON CONFLICT(singleton) DO UPDATE SET revision_id=excluded.revision_id,published_at=now(),version=site_publication.version+1;
  END IF;
 ELSE RAISE EXCEPTION 'Unsupported store operation'; END IF;
 SET CONSTRAINTS ALL IMMEDIATE;
 UPDATE public.store_settings SET version=version+1,updated_at=now() WHERE singleton RETURNING version INTO revision;
 INSERT INTO private.audit_events(actor_id,event_type,entity_type,entity_id) VALUES(auth.uid(),'save',kind,entity);
 result:=jsonb_build_object('revision',revision);
 INSERT INTO private.mutation_receipts(request_key,actor_id,payload,result) VALUES(request,auth.uid(),body,result);
 RETURN result;
END $$;

COMMIT;

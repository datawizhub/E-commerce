BEGIN;
ALTER TABLE public.products ADD COLUMN image_ref text NOT NULL DEFAULT '';
ALTER TABLE public.categories ADD COLUMN description text NOT NULL DEFAULT '', ADD COLUMN image_ref text NOT NULL DEFAULT '';
ALTER TABLE public.collections ADD COLUMN image_ref text NOT NULL DEFAULT '';
ALTER TABLE public.site_revisions ADD COLUMN settings jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(settings)='object');
CREATE TABLE private.mutation_receipts (
 request_key uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES auth.users(id),
 payload jsonb NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE private.mutation_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.mutation_receipts FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX mutation_receipts_actor_idx ON private.mutation_receipts(actor_id);
INSERT INTO public.store_settings(display_name) VALUES('Common Form');
-- Bootstrap only the administrator explicitly selected by the owner. No public signup/bootstrap endpoint.
INSERT INTO private.admin_account(user_id)
 SELECT id FROM auth.users WHERE lower(email)='danish@datawiz.com.my' AND email_confirmed_at IS NOT NULL;

CREATE FUNCTION private.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND EXISTS(
  SELECT 1 FROM private.admin_account a JOIN auth.users u ON u.id=a.user_id
  WHERE a.user_id=auth.uid() AND u.email_confirmed_at IS NOT NULL AND lower(u.email)='danish@datawiz.com.my'
 )
$$;
CREATE FUNCTION public.is_store_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.is_admin()$$;
CREATE FUNCTION private.require_admin() RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
BEGIN IF NOT private.is_admin() THEN RAISE EXCEPTION 'An approved administrator session is required' USING ERRCODE='42501'; END IF; END $$;

CREATE FUNCTION private.valid_image(ref text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT ref='' OR ref ~ '^/images/[a-z0-9-]+\.(jpg|png|webp)$' OR ref ~ '^/api/media/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;
CREATE FUNCTION private.valid_href(ref text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT ref IN ('/','/products','/collections','/promotions') OR ref ~ '^/(products|categories|collections)/[a-z0-9]+(-[a-z0-9]+)*$'
$$;
CREATE FUNCTION private.site_json(r public.site_revisions) RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT r.settings || jsonb_build_object('sections',r.sections,'navigation',r.navigation)
$$;
CREATE FUNCTION private.empty_site() RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path='' AS $$
 SELECT '{"announcement":"Ready-stock clothing · MYR","heroTitle":"Everyday, considered.","heroBody":"Our collection is coming soon.","heroImage":"/images/editorial.jpg","heroButton":"Explore the collection","heroHref":"/products","sections":[],"navigation":[{"id":"shop","label":"Shop","href":"/products"}]}'::jsonb
$$;
CREATE FUNCTION private.snapshot(admin_read boolean) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb; published jsonb; draft jsonb; at_time timestamptz:=statement_timestamp();
BEGIN
 IF admin_read THEN PERFORM private.require_admin(); END IF;
 SELECT private.site_json(r) INTO published FROM public.site_publication p JOIN public.site_revisions r ON r.id=p.revision_id;
 published:=coalesce(published,private.empty_site());
 IF admin_read THEN SELECT private.site_json(r) INTO draft FROM public.site_revisions r WHERE state='draft'; END IF;
 SELECT jsonb_build_object(
  'revision',CASE WHEN admin_read THEN (SELECT version FROM public.store_settings WHERE singleton) ELSE 0 END,
  'serverTime',at_time,
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
    FROM public.product_attribute_values v JOIN public.attribute_definitions d ON d.id=v.definition_id WHERE v.product_id=p.id AND (admin_read OR (d.visible AND d.archived_at IS NULL))),'{}'::jsonb),
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
   FROM public.attribute_definitions d WHERE d.archived_at IS NULL AND (admin_read OR d.visible)),'[]'::jsonb),
  'promotions',coalesce((SELECT jsonb_agg(jsonb_build_object('id',pr.id,'title',pr.title,'kind',pr.discount_type,'amount',CASE pr.discount_type WHEN 'fixed' THEN pr.amount_minor::numeric ELSE pr.percent_bps::numeric/100 END,'enabled',pr.enabled,'startsAt',pr.starts_at,'endsAt',coalesce(pr.ends_at,'9999-12-31'::timestamptz),
   'productIds',coalesce((SELECT jsonb_agg(t.product_id ORDER BY t.product_id) FROM public.promotion_targets t JOIN public.products p ON p.id=t.product_id WHERE t.promotion_id=pr.id AND (admin_read OR p.status='published')),'[]'::jsonb)) ORDER BY pr.starts_at,pr.id)
   FROM public.promotions pr WHERE admin_read OR (pr.enabled AND pr.active_window @> at_time)),'[]'::jsonb),
  'adjustments',CASE WHEN admin_read THEN coalesce((SELECT jsonb_agg(x.row ORDER BY x.created_at DESC) FROM (SELECT s.created_at,jsonb_build_object('id',s.id,'variantId',s.variant_id,'delta',s.delta,'reason',coalesce(s.note,s.reason),'balance',s.balance_after,'date',s.created_at,'productTitle',p.title,'variantLabel',v.sku) row FROM private.stock_adjustments s JOIN public.product_variants v ON v.id=s.variant_id JOIN public.products p ON p.id=v.product_id ORDER BY s.created_at DESC LIMIT 500) x),'[]'::jsonb) ELSE '[]'::jsonb END,
  'siteDraft',CASE WHEN admin_read THEN coalesce(draft,published) ELSE published END,'sitePublished',published)
 ) INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.store_snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.snapshot(false)$$;
CREATE FUNCTION public.admin_snapshot() RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.snapshot(true)$$;

CREATE FUNCTION private.assert_media(ref text) RETURNS void LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF NOT private.valid_image(ref) THEN RAISE EXCEPTION 'Choose a bundled image or upload a managed image'; END IF;
 IF ref LIKE '/api/media/%' AND NOT EXISTS(SELECT 1 FROM public.assets WHERE id=substring(ref FROM 12)::uuid AND processing_state='ready') THEN RAISE EXCEPTION 'Image upload is not ready'; END IF;
END $$;
CREATE FUNCTION private.save_product(p jsonb) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE pid uuid:=(p->>'id')::uuid; old public.products; v jsonb; opt text; choice_label text; oid uuid; vid uuid; choice uuid; signature text; definition public.attribute_definitions; entry record; value_id uuid; selected text; media uuid;
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
 DELETE FROM public.product_attribute_values WHERE product_id=pid;
 FOR entry IN SELECT * FROM jsonb_each(p->'attributes') LOOP
  SELECT * INTO definition FROM public.attribute_definitions WHERE key=entry.key AND archived_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown attribute %',entry.key; END IF;
  IF NOT definition.applies_to_all AND NOT EXISTS(SELECT 1 FROM public.attribute_categories ac JOIN public.product_categories pc ON pc.category_id=ac.category_id WHERE ac.definition_id=definition.id AND pc.product_id=pid) THEN RAISE EXCEPTION 'Attribute % does not apply to these categories',entry.key; END IF;
  INSERT INTO public.product_attribute_values(product_id,definition_id,field_type,text_value,number_value,boolean_value) VALUES(pid,definition.id,definition.field_type,
    CASE WHEN definition.field_type IN('short_text','long_text') THEN entry.value#>>'{}' END,
    CASE WHEN definition.field_type='number' THEN (entry.value#>>'{}')::numeric END,
    CASE WHEN definition.field_type='boolean' THEN (entry.value#>>'{}')::boolean END) RETURNING id INTO value_id;
  IF definition.field_type IN('single_select','multi_select') THEN
   FOR selected IN SELECT value FROM jsonb_array_elements_text(CASE WHEN definition.field_type='single_select' THEN jsonb_build_array(entry.value) ELSE entry.value END) LOOP
    SELECT id INTO choice FROM public.attribute_choices WHERE definition_id=definition.id AND label=selected AND archived_at IS NULL;
    IF choice IS NULL THEN RAISE EXCEPTION 'Invalid choice for %',entry.key; END IF;
    INSERT INTO public.product_attribute_selections(value_id,definition_id,field_type,choice_id) VALUES(value_id,definition.id,definition.field_type,choice);
   END LOOP;
  END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.promotion_targets t JOIN public.promotions pr ON pr.id=t.promotion_id JOIN public.product_variants v ON v.product_id=t.product_id WHERE t.product_id=pid AND pr.enabled AND v.status='active' AND (pr.amount_minor>v.regular_price_minor OR (pr.discount_type='percentage' AND round(v.regular_price_minor*pr.percent_bps::numeric/10000)<1))) THEN RAISE EXCEPTION 'Price does not fit an enabled promotion'; END IF;
END $$;

CREATE FUNCTION private.mutate(kind text,p jsonb,expected bigint,request uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
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
  UPDATE public.attribute_choices SET archived_at=now() WHERE definition_id=entity;
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
CREATE FUNCTION public.admin_mutate(kind text,payload jsonb,expected_version bigint,request_key uuid) RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.mutate(kind,payload,expected_version,request_key)$$;

CREATE FUNCTION private.protect_sealed() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$BEGIN IF OLD.state='sealed' THEN RAISE EXCEPTION 'Sealed revisions are immutable'; END IF; RETURN NEW; END$$;
CREATE TRIGGER sealed_revision_immutable BEFORE UPDATE OR DELETE ON public.site_revisions FOR EACH ROW EXECUTE FUNCTION private.protect_sealed();

CREATE FUNCTION private.media_access(asset uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE row public.assets; ref text:='/api/media/'||asset::text;
BEGIN
 SELECT * INTO row FROM public.assets WHERE id=asset AND processing_state='ready';
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF private.is_admin() OR EXISTS(SELECT 1 FROM public.product_media m JOIN public.products p ON p.id=m.product_id WHERE m.asset_id=asset AND p.status='published')
 OR EXISTS(SELECT 1 FROM public.categories WHERE image_ref=ref AND archived_at IS NULL)
 OR EXISTS(SELECT 1 FROM public.collections WHERE image_ref=ref AND status='published')
 OR EXISTS(SELECT 1 FROM public.site_publication p JOIN public.site_revisions r ON r.id=p.revision_id WHERE r.settings->>'heroImage'=ref OR EXISTS(SELECT 1 FROM jsonb_array_elements(r.sections) s WHERE s->>'image'=ref AND (s->>'enabled')::boolean))
 THEN RETURN jsonb_build_object('bucket',row.bucket_id,'path',row.storage_path,'admin',private.is_admin()); END IF;
 RETURN NULL;
END $$;
CREATE FUNCTION public.media_access(asset_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$SELECT private.media_access(asset_id)$$;
CREATE FUNCTION private.register_asset(asset uuid,path text,w integer,h integer,alt text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM private.require_admin();
 IF path<>asset::text||'.webp' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='catalog-media' AND name=path) THEN RAISE EXCEPTION 'Upload is missing'; END IF;
 INSERT INTO public.assets(id,storage_path,mime_type,width,height,alt_text,processing_state) VALUES(asset,path,'image/webp',w,h,alt,'ready');
END $$;
CREATE FUNCTION public.register_asset(asset_id uuid,storage_path text,width integer,height integer,alt_text text) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$SELECT private.register_asset(asset_id,storage_path,width,height,alt_text)$$;
-- No direct catalog table grants. Controlled read/write endpoints are the Data API contract.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.is_store_admin(),public.store_snapshot(),public.admin_snapshot(),public.admin_mutate(text,jsonb,bigint,uuid),public.media_access(uuid),public.register_asset(uuid,text,integer,integer,text) FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA private TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin(),private.snapshot(boolean),private.media_access(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION private.mutate(text,jsonb,bigint,uuid),private.register_asset(uuid,text,integer,integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_admin(),public.store_snapshot(),public.media_access(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_snapshot(),public.admin_mutate(text,jsonb,bigint,uuid),public.register_asset(uuid,text,integer,integer,text) TO authenticated;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('catalog-media','catalog-media',false,10485760,ARRAY['image/webp']);
CREATE POLICY admin_media_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='catalog-media' AND (SELECT private.is_admin()));
CREATE POLICY reachable_media_read ON storage.objects FOR SELECT TO anon,authenticated USING(bucket_id='catalog-media' AND EXISTS(SELECT 1 FROM public.assets a WHERE a.storage_path=name AND private.media_access(a.id) IS NOT NULL));
COMMIT;

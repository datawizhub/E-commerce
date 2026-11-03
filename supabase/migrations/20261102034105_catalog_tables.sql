-- Clothing catalog and administration: table structures v1.0, 30 October 2026.
-- Target: a fresh Supabase PostgreSQL application schema, PostgreSQL 15+.
-- This is reviewed table-layer DDL, NOT the complete application backend.
-- RLS is enabled; client table privileges are revoked; no access policies/RPCs
-- are installed here. See 02-table-guide.md before using this in a project.
-- No users, product records, buckets, shipping, checkout or order data are created.
-- The file is transactional and intentionally fails if its application tables exist.

BEGIN;
SET LOCAL search_path = public, extensions, pg_catalog;

DO $prerequisites$
BEGIN
  IF current_setting('server_version_num')::integer < 150000 THEN
    RAISE EXCEPTION 'This structure requires PostgreSQL 15 or newer';
  END IF;
  IF to_regclass('auth.users') IS NULL THEN
    RAISE EXCEPTION 'Supabase auth.users must already exist; do not create a replacement Auth table';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Expected Supabase roles anon, authenticated and service_role';
  END IF;
END;
$prerequisites$;

CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

-- 01. Single administrator identity; controlled setup only.
CREATE TABLE private.admin_account (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 02. One store and one base catalog currency.
CREATE TABLE public.store_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 120),
  currency text NOT NULL DEFAULT 'MYR' CHECK (currency ~ '^[A-Z]{3}$'),
  timezone text NOT NULL DEFAULT 'Asia/Kuala_Lumpur' CHECK (char_length(timezone) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

-- 03. Metadata for privately stored, processed images.
CREATE TABLE public.assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL DEFAULT 'catalog-media' CHECK (bucket_id = 'catalog-media'),
  storage_path text NOT NULL UNIQUE CHECK (char_length(btrim(storage_path)) BETWEEN 1 AND 1024),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
  width integer CHECK (width > 0),
  height integer CHECK (height > 0),
  alt_text text NOT NULL DEFAULT '' CHECK (char_length(alt_text) <= 500),
  processing_state text NOT NULL DEFAULT 'processing' CHECK (processing_state IN ('processing', 'ready', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT ready_asset_has_dimensions CHECK (processing_state <> 'ready' OR (width IS NOT NULL AND height IS NOT NULL))
);

-- 04. Shared product details. Prices and stock belong to variants.
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 120 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 10000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  first_published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT published_product_has_timestamp CHECK (status <> 'published' OR first_published_at IS NOT NULL)
);

-- 05. Ordered product gallery; no duplicated product data.
CREATE TABLE public.product_media (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 0),
  alt_override text CHECK (char_length(alt_override) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, asset_id),
  CONSTRAINT product_media_position_unique UNIQUE (product_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

-- 06. Configurable variant dimensions such as Size and Color.
CREATE TABLE public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  key text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 100),
  position integer NOT NULL CHECK (position >= 0),
  filter_role text CHECK (filter_role IN ('size', 'color')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (product_id, key),
  UNIQUE (id, product_id),
  CONSTRAINT product_option_position_unique UNIQUE (product_id, position) DEFERRABLE INITIALLY IMMEDIATE
);
CREATE UNIQUE INDEX one_size_or_color_role_per_product ON public.product_options (product_id, filter_role) WHERE filter_role IS NOT NULL;

-- 07. Values allowed for a particular option.
CREATE TABLE public.option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES public.product_options(id) ON DELETE RESTRICT,
  key text NOT NULL CHECK (char_length(key) <= 80 AND key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 100),
  position integer NOT NULL CHECK (position >= 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (option_id, key),
  UNIQUE (id, option_id),
  CONSTRAINT option_value_position_unique UNIQUE (option_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

-- 08. Actual SKUs; one default variant for a product without options.
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  sku text NOT NULL CHECK (sku = btrim(sku) AND char_length(sku) BETWEEN 1 AND 64),
  option_signature text NOT NULL CHECK (char_length(option_signature) <= 4000),
  regular_price_minor bigint NOT NULL CHECK (regular_price_minor BETWEEN 1 AND 100000000),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  image_asset_id uuid REFERENCES public.assets(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (id, product_id),
  CONSTRAINT product_variant_combination_unique UNIQUE (product_id, option_signature) DEFERRABLE INITIALLY IMMEDIATE
);
CREATE UNIQUE INDEX product_variant_sku_unique ON public.product_variants (lower(sku));

-- 09. Concrete option choices. product_id is deliberate FK-validation data.
CREATE TABLE public.variant_option_values (
  variant_id uuid NOT NULL,
  product_id uuid NOT NULL,
  option_id uuid NOT NULL,
  value_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, option_id),
  FOREIGN KEY (variant_id, product_id) REFERENCES public.product_variants(id, product_id) ON DELETE CASCADE,
  FOREIGN KEY (option_id, product_id) REFERENCES public.product_options(id, product_id) ON DELETE RESTRICT,
  FOREIGN KEY (value_id, option_id) REFERENCES public.option_values(id, option_id) ON DELETE RESTRICT
);

-- 10. Product classification hierarchy.
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 120 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0),
  archived_at timestamptz,
  first_published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT category_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id)
);

-- 11. One product can appear in several categories.
CREATE TABLE public.product_categories (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, category_id)
);

-- 12. Curated merchandising groups.
CREATE TABLE public.collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  slug text NOT NULL UNIQUE CHECK (char_length(slug) <= 120 AND slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 5000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  first_published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  CONSTRAINT published_collection_has_timestamp CHECK (status <> 'published' OR first_published_at IS NOT NULL)
);

-- 13. Ordered collection membership, referencing the same products.
CREATE TABLE public.collection_products (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  position integer NOT NULL CHECK (position >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id),
  CONSTRAINT collection_product_position_unique UNIQUE (collection_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

-- 14. Admin-created descriptive fields; no migration per new field.
CREATE TABLE public.attribute_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE CHECK (key ~ '^[a-z][a-z0-9_]{0,63}$'),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 100),
  field_type text NOT NULL CHECK (field_type IN ('short_text', 'long_text', 'number', 'boolean', 'single_select', 'multi_select')),
  unit text CHECK (char_length(btrim(unit)) BETWEEN 1 AND 40),
  applies_to_all boolean NOT NULL DEFAULT true,
  visible boolean NOT NULL DEFAULT true,
  filterable boolean NOT NULL DEFAULT false,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (id, field_type),
  CONSTRAINT attribute_unit_is_numeric CHECK (unit IS NULL OR field_type = 'number'),
  CONSTRAINT text_attribute_not_filterable CHECK (NOT filterable OR field_type NOT IN ('short_text', 'long_text'))
);

-- 15. Applicable categories; descendant inheritance is a read/save rule.
CREATE TABLE public.attribute_categories (
  definition_id uuid NOT NULL REFERENCES public.attribute_definitions(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (definition_id, category_id)
);

-- 16. Reusable selection choices; copied field_type is validated by FK.
CREATE TABLE public.attribute_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  definition_id uuid NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('single_select', 'multi_select')),
  key text NOT NULL CHECK (char_length(key) <= 80 AND key ~ '^[a-z0-9]+([_-][a-z0-9]+)*$'),
  label text NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 100),
  position integer NOT NULL CHECK (position >= 0),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  FOREIGN KEY (definition_id, field_type) REFERENCES public.attribute_definitions(id, field_type) ON DELETE RESTRICT,
  UNIQUE (definition_id, key),
  UNIQUE (id, definition_id),
  CONSTRAINT attribute_choice_position_unique UNIQUE (definition_id, position) DEFERRABLE INITIALLY IMMEDIATE
);

-- 17. Typed, product-level values. NULL columns do not blur false/zero.
CREATE TABLE public.product_attribute_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  definition_id uuid NOT NULL,
  field_type text NOT NULL,
  text_value text,
  number_value numeric(20,6),
  boolean_value boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  FOREIGN KEY (definition_id, field_type) REFERENCES public.attribute_definitions(id, field_type) ON DELETE RESTRICT,
  UNIQUE (product_id, definition_id),
  UNIQUE (id, definition_id, field_type),
  CONSTRAINT typed_attribute_value_shape CHECK (
    (field_type = 'short_text' AND text_value IS NOT NULL AND char_length(text_value) BETWEEN 1 AND 200 AND number_value IS NULL AND boolean_value IS NULL)
    OR (field_type = 'long_text' AND text_value IS NOT NULL AND char_length(text_value) BETWEEN 1 AND 5000 AND number_value IS NULL AND boolean_value IS NULL)
    OR (field_type = 'number' AND number_value IS NOT NULL AND number_value BETWEEN -99999999999999.999999 AND 99999999999999.999999 AND text_value IS NULL AND boolean_value IS NULL)
    OR (field_type = 'boolean' AND boolean_value IS NOT NULL AND text_value IS NULL AND number_value IS NULL)
    OR (field_type IN ('single_select', 'multi_select') AND text_value IS NULL AND number_value IS NULL AND boolean_value IS NULL)
  )
);

-- 18. Choice assignments; both FKs tie values and choices to one definition.
CREATE TABLE public.product_attribute_selections (
  value_id uuid NOT NULL,
  definition_id uuid NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('single_select', 'multi_select')),
  choice_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (value_id, choice_id),
  FOREIGN KEY (value_id, definition_id, field_type) REFERENCES public.product_attribute_values(id, definition_id, field_type) ON DELETE CASCADE,
  FOREIGN KEY (choice_id, definition_id) REFERENCES public.attribute_choices(id, definition_id) ON DELETE RESTRICT
);
CREATE UNIQUE INDEX single_select_has_at_most_one_choice ON public.product_attribute_selections (value_id) WHERE field_type = 'single_select';

-- 19. Exact stock counts are private.
CREATE TABLE private.inventory_balances (
  variant_id uuid PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0)
);

-- 20. Adjustment record; a transaction/RPC must reconcile the live balance.
CREATE TABLE private.stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE RESTRICT,
  delta integer NOT NULL CHECK (delta <> 0),
  reason text NOT NULL CHECK (reason IN ('receipt', 'correction', 'damage', 'inspected_return')),
  note text CHECK (char_length(note) <= 2000),
  balance_before integer NOT NULL CHECK (balance_before >= 0),
  balance_after integer NOT NULL CHECK (balance_after >= 0),
  request_key uuid NOT NULL UNIQUE,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adjustment_arithmetic CHECK (balance_after::bigint = balance_before::bigint + delta::bigint),
  CONSTRAINT adjustment_direction CHECK ((reason IN ('receipt','inspected_return') AND delta > 0) OR (reason = 'damage' AND delta < 0) OR reason = 'correction')
);

-- 21. Public-safe boolean projection; later stock RPC maintains this.
CREATE TABLE public.variant_availability (
  variant_id uuid PRIMARY KEY REFERENCES public.product_variants(id) ON DELETE CASCADE,
  in_stock boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 22. Durable administrative event metadata; later routines enforce append-only.
CREATE TABLE private.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type text NOT NULL CHECK (char_length(btrim(event_type)) BETWEEN 1 AND 100),
  entity_type text NOT NULL CHECK (char_length(btrim(entity_type)) BETWEEN 1 AND 100),
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(details) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 23. One shared schedule and reduction for a promotion.
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  percent_bps integer,
  amount_minor bigint,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  active_window tstzrange GENERATED ALWAYS AS (
    CASE WHEN ends_at IS NOT NULL AND ends_at <= starts_at
      THEN 'empty'::tstzrange ELSE tstzrange(starts_at, ends_at, '[)') END
  ) STORED NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (id, active_window, enabled),
  CONSTRAINT promotion_discount_shape CHECK (
    (discount_type = 'percentage' AND percent_bps BETWEEN 1 AND 10000 AND percent_bps IS NOT NULL AND amount_minor IS NULL)
    OR (discount_type = 'fixed' AND amount_minor BETWEEN 1 AND 100000000 AND amount_minor IS NOT NULL AND percent_bps IS NULL)
  ),
  CONSTRAINT promotion_valid_times CHECK (isfinite(starts_at) AND (ends_at IS NULL OR (isfinite(ends_at) AND ends_at > starts_at)))
);

-- 24. Schedule inheritance is enforced by cascading composite FK, not a second
-- independent setting. Exclusion protects one product against overlapping offers.
CREATE TABLE public.promotion_targets (
  promotion_id uuid NOT NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  active_window tstzrange NOT NULL,
  enabled boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promotion_id, product_id),
  CONSTRAINT promotion_target_inherits_schedule FOREIGN KEY (promotion_id, active_window, enabled)
    REFERENCES public.promotions(id, active_window, enabled) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT product_offer_windows_do_not_overlap EXCLUDE USING gist (
    product_id WITH =, active_window WITH &&
  ) WHERE (enabled) DEFERRABLE INITIALLY IMMEDIATE
);

-- 25. Shared homepage/navigation draft and sealed revision documents.
CREATE TABLE public.site_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL DEFAULT 'draft' CHECK (state IN ('draft', 'sealed')),
  sections jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sections) = 'array' AND jsonb_array_length(sections) <= 20),
  navigation jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(navigation) = 'array'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sealed_at timestamptz,
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  UNIQUE (id, state),
  CONSTRAINT site_revision_seal_timestamp CHECK ((state = 'draft' AND sealed_at IS NULL) OR (state = 'sealed' AND sealed_at IS NOT NULL))
);
CREATE UNIQUE INDEX one_editable_site_draft ON public.site_revisions ((true)) WHERE state = 'draft';

-- 26. Only a sealed revision can be selected as the public website.
CREATE TABLE public.site_publication (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  revision_id uuid NOT NULL,
  revision_state text NOT NULL DEFAULT 'sealed' CHECK (revision_state = 'sealed'),
  published_at timestamptz NOT NULL DEFAULT now(),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  FOREIGN KEY (revision_id, revision_state) REFERENCES public.site_revisions(id, state) ON DELETE RESTRICT
);

-- Index referencing/filter directions not already covered by a leading PK/UNIQUE.
CREATE INDEX products_listing_idx ON public.products (created_at DESC, id) WHERE status = 'published';
CREATE INDEX product_media_asset_idx ON public.product_media (asset_id);
CREATE INDEX option_values_filter_idx ON public.option_values (key, option_id);
CREATE INDEX variants_catalog_idx ON public.product_variants (product_id, regular_price_minor, id) WHERE status = 'active';
CREATE INDEX variants_image_idx ON public.product_variants (image_asset_id) WHERE image_asset_id IS NOT NULL;
CREATE INDEX variant_options_product_idx ON public.variant_option_values (product_id);
CREATE INDEX variant_options_option_idx ON public.variant_option_values (option_id, product_id);
CREATE INDEX variant_options_value_idx ON public.variant_option_values (value_id, option_id, variant_id);
CREATE INDEX categories_parent_idx ON public.categories (parent_id);
CREATE INDEX category_products_idx ON public.product_categories (category_id, product_id);
CREATE INDEX collection_product_reverse_idx ON public.collection_products (product_id, collection_id);
CREATE INDEX attribute_category_reverse_idx ON public.attribute_categories (category_id, definition_id);
CREATE INDEX attribute_values_definition_idx ON public.product_attribute_values (definition_id, field_type, product_id);
CREATE INDEX attribute_numeric_filter_idx ON public.product_attribute_values (definition_id, number_value, product_id) WHERE field_type = 'number';
CREATE INDEX attribute_boolean_filter_idx ON public.product_attribute_values (definition_id, boolean_value, product_id) WHERE field_type = 'boolean';
CREATE INDEX attribute_selections_value_type_idx ON public.product_attribute_selections (value_id, definition_id, field_type);
CREATE INDEX attribute_selections_choice_idx ON public.product_attribute_selections (choice_id, definition_id, value_id);
CREATE INDEX stock_history_idx ON private.stock_adjustments (variant_id, created_at DESC, id);
CREATE INDEX stock_actor_idx ON private.stock_adjustments (actor_id);
CREATE INDEX audit_actor_idx ON private.audit_events (actor_id, created_at DESC);
CREATE INDEX audit_entity_idx ON private.audit_events (entity_type, entity_id, created_at DESC);
CREATE INDEX promotion_schedule_idx ON public.promotions (starts_at, ends_at) WHERE enabled;
CREATE INDEX site_revision_author_idx ON public.site_revisions (created_by);
CREATE INDEX site_publication_revision_idx ON public.site_publication (revision_id, revision_state);

COMMENT ON TABLE private.admin_account IS 'At most one approved administrator, linked to Supabase Auth; setup-only identity.';
COMMENT ON TABLE public.store_settings IS 'Singleton store settings; MYR is the initial base catalog currency.';
COMMENT ON TABLE public.assets IS 'Metadata for processed images in a private Storage bucket; not the image bytes.';
COMMENT ON TABLE public.products IS 'Shared product listing; categories, collections and promotions reference this identity.';
COMMENT ON TABLE public.product_media IS 'Ordered links from products to shared image assets.';
COMMENT ON TABLE public.product_options IS 'Configurable dimensions that distinguish purchasable variants.';
COMMENT ON TABLE public.option_values IS 'Allowed values for one product option, such as Medium or Navy.';
COMMENT ON TABLE public.product_variants IS 'Actual SKUs with regular minor-unit prices; no copied promotional products.';
COMMENT ON TABLE public.variant_option_values IS 'Actual option selections with same-product and same-option integrity.';
COMMENT ON TABLE public.categories IS 'Classification hierarchy; full cycle prevention belongs to the category save routine.';
COMMENT ON TABLE public.product_categories IS 'Many-to-many product classification without duplicating stock.';
COMMENT ON TABLE public.collections IS 'Manually curated merchandising groups.';
COMMENT ON TABLE public.collection_products IS 'Ordered membership of products in curated collections.';
COMMENT ON TABLE public.attribute_definitions IS 'Admin-created typed descriptive fields; independent display and filter flags.';
COMMENT ON TABLE public.attribute_categories IS 'Category scope of descriptive definitions; descendants resolved by application queries.';
COMMENT ON TABLE public.attribute_choices IS 'Centrally managed choices for single-select or multi-select definitions.';
COMMENT ON TABLE public.product_attribute_values IS 'Typed descriptive values; false and numeric zero are preserved.';
COMMENT ON TABLE public.product_attribute_selections IS 'Choice links with matching definition and type; at most one for single-select.';
COMMENT ON TABLE private.inventory_balances IS 'Current exact sellable quantity per variant at one stock location.';
COMMENT ON TABLE private.stock_adjustments IS 'Auditable stock deltas with request deduplication keys and reconciled arithmetic.';
COMMENT ON TABLE public.variant_availability IS 'Public-safe availability projection maintained by the future inventory transaction.';
COMMENT ON TABLE private.audit_events IS 'Administrative audit metadata; append-only enforcement belongs to controlled write routines.';
COMMENT ON TABLE public.promotions IS 'Product-wide percentage or fixed reductions with one authoritative schedule.';
COMMENT ON TABLE public.promotion_targets IS 'Product offer targets inheriting schedule/enabled state, with overlap exclusion.';
COMMENT ON TABLE public.site_revisions IS 'Shared homepage/navigation draft and sealed content documents; full content validation follows.';
COMMENT ON TABLE public.site_publication IS 'Singleton pointer to a sealed site revision, never a draft.';

COMMENT ON COLUMN public.product_variants.regular_price_minor IS 'Integer sen in the store base currency: MYR 80.00 = 8000. Effective sale price is calculated later.';
COMMENT ON COLUMN public.product_variants.option_signature IS 'Canonical option/value signature generated by the future product-save routine, not trusted client input.';
COMMENT ON COLUMN public.variant_option_values.product_id IS 'Deliberate integrity copy used by two composite foreign keys to prevent cross-product choices.';
COMMENT ON COLUMN public.product_attribute_values.field_type IS 'Integrity copy bound by FK to its definition; enables row-level type-shape checks.';
COMMENT ON COLUMN public.promotions.percent_bps IS 'Percentage in basis points: 25 percent = 2500; the percentage discount is rounded half up to a minor unit.';
COMMENT ON COLUMN public.promotions.active_window IS 'Stored generated interval [starts_at, ends_at); NULL end is unbounded.';
COMMENT ON COLUMN public.promotion_targets.active_window IS 'Must match the parent promotion; parent schedule changes cascade automatically.';
COMMENT ON COLUMN public.site_publication.revision_state IS 'Fixed sealed value forms a composite FK that excludes draft publication.';
COMMENT ON COLUMN private.stock_adjustments.balance_before IS 'Snapshot used to reconcile the signed delta and resulting balance; transaction must match the live balance.';
COMMENT ON COLUMN private.stock_adjustments.request_key IS 'Unique retry identity. Returning an existing result instead of failing is the future inventory RPCs responsibility.';

-- Enable RLS on exactly these tables and close any inherited/default client grants.
-- No policies or public grants are intentionally created by this table-only file.
DO $table_security$
DECLARE target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'private.admin_account','public.store_settings','public.assets','public.products',
    'public.product_media','public.product_options','public.option_values','public.product_variants',
    'public.variant_option_values','public.categories','public.product_categories','public.collections',
    'public.collection_products','public.attribute_definitions','public.attribute_categories',
    'public.attribute_choices','public.product_attribute_values','public.product_attribute_selections',
    'private.inventory_balances','private.stock_adjustments','public.variant_availability',
    'private.audit_events','public.promotions','public.promotion_targets',
    'public.site_revisions','public.site_publication'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE %s FROM PUBLIC, anon, authenticated, service_role', target);
  END LOOP;
END;
$table_security$;

COMMIT;

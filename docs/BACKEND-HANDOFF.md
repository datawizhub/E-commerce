# Supabase backend handoff

Updated 2 November 2026. The existing Next.js store is connected to **E-commerce_store**, project **kuynrtpkelvcmsojyvol**, in Datawiz’s Org. The website itself runs locally. No Git repository, GitHub upload, or Vercel deployment was created.

## Using the store

Run `start-local.cmd`, or `pnpm dev` with Node and pnpm available. Open `http://127.0.0.1:3000/admin`. Sign in with the verified Supabase Auth user **danish@datawiz.com.my** and the password entered privately during setup.

Create categories and optional collections first. Create descriptive attributes in **Attributes**; definitions and values are relational records, so adding a field requires no schema migration. Create a product with its actual size/colour variants and unique SKUs. New variants start at zero stock. Use **Inventory** to record stock adjustments with a reason. Publish a product when its image, category, variants and details are ready.

Promotions reference those same products. A shirt keeps its category and collection membership while appearing in The offers during its promotion. Prices use integer sen in MYR. Schedules are edited in Malaysia time and evaluated using PostgreSQL time. Homepage and navigation share a saved draft and publish together. `/preview` requires the administrator and displays the saved draft header, navigation and body.

The project began empty. Browser demo products and invented stock counts were not imported as real merchandise. The integration checks left a starter **Shirts** category, an **archived Integration test shirt**, a disabled test promotion and two stock audit entries, **+5 and −5**. Its final stock is zero. The original homepage announcement was restored. Uploaded test media remains private with the archived record. Benchmark rows were rolled back and do not remain in the project.

## Configuration and credentials

`.env.local` contains the selected project URL, its publishable key and `NEXT_PUBLIC_STORE_MODE=backend`. See `.env.example` for variable names. No service-role or secret key is stored in the local app or sent to the browser. Supabase session cookies are HTTP-only. Server requests verify the Auth identity and the private singleton administrator membership. Editable user profile metadata never grants administration.

The Supabase **catalog-media-url** Edge Function uses Supabase-provided server environment credentials only after checking asset reachability using the caller’s verified session. It signs public images for **300 seconds**, or administrator-only images for **60 seconds**. Anonymous callers cannot use Storage’s signing API directly to choose a longer expiry. The function implements its own authentication and reachability checks; its gateway `verify_jwt` flag is false because publishable keys are not JWTs.

Auth user registration is not offered by this app. Project-level **Allow new users to sign up** and **Leaked password protection** settings should be reviewed in the Supabase dashboard before a public launch. The advisor currently reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Neither setting gives an ordinary authenticated user administrator access.

## Database and request contract

Seven versioned SQL migrations are under `supabase/migrations`. They implement the reviewed 26 tables plus a private mutation-receipt table. All application tables have RLS enabled and direct client table privileges revoked. Public and admin access use explicit RPC grants. Security-definer routines are confined to the private schema; privileged writes check the approved Auth identity, use a fixed search path and run atomically.

- `store_snapshot()` returns published site metadata and a bounded set of homepage products, not the whole catalog.
- `catalog_list(query)` returns 24 products per page, a total, same-variant colour/size/effective-price/availability filtering, scoped facets, numeric attribute ranges, the server evaluation time and next offer boundary. Selection values use OR within a field; different fields combine with AND. Facets omit their own filter when calculating alternatives.
- `product_snapshot(slug)` returns one published product and up to four related products.
- `admin_snapshot()` returns the protected editing state and current store revision. Exact inventory and adjustment history remain private.
- `admin_mutate(kind, payload, expected_version, request_key)` saves one product, group with membership, attribute, promotion, stock adjustment, or site document. It rejects stale revisions. Inventory adjustments lock the balance, prohibit negatives, append history and deduplicate retries.
- `media_access(asset_id)` checks whether an image is reachable from published content or the approved administrator. `register_asset(...)` records an uploaded, processed asset after authenticated upload.

The global revision is intentional for one administrator: another tab’s save may require reloading before saving a stale form. Browser changes wait for the database response before reporting success. An acknowledged save stays successful if its follow-up refresh fails; a refresh warning prevents it being confused with a failed write. Retrying an uncertain stock request reuses its request identity.

Product options, variant selections, category/collection memberships, typed attribute values and promotion targets remain normalized. Removed variants are archived. Retired attribute choices retain existing assignments; unrelated product edits do not require replacing them. Optional text/selection values can be cleared, and numeric zero/boolean false are preserved. Attribute display visibility and filtering are independent.

Public responses expose availability as 0/1 for compatibility with the existing frontend model; they do not expose exact counts. Effective prices and active offers come from PostgreSQL. Public pages refresh at the next offer boundary, on window focus and at a 30-second fallback interval. Published site revisions are immutable; publishing creates a sealed copy and updates the publication pointer.

## Images

The product editor accepts static JPEG, PNG and WebP images up to 10 MB. The server decodes the actual content, limits decoded pixels, applies orientation, strips metadata, resizes to a maximum 2400-pixel edge, and stores a WebP in the private `catalog-media` bucket. Images not reachable from published content require the administrator. Existing signed URLs remain valid until their bounded expiry after content is archived.

Bundled sample photography remains selectable. Its provenance is in `public/images/sources.json`; replace it with photographs of actual stock before launch. A single product image and size/colour dimensions match the current frontend. Additional galleries and arbitrary variant dimensions are later frontend work.

## Verification

Run these from this folder:

```text
pnpm test             # domain, persistence, query validation, draft preview regression
pnpm test:db          # in-memory PostgreSQL security and transaction checks
pnpm test:backend     # public/auth/media API boundaries against the local connected app
pnpm test:catalog     # SSR pagination and numeric filters against an isolated local API fixture
pnpm test:e2e         # original UI journeys in explicit demo mode on port 3001
pnpm typecheck
pnpm lint
pnpm build
```

On this Windows workstation, sandboxed Edge and Next.js native-module junctions can require host permission. Test servers use separate build directories. Demo mode is isolated from the connected app and cannot disable backend mode in a production build. Hosted database failures never fall back to demo inventory.

Final verification: **29 unit tests, 19 database checks and 11 browser journeys passed**, plus lint, TypeScript and the production build. Browser journeys comprise three connected-store boundaries, two isolated catalog checks and six original demo flows. Cold development compilations have explicit test time allowances; they are not production response-time measurements.

The bundled pnpm wrapper attempted an automatic dependency reinstall on this workstation and aborted without a TTY. `start-local.cmd` runs the installed Next.js executable directly. The verified Node equivalents for checks are `node node_modules/vitest/vitest.mjs run`, `node scripts/test-database.mjs`, `node node_modules/@playwright/test/cli.js test` (add `--config playwright.backend.config.ts` or `--config playwright.catalog.config.ts` for those suites), `node node_modules/typescript/bin/tsc --noEmit`, `node node_modules/eslint/bin/eslint.js .`, and `node node_modules/next/dist/bin/next build`.

Live verification covered administrator sign-in, persistent category/product saves, a processed private upload, temporary publication, category plus promotion membership, RM80 → RM60 pricing, public boolean versus private exact stock, draft isolation, sealed publication, and cleanup. A separate anonymous browser checked the storefront and mobile layout. A direct Storage-signing attempt was denied; the dedicated signer enforced its five-minute public expiry even when a caller requested a day.

The scale fixture used **1,000 products, 10,000 variants, three typed attributes, same-variant filters, facets and 24 returned products**. Over 20 warm samples the optimized query measured **235.87 ms p95 inside hosted PostgreSQL**; the maximum was 236.24 ms. This is a database measurement, not a network, cold-start or end-to-end latency guarantee. See `scripts/benchmark-catalog.sql`; its fixture runs inside a transaction and rolls back. Only rerun it in the intended development project.

A fresh code review found seven important issues; each was addressed with regression checks or the scale benchmark. See `BACKEND-PROGRESS.md` for the review record. Supabase advisors report the intentional deny-direct-access RLS posture as informational, and the project-level password protection setting noted above.

## Deferred

Shipping, checkout, payments, orders, customer accounts, currency conversion and public deployment remain out of scope. Smaller follow-ups from review are an administrator-facing publication rollback action, a product draft storefront preview, collecting uploaded-image alt metadata separately from the product title, and adding request IDs/durations consistently across all API operations. Current product images use the product title as their accessible text.

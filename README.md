# Common Form · clothing store

Local Next.js / React / TypeScript app in `C:\Users\danis\clothing-store`, connected to the **E-commerce_store** Supabase project (`kuynrtpkelvcmsojyvol`). No GitHub upload or Vercel deployment has been made.

Run **start-local.cmd**, keep its terminal open, and visit **http://127.0.0.1:3000**. With Node and pnpm on PATH, use `pnpm dev`. The server listens only on this computer.

Open **/admin** and sign in as **danish@datawiz.com.my** with the password you set privately in Supabase Auth. The workspace saves products, variants, categories, collections, descriptive attributes, inventory, promotions, homepage presets and navigation to PostgreSQL. **/preview** is an authenticated saved-draft preview. Shipping and checkout remain deferred.

New variants start at zero stock; add stock through Inventory. Published products appear publicly. A promoted product retains its category and collection memberships. Storefront lists use server-side filters and pages of 24 products. Public availability is a boolean; exact counts and history remain private. Uploads are validated, converted to WebP and stored privately.

Read **[Backend handoff](docs/BACKEND-HANDOFF.md)** for configuration, database/API contracts, security decisions, tests, measured query performance, test-data cleanup and remaining follow-ups. `.env.example` documents the local environment variables. `.env.local` contains only the project URL, publishable key and mode; no privileged key is stored in the app.

## Checks

```text
pnpm test
pnpm test:db
pnpm test:backend
pnpm test:catalog
pnpm test:e2e
pnpm typecheck
pnpm lint
pnpm build
```

The original frontend journeys run in isolated demo mode on port 3001. Catalog pagination tests use a local API fixture on port 3002. They do not modify the connected project. Backend browser tests expect the normal connected app to be running on port 3000. Microsoft Edge is used on Windows.

## Structure

- `src/app` — server-rendered routes, protected admin layout, login, and API endpoints.
- `src/components` — storefront and administrative UI.
- `src/lib/catalog.ts` — shared presentation/domain helpers; authoritative public pricing comes from PostgreSQL.
- `src/lib/catalog-query.ts`, `src/lib/supabase` — validated catalog queries, typed SSR client and authorization.
- `src/lib/store.ts` — hydrated connected editing state, awaited writes and explicitly isolated demo persistence.
- `supabase/migrations` — schema, transaction operations, permissions, publication, catalog queries and measured optimizations.
- `supabase/functions/catalog-media-url` — reachability-checked media signer with bounded expiry.
- `docs/BACKEND-INTEGRATION-PLAN.md`, `docs/BACKEND-PROGRESS.md`, `docs/BACKEND-HANDOFF.md` — plan, execution/review record and handoff.

The existing Inter typography and cream/navy/coral design remain in `globals.css` and `theme.css`. See `docs/NOMU-RESTYLE.md` for the supplied reference and adaptation. Earlier frontend planning documents describe the preceding prototype phase.

Bundled photographs are placeholders with provenance in `public/images/sources.json`; replace them with photographs of actual stock before launch. Browser demo products and invented inventory were not imported as real merchandise. The archived QA shirt and its balanced stock audit remain as the integration verification record.

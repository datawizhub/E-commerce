# Supabase backend integration

Requested 2 November 2026. Executes the previously approved PRD/TRD/database design against the existing frontend. This instruction replaces the earlier frontend-only limitation; local code, no GitHub upload or Vercel deployment remain in force.

**Selected project:** `kuynrtpkelvcmsojyvol` — E-commerce_store, Datawiz’s Org. Never substitute the differently named projects accessible through older Supabase connections.

**Single administrator:** `danish@datawiz.com.my`, verified Supabase Auth identity. Never trust editable profile metadata or grant administration to every authenticated user.

**Scope:** persistent catalog/variants, category and collection membership, typed descriptive attributes, stock history, promotions, shared site draft/publication, private uploaded media, and protected administration. Shipping, checkout, payments, orders and customer accounts remain deferred.

## Execution

1. Inspect the selected project's actual tables, migration history and Auth users before writing. Reuse the reviewed 26-table normalized design from the planning workspace; add migrations for controlled reads/writes and publication. Record migrations locally with CLI-generated names. No destructive reset of existing cloud data.
2. Add explicit grants/RLS and a private admin predicate. Public responses expose published content and boolean availability only. Authenticated admin operations verify membership, use database transactions and optimistic versions, and do not use a service-role bypass for normal CRUD.
3. Add Next.js Supabase SSR session clients and protected admin routes. Keep publishable credentials in documented environment variables; never put secrets in client code. Add a real login/logout flow and safe account setup instructions.
4. Replace browser-only catalog persistence with server reads and awaited mutations. Preserve the existing storefront and admin features. Validate inputs on the server; return actionable conflict, authorization and temporary-failure feedback. Keep browser demo mode explicitly isolated for existing fixture tests.
5. Use a private media bucket with validated/normalised uploads and reachability-checked media delivery. Stock adjustments are locked, nonnegative, audited and retry-safe. Promotions are non-overlapping and priced consistently. Site publication copies a validated draft into an immutable revision.
6. Verify SQL security/domain rules, anonymous isolation, admin denial/approval, persistence across independent browser contexts, current/public pricing, private media, and draft/publication separation. Run appropriate unit/browser tests, lint/types/build and Supabase advisors. Obtain an independent final review.

## Access status

Resolved: the project-scoped Supabase MCP server is authenticated for kuynrtpkelvcmsojyvol. Its empty application schemas and migration history were inspected before changes. Seven local migrations were applied to that exact project. The verified Auth administrator is danish@datawiz.com.my. Earlier permission failures from unrelated connector accounts were not bypassed by using another project.

## Decisions carried from the approved plan

MYR integer-sen pricing; Malaysia/Australia context; one administrator and one stock location. Fresh sample variants start at zero stock until an explicit receipt. Published slugs remain stable. Exact counts, draft content and adjustment history are private. The UI stays local even though its data persists in the requested Supabase project.

# Local frontend implementation

30 October 2026. Implements the approved catalog/design brief with the user's latest frontend-only boundary.

1. Establish a typed mock catalog and browser-local state. Test variant-correlated filters, price rounding, promotion rules, nonnegative stock, and draft/public site state before implementation.
2. Build the responsive storefront: home, products, categories, collections, Promotions, product detail, search and useful empty/not-found states.
3. Build a usable local admin workspace: dashboard, product creation/editing, categories/collections, descriptive attributes, inventory, promotions and preset homepage/navigation editing. Persist browser-local changes and provide a reset operation.
4. Verify unit behavior, end-to-end browsing/admin workflows, mobile layout, accessibility basics, type checking, lint and production build. Run one desktop/mobile visual inspection batch and one correction batch, then independent review.

No Supabase client, API handlers, credentials, backend calls, deployment or GitHub remote. The project is a new isolated folder rather than an existing repository/worktree. Git-based execution helpers do not apply; progress is recorded in docs/PROGRESS.md. No Git repository is initialized.

Public catalog behavior remains coherent: one product, variant-specific stock and regular prices, product-wide promotions, configurable descriptive attributes, and a separately published site-layout draft. Real authentication/authorization, stock transactions, scheduling guarantees across clients, media hosting and production durability await backend implementation.

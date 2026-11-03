# Frontend finish review

30 October 2026. Independent review of the local Common Form frontend against PRODUCT.md, docs/SURFACES.md, docs/FRONTEND-PLAN.md, README.md, DESIGN.md, and the Impeccable craft floor. This evaluates the user-pinned code-led cream/forest/system-sans direction; no approved visual comp or quality-bar image exists.

## 1. Disposition

**FIX** — one bounded catalog navigation defect should be corrected before handoff. The visual result does not require rebuilding or recapturing. No implementation files were edited by this reviewer.

## 2. Direction fidelity

The storefront follows the supplied contract: compact announcement and wordmark navigation, approximately 46/54 cream-copy/blue-coat hero split, large restrained system-sans headline, forest collection action, borderless garment photography, fine rules, and stacked mobile composition. Product listings and detail pages carry the same visual system without implying a working purchasing flow.

The admin follows its Operate contract: persistent desktop sidebar, local-preview bar, readable records, labelled editors, direct task actions, and a mobile navigation toggle. The local demo boundary is explicit. There is no basis for replacing the approved palette, system typography, photography treatment, or composition with a different aesthetic.

## 3. Craft and accessibility evidence

Opened and visually inspected every required full-page capture in .impeccable/review/: desktop.png, mobile.png, catalog-desktop.png, catalog-mobile.png, product-desktop.png, product-mobile.png, admin-desktop.png, admin-mobile.png, editor-mobile.png, homepage-editor-mobile.png, and products-admin-desktop.png. All show settled content and loaded photography, with no material clipping or broken layout. The product editor's long mobile form remains grouped and readable; homepage controls reflow cleanly. The mobile category strip intentionally scrolls within its own region.

Read browser-report.json: all eleven image captures report loaded images and no page overflow; the additional home/catalog/homepage-editor/product-editor checks at 320, 375, 768, and 1280 pixels also report no page overflow. Its errors and failures arrays are empty.

Source inspection confirms semantic labels and fieldsets, named icon buttons, visible focus, skip links, native modal dialogs with Escape handling, status/error announcements for editor feedback, pressed-state variant controls, reduced-motion handling, palette-based selection and caret, and tabular table numerals. The main ink/muted/forest palette provides strong visible contrast on the supplied surfaces. The pinned system-sans choice overrides the craft floor's general preference for a custom display face.

Parent-provided verification evidence: 16 domain tests, six browser journeys, lint, and production build passed; the UI detector returned no findings and the asset scan reported nine rasters with no missing provenance. The browser journeys cover browsing and exact variants, admin creation/attributes/promotions, inventory validation, draft/preview/publish/reset, mobile dialogs/filters, image upload/collection/navigation, and invalid-storage recovery.

## 4. Material findings

**[P2] Preserve the matching variant through the product title link.** src/components/catalog-ui.tsx:48 links to the bare product URL, while the photo link at line 27 includes the matching variant ID. Starting at /categories/shirts?color=Navy&size=M, the card represents the M variant, but its title opens the default S variant. This makes two links on the same filtered result disagree and can change the shown price or availability for other catalog data. Define one detail destination containing the matching variant ID and use it for both links. Extend the existing browse journey to assert the selected M variant after title navigation as well as photo navigation.

No other material findings. No optional taste changes requested.

## 5. Verification limits

This is a scoped frontend prototype review, not production-commerce certification. Shipping, checkout, customer accounts, authentication, orders, backend security, database durability, deployment, and real inventory transactions are explicitly deferred. The reviewer inspected supplied screenshots and source; it did not run a new browser session, assistive-technology audit, or independent performance benchmark. Reported test/build results come from the parent agent's execution evidence. Final disposition awaits the focused link correction and its verification; that href-only fix does not require another screenshot batch.

## Bounded final verdict

**SHIP for the agreed local frontend prototype. Finding status: RESOLVED.**

Independently inspected the focused correction: src/components/catalog-ui.tsx:24 now constructs one detailHref containing the first matching variant ID, and both the photograph link at line 27 and title link at line 46 use it. This directly removes the inconsistent destination identified above.

Inspected tests/e2e/store.spec.ts:11-29: the existing browse journey now opens the title from the Navy/M-filtered catalog, asserts Size M is selected and the expected price remains visible, then returns to that filtered catalog and asserts Size M after photograph navigation. The parent supplied the red reproduction (expected true, received false for Size M) and passing post-correction focused command: node node_modules/@playwright/test/cli.js test --grep 'browse, filter', 1/1 passed in 6.5 seconds.

The sole material finding is resolved. This pass was limited to its code and regression coverage; no new defect hunt or captures were required. The initial visual assessment and verification limits remain applicable. SHIP here authorizes handoff of the local prototype only, with no deployment or backend implication.

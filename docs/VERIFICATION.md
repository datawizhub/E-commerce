# Frontend verification · 30 October 2026

## Latest visual restyle · 2 November 2026

Nomu-inspired Inter/cream/navy/coral styling is now applied. The official public brand kit and live 1440/390px reference were inspected; actual Inter is self-hosted from its official Google Fonts distribution with the OFL licence. Source and adaptation decisions are in `docs/NOMU-RESTYLE.md`.

All six existing browser journeys were verified: five passed in the full run; the longer collection/upload/navigation journey reached its 30-second test timeout during concurrent cold build/capture work, then passed unchanged in its focused rerun (8.7 seconds). Lint and the production build passed with the new font and styling. The domain code and its existing tests were unchanged by this restyle.

The current eleven captures show Inter loaded, all visible images loaded, no document overflow, and no page/console errors or failed requests. Additional checks at 320/375/768/1280 also show no document overflow. First-pass image completion timing was corrected in the capture script by scrolling the rendered page before capture; no app image-loading behavior was changed.

Measured contrast: navy on coral 6.85:1; muted text on cream 5.90:1; the large darker-orange hero accent on cream 4.43:1. Small offer-note text uses navy. The detector ran once and surfaced design-system palette/type/radius advisories against the former DESIGN.md; the explicitly authorised replacement system is documented in the refreshed design files. Existing raster origin metadata scan: nine files, zero missing.

Fresh independent review returned **Ship**, with no material findings across both source reference captures and all eleven current app captures. See `docs/NOMU-REVIEW.md`. The earlier design evidence below is historical; the current capture files and design system supersede it.

Story: a visitor browses a shared local catalog, while a single demo admin changes product data and site content through browser-local state. The boundary is UI → pure catalog rules → validated localStorage → rendered storefront. API/database/checkout boundaries are intentionally absent.

## Automated evidence

- Vitest: **16 passed**. Current percentage/fixed pricing, sen rounding and exact end boundary; same-variant colour/size/price/stock correlation; attribute OR matching; promotion/category membership; unpublished visibility; immutable stock adjustments and invalid quantities; overlapping/oversized offers; disabling archived-product offers; independent draft publication.
- Playwright `store.spec.ts`: **4 passed**. Search/filter/detail pricing; new admin attribute and published product persisted over reload; the same discounted product in category and promotional listings; invalid then valid stock adjustment; saved draft vs preview vs publish; reset; mobile menu/filters and Escape dismissal.
- Playwright `admin-extra.spec.ts`: **2 passed**. Curated collection membership; real local photo upload persisted over reload; navigation draft/publication; invalid saved-schema fallback and reset.
- TypeScript, ESLint and production build passed. Next builds all defined storefront/admin routes.
- Independent finish review: initial five-section review found one filtered-variant title-link inconsistency. The regression test reproduced M becoming S, then passed after both card links shared one destination. The reviewer scored the finding **resolved** and returned **SHIP for the agreed local frontend prototype** in its bounded verdict. Final production build and lint passed again after the correction. See `docs/FINISH-REVIEW.md` for review scope.

## Rendered evidence

Eleven full-page captures in `.impeccable/review/` cover homepage, catalog, product detail, admin overview, product editor, homepage editor and product list at 1440px or 390px. The viewport height is 1000px desktop and 844px mobile. Reduced-motion capture, settled hydration and local image preloading prevent misleading intermediate states.

`browser-report.json` records zero page/console errors, failed requests, image failures or horizontal document overflow in these captures. Additional DOM checks cover home, catalog, homepage editor and product editor at 320px, 375px, 768px and 1280px. Tables use contained horizontal scrolling.

Design detector: one run, no findings. Photography origin metadata: scan of nine files, zero missing.

## Scope of confidence

Tested in Microsoft Edge through Playwright on this Windows machine. Keyboard focus styles, semantic controls, native dialogs, Escape dismissal and reduced-motion handling are implemented; this is not a full assistive-technology certification or cross-browser audit. Browser-local persistence is the intended prototype behavior. Backend transactions, authorization, payments, shipping, deployment and production durability remain outside this phase.

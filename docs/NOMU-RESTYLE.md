# Nomu reference adaptation · 2 November 2026

Source: https://nomu.store/ and its published https://nomu.store/brand. Live screenshots and computed typography were inspected at 1440px and 390px; reference evidence is in `.impeccable/reference/nomu/`.

The user explicitly requested Nomu typography and colours adapted to the existing ecommerce frontend. This supersedes the provisional cream/forest/system-sans style. Catalog behavior, browser-local admin, shipping/checkout deferral, and local-only scope continue.

## Direction contract

THESIS: Bring Nomu’s warm, confident visual language to clothing discovery, keeping the garments and practical product information central.

OWN-WORLD: Inter 400/500/600/700, cream #FFF9F6, navy #0F151D, coral #FF7448 and hover #FF8D69, pale coral #FFC8B7, supporting blue #D3E1FF. Floating white pill navigation, large medium-weight typography, rounded photographic regions, and one purposeful navy editorial panel. Use dark text on coral controls for readable contrast. Orange headline emphasis uses a darker companion tone on cream.

STORY: Discover the collection, filter real variants, inspect garments, and recognise offers immediately. Admin retains task-focused forms and tables with the same palette and type.

FIRST VIEWPORT: A compact announcement, inset white rounded navigation, oversized two-line clothing headline at left and rounded blue-coat photography at right. Coral action anchors the cream copy. Smaller screens stack centred copy and photography, keeping the collection action visible before imagery.

FORM: User-pinned reference, adapted within the existing storefront composition; no new identity selection or generated comp. Inter is the reference’s readable heading/body face. Common Form remains its own demonstration wordmark; Nomu’s custom NomNom logo face, brand marks, business claims and manufacturing content are not part of this store.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Plan and validation

1. Inspect live reference and published brand tokens; source Inter from the official Google Fonts distribution with its OFL licence.
2. Apply shared typography/palette, floating navigation, rounded commerce imagery, headline emphasis, buttons and coherent admin states. Retain existing interactions and editable content.
3. Run existing domain/browser regression suites, lint and production build. Inspect desktop/mobile captures together, fix material issues in one batch, and confirm once if necessary.
4. Run the UI detector once, obtain fresh independent review, and refresh DESIGN.md plus its token sidecar from the finished CSS.

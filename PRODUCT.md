# Clothing store

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

User-selected Next.js and React with the Supabase/PostgreSQL backend connected to E-commerce_store (kuynrtpkelvcmsojyvol). Vercel deployment remains deferred.

## Users and purpose

Visitors browse ready-stock clothing. A single administrator manages the catalog, descriptive attributes, variant stock, simple promotions, categories/collections, and preset homepage sections. Malaysia and Australia are intended markets. Shipping, checkout, orders and customer accounts remain deferred.

## Current implementation boundary

The website runs locally under C:\Users\danis\clothing-store and persists catalog, stock, promotions, media and site content in the selected Supabase project. Administration requires the approved Supabase Auth identity. No GitHub upload or Vercel deployment. Shipping, checkout, payments, orders and customer accounts remain deferred. Explicit development-only demo mode supports isolated fixture tests; it never replaces failed connected reads. See docs/BACKEND-HANDOFF.md for the current operating contract.

## Product principles

- One product identity appears across categories, collections and promotions.
- Actual size/color variants determine prices and availability.
- Descriptive attributes are configurable and separate from variants.
- Homepage preset content can be drafted, previewed and published through the local app with shared database persistence.
- Keep visual decisions centralized so a later reference site can inform a restyle.

## Evidence and open decisions

The owner approved the existing PRD/TRD and initially used a cream/forest provisional direction. On 2 November 2026 the owner supplied https://nomu.store/ and requested its typography and colours adapted to the store: Inter, cream/navy/coral, rounded panels and clear product browsing. This replaces the provisional visual system. See docs/NOMU-RESTYLE.md for reference evidence and the current surface contract. COMMON FORM is a temporary demonstration brand. Development demo content is fictional and was not imported as real stock; connected catalog content is maintained by the administrator. Initial MYR pricing is a planning default, not finalized Australian currency behavior.

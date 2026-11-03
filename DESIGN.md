---
name: "Common Form"
description: "Inter, warm cream, navy and coral for clothing discovery and a compact local workspace."
colors:
  paper: "#fff9f6"
  surface: "#fff"
  ink: "#0f151d"
  muted: "#5c626a"
  primary: "#ff7448"
  highlight: "#ffc8b7"
  secondary: "#d3e1ff"
  dark-surface: "#1b232e"
  accent-ink: "#c84d28"
  primary-hover: "#ff8d69"
  line: "#e2dcd8"
  soft: "#fff0e9"
  error: "#b42318"
  focus: "#1d4ed8"
typography:
  display:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "clamp(54px, 5.9vw, 90px)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "clamp(42px, 4.5vw, 64px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  section:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "clamp(30px, 3.1vw, 44px)"
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.035em"
  body:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.55
  button:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: 1.55
  navigation:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  badge:
    fontFamily: "var(--font-inter), Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.55
rounded:
  control: "12px"
  field-admin: "10px"
  workspace: "16px"
  panel: "50px"
  image: "24px"
  dialog: "24px"
  pill: "999px"
  thumbnail: "8px"
spacing:
  base: "8px"
  compact: "12px"
  standard: "16px"
  group: "20px"
  section: "24px"
  generous: "32px"
  wide: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: "13px 24px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "13px 24px"
  button-secondary-hover:
    backgroundColor: "{colors.secondary}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "13px 24px"
  button-danger-hover:
    backgroundColor: "#8c2017"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "100%"
  field-admin:
    rounded: "{rounded.field-admin}"
  navigation-store:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.navigation}"
    rounded: "{rounded.pill}"
    padding: "0 25px 0 30px"
    height: "76px"
  navigation-admin-current:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "11px 13px"
  badge:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.muted}"
    typography: "{typography.badge}"
    rounded: "{rounded.pill}"
    padding: "4px 9px"
  form-section:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.workspace}"
    padding: "26px"
  product-photo:
    backgroundColor: "{colors.soft}"
    rounded: "{rounded.image}"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.dialog}"
    padding: "30px"
---

# Design System: Common Form

## Overview

**Creative North Star: "Everyday, considered."**

Warm cream, navy type and coral actions frame calm clothing photography. The owner-approved Nomu reference supplies readable Inter typography, floating pill navigation and generous photographic corners; Common Form keeps its own demonstration wordmark and clothing content.

Storefront browsing is spacious; administration stays compact and task-focused. Shared type and palette connect these densities. The approved reference adaptation replaces the former provisional palette, system typography and square photographs.

**Key Characteristics:**

- Self-hosted Inter with medium-weight, tightly spaced headings.
- Cream and white grounds, navy text, coral actions and pale blue support.
- Rounded photographic panels and pill actions; compact labelled admin tools.

## Colors

### Primary

Coral anchors primary actions and sale labels. Pale coral supports the admin introduction and hover surfaces. Dark accent ink carries readable orange headline emphasis; hover coral is a control state.

### Secondary

Pale blue supports search, preview information and admin status badges.

### Neutral

Warm cream is the page ground; white lifts navigation, fields and workspace panels. Navy carries text, the editorial panel and footer. Muted slate and warm fine rules organise supporting information. Soft cream supplies quiet fills; dark surface is the navy hover companion. Error red and focus blue retain semantic roles.

**The Readable Coral Rule.** Use navy text on coral controls; use the darker accent ink for headline emphasis on cream.

## Typography

Inter is self-hosted through `next/font/local`, exposed as `--font-inter` and consumed by `--font`; Arial/Helvetica/sans-serif are fallbacks. The variable font comes from the official Google Fonts distribution, with `OFL.txt` beside the binary in `src/app/fonts/`. It uses `display: swap` and a declared weight range of 100–900. Normal content uses 400/500/600/700, with a 650 wordmark.

Frontmatter records desktop roles: hero display, listing headline, section heading and admin title. Body uses (15px, 1.55), with paragraphs capped at (70ch). Headings are medium weight and tightly spaced; the hero caps at (90px). Generic h1/h2 remain (48px)/(32px) where contextual rules do not override them. Product names use (14px), prices (13px), field labels (14px) and compact metadata (11–12px).

At (950px), the hero uses `clamp(56px, 7.8vw, 76px)`; at (700px), `clamp(38px, 11.8vw, 58px)` and (1.05) line height. Admin headings step from (36px) to (32px) at (850px), then (31px) at (700px). Keep the hero scale out of editors.

## Layout

Storefront gutters are generally (4.2%), increasing to (6%) on mobile. The desktop hero is a (52%/48%) split; at (950px) it stacks centred copy above imagery, keeping its action before the photograph. The product grid uses four columns, catalog listings three; both become two at (850px). Mobile collections and product detail become one column at (700px). Category pills scroll horizontally on mobile.

Admin has a (235px) fixed sidebar and (70px) topbar; the sidebar narrows at (1150px)/(850px) and becomes toggled at (700px). Working content caps at (1600px). Editors collapse at (1150px); tables scroll inside their wrapper. Shared spacing starts at an (8px) base with contextual gaps and generous storefront section padding.

## Elevation & Depth

Depth comes mainly from tonal grounds and photography. Floating navigation uses `0 8px 24px #0f151d12`; dialogs use `0 16px 64px #0003`, and the mobile admin sidebar uses `12px 20px 30px #0001`. Product cards and ordinary workspace panels remain flat. Dialog backdrops are translucent navy with (3px) blur.

The image reveal lasts (1.1s); product hover scales imagery to (1.035) over (0.65s). Shared easing is recorded in the sidecar. Reduced-motion preference disables animation/transitions and smooth scrolling.

## Shapes

Large photographic and editorial panels use the panel radius, reduced to (24px) at (700px). Product, collection and detail photographs use the image radius, reduced to (18px) on mobile. Buttons, badges, variant choices and navigation use pills; icon actions are circles. The footer has rounded upper corners (50px desktop, 28px mobile).

Admin fields within form sections use (10px) corners; other shared fields use the control radius. Workspace panels use (16px), reducing to (14px) on mobile. Dialogs remain (24px); table thumbnails use (8px). The admin introduction is a separate (28px)/(22px mobile) panel.

**The Contextual Corner Rule.** Use large corners for photography, pills for actions, and compact corners for working forms.

## Components

- **Buttons:** coral/navy primary pills; transparent, fine-bordered secondary pills turn pale blue on hover; danger pills retain white text and darken red. Default minimum height is (48px), hero action (54px). Admin heading actions retain compact padding (10px 15px), and become (42px) high with (9px 12px) padding on mobile. Disabled controls use (0.4) opacity.
- **Fields:** white, fine-bordered, minimum (43px) high; labels above. Read-only fields use soft cream. Form-section fields retain the compact admin radius. Textareas resize vertically. Controls retain the (2px) blue focus outline with (4px) offset.
- **Navigation:** inset white pill (76px desktop height), navy links with active underline and a coral promotion pill. Mobile height steps through (68px) to (64px) and opens menu/search dialogs. Admin rows use pale coral hover and coral/navy current state.
- **Cards:** unboxed garment photography with actual prices and muted variant metadata. Photographs gently enlarge on hover; a circular arrow appears on hover/keyboard focus and is hidden on mobile. Workspace panels are white with fine borders; form padding is (26px), mobile (22px 18px).
- **Chips and variants:** offer labels and size/colour choices are pills. Selected variants use navy/cream; unavailable choices retain strike-through. Admin neutral badges use soft cream; the legacy `green` status class now renders pale blue with dark blue text. Success feedback retains its light green semantic fill; it is not a brand accent.
- **Dialogs:** native, labelled, closable and scrollable; maximum width (650px), viewport gutters (32px), maximum height (88dvh; 90dvh mobile). They support search, menu, filters and editors within the local prototype.

## Do's and Don'ts

### Do:

- **Do** use the approved Inter, cream, navy and coral system on both surfaces.
- **Do** keep garment photography prominent and product cards unboxed.
- **Do** retain compact admin forms, actual variant prices and visible local-preview wording.
- **Do** preserve keyboard focus, reduced motion and contained mobile table scrolling.

### Don't:

- **Don't** reintroduce the superseded forest palette, system-only type or square photographic treatment.
- **Don't** apply photographic panel corners to every admin field or table.
- **Don't** copy Nomu logos, its custom NomNom face, or its business and manufacturing claims.
- **Don't** imply checkout, authentication, backend connectivity or production administration.


# NeuroFelicitology design foundation (v1.0)

Phase 01 of the redesign. Sage + warm ivory + forest green, Literata + Inter, light mode only.
Source of truth: `src/styles/nff-tokens.css`. Components never use hex values or primitive tokens directly.

## Token architecture

| Layer | Where | Example | Who uses it |
|---|---|---|---|
| 1. Primitives | `:root` | `--nff-forest-800`, `--nff-sage-100`, `--nff-clay-500`, `--nff-neutral-700` | Semantic layer only |
| 1b. Ramps | `:root` | `--nff-brand-50…950` (aliases forest/sage), `--nff-accent-*` (aliases clay) | Semantic layer only |
| 2. Semantic | `:root` | `--nff-color-bg-canvas`, `--nff-color-text-secondary`, `--nff-color-border-focus` | Components (via Tailwind `bg-nff-*`, `text-nff-*`) |
| 3. Surface scopes | `[data-surface="public|practitioner|cms"]` | re-points canvas, sunken, hover, borders, CMS headings | Set once on each layout root |
| 4. Component | `:root, [data-surface]` | `--nff-button-primary-bg-hover`, `--nff-input-border-error`, `--nff-focus-ring` | `src/components/ui/*` |
| 5. shadcn aliases | `:root, [data-surface]` | `--primary`, `--secondary`, `--border`, `--ring` | shadcn classes (`bg-primary`, `border-input`) |
| 6. Tailwind `@theme inline` | bottom of file | `--color-nff-bg-tonal` → `bg-nff-bg-tonal` | Utility classes |

Layers 4–5 are declared on `:root` **and** every `[data-surface]`. Custom properties resolve where they're declared, so this makes the aliases pick up each surface's values.

**Light mode is the only active theme.**
- `NffThemeProvider` forces `light`.
- The `.dark` block is dormant.
- `globals.css` binds Tailwind's `dark:` variant to the `.dark` class, so the operating system's dark-mode setting can't turn on the dormant shadcn `dark:` utilities.

## Colour

### Primitives

| Token | Hex | Notes |
|---|---|---|
| `forest-950` | `#1F2A20` | Deepest; reserved |
| `forest-900` | `#344536` | CTA active, inverse background, link hover |
| `forest-800` | `#455641` | **Primary CTA**, brand text, links |
| `forest-700` | `#53674E` | CTA hover, focus ring, brand icons |
| `sage-600` | `#66765B` | Icons and graphics only (4.47:1 on ivory, under the 4.5:1 AA minimum for body text) |
| `sage-500` | `#829078` | Illustration, charts, decorative |
| `sage-400` / `300` / `200` | `#9EAA94` / `#BCC5B2` / `#D7DDCE` | Tonal fills, secondary-button hover and pressed |
| `sage-100` | `#EAEDE4` | Sage sections, selected state, secondary button |
| `sage-50` | `#F3F5EF` | Hover wash |
| `ivory-50` | `#F7F5EF` | Public canvas |
| `ivory-100` / `200` | `#EFECE3` / `#E5E1D5` | Public secondary and tertiary background |
| `clay-500` | `#B98268` | Accent **fill or decoration only** (2.98:1 on ivory) |
| `clay-600` / `700` | `#9E6A52` / `#84553F` | Accent icon / **accent text** (5.75:1) |
| `neutral-0` | `#FFFFFF` | Cards, CMS canvas |
| `neutral-25` | `#FAFAF7` | Practitioner canvas |
| `neutral-50` | `#F4F5F1` | CMS secondary surfaces |
| `neutral-100` | `#EDEEE8` | Muted, disabled |
| `neutral-200` | `#E6E7E1` | Default border |
| `neutral-300` | `#D2D4CC` | Strong border |
| `neutral-400` | `#A9ABA3` | Disabled text (exempt from contrast) |
| `neutral-500` | `#85877F` | Input border (≥3:1) |
| `neutral-600` | `#62655D` | Tertiary text, placeholder |
| `neutral-700` | `#555950` | Secondary text |
| `neutral-900` | `#252820` | Primary text |

Status ramps (success, warning, error, info) are unchanged from v0.1.

### Semantic tokens

| Group | Token | Value | Usage |
|---|---|---|---|
| Brand | `bg-brand-default` / `-hover` / `-pressed` | forest-800 / 700 / 900 | Primary CTA rest / hover / active |
| | `bg-brand-subtle` / `-hover` | sage-100 / sage-200 | Tinted brand chips and highlights |
| | `bg-secondary-default` / `-hover` / `-pressed` | sage-100 / 200 / 300 | Secondary button |
| | `bg-accent-default` / `-subtle` | clay-500 / clay-50 | Restrained accent fills |
| Backgrounds | `bg-public` | ivory-50 | Public site canvas |
| | `bg-practitioner` | neutral-25 | Learning workspace canvas |
| | `bg-cms` | white | CMS workspace canvas |
| | `bg-tonal` / `-strong` | sage-100 / sage-200 | Sage-toned sections |
| | `bg-inverse` | forest-900 | Footer bands, inverse callouts |
| Surfaces | `bg-surface` / `-raised` | white | Cards, popovers |
| | `bg-surface-sunken`, `bg-surface-secondary` | ivory-100 (public), neutral-50 (practitioner, CMS) | Wells, table headers, sidebars |
| | `bg-selected` | sage-100 | Selected rows and nav items |
| | `bg-disabled` | neutral-100 | Disabled controls |
| States | `bg-hover` / `bg-pressed` | sage-50 / sage-100 (CMS: neutral-50 / 100) | Ghost and row interactions |
| Text | `text-primary` / `secondary` / `tertiary` | neutral-900 / 700 / 600 | Body hierarchy |
| | `text-placeholder` | neutral-600 | Input placeholders |
| | `text-disabled` | neutral-400 | Disabled labels |
| | `text-inverse` | ivory-50 | On forest-900 |
| | `text-brand`, `text-link-default` / `-hover` | forest-800 / forest-900 | Brand words, links |
| | `text-accent` | clay-700 | Overlines, accent words |
| Borders | `border-subtle` / `default` / `strong` | neutral-100 / 200 / 300 | Separators (decorative) |
| | `border-input` / `-hover` | neutral-500 / neutral-700 | Form controls (≥3:1) |
| | `border-focus` | forest-700 | Focus indicator |
| | `border-error` | error-600 | Invalid fields |
| Feedback | `*-success`, `*-warning`, `*-error`, `*-info` | existing status ramps (700 for text, 600 for fills and icons, 50 for backgrounds) | Status messages, chips, toasts |

### Component tokens

- **Buttons:**
  - `--nff-button-primary-bg`, `-hover`, `-active`, `-fg`
  - `--nff-button-secondary-*`
  - `--nff-button-outline-border`, `-bg`
  - `--nff-button-tertiary-fg`
  - `--nff-button-ghost-bg-hover`, `-active`
  - `--nff-button-destructive-*`
  - `--nff-button-disabled-opacity`
- **Forms:**
  - `--nff-input-bg`, `-border`, `-border-hover`, `-border-focus`, `-border-error`, `-placeholder`, `-bg-disabled`
- **Other:**
  - `--nff-card-*`, `--nff-nav-*`, `--nff-table-*`, `--nff-chip-*`
  - `--nff-focus-ring`: a 2 px surface-coloured offset plus a 2 px forest ring

### Surfaces

| Surface | Set on | Canvas | Secondary | Borders | Headings |
|---|---|---|---|---|---|
| Public | `PublicLayout`, `AuthLayout` | Ivory `#F7F5EF` | Ivory-100, sage-100 sections, white cards | `#E6E7E1` | Literata |
| Practitioner | `PractitionerLayout` | `#FAFAF7` | `#F4F5F1`, white cards | `#E6E7E1` | Literata |
| CMS | `CmsLayout` | `#FFFFFF` | `#F4F5F1` | `#E6E7E1` | Inter 600, compact sizes, minimal shadows |
| Inverse | Any dark feature band (first used by the public footer) | Forest-900 `#344536` | — | Ivory at 14% / 28% | Literata, ivory |

**Inverse** is a scope you nest inside another surface, not a layout surface. Set `data-surface="inverse"` on the band and use the ordinary semantic classes (`text-foreground`, `text-nff-text-secondary`, `bg-primary`), which re-point automatically:

- Primary text is ivory (9.39:1).
- Secondary and tertiary text are sage-300 `#BCC5B2` (5.74:1).
- Accent text is clay-200 `#E3C3B2` (6.2:1).
- The focus ring is sage-100.
- The primary button flips to ivory with forest-900 text.

Don't hand-pick colours inside dark bands.

## Contrast (WCAG 2.2 AA)

| Pair | Ratio | Requirement |
|---|---|---|
| White on primary CTA `#455641` | 7.89 | ≥4.5 ✓ |
| White on CTA hover `#53674E` | 6.14 | ✓ |
| White on CTA active `#344536` | 10.24 | ✓ |
| Primary text on ivory | 13.73 | ✓ |
| Secondary text on ivory / sage-100 | 6.57 / 6.05 | ✓ |
| Tertiary text on ivory / white / sage-100 / CMS grey | 5.44 / 5.93 / 5.01 / ≥5.0 | ✓ |
| Link on ivory / sage-100 | 7.24 / 6.67 | ✓ |
| Accent text clay-700 on ivory | 5.75 | ✓ |
| Ivory on inverse forest-900 | 9.39 | ✓ |
| Input border on white / ivory | 3.64 / 3.34 | ≥3 ✓ (1.4.11) |
| Focus ring on white / ivory | 6.14 / 5.64 | ≥3 ✓ (1.4.11) |
| Status text (700 stops) on white | 7.75–8.68 | ✓ |
| clay-500 on ivory | 2.98 | **Decoration and fills only** |
| sage-600 on ivory | 4.47 | Icons and large text only |
| sage-500 on ivory | 3.10 | Graphics only |

The previous shadcn focus ring (forest at 50% opacity) measured 2.1:1. Every `src/components/ui` primitive now uses a solid 2 px `ring-ring`.

## Typography

Literata (variable optical size 7–72, weights 300–700, with italic) is for editorial content. Inter is for interface text. JetBrains Mono is for CMS code and IDs. All three load in `index.html`.

| Style | Class | Font | Desktop ≥1280 | Tablet 768–1279 | Mobile <768 | Weight | Tracking | Usage |
|---|---|---|---|---|---|---|---|---|
| Display XL | `nff-display-xl` | Literata | 72/76 | 60/66 | 44/50 | 400 | −0.025em | Landing hero only |
| Display LG | `nff-display` | Literata | 60/66 | 52/60 | 40/46 | 400 | −0.02em | Section heroes |
| H1 | `nff-heading-h1` | Literata | 52/60 | 44/52 | 36/42 | 400 | −0.02em | Page titles |
| H2 | `nff-heading-h2` | Literata | 40/48 | 34/42 | 30/36 | 400 | −0.015em | Section headings |
| H3 | `nff-heading-h3` | Literata | 32/40 | 28/36 | 24/32 | 500 | −0.01em | Sub-sections |
| H4 | `nff-heading-h4` | Literata | 24/32 | 22/30 | 20/28 | 500 | −0.005em | Card and feature titles |
| Reading lead | `nff-reading-lead` | Literata | 20/32 | 19/30 | 18/30 | 400 | 0 | Editorial intros |
| Reading body | `nff-reading-body` | Literata | 18/30 | 18/30 | 17/28 | 400 | 0 | Exploration reader |
| Body large | `nff-body-lg` | Inter | 18/30 | 18/28 | 17/28 | 400 | −0.005em | Intros in the interface |
| Body | `nff-body-md` | Inter | 16/26 | 16/26 | 16/26 | 400 | 0 | Default |
| Body small | `nff-body-sm` | Inter | 14/22 | 14/22 | 14/22 | 400 | 0 | Metadata, helper text |
| Navigation | `nff-nav` | Inter | 15/20 | 15/20 | 15/20 | 500 | 0 | Primary navigation |
| Button | `nff-button` (built into `Button`) | Inter | 15/20 | 15/20 | 15/20 | 500 | 0 | All buttons |
| Label | `nff-label` | Inter | 13/18 | 13/18 | 13/18 | 500 | 0.005em | Form labels |
| Label MD / SM | `nff-label-md` / `-sm` | Inter | 14/20 · 12/16 | same | same | 500 | 0 · 0.01em | Menus · chips and badges |
| Caption | `nff-caption` | Inter | 12/16 | 12/16 | 12/16 | 400 | 0.01em | Timestamps, captions |
| Overline | `nff-overline` | Inter | 12/16 | 12/16 | 12/16 | 600 | 0.12em, upper-case | Eyebrows |
| Table body / header | `nff-data-table` / `-header` | Inter | 14/20 · 12/16 | same | same | 400 · 600 | 0 · 0.04em, upper-case | CMS tables (tabular figures) |

**CMS override** (`[data-surface="cms"]`, all breakpoints): H1 28/36, H2 24/32, H3 20/28, H4 18/26. All four are Inter 600.

## Rules for Phase 02 onward

1. Use semantic or component tokens through Tailwind (`bg-nff-bg-tonal`, `text-nff-text-secondary`, `bg-primary`). Never use hex values or primitives.
2. Use one primary (forest) CTA per view. Secondary actions use `variant="secondary"` (sage) or `outline`.
3. Clay is an accent: overlines, a single highlighted word, illustration. It's never a button or body text.
4. Put sage-toned sections on `bg-nff-bg-tonal`, white cards on `bg-card`, and the inverse band on `bg-nff-bg-inverse` with `text-nff-text-inverse`.
5. Keep the CMS on white and grey. Don't add gradients, ivory or decorative backgrounds.

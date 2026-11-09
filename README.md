# NFF — NeuroFelicitology web front end

Front-end-only prototype of the NFF platform: public web, registered-practitioner workspace, and the CMS & admin portal. There is no backend in this phase. Every screen reads typed mock data through `src/services`, so a real API can replace the mocks without changing UI code.

## Source of truth

- `docs/screens.md` — every screen ID, its sections and states.
- `src/styles/nff-tokens.css` — design tokens generated from Figma. Do not edit values by hand.
- Open questions are implemented as defaults in `src/config/flags.ts`.

## Stack

Vite + React 18 + TypeScript (strict) · Tailwind CSS v4 + shadcn/ui · React Router v6 (data router) · TanStack Query · React Hook Form + Zod · lucide-react · Recharts (shadcn Chart) · sonner · hls.js · Vitest + Testing Library · Playwright.

## Getting started

```bash
npm install
npm run dev
```

Quality gate:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Smoke tests (needs `npx playwright install chromium` once):

```bash
npm run e2e
```

## Demo controls

A dev-only panel sits bottom-left (hidden in production):

- **Scenario** — `default`, `empty`, `error`, `slow`, `no-featured`, `locked-stage`, `token-expired`, `transcode-failed`. Switching invalidates queries so the screen refetches.
- **Role** — Visitor, Practitioner, Editor, Campaign, Admin. Switching reloads into the matching workspace.

Mock accounts (password `practice123`):

| Role | Email |
| --- | --- |
| Practitioner | `practitioner@nff.demo` |
| Editor | `editor@nff.demo` |
| Campaign | `campaign@nff.demo` |
| Admin | `admin@nff.demo` |

The verification code is `123456`. Consent is stored in localStorage; clear `nff.consent` to see the cookie banner again.

## Structure

```
src/
  app/            router, providers, layouts (Public, Practitioner, Auth, CMS)
  pages/          one folder per portal: public/, auth/, practitioner/, cms/, system/
  components/ui/  shadcn primitives (generated; minimal edits)
  components/nff/ NFF composite components
  features/       feature logic + hooks (auth, theme, …)
  mocks/          seed data, fake API with latency, scenario switch
  services/       typed API functions the UI calls
  types/          domain types
  config/         brand constant and feature flags
  styles/         nff-tokens.css, globals.css
docs/screens.md
```

## Status

- Task 1 — foundation: tokens, shells, providers, mock layer, auth service, scenario/role controls, quality scripts.
- Task 2 — **S-WEB-01 Home** at `/` with loading, empty, error and no-featured states.
- Task 3 — **S-WEB-03 Explorations catalogue** at `/explorations` with category tabs, result count, card grid, load more, locked-stage markers, and loading, empty, error and no-results states.

Later screens are routed to a clearly labelled placeholder so navigation works while each screen is built.

# My Fab Estimator

Fabrication estimating app for stainless steel manufacturers.

A working local-first version: edit your costing matrix, build a stainless steel
table estimate, see the cost breakdown live as you type. No login, no cloud —
yet. Data lives in your browser's localStorage.

## Status

- ✅ Deterministic pricing engine for stainless steel tables (`src/pricing/`)
- ✅ 20 unit tests (margin/markup, VAT, rounding, missing-rate errors, etc.)
- ✅ Next.js 14 app with Dashboard, Costing Matrix, New Estimate, Estimates list
- ✅ Single-source costing data persisted to browser localStorage
- ⏳ Supabase auth + cloud storage (later)
- ⏳ AI enquiry/drawing upload (later — Phase 5)
- ⏳ PDF quote export (later — Phase 6)

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:3000

First run will seed your costing data with sensible defaults so you can try it
straight away. Edit anything in the **Costing Matrix** page — your changes
persist locally.

## Other commands

```bash
npm test          # 20 pricing-engine tests
npm run typecheck # tsc --noEmit
npm run demo      # print a sample estimate to the terminal
npm run build     # production build
```

## Project structure

```
src/
  app/                          Next.js app router pages
    layout.tsx                  Root shell (sidebar + main)
    page.tsx                    Dashboard
    costing-matrix/page.tsx     Edit rates
    estimates/new/page.tsx      Estimate builder + live result
    estimates/page.tsx          Saved estimates list
  components/                   Sidebar, Card, Button, Field, etc.
  lib/
    seed-company.ts             Default rates for first run
    use-company.ts              localStorage hook for costing data
    use-estimates.ts            localStorage hook for saved estimates
    format.ts                   Currency / number formatting
  pricing/                      Pure deterministic engine (the money)
    types.ts                    Inputs / outputs / company data shapes
    helpers.ts                  Geometry, lookups, rounding
    engine.ts                   calculateTableEstimate()
    __tests__/                  20 tests + sample fixtures
  demo.ts                       `npm run demo` worked example
```

## Core rule

> AI assists with interpretation and wording. The pricing engine calculates all prices.

Missing rates surface as visible errors. The engine never invents a fallback.

## What "later" looks like

Per the PRD roadmap (kept in this folder):

- **Phase 0/1 finishing:** Supabase auth, multi-tenant DB schema, RLS — replaces
  the localStorage hooks.
- **Phase 4:** more product templates (shelf, cupboard, sink unit, splashback).
- **Phase 5:** AI enquiry parser — paste a customer email or upload a drawing,
  get extracted spec data to confirm before pricing.
- **Phase 6:** quote PDF export with company branding.
- **Phase 7:** actual-vs-estimated job cost feedback loop.

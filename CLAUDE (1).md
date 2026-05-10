# CLAUDE.md — My Fab Estimator

Project-level instructions for Claude Code when working on **My Fab Estimator**.

This file combines:
- Project-specific rules for the My Fab Estimator build.
- Karpathy-inspired AI coding discipline: think first, keep changes small, avoid speculative abstractions, verify work, and manage context deliberately.
- Claude Code best practice: clear success criteria, compact context, safe tool use, and human review where risk exists.

---

## 1. Product summary

**My Fab Estimator** is a fabrication estimating SaaS app for stainless steel fabricators.

The app helps users:
- Enter company costing data.
- Maintain a live costing matrix.
- Create controlled estimates for stainless steel fabrication.
- Generate quote previews.
- Later use AI to read enquiries and populate estimate drafts.

Core product rule:

> AI assists with interpretation and wording. The pricing engine calculates all prices.

---

## 2. Non-negotiable pricing rule

Never let AI invent or guess costs.

Claude must not:
- Invent material prices.
- Invent labour rates.
- Invent process rates.
- Invent margins.
- Override company costing rules.
- Generate final sell prices from language alone.
- Treat uncertain customer data as confirmed.

Claude may:
- Parse enquiries.
- Suggest missing information.
- Draft quote wording.
- Suggest product templates.
- Explain assumptions.
- Create deterministic pricing code using stored company rates.

All price calculations must come from the pricing engine using stored company data.

---

## 3. Karpathy-inspired coding discipline

### Think before coding

Before implementing non-trivial work:
- Restate the goal in one or two lines.
- Identify assumptions.
- Identify files likely to be touched.
- Identify how the change will be verified.
- If the request is ambiguous, ask or make the smallest safe assumption and state it.

Do not silently guess business logic.

### Simplicity first

Prefer the minimum code that correctly solves the requested task.

Do not add:
- Unrequested features.
- Premature abstractions.
- Configurability that is not needed yet.
- Generic frameworks around one use case.
- Clever code where boring code is clearer.

If a solution can be 50 lines instead of 200, choose the 50-line version.

### Surgical changes

Touch only the files needed for the current task.

Do not:
- Refactor unrelated code.
- Reformat unrelated files.
- Rename unrelated variables.
- Delete pre-existing dead code unless asked.
- Change architecture unless the task requires it.

Clean up only unused imports, variables, or files created by your own change.

### Goal-driven execution

Convert every task into verifiable success criteria.

Examples:
- “Add validation” means add validation rules and tests for invalid inputs.
- “Fix a bug” means reproduce the bug, fix it, and verify the fix.
- “Build estimator” means produce calculation output and test deterministic examples.

Loop until the verification passes or clearly report what failed.

---

## 4. Context engineering rules

Context is a limited resource. Use it deliberately.

Before making changes:
- Read the PRD/roadmap if present.
- Read relevant files before editing.
- Prefer existing project patterns over new patterns.
- Keep summaries short.
- Do not load unrelated files unless needed.

When the task becomes large:
- Break it into small steps.
- Complete one verifiable step at a time.
- Keep a short running note of decisions.
- Avoid trying to rebuild the whole app in one session.

If context becomes messy:
- Summarise current state.
- List completed work.
- List remaining work.
- Continue from the smallest next step.

---

## 5. Technical stack

Default stack unless the repository says otherwise:

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres
- Zod validation
- React Hook Form
- OpenAI API for later AI features
- Server-side API routes or server actions for protected logic

Do not expose API keys in frontend code.

---

## 6. Core architecture

Expected high-level modules:

- Authentication
- Company onboarding
- Company/user access control
- Costing matrix
- Labour rates
- Material rates
- Process rates
- Costing rules
- Estimate builder
- Pricing engine
- Quote preview
- Estimate history
- Later: AI enquiry parser
- Later: PDF quote export
- Later: actual-vs-estimated job review

Keep pricing logic in a dedicated service/module.

Do not scatter pricing formulas across UI components.

---

## 7. Database principles

Every company-owned table must include `company_id`.

Company-owned data includes:
- labour rates
- material rates
- process rates
- costing rules
- quote settings
- estimates
- quote records
- actual job costs

Rules:
- Enforce company isolation.
- Add indexes on `company_id`.
- Use row-level security where Supabase is used.
- Never allow one company to read or update another company’s data.
- Store `created_at` and `updated_at`.
- Store `updated_by` where useful for costing data.

---

## 8. Pricing engine rules

The pricing engine must be deterministic.

Same inputs + same costing matrix = same output.

The pricing engine must:
- Accept structured input.
- Validate required fields.
- Use stored material rates.
- Use stored labour rates.
- Use stored process rates.
- Use stored overhead/margin rules.
- Return detailed cost breakdown.
- Return missing information.
- Return validation errors.
- Store or return a costing snapshot.

The pricing engine must not:
- Call AI.
- Read unstructured customer messages directly.
- Invent fallback costs.
- Hide missing rates.
- Return only a final price without breakdown.

---

## 9. Costing snapshot rule

Every estimate must store the exact costing data used at the time of calculation.

Use a `costing_snapshot` JSON object or linked snapshot record.

Snapshot should include:
- Material rates used.
- Labour rates used.
- Process rates used.
- Waste factors used.
- Overhead rule used.
- Margin or markup rule used.
- VAT settings used.
- Timestamp.
- Calculation version if available.

This protects old quotes when material and labour prices change.

---

## 10. AI feature rules

AI features come after the deterministic estimator works.

AI may be used for:
- Enquiry parsing.
- Product classification.
- Missing information detection.
- Draft quote wording.
- Assumptions and exclusions wording.
- Clarification questions.

AI output must:
- Be treated as draft.
- Be validated with Zod.
- Be confirmed by the user before pricing.
- Never override calculated values.
- Never create final prices by itself.

For AI parsing, return strict JSON only.

---

## 11. UI principles

The app should feel like a practical industrial SaaS tool.

Prioritise:
- Clear tables.
- Simple forms.
- Obvious edit buttons.
- Green/amber/red status indicators.
- Plain-English warnings.
- Clean cost breakdown cards.
- Print-friendly quote preview.

Avoid:
- Flashy gimmicks.
- Overdesigned dashboards.
- Hidden business logic.
- Confusing margin/markup labels.

---

## 12. Costing matrix rules

The live costing matrix is the heart of the app.

It should show:
- Category.
- Status.
- Value summary.
- Last updated date.
- Warning if stale or missing.
- Edit action.

Status:
- Green = complete and current.
- Amber = exists but stale or needs review.
- Red = missing critical information.

Do not allow final quote generation when red critical blockers exist.

---

## 13. Validation rules

Required validation:
- Dimensions must be positive numbers.
- Quantity must be at least 1.
- Required material rate must exist.
- Required labour rate must exist.
- Required costing rule must exist.
- Margin must not fall below configured minimum unless explicitly overridden.
- VAT only applies if company is VAT registered.

When validation fails:
- Show the exact missing or invalid field.
- Do not produce a final quote.
- Do not silently default to zero.

---

## 14. Security rules

Never:
- Commit `.env` files.
- Expose API keys client-side.
- Log secrets.
- Mix tenant/company data.
- Trust client-side company IDs without server verification.
- Let estimators edit owner-only costing settings unless permissions allow it.

Always:
- Validate server-side.
- Check user company membership.
- Use least-privilege database access.
- Keep AI calls on the server.
- Treat uploaded files and pasted enquiries as untrusted input.

---

## 15. Testing expectations

Add or update tests for:
- Pricing calculations.
- Missing material rates.
- Missing labour rates.
- VAT calculation.
- Margin vs markup calculation.
- Rounding rules.
- Company access control.
- Zod validation schemas.
- AI JSON schema validation when AI features are added.

For pricing logic, tests are not optional.

---

## 16. Build commands

Use actual project commands if already defined.

Common expected commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm test
```

Before finishing a coding task, run the most relevant available check:
- Unit tests for pricing logic.
- Lint/build for app-wide changes.
- Typecheck where available.

If a command fails:
- Report the exact failure.
- Explain whether it is caused by your change.
- Fix it if it is in scope.

---

## 17. Working method

For each task:

1. Inspect relevant files.
2. State a short plan for non-trivial work.
3. Make the smallest correct change.
4. Run relevant checks.
5. Report what changed.
6. Report verification result.
7. Report any remaining risk or follow-up.

Do not pretend verification passed if it was not run.

---

## 18. Current MVP priority

Build in this order:

1. App scaffold.
2. Authentication.
3. Company onboarding.
4. Database schema and RLS.
5. Labour/material/process rate CRUD.
6. Costing rules.
7. Live costing matrix.
8. Stainless steel table pricing engine.
9. Estimate builder.
10. Estimate storage with costing snapshot.
11. Quote preview.
12. AI enquiry parser later.

Do not build AI first.

The boring costing engine protects the money. Build that first.

---

## 19. Product-specific language

Use these terms consistently:

- Costing matrix
- Material rates
- Labour rates
- Process rates
- Costing rules
- Build cost
- Sell price
- Margin
- Markup
- Costing snapshot
- Estimate
- Quote preview

Be careful with margin vs markup:
- Markup = percentage added to cost.
- Margin = profit percentage of sell price.

Do not use them interchangeably.

---

## 20. Final rule

When in doubt, choose the safer estimating behaviour:

- Ask for missing data.
- Show assumptions.
- Avoid invented defaults.
- Preserve margin.
- Keep the change small.
- Verify the result.

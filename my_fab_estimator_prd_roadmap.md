# My Fab Estimator — Product Requirements Document & Build Roadmap

## 1. Product name

**My Fab Estimator**

## 2. One-line description

**My Fab Estimator is a plug-and-play fabrication estimating app for stainless steel manufacturers that captures each company’s live costing data, maintains a current costing matrix, and generates controlled build-cost estimates and customer quotes.**

---

# 3. Product vision

Small and medium stainless steel fabricators often estimate using spreadsheets, memory, outdated material costs, manual calculations, and individual experience. This creates inconsistent pricing, missed cost items, underquoted work, and poor margin visibility.

**My Fab Estimator** solves this by giving fabricators a structured setup wizard, live costing matrix, product-specific estimate builders, and AI-assisted enquiry interpretation.

The app must not allow AI to invent costs. AI should interpret job requirements, identify missing information, and draft quote language. The app’s pricing engine must calculate costs from verified company data.

---

# 4. Core principle

## AI assists. The pricing engine decides.

AI may:

- Read customer enquiries.
- Extract dimensions and product details.
- Suggest the right product template.
- Identify missing information.
- Draft quote descriptions, assumptions, exclusions, and clarification questions.

AI must not:

- Invent material prices.
- Invent labour rates.
- Override company costing rules.
- Generate a final sell price without the pricing engine.
- Treat uncertain drawing/spec data as confirmed.

---

# 5. Target users

## Primary users

### Fabrication company owner / manager

Needs to set up the company’s pricing rules, margins, materials, labour rates, and quote settings.

### Estimator / salesperson

Needs to quickly create estimates from customer enquiries, product dimensions, uploaded documents, or drawings.

### Workshop manager

May later compare estimated labour/material cost against actual job cost.

## Future users

### Accountant / finance user

Needs margin reporting and cost history.

### Admin / SaaS platform owner

Needs to manage companies, users, subscriptions, and system templates.

---

# 6. Problem statement

Fabricators need a faster and safer way to estimate bespoke stainless steel fabrication work.

Current problems:

- Estimating knowledge lives in people’s heads.
- Material prices are often out of date.
- Labour allowances are inconsistent.
- Similar jobs are quoted differently by different estimators.
- Small omissions destroy margin.
- Quotes are slow to produce.
- Historical job costing is rarely fed back into estimating.
- AI alone is unsafe for pricing because it may hallucinate costs.

---

# 7. Product objectives

## MVP objectives

1. Allow a company to onboard and enter its critical costing information.
2. Show a live costing matrix with clear completion/status indicators.
3. Allow the user to create an estimate for a stainless steel table.
4. Calculate build cost from materials, labour, process rates, wastage, overhead, and margin.
5. Generate a customer-facing quote summary.
6. Store each estimate with the exact costing data used at the time.
7. Include admin-editable cost settings.

## Post-MVP objectives

1. Add product templates for shelves, cupboards, sink units, splashbacks, and bespoke fabrication.
2. Add AI enquiry reader.
3. Add document/drawing upload.
4. Add quote PDF generation.
5. Add actual job cost comparison.
6. Add historical quote lookup.
7. Add company-level reporting and margin dashboards.

---

# 8. Success metrics

## MVP success metrics

- User can complete onboarding without developer help.
- User can create a stainless steel table estimate in under 5 minutes.
- Estimate output clearly separates material cost, labour cost, overhead, margin, and sell price.
- The app flags missing critical costing data before allowing final quote generation.
- Every quote stores a snapshot of the costing matrix used.

## Future success metrics

- Estimate creation time reduced by at least 50%.
- Quote consistency improves across estimators.
- Fewer jobs are underquoted due to missing materials/labour.
- Actual-vs-estimated job review becomes possible.
- AI extraction accuracy reaches useful confidence levels after human review.

---

# 9. MVP scope

## Included in MVP

### Authentication

- User registration.
- User login.
- Company account creation.
- Basic role support: owner, estimator.

### Company setup wizard

Collect:

- Company details.
- Labour rates.
- Material rates.
- Process rates.
- Waste factors.
- Overhead settings.
- Margin settings.
- Quote settings.

### Live costing matrix

Show:

- Labour rates.
- Material rates.
- Process rates.
- Waste factors.
- Margin rules.
- Delivery rules.
- Quote settings.
- Status: complete, missing, stale, needs review.
- Last updated date.

### Estimate builder — stainless steel table

Inputs:

- Quantity.
- Length mm.
- Depth mm.
- Height mm.
- Material grade.
- Sheet thickness.
- Finish.
- Undershelf yes/no.
- Rear upstand yes/no.
- Upstand height mm.
- Leg type.
- Number of legs.
- Adjustable feet yes/no.
- Welded/bolted construction.
- Delivery required yes/no.
- Installation required yes/no.
- Notes.

Outputs:

- Material cost.
- Labour/process cost.
- Consumables.
- Overhead.
- Build cost.
- Margin.
- Suggested sell price.
- Assumptions.
- Missing information.
- Confidence/estimate completeness.

### Quote output

Generate a simple quote preview containing:

- Customer name.
- Quote reference.
- Product description.
- Specification.
- Assumptions.
- Exclusions.
- Lead time placeholder.
- Price excluding VAT.
- VAT line if enabled.
- Price including VAT.
- Validity period.

### Estimate history

- List previous estimates.
- View estimate details.
- Duplicate previous estimate.
- See matrix snapshot used for that estimate.

---

# 10. Out of scope for MVP

The following are not required for the first working build:

- AI document reading.
- PDF drawing interpretation.
- CAD integration.
- Supplier API material pricing.
- Multi-company billing/subscriptions.
- Job scheduling.
- Stock control.
- Purchase orders.
- Invoicing.
- Advanced reporting.
- Mobile app.
- Full quote PDF branding.
- Actual job-cost tracking.

These can be added after the core estimating engine works.

---

# 11. Recommended technology stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui components
- React Hook Form
- Zod validation

## Backend

- Next.js API routes or server actions
- Supabase Auth
- Supabase Postgres database
- Prisma or Drizzle ORM

## AI

- OpenAI API for enquiry parsing and quote language generation
- AI calls must go through the backend only
- API keys must never be exposed in frontend code

## File/PDF generation — later phase

- React PDF, PDFKit, DocRaptor, or similar

## Hosting

- Vercel for frontend/app
- Supabase for database/auth/storage

---

# 12. System architecture

```text
User
  ↓
Next.js frontend
  ↓
Authentication / company access control
  ↓
Application backend
  ↓
Postgres database
  ↓
Pricing engine
  ↓
Estimate output
  ↓
Quote preview / export
```

Future AI flow:

```text
Customer enquiry / uploaded spec
  ↓
AI extraction service
  ↓
Structured job data
  ↓
Human confirmation
  ↓
Pricing engine
  ↓
Quote output
```

---

# 13. Core modules

## 13.1 Authentication module

### Requirements

- Users can register and log in.
- Each user belongs to one or more companies.
- Company data must be isolated by company ID.
- Users must only see their own company’s estimates and costing data.

### Roles

#### Owner

Can:

- Edit all costing matrix data.
- Add/remove users.
- Create estimates.
- View all company estimates.

#### Estimator

Can:

- Create estimates.
- View estimates.
- Cannot edit global costing rules unless permission is granted.

---

## 13.2 Company setup wizard

### Purpose

Collect all critical costing data before the user creates proper estimates.

### Wizard steps

1. Company details
2. Labour rates
3. Material rates
4. Process rates
5. Waste factors
6. Overhead and margin
7. Quote settings
8. Review matrix

### Company details fields

- Company name
- Address
- Email
- Phone
- VAT registered yes/no
- VAT rate
- Default currency
- Quote validity days
- Default lead time text
- Company logo URL/file later

---

## 13.3 Labour rates module

### Required fields

- General fabrication hourly rate
- Welding hourly rate
- Polishing/graining hourly rate
- CAD/drawing hourly rate
- Installation hourly rate
- Project/admin hourly rate
- Minimum labour charge hours

### Example

| Rate type | Unit | Example |
|---|---:|---:|
| Fabrication | per hour | £45 |
| Welding | per hour | £55 |
| Polishing | per hour | £50 |
| CAD | per hour | £60 |
| Installation | per hour | £65 |

---

## 13.4 Material rates module

### Required fields

- Material category
- Grade
- Thickness/profile size
- Unit type
- Unit cost
- Supplier name optional
- Last updated date
- Stale-after days

### Material categories

- Sheet
- Box section
- Tube
- Angle
- Flat bar
- Feet
- Hinges
- Handles
- Locks
- Runners
- Fixings
- Consumables

### Example records

| Material | Grade | Size/thickness | Unit | Cost |
|---|---|---:|---|---:|
| Stainless sheet | 304 | 1.2mm | m² | £X |
| Stainless sheet | 304 | 1.5mm | m² | £X |
| Box section | 304 | 30x30mm | metre | £X |
| Adjustable foot | n/a | standard | each | £X |

---

## 13.5 Process rates module

### Purpose

Stores costing rules for workshop operations.

### Required process types

- Cutting
- Folding
- Welding
- Polishing/graining
- Drilling
- Assembly
- Packing
- QA/checking

### Example fields

- Process name
- Unit type: per item, per metre, per fold, per m², per hour
- Time allowance
- Cost rate source
- Minimum charge

### Example

| Process | Basis | Example rule |
|---|---|---|
| Folding | per fold | 5 minutes per fold |
| Welding | per metre | 20 minutes per metre |
| Polishing | per m² | 30 minutes per m² |
| Packing | per item | 15 minutes per item |

---

## 13.6 Waste factor module

### Required fields

- Standard sheet wastage percentage
- Bespoke sheet wastage percentage
- Polished finish handling allowance percentage
- Small job contingency percentage
- Default consumables percentage

### Example

| Rule | Example |
|---|---:|
| Standard sheet waste | 10% |
| Bespoke sheet waste | 20% |
| Consumables | 3% of material + labour |

---

## 13.7 Margin and overhead module

### Required fields

- Overhead calculation type: percentage or fixed
- Overhead percentage
- Default margin percentage
- Minimum margin percentage
- Minimum order value
- Round sell price yes/no
- Price rounding unit: £1, £5, £10, £25, £50

### Important distinction

Markup and margin are not the same.

For MVP, store the selected calculation method clearly:

- Markup on cost
- Margin on sell price

The app should label this clearly to avoid accidental underpricing.

---

## 13.8 Live costing matrix

### Purpose

Central dashboard showing the current state of all costing data.

### Matrix columns

- Category
- Status
- Value summary
- Last updated
- Updated by
- Warning
- Edit button

### Status logic

#### Green / Complete

All required fields are present and current.

#### Amber / Needs review

Data exists but is older than the stale-after period or optional fields are missing.

#### Red / Missing critical data

Required fields are missing. The app should prevent final quote generation if critical data is missing.

### Matrix categories

- Company details
- Labour rates
- Material rates
- Process rates
- Waste factors
- Overhead rules
- Margin rules
- Quote settings
- Delivery rules
- Installation rules
- Product templates

---

# 14. MVP estimating logic — stainless steel table

## 14.1 Input fields

### Customer/job fields

- Customer name
- Customer email optional
- Project name
- Quote reference auto-generated
- Date
- Notes

### Product fields

- Product type: stainless steel table
- Quantity
- Length mm
- Depth mm
- Height mm
- Material grade
- Sheet thickness
- Finish
- Undershelf yes/no
- Rear upstand yes/no
- Upstand height mm
- Leg type
- Number of legs
- Adjustable feet yes/no
- Construction type: welded/bolted
- Delivery required yes/no
- Installation required yes/no

---

## 14.2 Cost calculation outline

### Area conversion

```text
length_m = length_mm / 1000
depth_m = depth_mm / 1000
height_m = height_mm / 1000
```

### Table top area

```text
top_area_m2 = length_m * depth_m
```

### Undershelf area

```text
undershelf_area_m2 = length_m * depth_m if undershelf = true else 0
```

### Rear upstand area

```text
upstand_area_m2 = length_m * upstand_height_m if rear_upstand = true else 0
```

### Sheet material area

```text
raw_sheet_area_m2 = top_area_m2 + undershelf_area_m2 + upstand_area_m2
sheet_area_with_waste = raw_sheet_area_m2 * (1 + waste_factor_percentage)
```

### Sheet material cost

```text
sheet_material_cost = sheet_area_with_waste * material_rate_per_m2
```

### Leg/profile cost

```text
leg_length_total_m = number_of_legs * height_m
leg_material_cost = leg_length_total_m * selected_leg_material_rate_per_metre
```

### Adjustable feet

```text
feet_cost = number_of_legs * adjustable_foot_unit_cost
```

### Base material cost

```text
base_material_cost = sheet_material_cost + leg_material_cost + feet_cost + optional_materials
```

### Process/labour cost

MVP should use configurable allowances. Do not hardcode real-world assumptions permanently.

Example process model:

```text
cutting_cost = cutting_time_hours * fabrication_hourly_rate
folding_cost = number_of_folds * fold_time_hours * fabrication_hourly_rate
welding_cost = weld_time_hours * welding_hourly_rate
polishing_cost = visible_area_m2 * polish_time_per_m2 * polishing_hourly_rate
assembly_cost = assembly_time_hours * fabrication_hourly_rate
packing_cost = packing_time_hours * fabrication_hourly_rate
```

### Consumables

```text
consumables_cost = (base_material_cost + labour_cost) * consumables_percentage
```

### Build cost

```text
build_cost = material_cost + labour_cost + consumables_cost
```

### Overhead

```text
overhead_cost = build_cost * overhead_percentage
```

### Total cost before margin

```text
total_cost = build_cost + overhead_cost
```

### Selling price — markup method

```text
selling_price = total_cost * (1 + markup_percentage)
```

### Selling price — margin method

```text
selling_price = total_cost / (1 - margin_percentage)
```

### VAT

```text
vat_amount = selling_price * vat_rate if company_is_vat_registered else 0
total_inc_vat = selling_price + vat_amount
```

---

# 15. Estimate output requirements

Each estimate must show:

- Estimate ID
- Quote reference
- Company ID
- Created by
- Customer name
- Product type
- Product specification
- Material cost
- Labour cost
- Process cost breakdown
- Consumables cost
- Overhead cost
- Total cost before margin
- Margin/markup value
- Suggested sell price excluding VAT
- VAT amount
- Suggested sell price including VAT
- Assumptions
- Exclusions
- Missing information
- Internal notes
- Costing matrix snapshot ID

---

# 16. Costing matrix snapshot requirement

Every estimate must store the exact cost data used at the time of calculation.

This is critical because material prices, labour rates, and margins change over time.

Each estimate should store either:

1. A full JSON snapshot of the costing values used, or
2. A linked matrix snapshot record.

Recommended MVP approach:

- Store a JSONB column called `costing_snapshot` on the estimate.

This should include:

- Material rates used
- Labour rates used
- Process rates used
- Waste factors used
- Margin/markup rules used
- Overhead rules used
- VAT rate used
- Timestamp

---

# 17. AI features — post-MVP

## 17.1 AI enquiry parser

### Purpose

Allow the user to paste a customer email or enquiry and have the AI extract structured estimate data.

### Input

- Plain text customer enquiry.

### Output JSON

```json
{
  "product_type": "stainless_steel_table",
  "quantity": 1,
  "length_mm": 1800,
  "depth_mm": 700,
  "height_mm": 900,
  "material_grade": "304",
  "sheet_thickness_mm": null,
  "finish": null,
  "features": ["undershelf", "rear_upstand"],
  "delivery_required": null,
  "installation_required": null,
  "missing_information": [
    "sheet_thickness_mm",
    "finish",
    "delivery_postcode"
  ],
  "confidence": 0.82
}
```

### AI rules

- AI output must be treated as draft data.
- User must confirm extracted data before pricing.
- Missing fields must be clearly shown.
- AI confidence below threshold should trigger manual review.
- AI must not produce the final price.

---

## 17.2 AI quote wording generator

### Purpose

Generate customer-facing quote language after the pricing engine calculates the estimate.

### Inputs

- Confirmed estimate data.
- Product specification.
- Assumptions.
- Exclusions.
- Price calculated by pricing engine.

### Output

- Polished product description.
- Quote assumptions.
- Quote exclusions.
- Clarification questions.

### AI rules

- AI must not alter calculated price.
- AI must not add unconfirmed scope.
- AI must not promise lead times unless provided by user/company settings.
- AI must use cautious wording where information is missing.

---

# 18. Data model — MVP

## 18.1 companies

```sql
id uuid primary key
name text not null
address text
email text
phone text
vat_registered boolean default false
vat_rate numeric default 20
currency text default 'GBP'
default_quote_validity_days integer default 30
default_lead_time_text text
created_at timestamp
updated_at timestamp
```

## 18.2 users

Handled by Supabase Auth.

## 18.3 company_users

```sql
id uuid primary key
company_id uuid references companies(id)
user_id uuid not null
role text not null -- owner, estimator
created_at timestamp
```

## 18.4 labour_rates

```sql
id uuid primary key
company_id uuid references companies(id)
rate_type text not null
hourly_rate numeric not null
minimum_hours numeric default 0
last_updated_at timestamp
updated_by uuid
created_at timestamp
```

## 18.5 material_rates

```sql
id uuid primary key
company_id uuid references companies(id)
category text not null -- sheet, box_section, tube, feet, fixings
name text not null
grade text
size_label text
thickness_mm numeric
unit text not null -- m2, metre, each, sheet
unit_cost numeric not null
supplier_name text
stale_after_days integer default 30
last_updated_at timestamp
updated_by uuid
created_at timestamp
```

## 18.6 process_rates

```sql
id uuid primary key
company_id uuid references companies(id)
process_name text not null -- cutting, folding, welding, polishing
basis text not null -- per_item, per_metre, per_fold, per_m2, per_hour
time_minutes numeric
minimum_minutes numeric default 0
labour_rate_type text
created_at timestamp
updated_at timestamp
```

## 18.7 costing_rules

```sql
id uuid primary key
company_id uuid references companies(id)
standard_waste_percentage numeric default 10
bespoke_waste_percentage numeric default 20
consumables_percentage numeric default 3
overhead_percentage numeric default 0
pricing_method text default 'margin' -- margin or markup
default_margin_percentage numeric default 30
minimum_margin_percentage numeric default 20
minimum_order_value numeric default 0
rounding_enabled boolean default true
rounding_unit numeric default 10
created_at timestamp
updated_at timestamp
```

## 18.8 estimates

```sql
id uuid primary key
company_id uuid references companies(id)
created_by uuid not null
quote_reference text not null
customer_name text
customer_email text
project_name text
product_type text not null
status text default 'draft' -- draft, quoted, accepted, rejected, archived
input_data jsonb not null
cost_breakdown jsonb not null
costing_snapshot jsonb not null
assumptions text[]
exclusions text[]
missing_information text[]
internal_notes text
sell_price_ex_vat numeric
vat_amount numeric
total_price_inc_vat numeric
created_at timestamp
updated_at timestamp
```

## 18.9 quote_settings

```sql
id uuid primary key
company_id uuid references companies(id)
quote_prefix text default 'Q'
next_quote_number integer default 1
terms_text text
exclusions_default text
validity_days integer default 30
created_at timestamp
updated_at timestamp
```

---

# 19. Core pages / routes

## Public routes

- `/` landing page
- `/login`
- `/register`

## App routes

- `/app/dashboard`
- `/app/setup`
- `/app/costing-matrix`
- `/app/materials`
- `/app/labour-rates`
- `/app/process-rates`
- `/app/rules`
- `/app/estimates`
- `/app/estimates/new`
- `/app/estimates/[id]`
- `/app/quotes/[id]`
- `/app/settings/company`
- `/app/settings/users`

---

# 20. UI requirements

## Visual style

- Clean industrial SaaS look.
- Practical, not gimmicky.
- Use cards, tables, clear status indicators, and simple forms.
- Use green/amber/red states for costing matrix completeness.
- Currency formatting must be clean and consistent.

## Important screens

### Dashboard

Show:

- Matrix health score
- Recent estimates
- Missing critical data
- Quick action: create estimate
- Quick action: update material prices

### Setup wizard

Show progress:

```text
Company → Labour → Materials → Processes → Rules → Quote Settings → Review
```

### Costing matrix

Show all key costing categories and status.

### Estimate builder

Use a left-to-right or step-based flow:

```text
Job details → Product specification → Options → Cost review → Quote preview
```

### Estimate result

Show clear cards:

- Material cost
- Labour/process cost
- Overhead
- Build cost
- Margin
- Sell price

Also show:

- Expandable breakdown
- Assumptions
- Warnings
- Missing data

---

# 21. Validation rules

## General validation

- Dimensions must be positive numbers.
- Quantity must be at least 1.
- Material rate must exist for selected grade/thickness.
- Labour rates must exist before final calculation.
- Costing rules must exist before final calculation.
- Margin percentage must not be below configured minimum unless owner override is allowed.
- VAT must only be applied if company is VAT registered.

## Critical blockers

The app must prevent final quote generation if:

- No material rate exists for the chosen material/thickness.
- No fabrication labour rate exists.
- No margin rule exists.
- Required dimensions are missing.
- Quantity is missing.

---

# 22. Security requirements

- API keys must only exist on the server.
- OpenAI API key must never be exposed to client-side code.
- Company data must be isolated by company ID.
- Users cannot access another company’s estimates.
- All write actions must verify user role.
- All database queries must enforce company ownership.
- Use environment variables for secrets.
- Never commit `.env` files.

---

# 23. Non-functional requirements

## Performance

- Estimate calculation should complete instantly for MVP.
- App pages should load quickly on normal office broadband.

## Reliability

- Calculations must be deterministic.
- Same input + same costing matrix must produce same output.
- Costing snapshots must make old estimate review reliable.

## Auditability

- Store who updated key costing data.
- Store when rates were last updated.
- Store exact estimate inputs and costing snapshots.

## Usability

- User should not need technical knowledge.
- Cost setup must be guided.
- Warnings must be plain English.

---

# 24. Acceptance criteria — MVP

## Onboarding

- User can create an account.
- User can create a company.
- User can complete setup wizard.
- User can see setup completion status.

## Costing matrix

- User can view all critical costing categories.
- Missing data shows red.
- Old data shows amber.
- Complete data shows green.
- User can edit costing values.

## Estimate builder

- User can create a stainless steel table estimate.
- App validates dimensions and required fields.
- App uses stored material/labour/process/rule data.
- App produces cost breakdown.
- App produces suggested sell price.
- App stores estimate and costing snapshot.

## Quote preview

- User can view customer-facing quote text.
- Quote includes product spec, assumptions, exclusions, and price.
- Price comes only from pricing engine.

---

# 25. Roadmap

## Phase 0 — Project setup

### Goal

Create the app foundation.

### Tasks

- Create Next.js TypeScript project.
- Add Tailwind CSS.
- Add shadcn/ui.
- Configure Supabase.
- Add authentication.
- Create protected app layout.
- Create basic dashboard.
- Add database schema/migrations.

### Deliverable

User can register, log in, and access a protected dashboard.

---

## Phase 1 — Company setup and costing matrix

### Goal

Allow the user to enter and manage their critical costing data.

### Tasks

- Company creation flow.
- Labour rates CRUD.
- Material rates CRUD.
- Process rates CRUD.
- Costing rules CRUD.
- Quote settings CRUD.
- Costing matrix dashboard.
- Matrix status logic.

### Deliverable

User can complete setup and see a live costing matrix.

---

## Phase 2 — Stainless steel table estimator

### Goal

Build the first working product estimator.

### Tasks

- Create estimate form.
- Add product specification fields.
- Build pricing engine service.
- Add validation.
- Calculate material costs.
- Calculate labour/process costs.
- Calculate overhead and margin.
- Generate cost breakdown.
- Store estimate.
- Store costing snapshot.

### Deliverable

User can generate a controlled build-cost estimate for a stainless steel table.

---

## Phase 3 — Quote preview

### Goal

Turn estimate into a customer-facing quote preview.

### Tasks

- Generate quote reference.
- Create quote preview page.
- Add assumptions and exclusions.
- Add VAT calculation.
- Add duplicate estimate feature.
- Add print-friendly page.

### Deliverable

User can create and review a basic quote from an estimate.

---

## Phase 4 — More product templates

### Goal

Expand beyond tables.

### Product templates

- Wall shelf
- Floor cupboard
- Wall cupboard
- Sink unit
- Splashback
- Bespoke counter/worktop

### Deliverable

User can choose from multiple fabrication product templates.

---

## Phase 5 — AI enquiry reader

### Goal

Use AI to interpret customer enquiries.

### Tasks

- Add enquiry paste/upload text input.
- Add backend OpenAI extraction endpoint.
- Define strict JSON schema.
- Add human confirmation screen.
- Map extracted data to estimate builder.
- Show missing information and confidence.

### Deliverable

User can paste an enquiry and generate draft estimate inputs.

---

## Phase 6 — Quote PDF and branding

### Goal

Generate professional customer quote PDFs.

### Tasks

- Add company logo upload.
- Add quote PDF template.
- Add export/download PDF.
- Add email-ready quote output.

### Deliverable

User can export a professional quote PDF.

---

## Phase 7 — Actual job cost and learning loop

### Goal

Compare estimated vs actual cost.

### Tasks

- Add job completion screen.
- Enter actual labour hours.
- Enter actual material cost.
- Compare estimate vs actual.
- Show variance.
- Feed insights back to template assumptions.

### Deliverable

User can see whether jobs were correctly estimated.

---

## Phase 8 — SaaS/admin layer

### Goal

Prepare for wider commercial product.

### Tasks

- Add subscriptions.
- Add company plans.
- Add admin dashboard.
- Add usage limits.
- Add Stripe billing.
- Add template library.

### Deliverable

App can operate as a paid SaaS platform.

---

# 26. Codex build instructions

## Recommended Codex approach

Use Codex in small, controlled tasks. Do not ask it to build the entire app in one prompt.

Recommended build order:

1. Project scaffold.
2. Database schema.
3. Authentication.
4. Company onboarding.
5. Costing matrix.
6. Material/labour/process CRUD.
7. Pricing engine.
8. Table estimator.
9. Estimate storage.
10. Quote preview.
11. Tests.
12. AI features later.

---

# 27. Starter Codex prompt — project scaffold

```text
Build the initial foundation for a web app called "My Fab Estimator".

Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth
- Supabase Postgres

Create:
- Public landing page
- Login page
- Register page
- Protected app dashboard
- App layout with sidebar navigation
- Placeholder pages for Dashboard, Setup, Costing Matrix, Materials, Labour Rates, Process Rates, Rules, Estimates, and Settings

Requirements:
- Keep code clean and modular
- Use server-side authentication where appropriate
- Do not expose environment variables to the client
- Add clear README setup instructions
```

---

# 28. Starter Codex prompt — database schema

```text
Create the database schema for My Fab Estimator using Supabase Postgres migrations.

Add tables:
- companies
- company_users
- labour_rates
- material_rates
- process_rates
- costing_rules
- quote_settings
- estimates

Requirements:
- Every company-owned table must include company_id
- Add created_at and updated_at timestamps
- Add sensible constraints
- Add indexes for company_id
- Add row-level security policies so users can only access records for companies they belong to
- Add owner and estimator role support in company_users
```

---

# 29. Starter Codex prompt — costing matrix

```text
Build the Costing Matrix page for My Fab Estimator.

The page should show a table of critical costing categories:
- Company details
- Labour rates
- Material rates
- Process rates
- Waste factors
- Overhead rules
- Margin rules
- Quote settings
- Delivery rules
- Product templates

For each category show:
- Status: Complete, Needs Review, or Missing
- Last updated date
- Short value summary
- Warning message if relevant
- Edit button

Status rules:
- Missing required data = Missing
- Data older than stale-after-days = Needs Review
- Required data present and current = Complete

Use green, amber, and red visual states.
```

---

# 30. Starter Codex prompt — pricing engine

```text
Create a deterministic pricing engine for My Fab Estimator.

Build a TypeScript service that calculates the build cost for a stainless steel table.

Inputs:
- Quantity
- Length mm
- Depth mm
- Height mm
- Material grade
- Sheet thickness
- Finish
- Undershelf yes/no
- Rear upstand yes/no
- Upstand height mm
- Leg type
- Number of legs
- Adjustable feet yes/no
- Construction type
- Company material rates
- Company labour rates
- Company process rates
- Company costing rules
- Company VAT settings

Outputs:
- Material cost breakdown
- Labour/process cost breakdown
- Consumables cost
- Overhead cost
- Total cost before margin
- Margin or markup calculation
- Sell price excluding VAT
- VAT amount
- Total including VAT
- Assumptions
- Missing information
- Costing snapshot

Rules:
- Do not call AI from the pricing engine
- Do not invent missing rates
- Return validation errors when required rates are missing
- Same inputs must always produce same outputs
- Include unit tests for calculation examples
```

---

# 31. Starter Codex prompt — estimate builder

```text
Build the Estimate Builder page for My Fab Estimator.

Create a multi-step form for a stainless steel table estimate:
1. Job details
2. Product specification
3. Options
4. Cost review
5. Quote preview

Use React Hook Form and Zod validation.

On submit:
- Validate required fields
- Fetch company costing data
- Call the pricing engine
- Display cost breakdown
- Save estimate to database with costing_snapshot

Do not allow final quote generation if required costing data is missing.
```

---

# 32. Starter Codex prompt — AI enquiry parser later

```text
Add an AI enquiry parser to My Fab Estimator.

User can paste a customer enquiry into a text box.

The backend should call the OpenAI API and return strict JSON with:
- product_type
- quantity
- length_mm
- depth_mm
- height_mm
- material_grade
- sheet_thickness_mm
- finish
- features
- delivery_required
- installation_required
- missing_information
- confidence

Rules:
- AI output is draft only
- User must confirm extracted data before pricing
- AI must not calculate or invent prices
- AI must not create a final quote directly
- Validate AI output against a Zod schema before using it
```

---

# 33. Suggested AGENTS.md file for Codex

```text
# AGENTS.md — My Fab Estimator

You are working on My Fab Estimator, a fabrication estimating SaaS app for stainless steel fabricators.

Core rule:
AI assists with interpretation and wording, but the pricing engine must calculate all prices deterministically from stored company data.

Do not:
- Invent prices
- Hardcode business rates except as seed/demo data
- Expose API keys in frontend code
- Mix company data between tenants
- Skip validation around costing data

Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase Auth/Postgres
- Zod for validation

Priorities:
1. Clean, modular code
2. Strong type safety
3. Deterministic calculations
4. Secure company-level data isolation
5. Clear user-facing warnings when data is missing

When adding pricing logic:
- Put calculation code in a dedicated service/module
- Include unit tests
- Return a detailed breakdown, not just a final price
- Store a costing snapshot with every estimate

When adding AI features:
- AI must return structured draft data only
- Validate AI output with Zod
- Require human confirmation before pricing
- Never let AI override calculated prices
```

---

# 34. MVP build checklist

## Foundation

- [ ] Next.js app created
- [ ] Tailwind installed
- [ ] shadcn/ui installed
- [ ] Supabase project connected
- [ ] Auth working
- [ ] Protected dashboard working

## Database

- [ ] Companies table
- [ ] Company users table
- [ ] Labour rates table
- [ ] Material rates table
- [ ] Process rates table
- [ ] Costing rules table
- [ ] Quote settings table
- [ ] Estimates table
- [ ] Row-level security policies

## Setup

- [ ] Company setup wizard
- [ ] Labour rates CRUD
- [ ] Material rates CRUD
- [ ] Process rates CRUD
- [ ] Costing rules CRUD
- [ ] Quote settings CRUD

## Costing matrix

- [ ] Matrix dashboard
- [ ] Green/amber/red statuses
- [ ] Missing data warnings
- [ ] Stale data warnings
- [ ] Edit links

## Estimating

- [ ] Stainless steel table estimate form
- [ ] Pricing engine
- [ ] Validation
- [ ] Cost breakdown
- [ ] Estimate save
- [ ] Costing snapshot save

## Quote

- [ ] Quote reference generation
- [ ] Quote preview page
- [ ] Assumptions/exclusions
- [ ] VAT calculation
- [ ] Print-friendly output

---

# 35. Future commercial positioning

Possible tagline:

**The live costing and estimating platform for stainless steel fabricators.**

Alternative taglines:

- **Stop guessing. Start estimating from live fabrication costs.**
- **Controlled costing for stainless steel fabrication.**
- **From enquiry to quote, without losing your margin.**
- **A smarter estimating system for fabricators who cannot afford guesswork.**

---

# 36. Final product strategy

The app should not be sold as magic AI quoting.

It should be sold as:

**A controlled fabrication estimating engine with AI assistance.**

That is more credible, more accurate, and safer for real businesses.

The first commercial version should focus on one thing:

**Help fabricators produce faster, more consistent quotes while protecting margin.**


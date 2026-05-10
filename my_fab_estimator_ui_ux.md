# My Fab Estimator — UI/UX Direction

## 1. Design concept

**Design style:** Industrial Calm SaaS

**One-line direction:**

> My Fab Estimator should feel like a clean financial control panel for fabrication — not an old estimating spreadsheet with lipstick on.

The interface should be simple, calm, modern, and practical. It should feel premium enough for business users but straightforward enough for fabricators, estimators, and workshop managers to use without training.

Think:

- Stripe clarity
- Linear simplicity
- Notion calmness
- Practical industrial costing tool
- Stainless steel fabrication confidence

Avoid:

- Flashy “AI magic” styling
- Overloaded ERP-style screens
- Busy dashboards
- Tiny form fields
- Hidden business logic
- Gimmicky futuristic visuals

---

## 2. Product personality

The app should feel:

- Clear
- Reliable
- Practical
- Commercial
- Accurate
- Calm
- Modern
- Margin-protective

The user should feel:

> “I know exactly what information is missing, what this job costs, and whether I can quote safely.”

---

## 3. Core UX principle

## Make safe quoting obvious

The interface must constantly answer:

1. Is my costing data complete?
2. Is anything missing?
3. Are my material prices current?
4. Is this estimate profitable?
5. Can I safely issue this quote?

The app should not bury problems. Missing cost data, stale prices, and margin warnings should be impossible to miss.

---

## 4. Main navigation

Use a simple sidebar.

Recommended navigation:

```text
Dashboard
Costing Matrix
New Estimate
Estimates
Materials
Labour Rates
Process Rates
Rules & Margins
Quote Settings
Company Settings
```

The sidebar should be clean, minimal, and easy to scan.

Use simple icons, but do not rely on icons alone. Labels matter.

---

## 5. Visual style

### Overall look

Use:

- White and off-white backgrounds
- Soft grey panels
- Dark charcoal text
- Muted secondary text
- Brushed steel-inspired neutrals
- One strong blue/cyan primary accent
- Green/amber/red only for status and warnings
- Rounded cards
- Subtle shadows
- Spacious layout
- Large readable numbers

Avoid:

- Bright gradients
- Heavy shadows
- Dark-pattern overload
- Neon colours
- Too many competing accents
- Dense ERP-style tables

---

## 6. Suggested colour palette

```text
Background:        #F7F8FA
Panel:             #FFFFFF
Primary text:      #111827
Secondary text:    #6B7280
Border:            #E5E7EB
Primary accent:    #0EA5E9
Deep navy:         #0F172A
Steel grey:        #64748B
Success green:     #16A34A
Warning amber:     #F59E0B
Danger red:        #DC2626
Muted background:  #F1F5F9
```

Use colour sparingly.

Status colours should have purpose:

- Green = complete / safe
- Amber = needs review
- Red = missing / blocked
- Blue = primary action or selected state

---

## 7. Typography

Recommended fonts:

- Inter
- Geist
- IBM Plex Sans
- Satoshi

Preferred choice:

> Use **Geist** or **Inter**.

Typography should be clean, readable, and modern.

Use clear hierarchy:

```text
Page title:        28–32px
Section title:     18–22px
Card heading:      15–17px
Body text:         14–16px
Table text:        13–15px
Muted helper text: 12–14px
Large price:       32–44px
```

---

## 8. Dashboard UX

The dashboard should answer one question:

> Are we ready to quote safely?

### Suggested top section

```text
Costing Matrix Health: 86%
3 items need review
1 critical item missing
```

### Main dashboard cards

Use three prominent action cards:

1. **Create Estimate**
2. **Update Material Prices**
3. **Review Costing Matrix**

### Supporting sections

Below the main cards, show:

- Recent estimates
- Quotes awaiting review
- Stale material prices
- Missing critical data
- Margin warning alerts

Avoid vanity graphs unless they help the user make a decision.

This is a quoting cockpit, not a generic SaaS analytics dashboard.

---

## 9. Costing Matrix UX

The **Costing Matrix** is the heart of the app.

It should show the user whether their estimating data is complete and current.

### Suggested page structure

```text
Costing Matrix

[Complete: 7] [Needs Review: 2] [Missing: 1]

Category             Status          Last Updated      Action
Labour Rates         Complete        Today             Edit
304 Sheet Prices     Complete        Today             Edit
316 Sheet Prices     Missing         —                 Add
Process Rates        Needs Review    32 days ago       Review
Margins              Complete        Today             Edit
Quote Settings       Complete        Today             Edit
```

### Matrix columns

- Category
- Status
- Value summary
- Last updated
- Updated by
- Warning
- Action

### Status chips

Use clear visual chips:

```text
Complete      Green
Needs Review  Amber
Missing       Red
Optional      Grey
```

### Matrix UX rules

- Red items must be prominent.
- Amber items should explain why they need review.
- Edit buttons should be visible.
- Do not hide key warnings in tooltips only.
- If critical data is missing, block final quote generation.

---

## 10. Setup wizard UX

The first-time user should not be thrown into a blank dashboard.

Use a guided setup wizard.

### First screen

```text
Welcome to My Fab Estimator

Set up your live costing matrix so your estimates are based on your real material prices, labour rates and margins.

[Start Setup]
```

### Wizard steps

```text
Company → Labour → Materials → Processes → Margins → Quote Settings → Review
```

### Setup progress

```text
You’re 72% ready to quote.
Complete material rates to unlock estimates.
```

### Setup completion screen

```text
Your costing matrix is ready.

[Create First Estimate]
```

### Wizard rules

- Ask only for critical information first.
- Let users add more detail later.
- Do not overwhelm users with every possible setting.
- Use sensible field grouping.
- Explain each costing category in plain English.

---

## 11. Estimate builder UX

The estimate builder should be step-based, not one giant form.

### Suggested flow

```text
1. Job Details
2. Product Type
3. Dimensions & Specification
4. Options
5. Cost Review
6. Quote Preview
```

---

## 12. Estimate builder — Step 1: Job Details

Fields:

- Customer name
- Customer email
- Project name
- Quote reference
- Internal notes

Keep this page light. The user should be able to move quickly.

---

## 13. Estimate builder — Step 2: Product Type

Use large selectable cards.

```text
[ Table ]
[ Shelf ]
[ Cupboard ]
[ Sink Unit ]
[ Splashback ]
[ Bespoke ]
```

For MVP:

- Table = active
- Others = coming soon

Do not show inactive templates as broken features. Use a calm “Coming soon” state.

---

## 14. Estimate builder — Step 3: Dimensions & Specification

Use large, clear inputs.

```text
Length      [ 1800 ] mm
Depth       [ 700  ] mm
Height      [ 900  ] mm
Quantity    [ 1    ]
```

Other fields:

- Material grade
- Sheet thickness
- Finish
- Construction type

Use mm as the default unit.

Avoid tiny spreadsheet-like input boxes.

---

## 15. Estimate builder — Step 4: Options

Use toggle cards or switches.

```text
Undershelf         [Yes]
Rear upstand       [Yes]
Adjustable feet    [Yes]
Welded frame       [Yes]
Delivery           [Yes]
Installation       [No]
```

This should feel quick and visual.

Use short helper text when useful.

Example:

```text
Rear upstand
Adds stainless upstand to the back edge of the table.
```

---

## 16. Estimate builder — Step 5: Cost Review

This is one of the most important screens.

Show a clean cost breakdown:

```text
Material Cost       £xxx
Labour Cost         £xxx
Consumables         £xx
Overhead            £xx
Build Cost          £xxx
Margin              xx%
Sell Price ex VAT   £xxx
VAT                 £xx
Total inc VAT       £xxx
```

### Use cards for major numbers

Recommended cards:

- Material cost
- Labour cost
- Build cost
- Sell price
- Margin status

### Add warning boxes

Examples:

```text
Amber: Material price last updated 35 days ago.
Red: No delivery postcode entered.
Green: Margin above minimum threshold.
```

### Cost review rules

- Show breakdown clearly.
- Do not hide how the number was built.
- Let users expand detailed calculations.
- Flag anything risky before quote preview.
- Do not allow final quote if critical data is missing.

---

## 17. Estimate builder — Step 6: Quote Preview

The quote preview should feel customer-ready but still editable.

Include:

- Company name
- Customer name
- Quote reference
- Product description
- Specification
- Assumptions
- Exclusions
- Lead time
- Quote validity
- Price excluding VAT
- VAT
- Total including VAT
- Terms

### Buttons

```text
[Back to Cost Review]
[Save Draft]
[Mark as Quoted]
[Print / Export PDF]  // future
```

For MVP, print-friendly page is enough.

PDF export can come later.

---

## 18. AI UX

AI should be useful but subtle.

Do not make the app feel like a chatbot with a calculator attached.

AI should appear as an assistant panel, not the entire product.

### AI Enquiry Reader panel

```text
AI Enquiry Reader

Paste a customer email or enquiry below.
We’ll extract the likely product, dimensions, features and missing information.

[Paste enquiry...]

[Analyse Enquiry]
```

### AI output example

```text
I found:

Product: stainless steel table
Size: 1800 x 700 x 900 mm
Features: undershelf, rear upstand

Missing:
- Sheet thickness
- Finish
- Delivery postcode

Confidence: 82%

[Use this as draft estimate]
```

### AI UX rules

- Always show confidence.
- Always show missing information.
- AI output must be confirmed by the user.
- AI must not create final prices.
- AI must not silently fill missing cost data.
- Use plain language, not “AI wizard” language.

---

## 19. Important component patterns

Use a disciplined component system.

Recommended components:

- Sidebar navigation
- Top bar
- Page header
- Cards
- Tables
- Status chips
- Stepper
- Input groups
- Toggle cards
- Empty states
- Alert banners
- Slide-over panels
- Modal confirmations
- Toast notifications
- Expandable breakdown sections
- Print-friendly quote layout

---

## 20. Empty states

Empty states should be useful.

Bad:

```text
No data.
```

Good:

```text
No material rates added yet.
Add your first stainless sheet price to unlock estimating.

[Add Material Rate]
```

Other examples:

```text
No estimates yet.
Create your first estimate to test your costing matrix.

[Create Estimate]
```

```text
No process rates added.
Add cutting, folding, welding and polishing rules to improve estimate accuracy.

[Add Process Rate]
```

---

## 21. Error and warning language

Use plain English.

Examples:

```text
No 304 stainless 1.2mm sheet rate found.
Add this material rate before generating a quote.
```

```text
Your polishing rate has not been reviewed for 45 days.
You can continue, but the estimate may be based on stale data.
```

```text
The selected margin is below your company minimum.
Owner approval is required to continue.
```

Avoid technical messages unless needed.

---

## 22. Margin and markup UX

Margin and markup must be clearly labelled.

Do not use the terms interchangeably.

Include helper text:

```text
Markup is added on top of cost.
Margin is the profit percentage of the final selling price.
```

If both are supported, make the selected method obvious.

Example:

```text
Pricing method: Margin on sell price
Default margin: 30%
Minimum margin: 20%
```

This is critical because confusing margin and markup can badly underprice jobs.

---

## 23. Mobile and responsive behaviour

MVP can be desktop-first.

Target users are likely estimating on laptops/desktops.

Still, the app should be usable on tablet.

Responsive rules:

- Sidebar collapses on smaller screens.
- Tables become stacked cards where necessary.
- Estimate forms remain readable.
- Quote preview should be printable.
- Do not over-prioritise phone layout for MVP.

---

## 24. Accessibility

Minimum requirements:

- Good colour contrast.
- Status chips should not rely only on colour.
- Use labels for all inputs.
- Use keyboard-accessible controls.
- Provide visible focus states.
- Avoid tiny click targets.
- Use clear error text under fields.

Example:

```text
Status: Missing
Colour: Red
Icon: Warning triangle
Text: “Material rate required”
```

---

## 25. Suggested first UI screens

Build these first:

1. Landing page
2. Login/register
3. App dashboard
4. Setup wizard
5. Costing Matrix
6. Materials page
7. Labour Rates page
8. New Estimate stepper
9. Cost Review screen
10. Quote Preview screen

Do not design every future feature before the MVP works.

---

## 26. Suggested Codex / Claude UI prompt

Use this with Codex or Claude Code:

```text
Design the UI for My Fab Estimator as a modern, calm, industrial SaaS product.

Style:
- Clean white/off-white background
- Charcoal text
- Soft grey panels
- Blue/cyan primary accent
- Green/amber/red status chips for costing matrix health
- Rounded cards
- Subtle shadows
- Spacious layout
- Clear typography using Inter or Geist
- Practical, premium, not flashy

Build:
- App sidebar navigation
- Dashboard page
- Costing Matrix page
- Setup wizard
- New Estimate stepper flow
- Estimate result/cost breakdown page
- Quote preview page

UX rules:
- Keep screens calm and uncluttered
- Use progressive disclosure
- Do not overload users with every setting at once
- Make missing costing data impossible to ignore
- Use clear real-world fabrication language
- Prioritise speed, clarity and margin protection
- AI features should appear as an assistant panel, not as the core interface

Use:
- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
```

---

## 27. Suggested design tagline

Possible UI/design positioning:

> Clean costing control for stainless steel fabrication.

Alternative product-facing lines:

- Quote faster without losing your margin.
- Live fabrication costing without spreadsheet chaos.
- A cleaner way to price stainless steel fabrication.
- From material rates to customer quote in minutes.
- Built for fabricators who cannot afford guesswork.

---

## 28. Final design standard

The design should be simple enough for a busy estimator and polished enough to sell as a serious SaaS product.

The goal is not to look like an AI toy.

The goal is to look like:

> A modern costing and quote-control system for real fabrication businesses.

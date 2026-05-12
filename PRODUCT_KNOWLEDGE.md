# Product knowledge — CCE fabrication patterns

Drawn from 646 costing sheets (Q4 2025 → Q2 2026) plus sample customer-facing
PDFs. This is the design brief for the per-product pricing engine and the
description generator. Treat it as living — update when new patterns emerge.

---

## 1. CCE's customer-facing line-item language pattern

Every fabrication line description follows a consistent grammar:

```
[Finish] [grade] stainless steel [PRODUCT] approx. {L}mm × {D}mm × {H}mm
complete with [top features: upstand, downturn, chamfer, drainer, etc.]
Under to be [under-structure]
with [shelving / drawers / doors description]
[+ specific feature callouts: sink bowls, cutouts, drop-downs, etc.]
```

Examples:

> Stainless steel wall bench approx. 2000mm × 800mm × 900mm complete with
> 50mm high upstand to rear and LH end. Under to have open framework
> (no panels) with void under to full length to accept existing under
> counter refrigerators.

> Stainless steel sink unit approx. 2400mm × 700mm × 900mm complete with
> upstand to rear and chamfer to exposed corners. Worktop to have anti-drip
> edge with two No 500mm × 400mm × 300mm sink bowls with plain flat drainer
> to either side. Under sinks to be valance panel to front and both sides
> with base shelf only. Price excluding taps.

**Implication for the engine:** auto-generate the description from the spec
+ selected features + structure choice. Estimator can always edit the final
text before saving. This is the single biggest UX win — estimators write
these descriptions by hand today.

---

## 2. Product taxonomy

Confirmed product types with their typical use case, dimensions, and
feature-attachment rates from the data:

### Wall bench  (126 occurrences)
- Median: 1600 × 755 × 900 mm
- A bench fixed against a wall — legs at front, no back legs
- 39% have a valance, 33% have local anti-drip edge, 21% have a sink bowl
- 16% have end frame 900, 15% have shelf 900, 10% have shelf 1200
- Default underside: open framework with base shelf

### Work bench  (120 occurrences)
- Median: 1580 × 800 × 900 mm
- Centre-of-room or open-position bench
- 32% chamfer, 28% valance, 25% anti-drip edge, 24% chopping board, 23% sink bowl
- 22% have end frame 900, 19% have shelf 900

### Mobile bench / mobile centre bench  (15 occurrences)
- Median: 2000 × 850 × 900 mm
- Free-standing, mobile
- 47% have castors (logical — they're mobile)
- 53% have end panel double skinned 900 (more enclosed)
- Common: cupboard or rear panels (laminate boards)

### Worktop  (214 occurrences) — sub-assembly, often part of a bench
- Median: 1700 × 750 × 900 mm
- Worktop with downturns, sometimes standalone
- 29% have valance, 21% chamfer, 18% materials general, 16% anti-drip edge
- 14% have 14swg heavy top spec, 8% have shelf 600, 7% have upstand 300mm

### Splashback  (19 occurrences)
- Median: 1589 × 550 (height) — note: depth = wall height it covers
- Stainless panel wall-mounted behind a worktop
- Often has socket cutouts (standard, IP-rated, commando)
- Sometimes joined to other splashbacks ("edge for joining to SPLASHBACK 02")

### Service counter / under-bar counter  (45 occurrences)
- Median: 3500 × 800 × 900 mm (long)
- Front-of-house bar / drinks counter
- 96% have valance (refrigerated base hides compressor), 87% materials general
- 51% kick plate, 47% anti-drip edge, 40% speed rail 900, 38% speed rail 600
- 64% have 14swg top (heavy-duty surface)
- Frequently has ice wells, sink bowls, condiment holders

### Sink unit  (12 occurrences)
- Median: 1642 × 700 × 900 mm
- Dedicated unit with one or more sink bowls
- 42% valance, 25% anti-drip edge, 25% have a sink bowl 600×450×300
- Always quoted "Price excluding taps"
- Often has fully lined under-sink storage cupboard

### Dishwash table  (57 occurrences)  ← **MISSING FROM CURRENT SEED**
- Median: 1700 × 800 × 850 mm (note: 850mm tall, not 900)
- Inlet or outlet to a dishwasher
- 47% have sink bowl 600×450×300, 47% have 300mm upstand
- 42% valance, 25% welded join (joining to another section)
- 23% basket runners (for dishwash baskets)
- Common features: anti-drip "gulley" to accept 500×500 baskets,
  connection to dishwasher to one end

### Wall shelf  (273 occurrences) — HIGHEST FREQUENCY
- Median: 1400 × 300 mm
- "30mm × 30mm fixed height wall brackets" is the standard bracket spec
- Single tier, two tier, or shaped variants
- Mostly plain — only ~5% have additional features

### Over-shelf  (39 occurrences)
- Median: 2100 × 375 × 800 mm (height = how high it sits above counter)
- **Wall-mounted by default**, bench-mounted when wall integrity poor
- Single or double tier
- May have built-in infra-red heaters (premium)
- 26% have 14swg top, 36% valance

### Pot shelf  (31 occurrences)  ← **MISSING FROM CURRENT SEED**
- Median: 800 × 500 mm
- "Rodded" construction (rods instead of solid sheet, for drainage)
- "wall mounted single tier rodded pot shelf"
- Sometimes pass-through to dishwasher

### Basket shelf  (17 occurrences)  ← **MISSING FROM CURRENT SEED**
- Median: 1200 × 500 × 1050 mm
- Box section angled with rod dividers, holds dishwash baskets vertically
- "Suitable for 500×500 baskets" common spec

### Drip tray  (34 occurrences)  ← **MISSING FROM CURRENT SEED**
- Median: 2900 × 120 × 30 mm
- Very long, very thin, very shallow
- Removable perforated inserts
- Stainless brackets for mounting to existing bar

### Hot cupboard  (29 occurrences)
- Median: 1400 × 720 × 900 mm
- Heated holding cupboard
- 31% have 14swg top, sliding/pass-through doors common
- 14% have castors (mobile variants)
- Often with sneeze screens, bain marie pans, GN runners

### Wall cupboard  (7 occurrences)
- Median: 1350 × 300 × 600 mm (smaller, mounted high)
- Non-lockable hinged doors, fixed base shelf, adjustable centre shelf

### Storage cupboard  (21 occurrences)
- Median: 750 × 650 × 700 mm
- Often under-sink storage, lockable for chemicals
- 24% have wash hand basin (suggests these are wash-station units)

### Rack  (24 occurrences)
- Median: 1304 × 300 × 1800 mm (tall)
- 4-tier or 5-tier storage racks
- Often with adjustable shelves on ladder racking

### Island counter  (16 occurrences)
- Median: 1900 × 600 × 900 mm
- Free-standing counter, often for bar / display use

### Rotisserie  (6 occurrences) — CCE has repeat customers buying these
- Bespoke rotisserie skewer or stand
- Specific to customer needs — best treated as `custom` for MVP

### Cooksuite / Cucina  (premium, ~£20k+)
- Multi-module assembly with induction zones, plancha, fryers, drawer bases
- Out of MVP scope for the pricing engine — handle as `custom` line with manual price
- CCE has a **standard Cucina spec template** (see `Sample quotes/Cucina Cooksuite's/`)
  documenting the construction grade for every component. The template can be
  emitted as a "specification sheet" by the app for any line item — material
  thickness, grade, finish, frame box sections, panel gauges, etc. Worth doing
  later as a quality / professionalism differentiator.

**Sample Cucina spec format** (Marylebone Hotel):
```
Work Tops:       10swg (3mm) 304 burnished, mirror polished sides and front
Profile:         100mm upstand + 20mm tile return + 50mm profiled downturns
Sound Deadening: 18mm ply + 0.9mm brushed s/s enclosure panel
Shelves:         18swg (1.2mm) 304 brushed
External Panels: 20swg (0.9mm) 304 brushed
Top Frame:       40×40×1.5mm 304 brushed box section
Legs:            30×30×1.2mm 304 brushed box section
Valance Panels:  18swg (1.2mm) 304 brushed
Feet:            Metal adjustable height
Doors / Drawers: Integrally folded handles
Kick Plates:     18swg (1.2mm) 304 brushed, screw-fixed
Over Shelves:    18swg (1.2mm) 304 brushed, riser style supports
Lights:          LED task lighting + dimmer per shelf
Heat Lamps:      300W quartz + dimmer per shelf
```

### Bar / under-bar counter reference library
- `Sample quotes/Interbar Drawings/` — 192 items spanning years of CCE bar work
- Use as canonical reference when refining the `service_counter` calculator
- Common patterns: drip trays, beer fonts with mounting brackets, bespoke
  refrigerated drawer bases (LH / RH / central compressor), ice wells,
  speed rails, perforated drainage

---

## 3. Common features ranked by usage

These are the universal feature adders. Frequency = how often the feature
appears across all parent product types.

| Feature | Universal frequency | Notes |
|---|---|---|
| Materials general (PC sum) | 217× | Catch-all bespoke material allowance, ~£250 list |
| Valance | 216× | Vented panel hiding compressor/services. Most service counters have one. |
| Chamfer | 155× | "Chamfer to exposed corners" — finish on edges |
| Sundries | 148× | Fixed £50 placeholder per parent line for misc consumables |
| Local anti-drip edge | 126× | Slight raised lip around a sink area to contain spills |
| Welded join | 84× | Where two tops/sections join, full-strength weld |
| Sink bowl 500×400×300 | 82× | The most common sink bowl size |
| Chopping board 1/1 GN | 80× | Insert chopping surface (white plastic, GN size) |
| Kick plate | 67× | Bottom panel screw-fixed to legs (protects toes) |
| Sink bowl 600×450×300 | 48× | Dishwash-table size bowl |
| Castors | 45× | Almost always on mobile benches |
| Wash hand basin | 41× | Drop-in WHB, separate from sink bowls |
| Basket runners | 37× | For dishwash basket storage |
| Column cutout | 30× | When a structural column intrudes into the worktop |
| Trivet perforated 400×400 | 23× | Heat-resistant insert |
| Sound deadening ply / panel | 20× / 20× | For noise on stainless tops |
| Drop down section | 18× | Recessed area to accept countertop equipment |
| Speed rail (900 built-in) | 18× | Bar drinks rail |
| Ice well 900 | 17× | Insulated wells for cold drinks |
| Speed rail (600 built-in) | 15× | Smaller bar rail |
| Bin pull-out section | 13× | Hidden bin slot |
| Waste chute (welded) | 13× | Drop-in waste chute through a top |
| Sockets — std SSO / IP DSSO / IP SSO | 7+7+7× | Power sockets cut into splashbacks / panels |
| Lock | 8× | Cylinder lock on a cupboard door |
| Bin flap | 10× | Counter-top bin opening |
| Service port | 14× | Hole/grommet for cabling |

---

## 4. Common sub-components ranked

| Sub-component | Universal frequency | Notes |
|---|---|---|
| End panel double skinned 900 | 99× | Cabinet side panel (closed-side bench) |
| End frame 900 | 98× | Open-leg framework for under-bench |
| 14swg heavy top | 90× | Premium thicker worktop spec |
| Shelf 900 | 74× | Most common shelf size |
| Shelf 600 | 62× | Second most common |
| Upstand 300mm | 49× | Tall upstand for messy areas |
| Shelf 1200 | 40× | |
| Panel 850×600 | 37× | Common cabinet side dimension |
| Door hinged recessed handle | 33× | |
| End panel double skinned 650 | 27× | Shorter cabinet (mobile bench / sink unit common) |
| Drawer integrally folded handle | 27× | |
| Shelf 1800 | 25× | |
| Drawer recessed handle | 23× | |
| Door hinged integrally folded | 21× | |
| Rear panel single skin 1800 | 21× | |
| Drawer bank of 3 | 3× | Premium feature, less common than I assumed |
| MCB 3-phase | 9× | High-end electrical, premium cooksuites |

---

## 5. Construction structures ("Under to be...")

Every bench/counter/sink unit specifies what's under the worktop. Common
patterns from the descriptions:

- **Open framework (no panels)** — just legs/frame, fully open underneath
- **Open framework with base shelf only** — legs + a shelf at bottom (welded)
- **Open framework with void** — legs + clear space (to accept fridge etc.)
- **Cupboard / fully lined ambient cupboard** — fully enclosed
- **Cupboard with hinged door / sliding door / pass-through doors**
- **Lockable storage** — specifically called out
- **Bank of drawers** — drawer cassette
- **Mixed** — e.g. "drawer bank to LH, void to centre, cupboard to RH"

**Implication for the engine:** "structure" is a property of the bench/counter,
not just sub-components. Estimator picks a structure type (open/cupboard/drawer),
which drives default labour hours and which sub-components are valid.

---

## 6. Upstand sizes

I had 300mm as the only upstand in the seed. The data shows:

- **50mm high upstand** — by far most common in benches (small finishing detail)
- **100mm shaped upstand** — service counters and bars
- **150mm fully boxed** — sometimes for sink units
- **300mm** — when splashing is heavy (sink units, dishwash tables)
- **400mm tap-deck upstand** — bespoke for tap deck splashbacks

Need to extend the catalogue for these sizes.

---

## 7. Material grades and finishes seen

- **Grade**: 304 (default, food-safe), 316 (corrosive environments — rare),
  430 (cheaper non-magnetic — rare; seen once)
- **Thickness**:
  - 18swg (1.2mm) — panels, splashbacks, doors, light worktops
  - 16swg (1.5mm) — standard worktops
  - 14swg (2.0mm) — heavy worktops, cooksuites
  - 10swg (3.0mm) — premium cooksuites only
- **Finishes** (the three CCE actually sells):
  - **Brushed** — the standard customer-visible finish, applied at CCE
  - **Burnished** — more reflective than brushed, finished by hand
  - **Mirror polished** — premium, uses LABOUR-110 at £184/hr (2× normal labour rate)

  Note: "DP1" you'll see in supplier sheet specs is the mill finish CCE buys
  raw stock in — that's a stock-keeping label, not a customer-facing finish.

---

## 8. Pricing engine implications — design decisions for the refactor

1. **Per-product calculators**, each implementing a common interface:
   ```typescript
   function calculateProduct(spec, features, subcomponents, company)
     : { breakdown, sell_price_ex_vat, customer_description, ... }
   ```
   Wrappers exist for: worktop, wall_bench, work_bench, mobile_bench,
   service_counter, sink_unit, dishwash_table, hot_cupboard, wall_cupboard,
   storage_cupboard, wall_shelf, over_shelf, pot_shelf, basket_shelf,
   splashback, rack, drip_tray, custom.

2. **Shared helpers**:
   - `sheetCost(area_m2, grade, swg, rates)` — picks the right sheet rate
   - `applyFeature(line, feature, geom, rates)` — returns material+labour uplift
   - `applySubcomponent(line, subcomp, geom, rates)` — same
   - `composeDescription(productType, spec, features, subs)` — generates the
     customer-facing text following CCE's grammar

3. **Structure choice** is a first-class spec field on benches/counters/sinks:
   `structure: 'open' | 'open_with_base_shelf' | 'open_with_void' | 'cupboard' | 'drawer_bank' | 'mixed'`

4. **Upstand height** is a spec field, not a feature — values: 0, 50, 100, 150, 300, 400 mm
   (or custom)

5. **Material grade and swg** are per-product spec — default 304/16swg for
   worktops, 304/18swg for panels.

6. **Mirror polishing** doubles labour for the polishing-time portion.

7. **Batch quotes** — "BATCH OF N" pattern: a single line that represents N
   identical items. Use `quantity` field with a flag `batched: boolean`.

8. **Auto-generated descriptions** can be overridden by the estimator
   per line.

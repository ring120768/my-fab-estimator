# Feature library extracted from CCE quotes

Analysed 106 "Costing Bought In" spreadsheets covering Apr–Jun 2026 quotes.
497 unique stock codes in total. Categorised below into the structure the
multi-line quote builder will use.

## 1. Bespoke products (line-item level) — 58 unique

Full assemblies — what a customer-facing line item describes. The engine
calculates each one as a product with optional features and sub-components.

Most common types we'll model first:

- **Wall bench** (CCE1-F00031 / F00032 / F00061 / F00062 / F00047) — sizes
  2000–2500mm × 650–850mm depth × 900mm high. With/without u-shelf. £574–£784.
- **Mobile centre bench** (CCE1-F00091) — 2000×800×900. £728.
- **Work bench** (CCE1-F00030) — 3335×800×900. £608.
- **Service counter** (CCE1-F00092) — 2300×800×950. £784.
- **Sink unit** (CCE1-F00305 / F00308) — 1950–2400×700×900. £1,432–£1,482.
- **Wall cupboard** (CCE1-F00237) — 950×600×1000. £618.
- **Storage cupboard** (CCE1-F00427) — 750×800. £2,214.
- **Hotcupboard sliding doors 1500** (CCE1-F00469) — £2,004.
- **Over shelf, quartz heated** (CCE1-F00544 / F00547) — 1500 or 2400. £834–£1,164.
- **Five-tier rack** (CCE1-F00380) — 1700×300×1800. £968.
- **Wall shelf** (CCE1-F00149) — 1800×500. £240.
- **Worktop** (priced as inline TOP 01-N items in the quote — no permanent stock code).
- **Splashback** (priced as inline SPLASHBACK 01-N — code SP5 used internally).
- **Island Cucina Cooksuite** (CCE1-F00663) — large bespoke £21k+ premium. Outside MVP scope.

## 2. Fabrication sub-components (attach to a product) — 32 unique

Catalogued sub-items that bolt on to a parent product. Each has a fixed
size-banded price.

- **Drawers**: single recessed handle £298, single integrally folded £366, bank of 3 £1,114
- **Doors**: hinged recessed handle £174, sliding integrally folded £242, pass-through £196, sliding hotcupboard pair £174
- **Rear panels** (single skin): 1200=£172, 1500=£172, 1800=£172, 2100=£242, 2400=£242
- **End panels** (double skinned): 650=£188, 900=£188
- **End frames**: 650=£86, 900=£86
- **Shelves** (single, internal): 600=£80, 900=£96, 1200=£114, 1500=£132, 1800=£152, 2100=£170, 2400=£186
- **Upstand 300mm**: £130
- **Kick plate (screw fixed)**: £54

## 3. Fabrication features (uplift on a product) — 47 unique

Optional add-ons that increase the price of a product. Estimator ticks each
needed.

- **Sink bowls**: 235×335×180=£348, 330×330×200=£356, 400×400×300=£406, 500×400×300=£434, 760×500×370=£852
- **Ice well**: 600=£898, 1200=£1,104
- **Hotcupboard fan-assisted**: £488
- **Bin 400×400×500**: £460. **Pull-out bin section**: £384
- **Speed rail built-in**: 600=£250, 900=£350. Add-on: 600=£175, 900=£220
- **1/1 GN runners**: £225
- **Drop-in wash hand basin**: £248
- **Drop down section**: £240
- **Local anti drip edge**: £240
- **Welded join (between two tops)**: £210
- **Bowl cover 600×450**: £178
- **Tab grabber built in**: £200
- **Chamfer**: £50
- **Service port**: £24
- **Chopping board 1/1 GN white**: £132.50
- **Castors** (set): £84
- **Sound deadening** (ply + enclosure panel): £262 combined
- **Condensation tray 400×400×40**: (price varies)

## 4. Raw stainless materials — 9 unique sheets

Standard CCE-purchased sheets. Already roughly in our costing matrix model.

| Code | Spec | List £/sheet | Supplier |
|---|---|---|---|
| META1-00002 | 2000×1000×1.2mm 304 DP1 | 43.06 | DMS |
| META1-00003 | 2000×1000×1.5mm 304 DP1 | 52.10 | ThyssenKrupp |
| META1-00004 | 2000×1000×2.0mm 304 DP1 | 66.15 | ThyssenKrupp |
| META1-00007 | 2500×1250×1.2mm 304 DP1 | 69.43 | DMS |
| META1-00008 | 2500×1250×1.5mm 304 DP1 | 87.52 | DMS |
| META1-00009 | 2500×1250×2.0mm 304 DP1 | 103.40 | ThyssenKrupp |
| META1-00074 | 2000×1000×1.2mm **430** DP1 | 48.70 | ThyssenKrupp |
| META1-00017 | Box 25×25×1.5mm | 3.25 | ThyssenKrupp |
| META1-00019 | Box 30×30×1.2mm | 9.00 | — |

Costing matrix should let CCE store these by spec rather than the bespoke
geometric "per m²" model alone (or both — the engine can derive from either).

## 5. Labour rates — 7 distinct types

| Code | Description | £/hr list |
|---|---|---|
| LABOUR-001 | Factory NWH (normal working hours) | 92 |
| LABOUR-004 | Factory deliver in sections | 92 |
| LABOUR-105 | Factory metal finish — burnished | 92 |
| LABOUR-110 | Factory metal finish — **mirror polished** | 184 |
| LABOUR-050 | Factory wire socket (specialist) | 46 |
| LABOUR-170 | Factory fit drawer runners | 46 |
| LABOUR-350 | Drawing / O&M manual | 100 |

The 35% supplier "discount" applies, then 25% first-MU markup, giving a sell
rate of £74.75/hr for LABOUR-001. Mirror polishing is double the base rate.

## 6. Services / free-text lines — 19 distinct codes

These are quote-specific text blocks, not calculated prices. The quote builder
needs a "free-text line item" that lets the estimator type a description and
set a flat price (or £0 for "by others"/"existing"/"future" markers).

Common types: project management (PM), site attendance, hidden money/spare,
area headers, accessory packs, warranty extensions, "by client", "by others",
"existing item", "future item", "item omitted".

## 7. Bought-in equipment — 320 unique codes (rare on fab-only quotes)

Mechline, Rational, Meiko, Winterhalter, Falcon, Frost Tech, Scandia, etc.
Mostly outside scope for the fabrication estimator MVP. Architecturally we
support them as a "bought-in line" with supplier list price + supplier
discount + markup. Estimator picks them from a catalogue (which Sage owns).

---

## Implications for the engine

**Product types we'll support in MVP**: worktop, splashback, wall_bench,
mobile_bench, work_bench, service_counter, sink_unit, wall_cupboard, hot_cupboard,
wall_shelf, over_shelf, rack.

**Each product** has:
- Geometry (length/depth/height, sheet thickness, material grade)
- Optional sub-components from §2 (drawers, doors, panels, shelves, kick plates)
- Optional features from §3 (sink bowls, anti-drip edges, welded joins, etc.)
- Calculated material cost (sheets used × cost/sheet, or m² × £/m² — same answer)
- Calculated labour hours from a default-per-product baseline + per-feature uplifts
- Estimator can override labour hours and unit price

**Each feature** has a fixed price OR a calculated price (material + labour).
Initially I'll seed the library with CCE's catalogue values as the defaults, and
allow companies to override per their own costing matrix.

**Free-text lines** are first-class line items with a description + flat price.

**Bought-in lines** are supply-only items with supplier list price + discount
+ markup chain. No geometry, no labour calc.

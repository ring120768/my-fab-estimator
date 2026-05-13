// Generate customer-facing line descriptions in CCE's house grammar.
//
// Pattern:
//   [Finish] [grade] stainless steel [PRODUCT] approx. {L}mm × {D}mm × {H}mm
//   complete with [top features] [upstand]
//   [Under to be {structure} {shelving}]
//   [+ extra feature callouts]

import type {
  AnyProductSpec,
  BenchSpec,
  CupboardSpec,
  DripTraySpec,
  FeatureChoice,
  FeatureLibraryEntry,
  QuoteEngineLibrary,
  ShelfSpec,
  SplashbackSpec,
  SubcomponentChoice,
  SubcomponentLibraryEntry,
  UnderStructure,
  WorktopSpec,
} from "./types";
import { swgToMm } from "./material";

const finishLabel = {
  brushed: "brushed",
  burnished: "burnished",
  mirror: "mirror polished",
} as const;

function materialPrefix(spec: { material: { grade: string; swg: number; finish: keyof typeof finishLabel } }): string {
  const thickness_mm = swgToMm(spec.material.swg);
  return `${spec.material.swg}swg (${thickness_mm}mm thick) ${spec.material.grade} grade ${finishLabel[spec.material.finish]} stainless steel`;
}

function dimensions(l: number, d: number, h?: number): string {
  return h ? `${l}mm × ${d}mm × ${h}mm` : `${l}mm × ${d}mm`;
}

function structurePhrase(s: UnderStructure): string {
  switch (s) {
    case "open_no_panels": return "open framework (no panels) with void to full length";
    case "open_with_base_shelf": return "open framework with fixed base shelf to full length";
    case "open_with_void": return "open framework with void to full length";
    case "open_with_mid_shelf": return "open framework with adjustable mid shelf";
    case "cupboard_hinged": return "ambient cupboard with hinged door";
    case "cupboard_sliding": return "ambient cupboard with sliding doors";
    case "drawer_bank": return "bank of drawers";
    case "lined_lockable": return "fully lined ambient storage cupboard with lockable hinged door";
    case "mixed": return "mixed configuration (see specification)";
    // Defensive default — never print "undefined" to a customer-facing quote.
    default: return "open framework (per specification)";
  }
}

/** Listify selected feature/subcomponent names in natural English. */
function listify(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0]!;
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return items.slice(0, -1).join(", ") + ", and " + items[items.length - 1];
}

function featureNamesFor(
  choices: FeatureChoice[],
  library: QuoteEngineLibrary
): string[] {
  return choices
    .map((c) => library.features.find((f) => f.code === c.code))
    .filter((f): f is FeatureLibraryEntry => Boolean(f))
    .map((f) => f.name.toLowerCase());
}

function subcompNamesFor(
  choices: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string[] {
  return choices
    .map((c) => library.subcomponents.find((s) => s.code === c.code))
    .filter((s): s is SubcomponentLibraryEntry => Boolean(s))
    .map((s) => s.name.toLowerCase());
}

// ---------- Per-product description generators ----------

export function describeWorktop(
  spec: WorktopSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  const parts: string[] = [];
  parts.push(`${materialPrefix(spec)} work top approx. ${dimensions(spec.length_mm, spec.depth_mm)}`);
  if (spec.downturn_all_sides) parts.push(`complete with down turns to all sides`);
  if (spec.upstand_size_mm > 0) {
    const pos = spec.upstand_position === "rear_and_ends" ? "rear and both ends" : "rear";
    parts.push(`${spec.upstand_size_mm}mm high upstand to ${pos}`);
  }
  const fNames = featureNamesFor(features, library);
  if (fNames.length) parts.push(`with ${listify(fNames)}`);
  const sNames = subcompNamesFor(subs, library);
  if (sNames.length) parts.push(`plus ${listify(sNames)}`);
  return parts.join(", ") + ".";
}

export function describeBench(
  spec: BenchSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  const productName = {
    wall_bench: "wall bench",
    work_bench: "work bench",
    mobile_bench: "mobile centre bench",
    service_counter: "service counter",
    sink_unit: "sink unit",
    dishwash_table: "dishwash table",
  }[spec.product_type];

  const parts: string[] = [];
  parts.push(
    `Stainless steel ${productName} approx. ${dimensions(spec.length_mm, spec.depth_mm, spec.height_mm)} complete with`
  );

  const topBits: string[] = [];
  if (spec.upstand_size_mm > 0) {
    const pos =
      spec.upstand_position === "rear_and_ends" ? "rear and both ends" :
      spec.upstand_position === "rear_and_both_ends" ? "rear and both ends" :
      "rear";
    topBits.push(`${spec.upstand_size_mm}mm high upstand to ${pos}`);
  }
  const fNames = featureNamesFor(features, library);
  topBits.push(...fNames);
  if (topBits.length) parts[parts.length - 1] += ` ${listify(topBits)}.`;
  else parts[parts.length - 1] += "."; // close off

  // Under structure
  parts.push(`Under to be ${structurePhrase(spec.under_structure)}.`);

  // Sub-components
  const sNames = subcompNamesFor(subs, library);
  if (sNames.length) parts.push(`Includes ${listify(sNames)}.`);

  if (spec.product_type === "sink_unit") parts.push("Price excluding taps.");
  return parts.join(" ");
}

export function describeSplashback(
  spec: SplashbackSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  const parts: string[] = [];
  parts.push(`${materialPrefix(spec)} splashback approx. ${spec.length_mm}mm × ${spec.wall_height_mm}mm high`);
  const fNames = featureNamesFor(features, library);
  if (fNames.length) parts.push(`complete with ${listify(fNames)}`);
  return parts.join(", ") + ".";
}

export function describeShelf(
  spec: ShelfSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  const t = spec.product_type;
  const name =
    t === "pot_shelf" ? (spec.rodded ? "rodded pot shelf" : "pot shelf") :
    t === "basket_shelf" ? "angled basket shelf with rod dividers" :
    t === "over_shelf" ? `${spec.tiers > 1 ? `${spec.tiers} tier ` : ""}over shelf` :
    `${spec.tiers > 1 ? `${spec.tiers} tier ` : ""}wall shelf`;

  const parts: string[] = [];
  parts.push(`Stainless steel ${name} approx. ${dimensions(spec.length_mm, spec.depth_mm, spec.height_mm)}`);
  if (spec.wall_brackets ?? true) parts.push(`complete with 30mm × 30mm fixed height wall brackets`);
  const fNames = featureNamesFor(features, library);
  if (fNames.length) parts.push(`and ${listify(fNames)}`);
  return parts.join(", ") + ".";
}

export function describeCupboard(
  spec: CupboardSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  const name = {
    wall_cupboard: "wall cupboard",
    hot_cupboard: "hot cupboard",
    storage_cupboard: "storage cupboard",
  }[spec.product_type];
  const doorBits = spec.doors === "none"
    ? "no doors"
    : `${spec.lockable ? "lockable " : "non-lockable "}${spec.doors} door${spec.number_of_doors > 1 ? "s" : ""}`;
  const shelfBits = spec.internal_shelves > 0
    ? `${spec.internal_shelves} internal shelf${spec.internal_shelves > 1 ? "es" : ""}${spec.adjustable_shelves ? " adjustable on ladder racking" : " fixed"}`
    : "";
  const parts = [`Stainless steel ${name} approx. ${dimensions(spec.length_mm, spec.depth_mm, spec.height_mm)} complete with ${doorBits}`];
  if (shelfBits) parts.push(shelfBits);
  const fNames = featureNamesFor(features, library);
  if (fNames.length) parts.push(listify(fNames));
  return parts.filter(Boolean).join(", ") + ".";
}

export function describeDripTray(
  spec: DripTraySpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  return `Stainless steel drip tray approx. ${dimensions(spec.length_mm, spec.depth_mm, spec.height_mm)} complete with ${spec.perforated_inserts ? "removable perforated inserts" : "plain base"} and ${spec.fixing_brackets} stainless steel fixing brackets.`;
}

/** Dispatch by product type. */
export function composeDescription(
  spec: AnyProductSpec,
  features: FeatureChoice[],
  subs: SubcomponentChoice[],
  library: QuoteEngineLibrary
): string {
  switch (spec.product_type) {
    case "worktop":     return describeWorktop(spec, features, subs, library);
    case "splashback":  return describeSplashback(spec, features, subs, library);
    case "wall_bench":
    case "work_bench":
    case "mobile_bench":
    case "service_counter":
    case "sink_unit":
    case "dishwash_table": return describeBench(spec, features, subs, library);
    case "wall_shelf":
    case "over_shelf":
    case "pot_shelf":
    case "basket_shelf":return describeShelf(spec, features, subs, library);
    case "wall_cupboard":
    case "hot_cupboard":
    case "storage_cupboard": return describeCupboard(spec, features, subs, library);
    case "drip_tray":   return describeDripTray(spec, features, subs, library);
    case "custom":      return spec.description;
    case "free_text":   return spec.description;
    case "bought_in":   return spec.description;
    case "delivery":    return spec.description;
    default: {
      // dishwash_table, island_counter, rack — not yet implemented with their
      // own spec types. Fall back to a generic placeholder.
      const fallback: string = (spec as { product_type: string }).product_type;
      return `[${fallback}] specification`;
    }
  }
}

// Convert a ParsedSchedule (from AI) into LineItemInput[] for the quote builder.
//
// Each item is mapped:
//   - bespoke fabrication → typed product spec using AI-suggested values + sensible fallbacks
//   - bought-in equipment → bought_in line with supplier list price etc.
//   - "BY CLIENT" / "FUTURE ITEM" → free_text line
//   - unmappable → custom line with the description verbatim

import type { ParsedLineItem, ParsedSchedule } from "./types";
import type {
  AnyProductSpec,
  BenchSpec,
  LineItemInput,
  ProductType,
  SplashbackSpec,
  WorktopSpec,
} from "@/pricing/v2/types";

const BENCH_TYPES: ProductType[] = [
  "wall_bench", "work_bench", "mobile_bench", "service_counter",
  "sink_unit", "dishwash_table",
];

const SHELF_TYPES: ProductType[] = [
  "wall_shelf", "over_shelf", "pot_shelf", "basket_shelf",
];

const CUPBOARD_TYPES: ProductType[] = [
  "wall_cupboard", "hot_cupboard", "storage_cupboard",
];

export function importedScheduleToLines(
  schedule: ParsedSchedule
): { header: HeaderPatch; lines: LineItemInput[] } {
  // Header info from drawing metadata
  const md = schedule.drawing_metadata;
  const header: HeaderPatch = {
    quote_reference: md.drawing_number ?? "",
    customer_name: md.client_name ?? "",
    project_name: md.project_name ?? md.area ?? "",
    project_location: md.site_address ?? "",
    prepared_by: md.drawn_by ?? "",
  };

  const lines: LineItemInput[] = schedule.line_items.map(toLineItemInput);
  return { header, lines };
}

export interface HeaderPatch {
  quote_reference: string;
  customer_name: string;
  project_name: string;
  project_location: string;
  prepared_by: string;
}

function toLineItemInput(item: ParsedLineItem): LineItemInput {
  const qty = Math.max(1, Math.round(item.quantity || 1));

  // ----- FREE TEXT / CLIENT-SUPPLIED / FUTURE -----
  if (item.is_client_supplied || item.is_future_item) {
    const tag = item.is_future_item ? "FUTURE ITEM" : "BY CLIENT";
    return {
      spec: {
        product_type: "free_text",
        description: `${tag}: ${item.description}`,
        manual_price_ex_vat: undefined,
      },
      features: [],
      subcomponents: [],
      quantity: qty,
    };
  }

  // ----- BOUGHT-IN EQUIPMENT -----
  if (item.is_bought_in_equipment) {
    return {
      spec: {
        product_type: "bought_in",
        description: item.description,
        manufacturer: item.manufacturer,
        model: item.model,
        supplier_list_price: item.suggested_supplier_list_price ?? 0,
        supplier_discount_pct: 0, // estimator fills in
        markup_pct: 15,            // sensible default; estimator can adjust
      },
      features: [],
      subcomponents: [],
      quantity: qty,
    };
  }

  // ----- BESPOKE FABRICATION -----
  const pt = item.inferred_product_type;
  const sp = item.suggested_spec ?? {};

  // Default material
  const material = {
    grade: (sp.material_grade ?? "304") as "304" | "316" | "430",
    swg: (sp.material_swg ?? 16) as 18 | 16 | 14 | 10,
    finish: (sp.material_finish ?? "brushed") as "brushed" | "burnished" | "mirror",
  };

  // Bench-family
  if (BENCH_TYPES.includes(pt)) {
    const spec: BenchSpec = {
      product_type: pt as BenchSpec["product_type"],
      length_mm: sp.length_mm ?? 1800,
      depth_mm: sp.depth_mm ?? 700,
      height_mm: sp.height_mm ?? 900,
      material,
      upstand_size_mm: (sp.upstand_size_mm ?? 50) as BenchSpec["upstand_size_mm"],
      upstand_position: sp.upstand_position ?? "rear",
      under_structure: (sp.under_structure as BenchSpec["under_structure"]) ?? "open_with_base_shelf",
      number_of_legs: 4,
      leg_section_mm: 30,
    };
    // Use the AI's original description text as the customer-facing line text
    // so estimators can see what was extracted alongside any auto-generated text.
    return {
      spec,
      features: [],
      subcomponents: [],
      quantity: qty,
      description_override: item.description,
    };
  }

  // Worktop
  if (pt === "worktop") {
    const upstandPos: WorktopSpec["upstand_position"] =
      sp.upstand_position === "rear_and_ends" || sp.upstand_position === "rear_and_both_ends"
        ? "rear_and_ends"
        : "rear";
    const spec: WorktopSpec = {
      product_type: "worktop",
      length_mm: sp.length_mm ?? 1800,
      depth_mm: sp.depth_mm ?? 700,
      material,
      downturn_all_sides: true,
      upstand_size_mm: (sp.upstand_size_mm ?? 50) as WorktopSpec["upstand_size_mm"],
      upstand_position: upstandPos,
    };
    return { spec, features: [], subcomponents: [], quantity: qty };
  }

  // Splashback
  if (pt === "splashback") {
    const spec: SplashbackSpec = {
      product_type: "splashback",
      length_mm: sp.length_mm ?? 1800,
      depth_mm: 1,
      material,
      wall_height_mm: sp.height_mm ?? 600,
    };
    return { spec, features: [], subcomponents: [], quantity: qty };
  }

  // Shelf family
  if (SHELF_TYPES.includes(pt)) {
    return {
      spec: {
        product_type: pt as "wall_shelf" | "over_shelf" | "pot_shelf" | "basket_shelf",
        length_mm: sp.length_mm ?? 1400,
        depth_mm: sp.depth_mm ?? 300,
        material: { ...material, swg: 18 },
        tiers: 1,
        wall_brackets: true,
      },
      features: [], subcomponents: [], quantity: qty,
    };
  }

  // Cupboard family
  if (CUPBOARD_TYPES.includes(pt)) {
    return {
      spec: {
        product_type: pt as "wall_cupboard" | "hot_cupboard" | "storage_cupboard",
        length_mm: sp.length_mm ?? 1450,
        depth_mm: sp.depth_mm ?? 300,
        height_mm: sp.height_mm ?? 600,
        material,
        doors: "hinged",
        number_of_doors: 2,
        internal_shelves: 1,
        adjustable_shelves: false,
        lockable: false,
      },
      features: [], subcomponents: [], quantity: qty,
    };
  }

  // Drip tray
  if (pt === "drip_tray") {
    return {
      spec: {
        product_type: "drip_tray",
        length_mm: sp.length_mm ?? 1200,
        depth_mm: sp.depth_mm ?? 120,
        height_mm: 30,
        material,
        perforated_inserts: true,
        fixing_brackets: 3,
      },
      features: [], subcomponents: [], quantity: qty,
    };
  }

  // Fallback — custom
  return {
    spec: {
      product_type: "custom",
      description: item.description,
      manual_price_ex_vat: 0,
    },
    features: [],
    subcomponents: [],
    quantity: qty,
  };
}

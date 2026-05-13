"use client";

// Editor for a single line item on a quote. Renders the right form fields
// based on the chosen product type. Calls back with a complete LineItemInput
// when the user finishes.

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { NumberField, SelectField, TextField, ToggleField } from "@/components/Field";
import type {
  AnyProductSpec,
  BenchSpec,
  CustomSpec,
  FeatureChoice,
  FreeTextSpec,
  LineItemInput,
  ProductType,
  QuoteEngineLibrary,
  ShelfSpec,
  SplashbackSpec,
  SubcomponentChoice,
  WorktopSpec,
} from "@/pricing/v2/types";
import type { ProductTypeRow } from "@/lib/supabase/quotes";
import { checkDimensions } from "@/lib/pricing/dimension-validation";

// Supported product types in this MVP UI. Others fall back to "custom".
const SUPPORTED = new Set<ProductType>([
  "worktop", "splashback",
  "wall_bench", "work_bench", "mobile_bench", "service_counter", "sink_unit", "dishwash_table",
  "wall_shelf", "over_shelf",
  "custom", "free_text", "delivery",
]);

interface Props {
  library: QuoteEngineLibrary;
  productTypes: ProductTypeRow[];
  initial?: LineItemInput;
  onSave: (input: LineItemInput) => void;
  onCancel: () => void;
}

export function LineItemEditor({ library, productTypes, initial, onSave, onCancel }: Props) {
  const [productType, setProductType] = useState<ProductType>(
    initial?.spec.product_type ?? "wall_bench"
  );
  const [quantity, setQuantity] = useState<number>(initial?.quantity ?? 1);
  const [labourOverride, setLabourOverride] = useState<number | "">(initial?.labour_hours_override ?? "");
  const [priceOverride, setPriceOverride] = useState<number | "">(initial?.unit_price_override ?? "");

  // Spec state — start with a sensible default per product type
  const [spec, setSpec] = useState<AnyProductSpec>(initial?.spec ?? defaultSpecFor("wall_bench"));

  // Selected features & sub-components
  const [features, setFeatures] = useState<FeatureChoice[]>(initial?.features ?? []);
  const [subcomps, setSubcomps] = useState<SubcomponentChoice[]>(initial?.subcomponents ?? []);

  // When product type changes, replace the spec with the new default
  const handleTypeChange = (newType: ProductType) => {
    setProductType(newType);
    setSpec(defaultSpecFor(newType));
    setFeatures([]);
    setSubcomps([]);
  };

  // Filter library entries to those applicable to the current product type
  const applicableFeatures = useMemo(
    () => library.features.filter((f) => f.applies_to.includes(productType)),
    [library, productType]
  );
  const applicableSubs = useMemo(
    () => library.subcomponents.filter((s) => s.applies_to.includes(productType)),
    [library, productType]
  );

  // Dimension sanity checks (catches typos like 10mm vs 100mm)
  const dimCheck = useMemo(() => {
    const dims = "length_mm" in spec
      ? { length_mm: spec.length_mm, depth_mm: (spec as { depth_mm?: number }).depth_mm, height_mm: (spec as { height_mm?: number }).height_mm }
      : {};
    return checkDimensions(spec.product_type, dims);
  }, [spec]);

  const canSave = dimCheck.errors.length === 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      spec,
      features,
      subcomponents: subcomps,
      quantity,
      labour_hours_override: typeof labourOverride === "number" ? labourOverride : undefined,
      unit_price_override: typeof priceOverride === "number" ? priceOverride : undefined,
    });
  };

  return (
    <Card title="Edit line item">
      <div className="space-y-4">
        <SelectField
          label="Product type"
          value={productType}
          onChange={(e) => handleTypeChange(e.target.value as ProductType)}
          options={productTypes
            .filter((pt) => SUPPORTED.has(pt.code as ProductType))
            .map((pt) => ({ value: pt.code, label: pt.name }))}
          hint={SUPPORTED.has(productType) ? undefined : "Limited UI for this type — using free text"}
        />

        <SpecForm spec={spec} setSpec={setSpec} />

        {applicableFeatures.length > 0 && (
          <FeatureChips
            label="Features"
            entries={applicableFeatures.map((f) => ({ code: f.code, name: f.name, default_price: f.default_price }))}
            selected={features}
            setSelected={setFeatures}
          />
        )}
        {applicableSubs.length > 0 && (
          <FeatureChips
            label="Sub-components"
            entries={applicableSubs.map((s) => ({ code: s.code, name: s.name, default_price: s.default_price }))}
            selected={subcomps}
            setSelected={setSubcomps}
          />
        )}

        <div className="grid grid-cols-3 gap-4">
          <NumberField
            label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
          <NumberField
            label="Labour hours override"
            value={labourOverride === "" ? "" : labourOverride}
            placeholder="auto"
            onChange={(e) => setLabourOverride(e.target.value === "" ? "" : Number(e.target.value))}
            hint="Leave blank to use engine default"
          />
          <NumberField
            label="Unit price override (£)"
            value={priceOverride === "" ? "" : priceOverride}
            placeholder="auto"
            onChange={(e) => setPriceOverride(e.target.value === "" ? "" : Number(e.target.value))}
            hint="Leave blank to use calculated price"
          />
        </div>

        {dimCheck.errors.length > 0 && (
          <div className="rounded-md bg-bad/10 border border-bad/30 p-3 text-sm text-bad">
            <div className="font-medium mb-1">⚠ Dimension errors — fix before saving</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {dimCheck.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}
        {dimCheck.warnings.length > 0 && dimCheck.errors.length === 0 && (
          <div className="rounded-md bg-warn/10 border border-warn/30 p-3 text-sm text-ink">
            <div className="font-medium mb-1 text-warn">⚠ Unusual dimensions — double-check</div>
            <ul className="list-disc list-inside space-y-0.5 text-xs">
              {dimCheck.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>Save line</Button>
        </div>
      </div>
    </Card>
  );
}

// ---------- Spec forms per product type ----------

function SpecForm({ spec, setSpec }: { spec: AnyProductSpec; setSpec: (s: AnyProductSpec) => void }) {
  switch (spec.product_type) {
    case "worktop":          return <WorktopForm spec={spec} setSpec={setSpec} />;
    case "splashback":       return <SplashbackForm spec={spec} setSpec={setSpec} />;
    case "wall_bench":
    case "work_bench":
    case "mobile_bench":
    case "service_counter":
    case "sink_unit":
    case "dishwash_table":   return <BenchForm spec={spec} setSpec={setSpec} />;
    case "wall_shelf":
    case "over_shelf":
    case "pot_shelf":
    case "basket_shelf":     return <ShelfForm spec={spec} setSpec={setSpec} />;
    case "custom":           return <CustomForm spec={spec} setSpec={setSpec} />;
    case "free_text":        return <FreeTextForm spec={spec} setSpec={setSpec} />;
    case "delivery":         return <DeliveryForm spec={spec} setSpec={setSpec} />;
    default:
      return (
        <div className="rounded-md bg-warn/10 border border-warn/30 p-3 text-sm text-ink">
          The dedicated UI for this product type isn&apos;t built yet. For now,
          choose <strong>Custom bespoke</strong> or <strong>Free text line</strong>
          to add this item, or switch to a supported product above.
        </div>
      );
  }
}

function MaterialFields({ spec, setSpec }: { spec: AnyProductSpec; setSpec: (s: AnyProductSpec) => void }) {
  if (!("material" in spec)) return null;
  return (
    <div className="grid grid-cols-3 gap-4">
      <SelectField
        label="Grade"
        value={spec.material.grade}
        onChange={(e) => setSpec({ ...spec, material: { ...spec.material, grade: e.target.value as "304" | "316" | "430" } })}
        options={[{ value: "304", label: "304" }, { value: "316", label: "316" }, { value: "430", label: "430" }]}
      />
      <SelectField
        label="Gauge"
        value={String(spec.material.swg)}
        onChange={(e) => setSpec({ ...spec, material: { ...spec.material, swg: Number(e.target.value) as 18 | 16 | 14 | 10 } })}
        options={[
          { value: "18", label: "18swg (1.2mm)" },
          { value: "16", label: "16swg (1.5mm)" },
          { value: "14", label: "14swg (2.0mm)" },
          { value: "10", label: "10swg (3.0mm)" },
        ]}
      />
      <SelectField
        label="Finish"
        value={spec.material.finish}
        onChange={(e) => setSpec({ ...spec, material: { ...spec.material, finish: e.target.value as "brushed" | "burnished" | "mirror" } })}
        options={[
          { value: "brushed", label: "Brushed" },
          { value: "burnished", label: "Burnished" },
          { value: "mirror", label: "Mirror" },
        ]}
        hint={spec.material.finish === "mirror" ? "2× labour cost" : undefined}
      />
    </div>
  );
}

function WorktopForm({ spec, setSpec }: { spec: WorktopSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <MaterialFields spec={spec} setSpec={setSpec} />
      <div className="grid grid-cols-3 gap-4">
        <NumberField label="Length (mm)" value={spec.length_mm} onChange={(e) => setSpec({ ...spec, length_mm: Number(e.target.value) })} />
        <NumberField label="Depth (mm)" value={spec.depth_mm} onChange={(e) => setSpec({ ...spec, depth_mm: Number(e.target.value) })} />
        <NumberField label="Upstand (mm)" value={spec.upstand_size_mm} onChange={(e) => setSpec({ ...spec, upstand_size_mm: Number(e.target.value) })} />
      </div>
      <ToggleField
        label="Downturn on all sides"
        checked={spec.downturn_all_sides}
        onChange={(v) => setSpec({ ...spec, downturn_all_sides: v })}
      />
    </div>
  );
}

function SplashbackForm({ spec, setSpec }: { spec: SplashbackSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <MaterialFields spec={spec} setSpec={setSpec} />
      <div className="grid grid-cols-3 gap-4">
        <NumberField label="Length (mm)" value={spec.length_mm} onChange={(e) => setSpec({ ...spec, length_mm: Number(e.target.value) })} />
        <NumberField label="Wall height (mm)" value={spec.wall_height_mm} onChange={(e) => setSpec({ ...spec, wall_height_mm: Number(e.target.value) })} />
      </div>
      <div className="flex gap-6">
        <ToggleField label="Joining edge — left" checked={!!spec.joining_edge_left} onChange={(v) => setSpec({ ...spec, joining_edge_left: v })} />
        <ToggleField label="Joining edge — right" checked={!!spec.joining_edge_right} onChange={(v) => setSpec({ ...spec, joining_edge_right: v })} />
      </div>
    </div>
  );
}

function BenchForm({ spec, setSpec }: { spec: BenchSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <MaterialFields spec={spec} setSpec={setSpec} />
      <div className="grid grid-cols-4 gap-4">
        <NumberField label="Length (mm)" value={spec.length_mm} onChange={(e) => setSpec({ ...spec, length_mm: Number(e.target.value) })} />
        <NumberField label="Depth (mm)" value={spec.depth_mm} onChange={(e) => setSpec({ ...spec, depth_mm: Number(e.target.value) })} />
        <NumberField label="Height (mm)" value={spec.height_mm} onChange={(e) => setSpec({ ...spec, height_mm: Number(e.target.value) })} />
        <NumberField label="Upstand (mm)" value={spec.upstand_size_mm} onChange={(e) => setSpec({ ...spec, upstand_size_mm: Number(e.target.value) })} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <SelectField
          label="Under structure"
          value={spec.under_structure}
          onChange={(e) => setSpec({ ...spec, under_structure: e.target.value as BenchSpec["under_structure"] })}
          options={[
            { value: "open_no_panels", label: "Open framework (no panels)" },
            { value: "open_with_base_shelf", label: "Open + fixed base shelf" },
            { value: "open_with_void", label: "Open + void" },
            { value: "open_with_mid_shelf", label: "Open + mid shelf" },
            { value: "cupboard_hinged", label: "Cupboard, hinged doors" },
            { value: "cupboard_sliding", label: "Cupboard, sliding doors" },
            { value: "drawer_bank", label: "Drawer bank" },
            { value: "lined_lockable", label: "Fully lined lockable" },
            { value: "mixed", label: "Mixed configuration" },
          ]}
        />
        <NumberField label="Number of legs" value={spec.number_of_legs} onChange={(e) => setSpec({ ...spec, number_of_legs: Number(e.target.value) })} />
        <SelectField
          label="Leg section (mm)"
          value={String(spec.leg_section_mm)}
          onChange={(e) => setSpec({ ...spec, leg_section_mm: Number(e.target.value) as 25 | 30 | 40 })}
          options={[
            { value: "25", label: "25×25" },
            { value: "30", label: "30×30" },
            { value: "40", label: "40×40" },
          ]}
        />
      </div>
    </div>
  );
}

function ShelfForm({ spec, setSpec }: { spec: ShelfSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <MaterialFields spec={spec} setSpec={setSpec} />
      <div className="grid grid-cols-4 gap-4">
        <NumberField label="Length (mm)" value={spec.length_mm} onChange={(e) => setSpec({ ...spec, length_mm: Number(e.target.value) })} />
        <NumberField label="Depth (mm)" value={spec.depth_mm} onChange={(e) => setSpec({ ...spec, depth_mm: Number(e.target.value) })} />
        <SelectField
          label="Tiers"
          value={String(spec.tiers)}
          onChange={(e) => setSpec({ ...spec, tiers: Number(e.target.value) as 1 | 2 | 3 })}
          options={[{ value: "1", label: "Single" }, { value: "2", label: "Two tier" }, { value: "3", label: "Three tier" }]}
        />
        <ToggleField label="Wall brackets" checked={spec.wall_brackets ?? true} onChange={(v) => setSpec({ ...spec, wall_brackets: v })} />
      </div>
    </div>
  );
}

function CustomForm({ spec, setSpec }: { spec: CustomSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Description"
        value={spec.description}
        onChange={(e) => setSpec({ ...spec, description: e.target.value })}
      />
      <NumberField
        label="Manual price ex VAT (£)"
        value={spec.manual_price_ex_vat}
        onChange={(e) => setSpec({ ...spec, manual_price_ex_vat: Number(e.target.value) })}
      />
    </div>
  );
}

function FreeTextForm({ spec, setSpec }: { spec: FreeTextSpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Free text"
        value={spec.description}
        onChange={(e) => setSpec({ ...spec, description: e.target.value })}
        hint="Plain text line — appears on the quote with no price unless one is set"
      />
      <NumberField
        label="Price ex VAT (£, optional)"
        value={spec.manual_price_ex_vat ?? 0}
        onChange={(e) => setSpec({ ...spec, manual_price_ex_vat: Number(e.target.value) || undefined })}
      />
    </div>
  );
}

function DeliveryForm({ spec, setSpec }: { spec: import("@/pricing/v2/types").DeliverySpec; setSpec: (s: AnyProductSpec) => void }) {
  return (
    <div className="space-y-4">
      <TextField
        label="Delivery description"
        value={spec.description}
        onChange={(e) => setSpec({ ...spec, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Type"
          value={spec.delivery_type}
          onChange={(e) => setSpec({ ...spec, delivery_type: e.target.value as typeof spec.delivery_type })}
          options={[
            { value: "kerbside", label: "Kerbside" },
            { value: "tail_lift", label: "Tail lift" },
            { value: "white_glove", label: "White glove" },
            { value: "install", label: "Delivery + install" },
          ]}
        />
        <NumberField
          label="Price ex VAT (£)"
          value={spec.manual_price_ex_vat}
          onChange={(e) => setSpec({ ...spec, manual_price_ex_vat: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

// ---------- Feature/sub-component chip selector ----------

function FeatureChips({
  label, entries, selected, setSelected,
}: {
  label: string;
  entries: { code: string; name: string; default_price?: number }[];
  selected: { code: string; quantity: number }[];
  setSelected: (next: { code: string; quantity: number }[]) => void;
}) {
  const isPicked = (code: string) => selected.some((s) => s.code === code);
  const toggle = (code: string) => {
    if (isPicked(code)) setSelected(selected.filter((s) => s.code !== code));
    else setSelected([...selected, { code, quantity: 1 }]);
  };
  return (
    <div>
      <div className="text-xs font-medium text-muted mb-2">{label}</div>
      <div className="flex flex-wrap gap-2">
        {entries.map((e) => {
          const picked = isPicked(e.code);
          return (
            <button
              key={e.code}
              type="button"
              onClick={() => toggle(e.code)}
              className={`text-xs rounded-full px-3 py-1 border transition-colors ${
                picked
                  ? "bg-accent text-white border-accent"
                  : "bg-panel text-ink border-border hover:bg-soft"
              }`}
              title={e.default_price ? `£${e.default_price}` : undefined}
            >
              {e.name}
              {e.default_price && (
                <span className={`ml-1.5 ${picked ? "text-white/80" : "text-muted"}`}>£{e.default_price}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Defaults ----------

function defaultSpecFor(t: ProductType): AnyProductSpec {
  const m = { grade: "304" as const, swg: 16 as const, finish: "brushed" as const };
  switch (t) {
    case "worktop": return { product_type: "worktop", length_mm: 1800, depth_mm: 700, material: m, downturn_all_sides: true, upstand_size_mm: 50, upstand_position: "rear" };
    case "splashback": return { product_type: "splashback", length_mm: 2000, depth_mm: 1, material: { ...m, swg: 18 }, wall_height_mm: 600 };
    case "wall_bench":
    case "work_bench":
    case "mobile_bench":
    case "service_counter":
    case "sink_unit":
    case "dishwash_table":
      return { product_type: t, length_mm: 2000, depth_mm: 700, height_mm: 900, material: m, upstand_size_mm: 50, upstand_position: "rear", under_structure: "open_with_base_shelf", number_of_legs: 4, leg_section_mm: 30 };
    case "wall_shelf":
    case "over_shelf":
    case "pot_shelf":
    case "basket_shelf":
      return { product_type: t, length_mm: 1400, depth_mm: 300, material: { ...m, swg: 18 }, tiers: 1, wall_brackets: true };
    case "delivery":
      return { product_type: "delivery", description: "Kerbside delivery to ground floor drop-off, normal working hours.", manual_price_ex_vat: 350, delivery_type: "kerbside" };
    case "free_text":
      return { product_type: "free_text", description: "" };
    case "custom":
    default:
      return { product_type: "custom", description: "Bespoke item (describe)", manual_price_ex_vat: 0 };
  }
}

// Quick demo: run `npm run demo` to see a sample estimate printed to the console.
// Useful for sanity-checking the engine without the test runner.

import { calculateTableEstimate } from "./pricing/engine";
import { SAMPLE_COMPANY, SAMPLE_TABLE } from "./pricing/__tests__/fixtures";

const result = calculateTableEstimate(SAMPLE_TABLE, SAMPLE_COMPANY);

console.log("\n=== My Fab Estimator — sample table estimate ===\n");

if (!result.ok) {
  console.log("❌ Could not produce an estimate.");
  console.log("Validation errors:");
  result.validation_errors.forEach((e) => console.log("  -", e));
  console.log("Missing information:");
  result.missing_information.forEach((m) => console.log("  -", m));
  process.exit(1);
}

const b = result.breakdown!;
const fmt = (n: number) => `£${n.toFixed(2)}`;

console.log(`Spec: ${SAMPLE_TABLE.length_mm} × ${SAMPLE_TABLE.depth_mm} × ${SAMPLE_TABLE.height_mm} mm`);
console.log(`Quantity: ${SAMPLE_TABLE.quantity}, Material: ${SAMPLE_TABLE.material_grade} / ${SAMPLE_TABLE.sheet_thickness_mm}mm`);

console.log("\n-- Material --");
b.material_lines.forEach((l) =>
  console.log(`  ${l.label.padEnd(40)} ${fmt(l.amount).padStart(12)}   ${l.detail ?? ""}`)
);
console.log(`  ${"Material total / unit".padEnd(40)} ${fmt(b.material_cost_per_unit).padStart(12)}`);

console.log("\n-- Labour --");
b.labour_lines.forEach((l) =>
  console.log(`  ${l.label.padEnd(40)} ${fmt(l.amount).padStart(12)}   ${l.detail ?? ""}`)
);
console.log(`  ${"Labour total / unit".padEnd(40)} ${fmt(b.labour_cost_per_unit).padStart(12)}`);

console.log("\n-- Build cost --");
console.log(`  ${"Consumables / unit".padEnd(40)} ${fmt(b.consumables_cost_per_unit).padStart(12)}`);
console.log(`  ${"Build cost / unit".padEnd(40)} ${fmt(b.build_cost_per_unit).padStart(12)}`);
console.log(`  ${"Overhead / unit".padEnd(40)} ${fmt(b.overhead_cost_per_unit).padStart(12)}`);
console.log(`  ${"Total cost / unit".padEnd(40)} ${fmt(b.total_cost_per_unit).padStart(12)}`);

console.log(`\n  Quantity × ${b.quantity}`);
console.log(`  ${"Total cost before margin".padEnd(40)} ${fmt(b.total_cost_before_margin).padStart(12)}`);

console.log("\n-- Pricing --");
console.log(`  Method: ${b.pricing_method} @ ${b.margin_or_markup_percentage}%`);
console.log(`  ${"Sell price ex VAT".padEnd(40)} ${fmt(b.sell_price_ex_vat).padStart(12)}`);
console.log(`  ${"VAT (" + b.vat_rate + "%)".padEnd(40)} ${fmt(b.vat_amount).padStart(12)}`);
console.log(`  ${"Total inc VAT".padEnd(40)} ${fmt(b.total_inc_vat).padStart(12)}`);

console.log("\n-- Assumptions --");
result.assumptions.forEach((a) => console.log("  •", a));

console.log("\nSnapshot taken at:", result.snapshot?.taken_at);
console.log("Engine version:", result.snapshot?.engine_version, "\n");

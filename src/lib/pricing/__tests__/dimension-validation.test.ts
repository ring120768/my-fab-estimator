import { describe, it, expect } from "vitest";
import { checkDimensions } from "../dimension-validation";

describe("checkDimensions", () => {
  it("accepts a typical wall bench", () => {
    const r = checkDimensions("wall_bench", { length_mm: 2000, depth_mm: 700, height_mm: 900 });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("flags 10mm as a probable typo (missed a zero)", () => {
    const r = checkDimensions("wall_bench", { length_mm: 10, depth_mm: 700, height_mm: 900 });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("typo");
    expect(r.errors[0]).toContain("100mm");
    expect(r.errors[0]).toContain("1000mm");
  });

  it("flags 50000mm as a probable typo (extra zero)", () => {
    const r = checkDimensions("wall_bench", { length_mm: 50000, depth_mm: 700, height_mm: 900 });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toContain("typo");
    expect(r.errors[0]).toContain("5000mm");
  });

  it("rejects zero or negative", () => {
    const r = checkDimensions("wall_bench", { length_mm: 0, depth_mm: 700, height_mm: 900 });
    expect(r.errors.length).toBeGreaterThan(0);
    expect(r.errors[0]).toMatch(/positive/);
  });

  it("warns on unusually small but possible values", () => {
    const r = checkDimensions("wall_bench", { length_mm: 300, depth_mm: 700, height_mm: 900 });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
    expect(r.warnings[0]).toMatch(/unusually small/);
  });

  it("warns on unusually large but possible values", () => {
    const r = checkDimensions("wall_bench", { length_mm: 5000, depth_mm: 700, height_mm: 900 });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("uses product-specific limits for drip trays (very thin/shallow OK)", () => {
    const r = checkDimensions("drip_tray", { length_mm: 2900, depth_mm: 120, height_mm: 30 });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("flags drip tray with bench-sized depth", () => {
    const r = checkDimensions("drip_tray", { length_mm: 2900, depth_mm: 700, height_mm: 30 });
    // 700mm depth is way outside drip-tray max — should be a typo error
    expect(r.errors.length + r.warnings.length).toBeGreaterThan(0);
  });

  it("uses product-specific limits for splashbacks (very thin depth OK)", () => {
    const r = checkDimensions("splashback", { length_mm: 2000, depth_mm: 1, height_mm: 600 });
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("treats undefined dimensions as not-yet-entered (no errors)", () => {
    const r = checkDimensions("wall_bench", {});
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });
});

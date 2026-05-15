import { describe, it, expect } from "vitest";
import { clampSessionsPerWeek, DEFAULT_SESSIONS_PER_WEEK } from "../goal-validation";

describe("clampSessionsPerWeek (FR-016, SC-009)", () => {
  // ─── In-range pass-through ───────────────────────────────────────────────

  it("returns the value unchanged when already within [1, 7]", () => {
    expect(clampSessionsPerWeek(1)).toBe(1);
    expect(clampSessionsPerWeek(3)).toBe(3);
    expect(clampSessionsPerWeek(5)).toBe(5);
    expect(clampSessionsPerWeek(7)).toBe(7);
  });

  // ─── SC-009 core cases ───────────────────────────────────────────────────

  it("clamps a too-large value (99) to 7 (SC-009 upper bound)", () => {
    expect(clampSessionsPerWeek(99)).toBe(7);
  });

  it("clamps a too-small value (0) to 1 (SC-009 lower bound)", () => {
    expect(clampSessionsPerWeek(0)).toBe(1);
  });

  it("returns null for a non-numeric string (SC-009 garbage input)", () => {
    expect(clampSessionsPerWeek("abc")).toBeNull();
  });

  // ─── Boundary and edge behaviour ─────────────────────────────────────────

  it("clamps negative numbers up to 1", () => {
    expect(clampSessionsPerWeek(-1)).toBe(1);
    expect(clampSessionsPerWeek(-100)).toBe(1);
  });

  it("clamps values above 7 down to 7", () => {
    expect(clampSessionsPerWeek(8)).toBe(7);
    expect(clampSessionsPerWeek(1000)).toBe(7);
  });

  it("rounds fractional input to the nearest integer before clamping", () => {
    expect(clampSessionsPerWeek(3.4)).toBe(3);
    expect(clampSessionsPerWeek(3.6)).toBe(4);
    expect(clampSessionsPerWeek(0.4)).toBe(1); // rounds to 0, clamps to 1
    expect(clampSessionsPerWeek(0.6)).toBe(1);
    expect(clampSessionsPerWeek(7.4)).toBe(7);
    expect(clampSessionsPerWeek(7.6)).toBe(7); // rounds to 8, clamps to 7
  });

  it("accepts numeric strings", () => {
    expect(clampSessionsPerWeek("5")).toBe(5);
    expect(clampSessionsPerWeek("99")).toBe(7);
    expect(clampSessionsPerWeek("0")).toBe(1);
  });

  it("returns null for undefined and null", () => {
    expect(clampSessionsPerWeek(undefined)).toBeNull();
    expect(clampSessionsPerWeek(null)).toBeNull();
  });

  it("returns null for non-finite numbers", () => {
    expect(clampSessionsPerWeek(NaN)).toBeNull();
    expect(clampSessionsPerWeek(Infinity)).toBeNull();
    expect(clampSessionsPerWeek(-Infinity)).toBeNull();
  });

  it("returns null for non number-or-string input types (booleans, objects, arrays)", () => {
    // These would otherwise coerce in surprising ways (null → 0 → 1,
    // true → 1, [5] → 5, etc.). A direct API caller passing them is almost
    // certainly malformed, so we drop them rather than guessing.
    expect(clampSessionsPerWeek(true)).toBeNull();
    expect(clampSessionsPerWeek(false)).toBeNull();
    expect(clampSessionsPerWeek({})).toBeNull();
    expect(clampSessionsPerWeek({ value: 5 })).toBeNull();
    expect(clampSessionsPerWeek([])).toBeNull();
    expect(clampSessionsPerWeek([5])).toBeNull();
  });

  // ─── Default constant ────────────────────────────────────────────────────

  it("exposes a default of 3 for POST handlers to use when input is non-finite", () => {
    expect(DEFAULT_SESSIONS_PER_WEEK).toBe(3);
  });
});

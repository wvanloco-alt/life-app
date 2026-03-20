import { describe, it, expect } from "vitest";
import { deriveQuadrant, isValidQuadrant, getQuadrantInfo } from "../quadrants";

describe("isValidQuadrant", () => {
  it("accepts valid quadrant values", () => {
    expect(isValidQuadrant("Q1")).toBe(true);
    expect(isValidQuadrant("Q2")).toBe(true);
    expect(isValidQuadrant("Q3")).toBe(true);
    expect(isValidQuadrant("Q4")).toBe(true);
  });

  it("rejects invalid quadrant values", () => {
    expect(isValidQuadrant("Q5")).toBe(false);
    expect(isValidQuadrant("")).toBe(false);
    expect(isValidQuadrant("q1")).toBe(false);
  });
});

describe("getQuadrantInfo", () => {
  it("returns correct info for Q1", () => {
    const info = getQuadrantInfo("Q1");
    expect(info.label).toBe("Urgent & Important");
    expect(info.hexColor).toBe("#DC2626");
  });

  it("returns correct info for Q2", () => {
    const info = getQuadrantInfo("Q2");
    expect(info.label).toBe("Not Urgent & Important");
    expect(info.hexColor).toBe("#16A34A");
  });
});

describe("deriveQuadrant", () => {
  it("returns Q2 when no target date is set", () => {
    expect(deriveQuadrant(null)).toBe("Q2");
  });

  it("returns Q1 when target date is today or in the past", () => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    expect(deriveQuadrant(dateStr)).toBe("Q1");
  });

  it("returns Q1 when target date is within 7 days", () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
    expect(deriveQuadrant(dateStr)).toBe("Q1");
  });

  it("returns Q2 when target date is more than 7 days away", () => {
    const future = new Date();
    future.setDate(future.getDate() + 30);
    const dateStr = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
    expect(deriveQuadrant(dateStr)).toBe("Q2");
  });

  it("returns Q1 for an overdue date", () => {
    expect(deriveQuadrant("2020-01-01")).toBe("Q1");
  });
});

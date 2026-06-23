import { describe, it, expect } from "vitest";
import { deriveDefaultStructure } from "@/components/goals/training-structure-fields";

describe("deriveDefaultStructure", () => {
  // (a) Goal days present and sufficient
  it("distributes goal days training-first when sufficient", () => {
    const result = deriveDefaultStructure(4, [1, 2, 3, 5]); // 4 spw → 2 train + 2 supp
    expect(result.trainingSessionsPerWeek).toBe(2);
    expect(result.supplementalSessionsPerWeek).toBe(2);
    // First 2 sorted goal days → training; next 2 → supplemental
    expect(result.trainingPreferredDays).toEqual([1, 2]);
    expect(result.supplementalPreferredDays).toEqual([3, 5]);
    // No day overlap
    const overlap = result.trainingPreferredDays.filter((d) =>
      result.supplementalPreferredDays.includes(d)
    );
    expect(overlap).toHaveLength(0);
  });

  // (b) Goal days present but fewer than total sessions
  it("fills remaining slots from spread order when goal days are insufficient", () => {
    const result = deriveDefaultStructure(4, [1]); // 4 spw → 2 train + 2 supp; only 1 goal day
    expect(result.trainingSessionsPerWeek).toBe(2);
    expect(result.supplementalSessionsPerWeek).toBe(2);
    expect(result.trainingPreferredDays).toHaveLength(2);
    expect(result.supplementalPreferredDays).toHaveLength(2);
    // Goal day 1 (Mon) should be assigned (training gets first pick)
    expect(result.trainingPreferredDays).toContain(1);
    // No day shared between arrays
    const overlap = result.trainingPreferredDays.filter((d) =>
      result.supplementalPreferredDays.includes(d)
    );
    expect(overlap).toHaveLength(0);
  });

  // (c) No goal days → even spread
  it("generates an even spread from SPREAD_ORDER when no goal days given", () => {
    const result = deriveDefaultStructure(3, null); // 3 spw → 2 train + 1 supp
    expect(result.trainingSessionsPerWeek).toBe(2);
    expect(result.supplementalSessionsPerWeek).toBe(1);
    // SPREAD_ORDER = [1,3,5,2,6,4,7]; training gets [1,3], supplemental gets [5]
    expect(result.trainingPreferredDays).toEqual([1, 3]);
    expect(result.supplementalPreferredDays).toEqual([5]);
    const overlap = result.trainingPreferredDays.filter((d) =>
      result.supplementalPreferredDays.includes(d)
    );
    expect(overlap).toHaveLength(0);
  });

  it("generates an even spread from SPREAD_ORDER when goal days is empty array", () => {
    const result = deriveDefaultStructure(5, []); // 5 spw → 3 train + 2 supp
    expect(result.trainingSessionsPerWeek).toBe(3);
    expect(result.supplementalSessionsPerWeek).toBe(2);
    expect(result.trainingPreferredDays).toEqual([1, 3, 5]);
    expect(result.supplementalPreferredDays).toEqual([2, 6]);
    const overlap = result.trainingPreferredDays.filter((d) =>
      result.supplementalPreferredDays.includes(d)
    );
    expect(overlap).toHaveLength(0);
  });

  // (d) Split sums to sessionsPerWeek
  it("split always sums to sessionsPerWeek", () => {
    for (const spw of [1, 2, 3, 4, 5, 6, 7]) {
      const r = deriveDefaultStructure(spw, null);
      expect(r.trainingSessionsPerWeek + r.supplementalSessionsPerWeek).toBe(spw);
    }
  });

  it("handles edge case of 0 sessions per week", () => {
    const result = deriveDefaultStructure(0, null);
    expect(result.trainingSessionsPerWeek).toBe(0);
    expect(result.supplementalSessionsPerWeek).toBe(0);
    expect(result.trainingPreferredDays).toEqual([]);
    expect(result.supplementalPreferredDays).toEqual([]);
  });

  it("handles 2 sessions per week (no supplemental per defaultSplit rule)", () => {
    const result = deriveDefaultStructure(2, null);
    expect(result.trainingSessionsPerWeek).toBe(2);
    expect(result.supplementalSessionsPerWeek).toBe(0);
    expect(result.supplementalPreferredDays).toEqual([]);
  });
});

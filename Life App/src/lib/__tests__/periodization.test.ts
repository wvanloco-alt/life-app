import { describe, it, expect } from "vitest";
import {
  assessLevel,
  generatePhases,
  buildClimbingPhaseDescription,
  buildClimbingLimitationNotes,
  getPhaseDisplayName,
  getCycleTotalWeeks,
} from "../training/periodization";

describe("assessLevel", () => {
  it("returns beginner for low grades and low experience", () => {
    const result = assessLevel("5b", "5b", 1);
    expect(result.derivedLevel).toBe("beginner");
    expect(result.recommendedModel).toBe("4-1");
  });

  it("returns intermediate for mid grades and mid experience", () => {
    const result = assessLevel("6b+", "6b+", 3);
    expect(result.derivedLevel).toBe("intermediate");
    expect(result.recommendedModel).toBe("4-3-2-1");
  });

  it("returns advanced for high grades and high experience", () => {
    const result = assessLevel("7b", "7b", 6);
    expect(result.derivedLevel).toBe("advanced");
    expect(result.recommendedModel).toBe("3-2-1");
  });

  it("takes the conservative level when grade and experience disagree", () => {
    const result = assessLevel("7a+", "7a+", 1);
    expect(result.derivedLevel).toBe("beginner");
    expect(result.recommendedModel).toBe("4-1");
  });

  it("takes the conservative level between boulder and sport grades", () => {
    const result = assessLevel("5a", "7a", 4);
    expect(result.derivedLevel).toBe("beginner");
  });

  it("caps at intermediate when experience is 2-5 years with advanced grade", () => {
    const result = assessLevel("7b", "7b", 3);
    expect(result.derivedLevel).toBe("intermediate");
  });

  it("includes explanation text", () => {
    const result = assessLevel("6a", "6a", 2);
    expect(result.explanation).toContain("6a");
    expect(result.explanation).toContain("2 year(s)");
  });
});

describe("generatePhases", () => {
  it("generates 2 phases for beginner (4-1 cycle)", () => {
    const phases = generatePhases("beginner", "sport", [], "2026-04-01");
    expect(phases).toHaveLength(2);
    expect(phases[0].phaseType).toBe("skill-stamina");
    expect(phases[0].durationWeeks).toBe(4);
    expect(phases[1].phaseType).toBe("rest");
    expect(phases[1].durationWeeks).toBe(1);
  });

  it("generates 4 phases for intermediate sport (4-3-2-1 cycle)", () => {
    const phases = generatePhases("intermediate", "sport", [], "2026-04-01");
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.phaseType)).toEqual([
      "skill-stamina",
      "max-strength-power",
      "anaerobic-endurance",
      "rest",
    ]);
    expect(phases.map((p) => p.durationWeeks)).toEqual([4, 3, 2, 1]);
  });

  it("applies bouldering modifier for intermediate (4-4-1-1)", () => {
    const phases = generatePhases("intermediate", "bouldering", [], "2026-04-01");
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.durationWeeks)).toEqual([4, 4, 1, 1]);
  });

  it("generates 3 phases for advanced sport (3-2-1 cycle)", () => {
    const phases = generatePhases("advanced", "sport", [], "2026-04-01");
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.phaseType)).toEqual([
      "max-strength-power",
      "anaerobic-endurance",
      "rest",
    ]);
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 2, 1]);
  });

  it("applies bouldering modifier for advanced (4-1-1)", () => {
    const phases = generatePhases("advanced", "bouldering", [], "2026-04-01");
    expect(phases.map((p) => p.durationWeeks)).toEqual([4, 1, 1]);
  });

  it("calculates correct date ranges with no gaps", () => {
    const phases = generatePhases("intermediate", "sport", [], "2026-04-01");

    expect(phases[0].startDate).toBe("2026-04-01");
    expect(phases[0].endDate).toBe("2026-04-29");

    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].startDate).toBe(phases[i - 1].endDate);
    }
  });

  it("assigns order indices sequentially", () => {
    const phases = generatePhases("advanced", "sport", [], "2026-04-01");
    expect(phases.map((p) => p.orderIndex)).toEqual([0, 1, 2]);
  });

  it("includes three-layer description for each phase", () => {
    const phases = generatePhases("intermediate", "sport", [], "2026-04-01");
    for (const phase of phases) {
      expect(phase.description).toContain("CLIMBING FOCUS");
      expect(phase.description).toContain("SUPPLEMENTAL TRAINING");
      expect(phase.description).toContain("MENTAL TRAINING");
    }
  });

  it("produces discipline-specific climbing content", () => {
    const bouldering = generatePhases("intermediate", "bouldering", [], "2026-04-01");
    const sport = generatePhases("intermediate", "sport", [], "2026-04-01");
    expect(bouldering[0].description).toContain("silent feet");
    expect(sport[0].description).toContain("Route volume");
    expect(bouldering[0].description).not.toContain("Route volume");
  });

  it("produces beginner-specific descriptions", () => {
    const beginner = generatePhases("beginner", "bouldering", [], "2026-04-01");
    const intermediate = generatePhases("intermediate", "bouldering", [], "2026-04-01");
    expect(beginner[0].description).toContain("Climb everything");
    expect(intermediate[0].description).not.toContain("Climb everything");
  });

  it("includes limitation notes when limitations are provided", () => {
    const phases = generatePhases("intermediate", "sport", ["fingers", "shoulder"], "2026-04-01");
    const skillPhase = phases.find((p) => p.phaseType === "skill-stamina");
    expect(skillPhase?.limitationNotes).toBeTruthy();
    expect(skillPhase?.limitationNotes).toContain("Fingers");
    expect(skillPhase?.limitationNotes).toContain("Shoulder");
  });

  it("returns null limitation notes when no limitations", () => {
    const phases = generatePhases("intermediate", "sport", [], "2026-04-01");
    for (const phase of phases) {
      expect(phase.limitationNotes).toBeNull();
    }
  });
});

describe("buildClimbingPhaseDescription", () => {
  it("returns all three section headers for every phase", () => {
    const phases: Array<"skill-stamina" | "max-strength-power" | "anaerobic-endurance" | "rest"> = [
      "skill-stamina", "max-strength-power", "anaerobic-endurance", "rest",
    ];
    for (const phase of phases) {
      const desc = buildClimbingPhaseDescription(phase, "bouldering", "intermediate");
      expect(desc).toContain("CLIMBING FOCUS");
      expect(desc).toContain("SUPPLEMENTAL TRAINING");
      expect(desc).toContain("MENTAL TRAINING");
    }
  });

  it("returns different climbing content for bouldering vs sport", () => {
    const bouldering = buildClimbingPhaseDescription("skill-stamina", "bouldering", "intermediate");
    const sport = buildClimbingPhaseDescription("skill-stamina", "sport", "intermediate");
    expect(bouldering).toContain("silent feet");
    expect(sport).toContain("Route volume");
    expect(bouldering).not.toContain("Route volume");
  });

  it("returns beginner climbing content when available", () => {
    const beginner = buildClimbingPhaseDescription("skill-stamina", "bouldering", "beginner");
    const intermediate = buildClimbingPhaseDescription("skill-stamina", "bouldering", "intermediate");
    expect(beginner).toContain("Climb everything");
    expect(intermediate).toContain("silent feet");
    expect(intermediate).not.toContain("Climb everything");
  });

  it("returns beginner supplemental content when available", () => {
    const beginner = buildClimbingPhaseDescription("skill-stamina", "sport", "beginner");
    expect(beginner).toContain("bodyweight only");
  });

  it("falls back to discipline-specific content for beginners when no beginner variant", () => {
    const desc = buildClimbingPhaseDescription("rest", "bouldering", "beginner");
    expect(desc).toContain("No structured climbing");
  });

  it("includes mental training with Hörst references", () => {
    const desc = buildClimbingPhaseDescription("skill-stamina", "bouldering", "intermediate");
    expect(desc).toContain("Hörst");
    expect(desc).toContain("Mental Wings");
  });
});

describe("buildClimbingLimitationNotes", () => {
  it("returns null for empty limitations", () => {
    expect(buildClimbingLimitationNotes("skill-stamina", [])).toBeNull();
  });

  it("returns specific notes for fingers during skill-stamina", () => {
    const notes = buildClimbingLimitationNotes("skill-stamina", ["fingers"]);
    expect(notes).toContain("Fingers");
    expect(notes).toContain("open-hand grip");
  });

  it("returns specific notes for shoulder during max-strength", () => {
    const notes = buildClimbingLimitationNotes("max-strength-power", ["shoulder"]);
    expect(notes).toContain("Shoulder");
    expect(notes).toContain("lock-off");
  });

  it("combines multiple limitation notes with separator", () => {
    const notes = buildClimbingLimitationNotes("skill-stamina", ["fingers", "elbow", "back"]);
    expect(notes).toContain("Fingers");
    expect(notes).toContain("Elbow");
    expect(notes).toContain("Back");
    expect(notes).toContain(" | ");
  });

  it("uses default notes for rest phase", () => {
    const notes = buildClimbingLimitationNotes("rest", ["fingers"]);
    expect(notes).toContain("Fingers");
    expect(notes).toContain("morning finger stiffness");
  });

  it("handles all 5 limitation types", () => {
    const allLimitations = ["fingers", "shoulder", "elbow", "back", "wrist"] as const;
    const notes = buildClimbingLimitationNotes("skill-stamina", [...allLimitations]);
    expect(notes).toBeTruthy();
    for (const lim of allLimitations) {
      expect(notes).toContain(lim.charAt(0).toUpperCase() + lim.slice(1));
    }
  });
});

describe("getPhaseDisplayName", () => {
  it("returns human-readable names", () => {
    expect(getPhaseDisplayName("skill-stamina")).toBe("Skill & Stamina");
    expect(getPhaseDisplayName("max-strength-power")).toBe("Max Strength & Power");
    expect(getPhaseDisplayName("anaerobic-endurance")).toBe("Anaerobic Endurance");
    expect(getPhaseDisplayName("rest")).toBe("Rest");
  });
});

describe("getCycleTotalWeeks", () => {
  it("returns 5 for beginner", () => {
    expect(getCycleTotalWeeks("beginner", "sport")).toBe(5);
    expect(getCycleTotalWeeks("beginner", "bouldering")).toBe(5);
  });

  it("returns 10 for intermediate sport", () => {
    expect(getCycleTotalWeeks("intermediate", "sport")).toBe(10);
  });

  it("returns 10 for intermediate bouldering", () => {
    expect(getCycleTotalWeeks("intermediate", "bouldering")).toBe(10);
  });

  it("returns 6 for advanced sport and bouldering", () => {
    expect(getCycleTotalWeeks("advanced", "sport")).toBe(6);
    expect(getCycleTotalWeeks("advanced", "bouldering")).toBe(6);
  });
});

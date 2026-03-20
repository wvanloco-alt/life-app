import { describe, it, expect } from "vitest";
import {
  assessTennisLevel,
  generateTennisPhases,
  buildLimitationNotes,
  buildPhaseDescription,
  getTennisPhaseDisplayName,
  getTennisCycleTotalWeeks,
} from "../training/tennis-periodization";

describe("assessTennisLevel", () => {
  it("returns beginner for beginner self-rating and low experience", () => {
    const result = assessTennisLevel("beginner", 1);
    expect(result.derivedLevel).toBe("beginner");
    expect(result.recommendedModel).toBe("3-1");
    expect(result.cycleLengthWeeks).toBe(4);
  });

  it("returns club for club self-rating and 3 years", () => {
    const result = assessTennisLevel("club", 3);
    expect(result.derivedLevel).toBe("club");
    expect(result.recommendedModel).toBe("3-3-2-1");
  });

  it("returns advanced for advanced self-rating and 6 years", () => {
    const result = assessTennisLevel("advanced", 6);
    expect(result.derivedLevel).toBe("advanced");
    expect(result.recommendedModel).toBe("3-2-1");
  });

  it("takes the conservative level when rating and experience disagree", () => {
    const result = assessTennisLevel("advanced", 1);
    expect(result.derivedLevel).toBe("beginner");
    expect(result.recommendedModel).toBe("3-1");
  });

  it("caps at club when advanced rating with 3 years", () => {
    const result = assessTennisLevel("advanced", 3);
    expect(result.derivedLevel).toBe("club");
  });

  it("caps at beginner when club rating with <2 years", () => {
    const result = assessTennisLevel("club", 1);
    expect(result.derivedLevel).toBe("beginner");
  });

  it("includes explanation text", () => {
    const result = assessTennisLevel("club", 4);
    expect(result.explanation).toContain("club");
    expect(result.explanation).toContain("4 year(s)");
  });
});

describe("generateTennisPhases", () => {
  it("generates 2 phases for beginner (3-1 cycle)", () => {
    const phases = generateTennisPhases("beginner", "all-court", [], "2026-04-01");
    expect(phases).toHaveLength(2);
    expect(phases[0].phaseType).toBe("foundation-prehab");
    expect(phases[0].durationWeeks).toBe(3);
    expect(phases[1].phaseType).toBe("recovery");
    expect(phases[1].durationWeeks).toBe(1);
  });

  it("generates 4 phases for club all-court (3-3-2-1)", () => {
    const phases = generateTennisPhases("club", "all-court", [], "2026-04-01");
    expect(phases).toHaveLength(4);
    expect(phases.map((p) => p.phaseType)).toEqual([
      "foundation-prehab",
      "strength-power",
      "tennis-endurance",
      "recovery",
    ]);
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 3, 2, 1]);
  });

  it("applies baseliner modifier for club (3-2-3-1)", () => {
    const phases = generateTennisPhases("club", "baseliner", [], "2026-04-01");
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 2, 3, 1]);
  });

  it("applies serve-volley modifier for club (3-3-1-1)", () => {
    const phases = generateTennisPhases("club", "serve-volley", [], "2026-04-01");
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 3, 1, 1]);
  });

  it("generates 3 phases for advanced all-court (3-2-1)", () => {
    const phases = generateTennisPhases("advanced", "all-court", [], "2026-04-01");
    expect(phases).toHaveLength(3);
    expect(phases.map((p) => p.phaseType)).toEqual([
      "strength-power",
      "performance",
      "recovery",
    ]);
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 2, 1]);
  });

  it("applies baseliner modifier for advanced (2-3-1)", () => {
    const phases = generateTennisPhases("advanced", "baseliner", [], "2026-04-01");
    expect(phases.map((p) => p.durationWeeks)).toEqual([2, 3, 1]);
  });

  it("applies serve-volley modifier for advanced (3-1-1)", () => {
    const phases = generateTennisPhases("advanced", "serve-volley", [], "2026-04-01");
    expect(phases.map((p) => p.durationWeeks)).toEqual([3, 1, 1]);
  });

  it("calculates correct date ranges with no gaps", () => {
    const phases = generateTennisPhases("club", "all-court", [], "2026-04-01");

    expect(phases[0].startDate).toBe("2026-04-01");
    expect(phases[0].endDate).toBe("2026-04-22");

    for (let i = 1; i < phases.length; i++) {
      expect(phases[i].startDate).toBe(phases[i - 1].endDate);
    }
  });

  it("assigns order indices sequentially", () => {
    const phases = generateTennisPhases("advanced", "all-court", [], "2026-04-01");
    expect(phases.map((p) => p.orderIndex)).toEqual([0, 1, 2]);
  });

  it("includes three-layer description for each phase", () => {
    const phases = generateTennisPhases("club", "all-court", [], "2026-04-01");
    for (const phase of phases) {
      expect(phase.description).toContain("ON-COURT FOCUS");
      expect(phase.description).toContain("SUPPLEMENTAL TRAINING");
      expect(phase.description).toContain("MENTAL GAME");
    }
  });

  it("produces style-specific on-court content", () => {
    const baseliner = generateTennisPhases("club", "baseliner", [], "2026-04-01");
    const serveVolley = generateTennisPhases("club", "serve-volley", [], "2026-04-01");

    const bDesc = baseliner[0].description;
    const svDesc = serveVolley[0].description;

    expect(bDesc).not.toBe(svDesc);
    expect(bDesc).toContain("groundstroke");
    expect(svDesc).toContain("Split step");
  });

  it("produces beginner-specific descriptions", () => {
    const beginner = generateTennisPhases("beginner", "baseliner", [], "2026-04-01");
    const club = generateTennisPhases("club", "baseliner", [], "2026-04-01");

    expect(beginner[0].description).toContain("consistency over power");
    expect(club[0].description).not.toContain("consistency over power");
  });

  it("includes limitation notes when limitations are provided", () => {
    const phases = generateTennisPhases("club", "all-court", ["shoulder", "back"], "2026-04-01");

    const foundationPhase = phases.find((p) => p.phaseType === "foundation-prehab");
    expect(foundationPhase?.limitationNotes).toBeTruthy();
    expect(foundationPhase?.limitationNotes).toContain("Shoulder");
    expect(foundationPhase?.limitationNotes).toContain("Back");
  });

  it("returns null limitation notes when no limitations", () => {
    const phases = generateTennisPhases("club", "all-court", [], "2026-04-01");
    for (const phase of phases) {
      expect(phase.limitationNotes).toBeNull();
    }
  });
});

describe("buildLimitationNotes", () => {
  it("returns null for empty limitations", () => {
    expect(buildLimitationNotes("foundation-prehab", [])).toBeNull();
  });

  it("returns specific notes for shoulder during foundation", () => {
    const notes = buildLimitationNotes("foundation-prehab", ["shoulder"]);
    expect(notes).toContain("Shoulder");
    expect(notes).toContain("external rotation");
  });

  it("returns specific notes for back during strength", () => {
    const notes = buildLimitationNotes("strength-power", ["back"]);
    expect(notes).toContain("Back");
    expect(notes).toContain("spinal loading");
  });

  it("combines multiple limitation notes with separator", () => {
    const notes = buildLimitationNotes("foundation-prehab", ["shoulder", "knee", "ankle"]);
    expect(notes).toContain("Shoulder");
    expect(notes).toContain("Knee");
    expect(notes).toContain("Ankle");
    expect(notes).toContain(" | ");
  });

  it("uses default notes for phases without specific notes", () => {
    const notes = buildLimitationNotes("performance", ["shoulder"]);
    expect(notes).toContain("Shoulder");
    expect(notes).toBeTruthy();
  });

  it("handles all 6 limitation types", () => {
    const allLimitations = ["shoulder", "back", "knee", "elbow", "ankle", "adductor"] as const;
    const notes = buildLimitationNotes("foundation-prehab", [...allLimitations]);
    expect(notes).toBeTruthy();
    for (const lim of allLimitations) {
      expect(notes).toContain(lim.charAt(0).toUpperCase() + lim.slice(1));
    }
  });
});

describe("buildPhaseDescription", () => {
  it("returns all three section headers for every phase", () => {
    const phases: Array<"foundation-prehab" | "strength-power" | "tennis-endurance" | "performance" | "recovery"> = [
      "foundation-prehab", "strength-power", "tennis-endurance", "performance", "recovery",
    ];
    for (const phase of phases) {
      const desc = buildPhaseDescription(phase, "all-court", "club");
      expect(desc).toContain("ON-COURT FOCUS");
      expect(desc).toContain("SUPPLEMENTAL TRAINING");
      expect(desc).toContain("MENTAL GAME");
    }
  });

  it("returns different on-court content for baseliner vs serve-volley", () => {
    const baseliner = buildPhaseDescription("strength-power", "baseliner", "club");
    const serveVolley = buildPhaseDescription("strength-power", "serve-volley", "club");
    expect(baseliner).toContain("inside-out forehand");
    expect(serveVolley).toContain("explosive serve");
    expect(baseliner).not.toContain("explosive serve");
  });

  it("returns beginner on-court content when available", () => {
    const beginner = buildPhaseDescription("foundation-prehab", "baseliner", "beginner");
    const club = buildPhaseDescription("foundation-prehab", "baseliner", "club");
    expect(beginner).toContain("consistency over power");
    expect(club).toContain("groundstroke");
    expect(club).not.toContain("consistency over power");
  });

  it("returns beginner supplemental content when available", () => {
    const beginner = buildPhaseDescription("foundation-prehab", "all-court", "beginner");
    expect(beginner).toContain("bodyweight only");
  });

  it("falls back to style-specific on-court for beginners when no beginner variant", () => {
    const desc = buildPhaseDescription("recovery", "baseliner", "beginner");
    expect(desc).toContain("Light rallying");
  });

  it("includes mental game content with Inner Game and Winning Ugly", () => {
    const desc = buildPhaseDescription("foundation-prehab", "all-court", "club");
    expect(desc).toContain("Inner Game");
    expect(desc).toContain("Winning Ugly");
  });
});

describe("getTennisPhaseDisplayName", () => {
  it("returns human-readable names", () => {
    expect(getTennisPhaseDisplayName("foundation-prehab")).toBe("Foundation & Prehab");
    expect(getTennisPhaseDisplayName("strength-power")).toBe("Strength & Power");
    expect(getTennisPhaseDisplayName("tennis-endurance")).toBe("Tennis-Specific Endurance");
    expect(getTennisPhaseDisplayName("performance")).toBe("Performance");
    expect(getTennisPhaseDisplayName("recovery")).toBe("Recovery");
  });
});

describe("getTennisCycleTotalWeeks", () => {
  it("returns 4 for beginner (all styles)", () => {
    expect(getTennisCycleTotalWeeks("beginner", "all-court")).toBe(4);
    expect(getTennisCycleTotalWeeks("beginner", "baseliner")).toBe(4);
    expect(getTennisCycleTotalWeeks("beginner", "serve-volley")).toBe(4);
  });

  it("returns correct totals for club by style", () => {
    expect(getTennisCycleTotalWeeks("club", "all-court")).toBe(9);
    expect(getTennisCycleTotalWeeks("club", "baseliner")).toBe(9);
    expect(getTennisCycleTotalWeeks("club", "serve-volley")).toBe(8);
  });

  it("returns correct totals for advanced by style", () => {
    expect(getTennisCycleTotalWeeks("advanced", "all-court")).toBe(6);
    expect(getTennisCycleTotalWeeks("advanced", "baseliner")).toBe(6);
    expect(getTennisCycleTotalWeeks("advanced", "serve-volley")).toBe(5);
  });
});

import { describe, it, expect } from "vitest";
import {
  buildRunningPhaseContent,
  buildRunningPhaseDescription,
  generateRunningPhases,
} from "../training/running-periodization";
import type { RunnerLevel, RunningGoalDistance, RunningPhaseType } from "@/types";

const BEGINNER_PHASES: RunningPhaseType[] = [
  "base-building",
  "development",
  "race-prep",
  "rest",
];

const INT_ADV_PHASES: RunningPhaseType[] = [
  "base-injury-prevention",
  "strength-endurance",
  "speed-specificity",
  "taper-race",
  "rest",
];

const LEVELS: RunnerLevel[] = ["beginner", "intermediate", "advanced"];
const DISTANCES: RunningGoalDistance[] = ["5k", "10k", "half-marathon", "marathon", "general"];

// ─── buildRunningPhaseContent ───────────────────────────────────────────────

describe("buildRunningPhaseContent", () => {
  it("returns three non-empty strings for every beginner phase", () => {
    for (const phase of BEGINNER_PHASES) {
      const result = buildRunningPhaseContent(phase, "general", "beginner");
      expect(result.sportFocusContent.length, `beginner/${phase} sportFocusContent`).toBeGreaterThan(0);
      expect(result.supplementalContent.length, `beginner/${phase} supplementalContent`).toBeGreaterThan(0);
      expect(result.mentalGameContent.length, `beginner/${phase} mentalGameContent`).toBeGreaterThan(0);
    }
  });

  it("returns three non-empty strings for every intermediate/advanced phase", () => {
    for (const level of ["intermediate", "advanced"] as RunnerLevel[]) {
      for (const phase of INT_ADV_PHASES) {
        const result = buildRunningPhaseContent(phase, "marathon", level);
        expect(result.sportFocusContent.length, `${level}/${phase} sportFocusContent`).toBeGreaterThan(0);
        expect(result.supplementalContent.length, `${level}/${phase} supplementalContent`).toBeGreaterThan(0);
        expect(result.mentalGameContent.length, `${level}/${phase} mentalGameContent`).toBeGreaterThan(0);
      }
    }
  });

  it("goalDistance parameter does not affect content (content is by phaseType + level)", () => {
    for (const distance of DISTANCES) {
      const a = buildRunningPhaseContent("base-building", distance, "beginner");
      const b = buildRunningPhaseContent("base-building", "general", "beginner");
      expect(a.sportFocusContent).toBe(b.sportFocusContent);
      expect(a.supplementalContent).toBe(b.supplementalContent);
      expect(a.mentalGameContent).toBe(b.mentalGameContent);
    }
  });

  it("layer strings match what buildRunningPhaseDescription would concatenate", () => {
    for (const phase of BEGINNER_PHASES) {
      const layers = buildRunningPhaseContent(phase, "general", "beginner");
      const description = buildRunningPhaseDescription(phase, "general", "beginner");
      expect(description).toContain(layers.sportFocusContent);
      expect(description).toContain(layers.supplementalContent);
      expect(description).toContain(layers.mentalGameContent);
    }
    for (const phase of INT_ADV_PHASES) {
      const layers = buildRunningPhaseContent(phase, "general", "intermediate");
      const description = buildRunningPhaseDescription(phase, "general", "intermediate");
      expect(description).toContain(layers.sportFocusContent);
      expect(description).toContain(layers.supplementalContent);
      expect(description).toContain(layers.mentalGameContent);
    }
  });

  it("intermediate and advanced return different content for non-rest phases", () => {
    const inter = buildRunningPhaseContent("base-injury-prevention", "general", "intermediate");
    const adv = buildRunningPhaseContent("base-injury-prevention", "general", "advanced");
    expect(inter.sportFocusContent).not.toBe(adv.sportFocusContent);
  });

  it("rest phase content is the same across all levels", () => {
    const beg = buildRunningPhaseContent("rest", "general", "beginner");
    const inter = buildRunningPhaseContent("rest", "general", "intermediate");
    const adv = buildRunningPhaseContent("rest", "general", "advanced");
    expect(beg.sportFocusContent).toBe(inter.sportFocusContent);
    expect(beg.sportFocusContent).toBe(adv.sportFocusContent);
    expect(beg.supplementalContent).toBe(inter.supplementalContent);
    expect(beg.mentalGameContent).toBe(inter.mentalGameContent);
  });

  it("generateRunningPhases populates layer fields on all beginner phases", () => {
    const phases = generateRunningPhases("beginner", "5k", [], "2026-01-05");
    for (const phase of phases) {
      expect(phase.sportFocusContent, `beginner/${phase.phaseType}`).toBeTruthy();
      expect(phase.supplementalContent, `beginner/${phase.phaseType}`).toBeTruthy();
      expect(phase.mentalGameContent, `beginner/${phase.phaseType}`).toBeTruthy();
    }
  });

  it("generateRunningPhases populates layer fields on all intermediate phases", () => {
    const phases = generateRunningPhases("intermediate", "marathon", [], "2026-01-05");
    for (const phase of phases) {
      expect(phase.sportFocusContent, `intermediate/${phase.phaseType}`).toBeTruthy();
      expect(phase.supplementalContent, `intermediate/${phase.phaseType}`).toBeTruthy();
      expect(phase.mentalGameContent, `intermediate/${phase.phaseType}`).toBeTruthy();
    }
  });
});

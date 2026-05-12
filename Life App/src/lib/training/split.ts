/**
 * Training vs. Supplemental session split.
 *
 * Default formula:
 *   supplemental = min(2, max(0, sessionsPerWeek − 2))
 *   training     = sessionsPerWeek − supplemental
 *
 * Rationale (from the feature spec):
 * - Below 2 total sessions/week, no supplemental — the user isn't committed
 *   enough yet to add gym work on top of sport training.
 * - Supplemental is capped at 2 — climbing and running source material both
 *   prescribe ~2x/week as the baseline; going higher risks under-recovery.
 *
 * Source: Life App/feature requests/training-supplemental-split/spec.md (FR-004).
 */
export function defaultSplit(sessionsPerWeek: number): {
  training: number;
  supplemental: number;
} {
  if (sessionsPerWeek <= 0) return { training: 0, supplemental: 0 };
  const supplemental = Math.min(2, Math.max(0, sessionsPerWeek - 2));
  return { training: sessionsPerWeek - supplemental, supplemental };
}

/**
 * Returns true when the split values are valid for the given goal:
 * training + supplemental must equal sessionsPerWeek, and neither can be negative.
 */
export function isValidSplit(
  training: number,
  supplemental: number,
  sessionsPerWeek: number
): boolean {
  if (training < 0 || supplemental < 0) return false;
  if (!Number.isInteger(training) || !Number.isInteger(supplemental)) return false;
  return training + supplemental === sessionsPerWeek;
}

/** Split + preferred weekdays (1–7 Mon–Sun). Stored on `training_plans`. */
export interface TrainingPlanSplit {
  trainingSessionsPerWeek: number;
  supplementalSessionsPerWeek: number;
  trainingPreferredDays: number[];
  supplementalPreferredDays: number[];
}

/**
 * Targets for a single calendar week within the scheduler. Today this mirrors
 * the plan's configured split exactly; `_isoWeekKey` is reserved for future
 * per-week overrides without changing callers.
 *
 * `_isoWeekKey` is the week's Monday ISO date string (`yyyy-mm-dd`).
 */
export function weeklySessionTargets(
  split: TrainingPlanSplit,
  _isoWeekKey: string
): { trainingCount: number; supplementalCount: number } {
  void _isoWeekKey;
  return {
    trainingCount: split.trainingSessionsPerWeek,
    supplementalCount: split.supplementalSessionsPerWeek,
  };
}

/**
 * Proportionally allocates `sessionsRemaining` into training vs. supplemental,
 * respecting the configured weekly ratio (sums to `sessionsPerWeek` per week × `numWeeks`).
 */
export function allocateSplitTotals(
  split: Pick<TrainingPlanSplit, "trainingSessionsPerWeek" | "supplementalSessionsPerWeek">,
  numWeeks: number,
  sessionsRemaining: number
): { trainingTotal: number; supplementalTotal: number } {
  const rawT = split.trainingSessionsPerWeek * numWeeks;
  const rawS = split.supplementalSessionsPerWeek * numWeeks;
  const rawTot = rawT + rawS;
  if (rawTot <= 0 || sessionsRemaining <= 0) {
    return { trainingTotal: 0, supplementalTotal: 0 };
  }
  const trainingTotal = Math.round((sessionsRemaining * rawT) / rawTot);
  const supplementalTotal = sessionsRemaining - trainingTotal;
  return { trainingTotal, supplementalTotal };
}

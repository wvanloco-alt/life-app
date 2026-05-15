/**
 * Habit streak helpers.
 *
 * Pure, environment-agnostic functions used to derive `currentStreak` and
 * `bestStreak` from a habit's persisted log dates. The server returns raw
 * `habit_logs.date` strings via `GET /api/habits`; the client (HabitList) runs
 * this helper locally with its own "today" so the timezone story is consistent
 * with the H1/H3 decisions in `spec.md` (client owns "today" for both reads
 * and writes).
 *
 * No DOM, no fetch, no system clock. Every "today"-anchored value is passed
 * in by the caller, which makes the math fully testable and reproducible.
 */

/**
 * Parse an ISO `YYYY-MM-DD` date string into a Date at local midnight.
 *
 * Anchoring at `T00:00:00` (no timezone offset) keeps the math purely
 * date-arithmetic and dodges the DST and leap-day pitfalls that bite when
 * a timestamp accidentally drifts by an hour. The Date value here is only ever
 * used for getTime()-based day-difference computation, never for display.
 */
function parseISODay(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

const MS_PER_DAY = 86400000;

/**
 * Compute the integer number of calendar days between two ISO date strings.
 *
 * Always returns a non-negative integer: `diffDays(a, b)` equals `diffDays(b, a)`.
 * Implementation uses local-midnight Date values so DST transitions and leap
 * days never produce a fractional or off-by-one result.
 */
function diffDays(a: string, b: string): number {
  return Math.round(Math.abs(parseISODay(a).getTime() - parseISODay(b).getTime()) / MS_PER_DAY);
}

/**
 * Add `n` calendar days to an ISO date string and return the new ISO date.
 *
 * `n` may be negative. Anchored at local midnight, same DST/leap-day safety
 * as `diffDays`.
 */
function addDays(iso: string, n: number): string {
  const d = parseISODay(iso);
  d.setDate(d.getDate() + n);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Compute current and best streaks for a habit, given its log dates and the
 * caller's notion of "today."
 *
 * - `dates`: ISO `YYYY-MM-DD` strings from `habit_logs.date`. May contain
 *   duplicates and may be in any order. Dates outside the lookback window
 *   are tolerated; only the dates that actually form runs with today/yesterday
 *   affect `current`, and `best` reflects the longest run anywhere in the input.
 * - `today`: ISO `YYYY-MM-DD` string. Required (not inferred from system
 *   time). The client passes the browser's local-time today; tests pass a
 *   fixed value for determinism.
 *
 * Returns `{ current, best }`. Both are non-negative integers.
 *
 * `current`: length of the longest run of consecutive days ending on `today`
 * or on the day immediately before `today`. If the most recent log is older
 * than yesterday, `current = 0`. The "or yesterday" allowance prevents the
 * common UX bug where a user opens the app at 00:01 local time and sees
 * "Current: 0d" the moment the clock crosses midnight before they log.
 *
 * `best`: length of the longest run anywhere in the deduplicated input.
 */
export function computeStreaks(
  dates: string[],
  today: string,
): { current: number; best: number } {
  // Deduplicate and sort ascending. A Set is cheap; sorting a deduplicated
  // array is O(n log n) but n is bounded by the 30-day server-side cap (see
  // spec FR-005) plus any retroactive entries the user may add.
  const unique = Array.from(new Set(dates)).sort();

  if (unique.length === 0) return { current: 0, best: 0 };

  // Best: walk the sorted array, counting the longest run where consecutive
  // entries differ by exactly 1 day.
  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    if (diffDays(unique[i - 1], unique[i]) === 1) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }

  // Current: find the anchor. Prefer today; fall back to yesterday. If neither
  // is present, current is 0.
  const set = new Set(unique);
  const yesterday = addDays(today, -1);

  let anchor: string | null = null;
  if (set.has(today)) anchor = today;
  else if (set.has(yesterday)) anchor = yesterday;

  if (anchor === null) return { current: 0, best };

  // Walk backward from the anchor counting consecutive days that are in the set.
  let current = 0;
  let cursor: string | null = anchor;
  while (cursor !== null && set.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  return { current, best };
}

import { describe, it, expect } from "vitest";
import { computeStreaks } from "../habit-streaks";

/**
 * Fixtures cover spec FR-014 to FR-017 and the leap-day edge case (E3).
 *
 * Most cases use `today = "2026-05-15"` as the fixed anchor so the
 * arithmetic is reproducible. Cases that test the "no recent activity" path
 * use a `today` far from the logs so the current-streak walks zero.
 *
 * A helper builds a list of N consecutive ISO dates ending on a given day,
 * which keeps the fixtures readable.
 */

function consecutiveDatesEndingOn(endIso: string, count: number): string[] {
  const out: string[] = [];
  const [y, m, d] = endIso.split("-").map(Number);
  const end = new Date(y, m - 1, d);
  for (let i = count - 1; i >= 0; i--) {
    const cur = new Date(end);
    cur.setDate(end.getDate() - i);
    const yy = cur.getFullYear();
    const mm = (cur.getMonth() + 1).toString().padStart(2, "0");
    const dd = cur.getDate().toString().padStart(2, "0");
    out.push(`${yy}-${mm}-${dd}`);
  }
  return out;
}

describe("computeStreaks", () => {
  const today = "2026-05-15";
  const yesterday = "2026-05-14";

  it("returns 0 / 0 for an empty array", () => {
    expect(computeStreaks([], today)).toEqual({ current: 0, best: 0 });
  });

  it("returns 1 / 1 for a single log on today", () => {
    expect(computeStreaks([today], today)).toEqual({ current: 1, best: 1 });
  });

  it("returns 1 / 1 for a single log on yesterday (the yesterday-only rule)", () => {
    expect(computeStreaks([yesterday], today)).toEqual({ current: 1, best: 1 });
  });

  it("returns 0 / 1 for a single log a week ago (current breaks but best survives)", () => {
    expect(computeStreaks(["2026-05-08"], today)).toEqual({ current: 0, best: 1 });
  });

  it("returns 30 / 30 for a perfect 30-day run ending today", () => {
    const dates = consecutiveDatesEndingOn(today, 30);
    expect(computeStreaks(dates, today)).toEqual({ current: 30, best: 30 });
  });

  it("returns 0 / 30 for a 30-day run that ended a week ago", () => {
    const dates = consecutiveDatesEndingOn("2026-05-08", 30);
    expect(computeStreaks(dates, today)).toEqual({ current: 0, best: 30 });
  });

  it("returns 0 / 7 for two 7-day runs with one missing day in between, all in the past", () => {
    // Run A: 2026-04-20 to 2026-04-26 (7 days), gap on 2026-04-27, run B: 2026-04-28 to 2026-05-04 (7 days).
    const runA = consecutiveDatesEndingOn("2026-04-26", 7);
    const runB = consecutiveDatesEndingOn("2026-05-04", 7);
    expect(computeStreaks([...runA, ...runB], today)).toEqual({ current: 0, best: 7 });
  });

  it("handles a leap-day spanning run correctly (Feb 27 to Mar 2 of 2024, a leap year)", () => {
    // 5 consecutive days that include 2024-02-29.
    const leapDates = ["2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02"];
    // Use a "today" far from these dates so current is 0; we only care about best here.
    expect(computeStreaks(leapDates, today)).toEqual({ current: 0, best: 5 });
  });

  it("recomputes correctly when a retroactive log fills a gap", () => {
    // Initial state: logs on day 1 (2026-05-01), day 3 (2026-05-03), day 4 (2026-05-04).
    // After a retroactive log on day 2 (2026-05-02), the dates form a single 4-day run.
    const filled = ["2026-05-01", "2026-05-02", "2026-05-03", "2026-05-04"];
    expect(computeStreaks(filled, today)).toEqual({ current: 0, best: 4 });
  });

  it("tolerates duplicate dates in the input (defensive: unique index should prevent this)", () => {
    const dupes = [today, today, yesterday, yesterday, yesterday];
    expect(computeStreaks(dupes, today)).toEqual({ current: 2, best: 2 });
  });

  it("tolerates input in arbitrary order", () => {
    const scrambled = ["2026-05-12", "2026-05-15", "2026-05-13", "2026-05-14"];
    expect(computeStreaks(scrambled, today)).toEqual({ current: 4, best: 4 });
  });
});

import { describe, expect, it } from "vitest";
import {
  computeForecast,
  computeScenario,
  computeTrajectory,
  getYearMonths,
  isMonthCompleted,
  isScenarioActive,
} from "../budget-forecast";
import type { ForecastPayload } from "@/types";

function basePayload(overrides: Partial<ForecastPayload> = {}): ForecastPayload {
  return {
    year: 2026,
    currency: "EUR",
    monthlySavingsTarget: 500,
    savingsStartingBalance: 1000,
    actuals: {},
    recurringIncome: 3000,
    fixedCostsByMonth: Object.fromEntries(getYearMonths(2026).map((m) => [m, 1100])),
    spendingAverage: 1400,
    spendingMonthsUsed: 3,
    plannedExpensesByMonth: {},
    ...overrides,
  };
}

describe("isMonthCompleted", () => {
  it("treats months before the reference month as completed", () => {
    expect(isMonthCompleted("2026-01", 2026, new Date("2026-04-15"))).toBe(true);
    expect(isMonthCompleted("2026-04", 2026, new Date("2026-04-15"))).toBe(false);
  });
});

describe("computeForecast", () => {
  it("passes completed month actuals through and projects the current month", () => {
    const payload = basePayload({
      actuals: {
        "2026-01": { income: 3200, fixedCosts: 1100, spending: 1420, savings: 680 },
        "2026-02": { income: 3200, fixedCosts: 1100, spending: 1380, savings: 720 },
        "2026-03": { income: 3200, fixedCosts: 1100, spending: 1290, savings: 810 },
      },
    });

    const months = computeForecast(payload, {}, new Date("2026-04-15"));
    expect(months[0].isActual).toBe(true);
    expect(months[0].savings).toBe(680);
    expect(months[3].isActual).toBe(false);
    expect(months[3].income).toBe(3000);
    expect(months[3].spending).toBe(1400);
  });

  it("projects all 12 months when the reference month is January", () => {
    const payload = basePayload();
    const months = computeForecast(payload, {}, new Date("2026-01-10"));
    expect(months.every((m) => !m.isActual)).toBe(true);
  });

  it("excludes fixed costs after their end month from projections", () => {
    const months = getYearMonths(2026);
    const fixedCostsByMonth = Object.fromEntries(
      months.map((m) => [m, m <= "2026-06" ? 500 : 0])
    );
    const payload = basePayload({ fixedCostsByMonth });
    const result = computeForecast(payload, {}, new Date("2026-01-10"));
    expect(result[5].fixedCosts).toBe(500);
    expect(result[6].fixedCosts).toBe(0);
  });

  it("accumulates cumulative from savingsStartingBalance and recalculates after override", () => {
    const payload = basePayload({ savingsStartingBalance: 1000, recurringIncome: 3000 });
    const base = computeForecast(payload, {}, new Date("2026-01-10"));
    expect(base[0].cumulative).toBe(1000 + base[0].savings);

    const overridden = computeForecast(payload, { "2026-01:income": 4000 }, new Date("2026-01-10"));
    expect(overridden[0].income).toBe(4000);
    expect(overridden[0].cumulative).toBeGreaterThan(base[0].cumulative);
    expect(overridden[11].cumulative).toBeGreaterThan(base[11].cumulative);
  });
});

describe("computeScenario", () => {
  const reference = new Date("2026-04-15");
  const payload = basePayload({
    actuals: {
      "2026-01": { income: 3000, fixedCosts: 1100, spending: 1400, savings: 500 },
      "2026-02": { income: 3000, fixedCosts: 1100, spending: 1400, savings: 500 },
      "2026-03": { income: 3000, fixedCosts: 1100, spending: 1400, savings: 500 },
    },
  });

  it("adds a one-time expense to the target month and lowers later cumulative values", () => {
    const base = computeForecast(payload, {}, reference);
    const scenario = computeScenario(
      base,
      { oneTimeExpense: { amount: 500, month: "2026-05" }, monthlyDelta: null },
      500
    );
    const baseMay = base.find((m) => m.month === "2026-05")!;
    const scenarioMay = scenario.find((m) => m.month === "2026-05")!;
    expect(scenarioMay.spending).toBe(baseMay.spending + 500);
    expect(scenarioMay.savings).toBe(baseMay.savings - 500);
    expect(scenario[11].cumulative).toBeLessThan(base[11].cumulative);
  });

  it("applies monthlyDelta only to non-actual months", () => {
    const base = computeForecast(payload, {}, reference);
    const scenario = computeScenario(
      base,
      { oneTimeExpense: null, monthlyDelta: 200 },
      500
    );
    expect(scenario[2].spending).toBe(base[2].spending);
    expect(scenario[3].spending).toBe(base[3].spending + 200);
  });

  it("returns the base series exactly when cleared", () => {
    const base = computeForecast(payload, {}, reference);
    computeScenario(
      base,
      { oneTimeExpense: { amount: 300, month: "2026-06" }, monthlyDelta: 100 },
      500
    );
    const cleared = computeScenario(base, { oneTimeExpense: null, monthlyDelta: null }, 500);
    expect(cleared.map((m) => m.cumulative)).toEqual(base.map((m) => m.cumulative));
  });

  it("stacks overrides first, then scenario adjustments", () => {
    const base = computeForecast(payload, { "2026-05:spending": 1000 }, reference);
    const scenario = computeScenario(
      base,
      { oneTimeExpense: { amount: 250, month: "2026-05" }, monthlyDelta: null },
      500
    );
    const may = scenario.find((m) => m.month === "2026-05")!;
    expect(may.spending).toBe(1250);
  });
});

describe("computeTrajectory", () => {
  it("returns cumulative values in order", () => {
    const payload = basePayload();
    const months = computeForecast(payload, {}, new Date("2026-01-10"));
    expect(computeTrajectory(months)).toEqual(months.map((m) => m.cumulative));
  });
});

describe("isScenarioActive", () => {
  it("is false for empty scenario", () => {
    expect(isScenarioActive({ oneTimeExpense: null, monthlyDelta: null })).toBe(false);
  });

  it("is true when monthly delta is zero but explicitly set", () => {
    expect(isScenarioActive({ oneTimeExpense: null, monthlyDelta: 0 })).toBe(true);
  });
});

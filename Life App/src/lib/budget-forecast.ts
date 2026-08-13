import { format } from "date-fns";
import type { ForecastMonth, ForecastPayload, ForecastRowType, Scenario } from "@/types";

export function getYearMonths(year: number): string[] {
  return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
}

export function isMonthCompleted(month: string, year: number, referenceDate: Date = new Date()): boolean {
  if (!month.startsWith(`${year}-`)) return false;
  const currentMonth = format(referenceDate, "yyyy-MM");
  return referenceDate.getFullYear() === year && month < currentMonth;
}

function overrideKey(month: string, rowType: ForecastRowType): string {
  return `${month}:${rowType}`;
}

function monthHasOverride(month: string, overrides: Record<string, number>): boolean {
  return (
    overrides[overrideKey(month, "income")] !== undefined ||
    overrides[overrideKey(month, "fixedCosts")] !== undefined ||
    overrides[overrideKey(month, "spending")] !== undefined
  );
}

export function computeForecast(
  payload: ForecastPayload,
  overrides: Record<string, number> = {},
  referenceDate: Date = new Date()
): ForecastMonth[] {
  const months = getYearMonths(payload.year);
  let cumulative = payload.savingsStartingBalance;

  return months.map((month) => {
    const completed = isMonthCompleted(month, payload.year, referenceDate);
    let income: number;
    let fixedCosts: number;
    let spending: number;

    if (completed) {
      const actual = payload.actuals[month];
      income = actual?.income ?? 0;
      fixedCosts = actual?.fixedCosts ?? 0;
      spending = actual?.spending ?? 0;
    } else {
      income = overrides[overrideKey(month, "income")] ?? payload.recurringIncome;
      fixedCosts =
        overrides[overrideKey(month, "fixedCosts")] ?? payload.fixedCostsByMonth[month] ?? 0;
      const projectedSpending =
        payload.spendingAverage + (payload.plannedExpensesByMonth[month] ?? 0);
      spending = overrides[overrideKey(month, "spending")] ?? projectedSpending;
    }

    const savings = income - fixedCosts - spending;
    cumulative += savings;

    return {
      month,
      isActual: completed,
      income,
      fixedCosts,
      spending,
      savings,
      cumulative,
      shortfall: savings < payload.monthlySavingsTarget,
      hasOverride: !completed && monthHasOverride(month, overrides),
    };
  });
}

export function computeScenario(
  base: ForecastMonth[],
  scenario: Scenario,
  monthlySavingsTarget: number
): ForecastMonth[] {
  const oneTime = scenario.oneTimeExpense;
  const delta = scenario.monthlyDelta;
  const hasScenario =
    (oneTime != null && oneTime.amount > 0) || (delta != null && delta !== 0);

  if (!hasScenario) {
    return base.map((m) => ({ ...m }));
  }

  const startingBalance = base.length > 0 ? base[0].cumulative - base[0].savings : 0;
  let cumulative = startingBalance;

  return base.map((m) => {
    if (m.isActual) {
      cumulative = m.cumulative;
      return { ...m };
    }

    let spending = m.spending;
    if (oneTime != null && oneTime.month === m.month && oneTime.amount > 0) {
      spending += oneTime.amount;
    }
    if (delta != null) {
      spending += delta;
    }

    const savings = m.income - m.fixedCosts - spending;
    cumulative += savings;

    return {
      ...m,
      spending,
      savings,
      cumulative,
      shortfall: savings < monthlySavingsTarget,
      hasOverride: m.hasOverride,
    };
  });
}

export function computeTrajectory(months: ForecastMonth[]): number[] {
  return months.map((m) => m.cumulative);
}

export function formatForecastCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.abs(amount % 1) < 0.005 ? 0 : 2,
  }).format(amount);
}

export function forecastMonthLabel(month: string): string {
  const [, mm] = month.split("-");
  const labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return labels[Number(mm) - 1] ?? month;
}

export function isScenarioActive(scenario: Scenario): boolean {
  return (
    (scenario.oneTimeExpense != null && scenario.oneTimeExpense.amount > 0) ||
    scenario.monthlyDelta != null
  );
}

export const EMPTY_SCENARIO: Scenario = { oneTimeExpense: null, monthlyDelta: null };

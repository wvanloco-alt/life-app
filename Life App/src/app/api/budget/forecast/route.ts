import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  budgetSettings,
  fixedCosts,
  incomeEntries,
  plannedExpenses,
  spendingEntries,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { getYearMonths, isMonthCompleted } from "@/lib/budget-forecast";
import type { ForecastPayload, MonthActuals } from "@/types";
import { and, eq, gte, lte } from "drizzle-orm";
import { endOfMonth, format, parseISO } from "date-fns";

const SAVINGS_SPENDING_CATEGORIES = new Set(["Savings", "Savings Withdrawal"]);
const SAVINGS_FIXED_CATEGORY = "Savings";

async function getOrCreateBudgetSettings(userId: string) {
  const rows = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, userId));
  if (rows.length > 0) return rows[0];
  const [created] = await db
    .insert(budgetSettings)
    .values({ currency: "EUR", monthlySavingsTarget: 0, userId })
    .returning();
  return created!;
}

type IncomeRow = typeof incomeEntries.$inferSelect;
type FixedCostRow = typeof fixedCosts.$inferSelect;
type SpendingRow = typeof spendingEntries.$inferSelect;

function dedupeRecurring(entries: IncomeRow[]): Map<string, IncomeRow> {
  const recurringBySource = new Map<string, IncomeRow>();
  for (const entry of entries) {
    if (!entry.isRecurring) continue;
    const existing = recurringBySource.get(entry.source);
    if (
      !existing ||
      (entry.createdAt && existing.createdAt && entry.createdAt > existing.createdAt)
    ) {
      recurringBySource.set(entry.source, entry);
    }
  }
  return recurringBySource;
}

function resolveMonthIncome(
  month: string,
  monthIncomeEntries: IncomeRow[],
  recurringBySource: Map<string, IncomeRow>
): number {
  const monthSources = new Set(monthIncomeEntries.map((e) => e.source));
  let totalIncome = monthIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
  for (const [, entry] of recurringBySource) {
    if (!monthSources.has(entry.source)) totalIncome += entry.amount;
  }
  return totalIncome;
}

function isFixedCostActiveInMonth(fc: FixedCostRow, month: string): boolean {
  if (!fc.isActive || fc.category === SAVINGS_FIXED_CATEGORY) return false;
  return fc.startMonth <= month && (fc.endMonth == null || fc.endMonth >= month);
}

function computeFixedCostsForMonth(month: string, allFixedCosts: FixedCostRow[]): number {
  return allFixedCosts
    .filter((fc) => isFixedCostActiveInMonth(fc, month))
    .reduce((sum, fc) => sum + fc.amount, 0);
}

function computeSpendingForMonth(month: string, allSpending: SpendingRow[]): number {
  const monthStart = `${month}-01`;
  const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");
  return allSpending
    .filter(
      (entry) =>
        entry.date >= monthStart &&
        entry.date <= monthEnd &&
        !SAVINGS_SPENDING_CATEGORIES.has(entry.category)
    )
    .reduce((sum, entry) => sum + entry.amount, 0);
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const today = new Date();
  const year = today.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const months = getYearMonths(year);

  const settings = await getOrCreateBudgetSettings(userId);

  const yearIncomeRows = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.userId, userId), gte(incomeEntries.month, `${year}-01`)));

  const recurringRows = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.isRecurring, true), eq(incomeEntries.userId, userId)));

  const recurringBySource = dedupeRecurring(recurringRows);
  const recurringIncome = [...recurringBySource.values()].reduce((sum, e) => sum + e.amount, 0);

  const allFixedCosts = await db
    .select()
    .from(fixedCosts)
    .where(and(eq(fixedCosts.isActive, true), eq(fixedCosts.userId, userId)));

  const allSpending = await db
    .select()
    .from(spendingEntries)
    .where(
      and(
        eq(spendingEntries.userId, userId),
        gte(spendingEntries.date, yearStart),
        lte(spendingEntries.date, yearEnd)
      )
    );

  const allPlanned = await db
    .select()
    .from(plannedExpenses)
    .where(and(eq(plannedExpenses.userId, userId), gte(plannedExpenses.month, `${year}-01`)));

  const incomeByMonth = new Map<string, IncomeRow[]>();
  for (const entry of yearIncomeRows) {
    const list = incomeByMonth.get(entry.month) ?? [];
    list.push(entry);
    incomeByMonth.set(entry.month, list);
  }

  const actuals: Record<string, MonthActuals> = {};
  for (const month of months) {
    if (!isMonthCompleted(month, year, today)) continue;
    const income = resolveMonthIncome(month, incomeByMonth.get(month) ?? [], recurringBySource);
    const fixed = computeFixedCostsForMonth(month, allFixedCosts);
    const spending = computeSpendingForMonth(month, allSpending);
    actuals[month] = {
      income,
      fixedCosts: fixed,
      spending,
      savings: income - fixed - spending,
    };
  }

  const fixedCostsByMonth: Record<string, number> = {};
  for (const month of months) {
    fixedCostsByMonth[month] = computeFixedCostsForMonth(month, allFixedCosts);
  }

  const plannedExpensesByMonth: Record<string, number> = {};
  for (const expense of allPlanned) {
    if (!expense.month.startsWith(`${year}-`)) continue;
    plannedExpensesByMonth[expense.month] =
      (plannedExpensesByMonth[expense.month] ?? 0) + expense.amount;
  }

  const completedMonths = months.filter((month) => isMonthCompleted(month, year, today));
  const sampleMonths = completedMonths.slice(-3);
  const spendingTotals = sampleMonths.map((month) => computeSpendingForMonth(month, allSpending));
  const spendingMonthsUsed = spendingTotals.length;
  const spendingAverage =
    spendingMonthsUsed > 0
      ? spendingTotals.reduce((sum, value) => sum + value, 0) / spendingMonthsUsed
      : 0;

  const payload: ForecastPayload = {
    year,
    currency: settings.currency ?? "EUR",
    monthlySavingsTarget: settings.monthlySavingsTarget ?? 0,
    savingsStartingBalance: settings.savingsStartingBalance ?? 0,
    actuals,
    recurringIncome,
    fixedCostsByMonth,
    spendingAverage,
    spendingMonthsUsed,
    plannedExpensesByMonth,
  };

  return NextResponse.json(payload);
}

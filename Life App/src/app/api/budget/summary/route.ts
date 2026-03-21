import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetSettings, incomeEntries, fixedCosts, spendingEntries, spendingCategories, plannedExpenses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { format, parseISO, getDaysInMonth, differenceInDays, endOfMonth, addMonths, parse } from "date-fns";
import type { BudgetSummary } from "@/types";
import { auth } from "@/lib/auth";

async function getOrCreateBudgetSettings(userId: string) {
  const rows = await db.select().from(budgetSettings).where(eq(budgetSettings.userId, userId));
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(budgetSettings).values({ currency: "EUR", monthlySavingsTarget: 0, userId }).returning();
  return created!;
}

function getDaysLeft(month: string): number {
  const today = new Date();
  const targetMonth = parse(month + "-01", "yyyy-MM-dd", new Date());
  const targetYear = targetMonth.getFullYear();
  const targetMonthNum = targetMonth.getMonth();
  if (targetYear < today.getFullYear()) return 0;
  if (targetYear === today.getFullYear() && targetMonthNum < today.getMonth()) return 0;
  if (targetYear > today.getFullYear()) return getDaysInMonth(targetMonth);
  if (targetMonthNum > today.getMonth()) return getDaysInMonth(targetMonth);
  return differenceInDays(endOfMonth(today), today) + 1;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get("month");
  const today = new Date();
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : format(today, "yyyy-MM");

  const settings = await getOrCreateBudgetSettings(userId);
  const monthStart = month + "-01";
  const monthEnd = format(endOfMonth(parseISO(monthStart)), "yyyy-MM-dd");

  const monthIncomeEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.month, month), eq(incomeEntries.userId, userId)));
  const recurringEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.isRecurring, true), eq(incomeEntries.userId, userId)));

  const recurringBySource = new Map<string, (typeof recurringEntries)[0]>();
  for (const entry of recurringEntries) {
    const existing = recurringBySource.get(entry.source);
    if (!existing || (entry.createdAt && existing.createdAt && entry.createdAt > existing.createdAt)) recurringBySource.set(entry.source, entry);
  }

  const monthSources = new Set(monthIncomeEntries.map((e) => e.source));
  let totalIncome = monthIncomeEntries.reduce((sum, e) => sum + e.amount, 0);
  for (const [, e] of recurringBySource) {
    if (!monthSources.has(e.source)) totalIncome += e.amount;
  }

  const allFixedCosts = await db.select().from(fixedCosts).where(and(eq(fixedCosts.isActive, true), eq(fixedCosts.userId, userId)));
  const totalFixedCosts = allFixedCosts.filter((fc) => fc.endMonth == null || (fc.startMonth <= month && fc.endMonth >= month)).reduce((sum, fc) => sum + fc.amount, 0);

  const monthlySavingsTarget = settings.monthlySavingsTarget ?? 0;
  const spendingBudget = totalIncome - totalFixedCosts - monthlySavingsTarget;

  const allSpending = await db.select().from(spendingEntries).where(eq(spendingEntries.userId, userId));
  const monthSpending = allSpending.filter((e) => e.date >= monthStart && e.date <= monthEnd);
  const totalSpent = monthSpending.reduce((sum, e) => sum + e.amount, 0);
  const remaining = spendingBudget - totalSpent;
  const daysLeft = getDaysLeft(month);
  const dailyAllowance = daysLeft > 0 ? Math.round((remaining / daysLeft) * 100) / 100 : 0;

  const byCategory = new Map<string, { amount: number; icon: string; color: string }>();
  const activeFixedCosts = allFixedCosts.filter((fc) => fc.endMonth == null || (fc.startMonth <= month && fc.endMonth >= month));
  for (const fc of activeFixedCosts) {
    const cur = byCategory.get(fc.category) ?? { amount: 0, icon: "🏠", color: "#6B7280" };
    cur.amount += fc.amount;
    byCategory.set(fc.category, cur);
  }
  for (const e of monthSpending) {
    const cur = byCategory.get(e.category) ?? { amount: 0, icon: "📦", color: "#6B7280" };
    cur.amount += e.amount;
    byCategory.set(e.category, cur);
  }

  const categories = await db.select().from(spendingCategories).where(and(eq(spendingCategories.isArchived, false), eq(spendingCategories.userId, userId)));

  const monthPlannedExpenses = await db
    .select({
      id: plannedExpenses.id,
      name: plannedExpenses.name,
      amount: plannedExpenses.amount,
      month: plannedExpenses.month,
      categoryId: plannedExpenses.categoryId,
      categoryName: spendingCategories.name,
      categoryIcon: spendingCategories.icon,
      notes: plannedExpenses.notes,
      createdAt: plannedExpenses.createdAt,
      updatedAt: plannedExpenses.updatedAt,
    })
    .from(plannedExpenses)
    .leftJoin(spendingCategories, eq(plannedExpenses.categoryId, spendingCategories.id))
    .where(and(eq(plannedExpenses.month, month), eq(plannedExpenses.userId, userId)));

  const totalPlannedExpenses = monthPlannedExpenses.reduce((sum, pe) => sum + pe.amount, 0);

  const catMap = new Map(categories.map((c) => [c.name, c]));
  const spendingByCategory = Array.from(byCategory.entries()).map(([category, { amount }]) => {
    const cat = catMap.get(category);
    return { category, amount, icon: cat?.icon ?? "📦", color: cat?.color ?? "#6B7280" };
  });

  let savingsGoal: BudgetSummary["savingsGoal"] = null;
  if (settings.savingsGoalTotal != null && settings.savingsGoalTotal > 0) {
    const allIncome = await db.select().from(incomeEntries).where(eq(incomeEntries.userId, userId));
    const allSpendingAll = await db.select().from(spendingEntries).where(eq(spendingEntries.userId, userId));
    const allFixed = await db.select().from(fixedCosts).where(and(eq(fixedCosts.isActive, true), eq(fixedCosts.userId, userId)));
    const allPlanned = await db.select().from(plannedExpenses).where(eq(plannedExpenses.userId, userId));

    const firstMonth = allIncome.length > 0 ? allIncome.reduce((min, e) => (e.month < min ? e.month : min), allIncome[0].month) : month;
    const firstDate = parse(firstMonth + "-01", "yyyy-MM-dd", new Date());
    const currentMonthDate = parse(month + "-01", "yyyy-MM-dd", new Date());

    let totalSaved = 0;
    let d = firstDate;
    while (d <= currentMonthDate) {
      const m = format(d, "yyyy-MM");
      const mStart = m + "-01";
      const mEnd = format(endOfMonth(d), "yyyy-MM-dd");
      const mIncome = allIncome.filter((e) => e.month === m).reduce((s, e) => s + e.amount, 0);
      const mRecBySource = new Map<string, number>();
      for (const e of allIncome) { if (e.isRecurring) mRecBySource.set(e.source, e.amount); }
      let mRecurring = 0;
      const mSources = new Set(allIncome.filter((e) => e.month === m).map((e) => e.source));
      for (const [source, amt] of mRecBySource) { if (!mSources.has(source)) mRecurring += amt; }
      const mFixed = allFixed.filter((fc) => fc.endMonth == null || (fc.startMonth <= m && fc.endMonth >= m)).reduce((s, fc) => s + fc.amount, 0);
      const mSpending = allSpendingAll.filter((e) => e.date >= mStart && e.date <= mEnd).reduce((s, e) => s + e.amount, 0);
      const mPlanned = allPlanned.filter((pe) => pe.month === m).reduce((s, pe) => s + pe.amount, 0);
      totalSaved += mIncome + mRecurring - mFixed - mSpending - mPlanned;
      d = addMonths(d, 1);
    }

    const saved = Math.max(0, totalSaved);
    const total = settings.savingsGoalTotal;
    savingsGoal = { total, targetDate: settings.savingsGoalTargetDate, saved, percentage: total > 0 ? Math.min(100, Math.round((saved / total) * 10000) / 100) : 0 };
  }

  const summary: BudgetSummary = { month, totalIncome, totalFixedCosts, monthlySavingsTarget, spendingBudget, totalSpent, remaining, dailyAllowance, daysLeft, spendingByCategory, savingsGoal, totalPlannedExpenses, plannedExpenses: monthPlannedExpenses };
  return NextResponse.json(summary);
}

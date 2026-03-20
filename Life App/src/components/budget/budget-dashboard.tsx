"use client";

import { useState, useEffect, useCallback } from "react";
import { parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BudgetSettingsDialog } from "./budget-settings-dialog";
import { formatEur } from "@/lib/currency";
import type { BudgetSummary } from "@/types";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Settings, Receipt } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { usePalette } from "@/hooks/use-palette";

interface BudgetDashboardProps {
  month: string;
}

interface MonthOverview {
  month: string;
  label: string;
  income: number;
  fixedCosts: number;
  planned: number;
  spending: number;
  savings: number;
  net: number;
}

const MONTH_LABELS: Record<string, string> = {
  "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
  "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
  "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
};

export function BudgetDashboard({ month }: BudgetDashboardProps) {
  const palette = usePalette();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [overviewData, setOverviewData] = useState<MonthOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`/api/budget/summary?month=${month}`);
    const data = await res.json();
    setSummary(data);
  }, [month]);

  const fetchOverview = useCallback(async () => {
    const year = month.slice(0, 4);
    const months: string[] = [];
    for (let m = 1; m <= 12; m++) {
      months.push(`${year}-${m.toString().padStart(2, "0")}`);
    }
    const results = await Promise.all(
      months.map(async (m) => {
        const res = await fetch(`/api/budget/summary?month=${m}`);
        const d: BudgetSummary = await res.json();
        const [, mm] = m.split("-");
        const planned = d.totalPlannedExpenses ?? 0;
        const savings = Math.max(0, d.totalIncome - d.totalFixedCosts - d.totalSpent - planned);
        return {
          month: m,
          label: `${MONTH_LABELS[mm] ?? mm}`,
          income: d.totalIncome,
          fixedCosts: d.totalFixedCosts,
          planned,
          spending: d.totalSpent,
          savings,
          net: d.totalIncome - d.totalFixedCosts - d.totalSpent - planned,
        };
      })
    );
    setOverviewData(results);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchSummary(), fetchOverview()]).finally(() => setLoading(false));
  }, [fetchSummary, fetchOverview]);

  if (loading || !summary) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  const remainingPct =
    summary.spendingBudget > 0
      ? (summary.remaining / summary.spendingBudget) * 100
      : 100;
  const remainingColor =
    remainingPct > 50
      ? "text-emerald-600"
      : remainingPct >= 20
        ? "text-amber-600"
        : "text-red-600";

  const pieData = summary.spendingByCategory.map((c) => ({
    name: c.category,
    value: c.amount,
    color: c.color,
  }));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          title="Budget settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
        <BudgetSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSaved={fetchSummary}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-muted/30 p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Monthly Income</p>
          <p className="text-2xl font-bold tracking-tight">{formatEur(summary.totalIncome)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Fixed Costs</p>
          <p className="text-2xl font-bold tracking-tight">{formatEur(summary.totalFixedCosts)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Savings Target</p>
          <p className="text-2xl font-bold tracking-tight">{formatEur(summary.monthlySavingsTarget)}</p>
        </div>
        <div className="rounded-xl bg-muted/30 p-5">
          <p className="text-xs font-medium text-muted-foreground mb-1">Spending Budget</p>
          <p className="text-2xl font-bold tracking-tight">{formatEur(summary.spendingBudget)}</p>
        </div>
      </div>

      <Card className="border-0 bg-muted/20 shadow-none">
        <CardHeader className="pb-2">
          <CardDescription className="text-xs">
            {summary.daysLeft > 0
              ? `${summary.daysLeft} days left · Daily allowance: ${formatEur(summary.dailyAllowance)}`
              : "Month ended"}
          </CardDescription>
          <p className="text-sm font-medium text-muted-foreground">Remaining Budget</p>
        </CardHeader>
        <CardContent>
          <p className={`text-4xl font-bold ${remainingColor}`}>
            {formatEur(summary.remaining)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>This month&apos;s spending breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) =>
                      `${name}: ${formatEur(value)}`
                    }
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number | undefined) => formatEur(v ?? 0)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState
                icon={Receipt}
                title="No spending yet"
                description="Start tracking your expenses to see the breakdown here."
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {summary.savingsGoal && (
            <Card>
              <CardHeader>
                <CardTitle>Savings Goal</CardTitle>
                <CardDescription>
                  {summary.savingsGoal.targetDate
                    ? `Target: ${formatEur(summary.savingsGoal.total)} by ${summary.savingsGoal.targetDate}`
                    : `Target: ${formatEur(summary.savingsGoal.total)}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{formatEur(summary.savingsGoal.saved)} saved</span>
                    <span>{summary.savingsGoal.percentage}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width: `${Math.min(summary.savingsGoal.percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Category Breakdown</CardTitle>
              <CardDescription>Spending per category this month</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.spendingByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={summary.spendingByCategory} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                    <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: number | undefined) => formatEur(v ?? 0)} />
                    <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                      {summary.spendingByCategory.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Receipt}
                  title="No spending this month"
                  description="Log an expense to see your category breakdown."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
          <CardDescription>{month.slice(0, 4)} overview: income, fixed costs, spending, savings</CardDescription>
        </CardHeader>
        <CardContent>
          {overviewData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overviewData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(v: number | undefined) => formatEur(v ?? 0)} />
                <Legend />
                <Bar dataKey="income" fill={palette.color("emerald")} name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="fixedCosts" fill={palette.color("gray")} name="Fixed costs" radius={[4, 4, 0, 0]} />
                <Bar dataKey="planned" fill={palette.color("purple")} name="Planned" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spending" fill={palette.color("amber")} name="Spending" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill={palette.color("blue")} name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly Summary</CardTitle>
          <CardDescription>{month.slice(0, 4)} totals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2.5 text-xs font-medium text-muted-foreground">Month</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Income</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Fixed</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Planned</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Spending</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Savings</th>
                  <th className="text-right py-2.5 text-xs font-medium text-muted-foreground">Net</th>
                </tr>
              </thead>
              <tbody>
                {overviewData.map((row) => (
                  <tr key={row.month} className="border-b border-border/30">
                    <td className="py-2">{row.label} {row.month.slice(0, 4)}</td>
                    <td className="text-right py-2">{formatEur(row.income)}</td>
                    <td className="text-right py-2">{formatEur(row.fixedCosts)}</td>
                    <td className="text-right py-2">{formatEur(row.planned)}</td>
                    <td className="text-right py-2">{formatEur(row.spending)}</td>
                    <td className="text-right py-2">{formatEur(row.savings)}</td>
                    <td className="text-right py-2">{formatEur(row.net)}</td>
                  </tr>
                ))}
                {overviewData.length > 0 && (() => {
                  const totals = overviewData.reduce(
                    (acc, r) => ({
                      income: acc.income + r.income,
                      fixedCosts: acc.fixedCosts + r.fixedCosts,
                      planned: acc.planned + r.planned,
                      spending: acc.spending + r.spending,
                      savings: acc.savings + r.savings,
                      net: acc.net + r.net,
                    }),
                    { income: 0, fixedCosts: 0, planned: 0, spending: 0, savings: 0, net: 0 }
                  );
                  return (
                    <tr className="border-t-2 font-bold">
                      <td className="py-2">Total</td>
                      <td className="text-right py-2">{formatEur(totals.income)}</td>
                      <td className="text-right py-2">{formatEur(totals.fixedCosts)}</td>
                      <td className="text-right py-2">{formatEur(totals.planned)}</td>
                      <td className="text-right py-2">{formatEur(totals.spending)}</td>
                      <td className="text-right py-2">{formatEur(totals.savings)}</td>
                      <td className="text-right py-2">{formatEur(totals.net)}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

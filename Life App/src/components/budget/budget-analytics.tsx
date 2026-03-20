"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { formatEur } from "@/lib/currency";
import { subMonths, parseISO, format } from "date-fns";
import type { BudgetSummary } from "@/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { usePalette } from "@/hooks/use-palette";

interface BudgetAnalyticsProps {
  month: string;
}

interface MonthSummary {
  month: string;
  label: string;
  income: number;
  fixedCosts: number;
  spending: number;
  savings: number;
  net: number;
}

export function BudgetAnalytics({ month }: BudgetAnalyticsProps) {
  const palette = usePalette();
  const [overviewData, setOverviewData] = useState<MonthSummary[]>([]);
  const [categoryData, setCategoryData] = useState<
    { category: string; amount: number; icon: string; color: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const fetchOverview = useCallback(async () => {
    const current = parseISO(month + "-01");
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(current, i);
      months.push(
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}`
      );
    }
    const results = await Promise.all(
      months.map(async (m) => {
        const res = await fetch(`/api/budget/summary?month=${m}`);
        const d: BudgetSummary = await res.json();
        const [, mm] = m.split("-");
        const labels: Record<string, string> = {
          "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
          "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
          "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
        };
        const savings = Math.max(
          0,
          d.totalIncome - d.totalFixedCosts - d.totalSpent
        );
        return {
          month: m,
          label: `${labels[mm] ?? mm} ${m.slice(0, 4)}`,
          income: d.totalIncome,
          fixedCosts: d.totalFixedCosts,
          spending: d.totalSpent,
          savings,
          net: d.totalIncome - d.totalFixedCosts - d.totalSpent,
        };
      })
    );
    setOverviewData(results);
  }, [month]);

  const fetchCategoryData = useCallback(async () => {
    const res = await fetch(`/api/budget/summary?month=${month}`);
    const d: BudgetSummary = await res.json();
    setCategoryData(d.spendingByCategory);
  }, [month]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOverview(), fetchCategoryData()]).finally(() =>
      setLoading(false)
    );
  }, [fetchOverview, fetchCategoryData]);

  const yearlyTotal = overviewData.reduce(
    (acc, row) => ({
      income: acc.income + row.income,
      fixedCosts: acc.fixedCosts + row.fixedCosts,
      spending: acc.spending + row.spending,
      savings: acc.savings + row.savings,
      net: acc.net + row.net,
    }),
    { income: 0, fixedCosts: 0, spending: 0, savings: 0, net: 0 }
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly overview</CardTitle>
          <CardDescription>
            Last 12 months: income, fixed costs, spending, savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-12 text-center text-muted-foreground">
              Loading...
            </p>
          ) : overviewData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={overviewData}>
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(v: number | undefined) => formatEur(v ?? 0)} />
                <Legend />
                <Bar dataKey="income" fill={palette.color("emerald")} name="Income" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="fixedCosts"
                  fill={palette.color("gray")}
                  name="Fixed costs"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="spending"
                  fill={palette.color("amber")}
                  name="Spending"
                  radius={[4, 4, 0, 0]}
                />
                <Bar dataKey="savings" fill={palette.color("blue")} name="Savings" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Category breakdown</CardTitle>
          <CardDescription>
            Spending by category for {format(parseISO(month + "-01"), "MMMM yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" tickFormatter={(v) => `€${v}`} />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={100}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip formatter={(v: number | undefined) => formatEur(v ?? 0)} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-12 text-center text-muted-foreground">
              No spending this month.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly summary</CardTitle>
          <CardDescription>Last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Month</th>
                  <th className="text-right py-2 font-medium">Income</th>
                  <th className="text-right py-2 font-medium">Fixed</th>
                  <th className="text-right py-2 font-medium">Spending</th>
                  <th className="text-right py-2 font-medium">Savings</th>
                  <th className="text-right py-2 font-medium">Net</th>
                </tr>
              </thead>
              <tbody>
                {overviewData.map((row) => (
                  <tr key={row.month} className="border-b">
                    <td className="py-2">{row.label}</td>
                    <td className="text-right py-2">
                      {formatEur(row.income)}
                    </td>
                    <td className="text-right py-2">
                      {formatEur(row.fixedCosts)}
                    </td>
                    <td className="text-right py-2">
                      {formatEur(row.spending)}
                    </td>
                    <td className="text-right py-2">
                      {formatEur(row.savings)}
                    </td>
                    <td className="text-right py-2">
                      {formatEur(row.net)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold">
                  <td className="py-2">Total</td>
                  <td className="text-right py-2">
                    {formatEur(yearlyTotal.income)}
                  </td>
                  <td className="text-right py-2">
                    {formatEur(yearlyTotal.fixedCosts)}
                  </td>
                  <td className="text-right py-2">
                    {formatEur(yearlyTotal.spending)}
                  </td>
                  <td className="text-right py-2">
                    {formatEur(yearlyTotal.savings)}
                  </td>
                  <td className="text-right py-2">
                    {formatEur(yearlyTotal.net)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

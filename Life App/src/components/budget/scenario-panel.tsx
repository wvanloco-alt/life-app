"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { forecastMonthLabel, isScenarioActive } from "@/lib/budget-forecast";
import type { ForecastMonth, Scenario } from "@/types";

interface ScenarioPanelProps {
  scenario: Scenario;
  onChange: (scenario: Scenario) => void;
  months: ForecastMonth[];
  currency: string;
}

export function ScenarioPanel({ scenario, onChange, months, currency }: ScenarioPanelProps) {
  const [expenseDraft, setExpenseDraft] = useState("");
  const [deltaDraft, setDeltaDraft] = useState("");
  const [deltaSign, setDeltaSign] = useState<1 | -1>(1);
  const [expenseMonth, setExpenseMonth] = useState<string>("");

  const selectableMonths = useMemo(
    () => months.filter((m) => !m.isActual).map((m) => m.month),
    [months]
  );

  useEffect(() => {
    if (expenseMonth || selectableMonths.length === 0) return;
    setExpenseMonth(selectableMonths[0]);
  }, [expenseMonth, selectableMonths]);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const amount = expenseDraft.trim() === "" ? null : Number(expenseDraft.replace(",", "."));
      const delta =
        deltaDraft.trim() === ""
          ? null
          : Number(deltaDraft.replace(",", ".")) * deltaSign;

      onChangeRef.current({
        oneTimeExpense:
          amount != null && Number.isFinite(amount) && amount > 0 && expenseMonth
            ? { amount, month: expenseMonth }
            : null,
        monthlyDelta: delta != null && Number.isFinite(delta) ? delta : null,
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [expenseDraft, deltaDraft, deltaSign, expenseMonth]);

  function clearScenario() {
    setExpenseDraft("");
    setDeltaDraft("");
    setDeltaSign(1);
    onChange({ oneTimeExpense: null, monthlyDelta: null });
  }

  const active = isScenarioActive(scenario);
  const currencySymbol =
    new Intl.NumberFormat(undefined, { style: "currency", currency }).formatToParts(0)[0]?.value ??
    currency;

  return (
    <Card className={active ? "border-l-4 border-l-amber-400" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="font-[family-name:var(--font-display)] text-lg">What If</CardTitle>
        <Button variant="ghost" size="sm" onClick={clearScenario} disabled={!active}>
          Clear
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">One-time expense</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                value={expenseDraft}
                onChange={(e) => setExpenseDraft(e.target.value)}
                className="pl-8"
                inputMode="decimal"
                placeholder="0"
              />
            </div>
            <Select value={expenseMonth} onValueChange={setExpenseMonth}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {selectableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {forecastMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Monthly adjustment</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setDeltaSign((sign) => (sign === 1 ? -1 : 1))}
              aria-label="Toggle sign"
            >
              {deltaSign > 0 ? "+" : "−"}
            </Button>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {currencySymbol}
              </span>
              <Input
                value={deltaDraft}
                onChange={(e) => setDeltaDraft(e.target.value)}
                className="pl-8"
                inputMode="decimal"
                placeholder="0"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {deltaSign > 0 ? "More" : "Less"} spending per projected month
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

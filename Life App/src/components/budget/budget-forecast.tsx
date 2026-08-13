"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  computeForecast,
  computeScenario,
  EMPTY_SCENARIO,
  isScenarioActive,
} from "@/lib/budget-forecast";
import type { ForecastPayload, ForecastRowType, Scenario } from "@/types";
import { ForecastChart } from "./forecast-chart";
import { ForecastTable } from "./forecast-table";
import { ScenarioPanel } from "./scenario-panel";

function ForecastSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[200px] w-full rounded-[0.625rem]" />
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-[0.625rem]" />
        <Skeleton className="h-10 w-full rounded-[0.625rem]" />
        <Skeleton className="h-10 w-full rounded-[0.625rem]" />
        <Skeleton className="h-10 w-full rounded-[0.625rem]" />
      </div>
      <Skeleton className="h-40 w-full rounded-[0.625rem]" />
    </div>
  );
}

interface BudgetForecastProps {
  onSwitchTab?: (tab: string) => void;
}

export function BudgetForecast({ onSwitchTab }: BudgetForecastProps) {
  const [raw, setRaw] = useState<ForecastPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [scenario, setScenario] = useState<Scenario>(EMPTY_SCENARIO);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/budget/forecast");
        if (!res.ok) throw new Error("Failed to load forecast");
        const data = (await res.json()) as ForecastPayload;
        if (!cancelled) setRaw(data);
      } catch {
        if (!cancelled) setError("Could not load your forecast right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const baseMonths = useMemo(
    () => (raw ? computeForecast(raw, overrides) : []),
    [raw, overrides]
  );

  const scenarioMonths = useMemo(
    () =>
      raw ? computeScenario(baseMonths, scenario, raw.monthlySavingsTarget) : [],
    [baseMonths, scenario, raw]
  );

  const annualGoal = raw ? raw.monthlySavingsTarget * 12 : 0;
  const scenarioActive = isScenarioActive(scenario);

  const handleOverride = useCallback(
    (month: string, rowType: ForecastRowType, value: number | null) => {
      const key = `${month}:${rowType}`;
      setOverrides((prev) => {
        const next = { ...prev };
        if (value == null) delete next[key];
        else next[key] = value;
        return next;
      });
    },
    []
  );

  if (loading) return <ForecastSkeleton />;

  if (error || !raw) {
    return <p className="text-sm text-muted-foreground">{error || "Something went wrong."}</p>;
  }

  const hasIncomeData = raw.recurringIncome > 0 || Object.keys(raw.actuals).length > 0;
  if (!hasIncomeData) {
    return (
      <EmptyState
        icon={Wallet}
        title="No income data yet"
        description="Add your monthly income in the Income tab to see your year forecast."
        action={{
          label: "Add income",
          onClick: () => onSwitchTab?.("income"),
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight">
          Budget Forecast
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your year at a glance — actuals for completed months, projections for the rest.
        </p>
      </div>

      <ForecastChart
        baseMonths={baseMonths}
        scenarioMonths={scenarioMonths}
        scenarioActive={scenarioActive}
        annualGoal={annualGoal}
        currency={raw.currency}
      />

      <ForecastTable
        months={scenarioMonths}
        overrides={overrides}
        monthlySavingsTarget={raw.monthlySavingsTarget}
        currency={raw.currency}
        onOverride={handleOverride}
      />

      {raw.spendingMonthsUsed > 0 && raw.spendingMonthsUsed < 3 && (
        <p className="text-xs text-muted-foreground">
          Spending projection is based on {raw.spendingMonthsUsed} month
          {raw.spendingMonthsUsed === 1 ? "" : "s"} of history.
        </p>
      )}

      <ScenarioPanel
        scenario={scenario}
        onChange={setScenario}
        months={baseMonths}
        currency={raw.currency}
      />
    </div>
  );
}

"use client";

import {
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePalette } from "@/hooks/use-palette";
import { forecastMonthLabel, formatForecastCurrency } from "@/lib/budget-forecast";
import type { ForecastMonth } from "@/types";

interface ForecastChartProps {
  baseMonths: ForecastMonth[];
  scenarioMonths: ForecastMonth[];
  scenarioActive: boolean;
  annualGoal: number;
  currency: string;
}

export function ForecastChart({
  baseMonths,
  scenarioMonths,
  scenarioActive,
  annualGoal,
  currency,
}: ForecastChartProps) {
  const palette = usePalette();
  const amber = palette.color("amber");
  const blue = palette.color("blue");

  const lastActualIndex = baseMonths.findLastIndex((m) => m.isActual);

  const data = baseMonths.map((base, index) => {
    const includeInProjection =
      lastActualIndex >= 0 ? index >= lastActualIndex : true;

    return {
      month: forecastMonthLabel(base.month),
      actual: base.isActual ? base.cumulative : null,
      projected: includeInProjection ? base.cumulative : null,
      scenario:
        scenarioActive && includeInProjection ? scenarioMonths[index]?.cumulative ?? null : null,
    };
  });

  return (
    <div className="rounded-[0.625rem] border border-border p-4">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
            tickFormatter={(value: number) => formatForecastCurrency(value, currency)}
          />
          <Tooltip
            formatter={(value: number | undefined, name: string | undefined) => [
              value != null ? formatForecastCurrency(value, currency) : "—",
              name === "actual" ? "Actual" : name === "scenario" ? "Scenario" : "Projected",
            ]}
          />
          {annualGoal > 0 && (
            <ReferenceLine
              y={annualGoal}
              stroke={palette.color("gray")}
              strokeDasharray="4 2"
              label={{
                value: `Goal ${formatForecastCurrency(annualGoal, currency)}`,
                position: "right",
                fill: "currentColor",
                fontSize: 11,
              }}
            />
          )}
          <Line
            type="monotone"
            dataKey="actual"
            stroke={amber}
            strokeWidth={2}
            dot={false}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke={amber}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
            connectNulls
            opacity={0.55}
          />
          {scenarioActive && (
            <Line
              type="monotone"
              dataKey="scenario"
              stroke={blue}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

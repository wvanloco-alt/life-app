"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Pencil } from "lucide-react";
import {
  forecastMonthLabel,
  formatForecastCurrency,
} from "@/lib/budget-forecast";
import type { ForecastMonth, ForecastRowType } from "@/types";

interface ForecastTableProps {
  months: ForecastMonth[];
  overrides: Record<string, number>;
  monthlySavingsTarget: number;
  currency: string;
  onOverride: (month: string, rowType: ForecastRowType, value: number | null) => void;
}

type RowDef = {
  key: ForecastRowType | "savings" | "cumulative";
  label: string;
  editable: boolean;
  getValue: (month: ForecastMonth) => number;
};

const ROWS: RowDef[] = [
  { key: "income", label: "Income", editable: true, getValue: (m) => m.income },
  { key: "fixedCosts", label: "Fixed costs", editable: true, getValue: (m) => m.fixedCosts },
  { key: "spending", label: "Spending", editable: true, getValue: (m) => m.spending },
  { key: "savings", label: "Savings", editable: false, getValue: (m) => m.savings },
  { key: "cumulative", label: "Cumulative", editable: false, getValue: (m) => m.cumulative },
];

function overrideKey(month: string, rowType: ForecastRowType): string {
  return `${month}:${rowType}`;
}

function CellEditor({
  value,
  onConfirm,
  onCancel,
}: {
  value: string;
  onConfirm: (value: number | null) => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function commit() {
    const trimmed = draft.trim();
    if (trimmed === "") {
      onConfirm(null);
      return;
    }
    const parsed = Number(trimmed.replace(",", "."));
    if (Number.isFinite(parsed)) onConfirm(parsed);
    else onCancel();
  }

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onCancel();
      }}
      className="w-full bg-transparent text-right font-[family-name:var(--font-mono)] text-[13px] outline-none"
    />
  );
}

export function ForecastTable({
  months,
  overrides,
  monthlySavingsTarget,
  currency,
  onOverride,
}: ForecastTableProps) {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [editing, setEditing] = useState<{ month: string; rowType: ForecastRowType } | null>(
    null
  );

  function formatSigned(value: number, rowKey: RowDef["key"]): string {
    const formatted = formatForecastCurrency(Math.abs(value), currency);
    if (rowKey === "income") return formatted;
    return value === 0 ? formatted : `-${formatted}`;
  }

  return (
    <div className="overflow-x-auto rounded-[0.625rem] border border-border">
      <table className="min-w-[960px] w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="sticky left-0 z-10 bg-muted/30 px-4 py-3 text-left font-medium text-muted-foreground w-[120px]">
              &nbsp;
            </th>
            {months.map((month) => {
              const isCurrent = month.month === currentMonth;
              return (
                <th
                  key={month.month}
                  className={`px-3 py-3 text-right font-medium ${
                    isCurrent ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                  } ${!month.isActual ? "opacity-70 italic" : ""}`}
                >
                  <div>{forecastMonthLabel(month.month)}</div>
                  {!month.isActual && (
                    <div className="text-[10px] font-normal not-italic uppercase tracking-wide">
                      proj.
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, rowIndex) => (
            <tr
              key={row.key}
              className={row.key === "savings" ? "border-t-2 border-border" : "border-b border-border/60"}
            >
              <td className="sticky left-0 z-10 bg-background px-4 py-3 text-muted-foreground">
                {row.label}
              </td>
              {months.map((month) => {
                const isCurrent = month.month === currentMonth;
                const value = row.getValue(month);
                const editable =
                  row.editable && !month.isActual && row.key !== "savings" && row.key !== "cumulative";
                const rowType = row.key as ForecastRowType;
                const isEditing =
                  editing?.month === month.month && editing?.rowType === rowType;
                const isOverridden =
                  editable && overrides[overrideKey(month.month, rowType)] !== undefined;
                const isSavingsRow = row.key === "savings";
                const isCumulativeRow = row.key === "cumulative";

                return (
                  <td
                    key={`${month.month}-${row.key}`}
                    className={`relative px-3 py-3 text-right align-middle ${
                      isCurrent ? "bg-amber-50/50 dark:bg-amber-950/20" : ""
                    } ${!month.isActual ? "opacity-70" : ""} ${
                      editable ? "group cursor-pointer hover:bg-muted/50" : ""
                    } ${
                      isSavingsRow && month.shortfall && monthlySavingsTarget > 0
                        ? "text-red-500/70"
                        : ""
                    } ${
                      isCumulativeRow && value >= 0
                        ? "text-[oklch(var(--palette-amber)/_1)]"
                        : isCumulativeRow && value < 0
                          ? "text-red-500/70"
                          : ""
                    }`}
                    onClick={() => {
                      if (!editable || isEditing) return;
                      setEditing({ month: month.month, rowType });
                    }}
                  >
                    {isOverridden && (
                      <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400" />
                    )}
                    {editable && !isEditing && (
                      <Pencil className="absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2 opacity-0 group-hover:opacity-40" />
                    )}
                    {isEditing ? (
                      <CellEditor
                        value={String(Math.abs(value))}
                        onConfirm={(next) => {
                          onOverride(month.month, rowType, next);
                          setEditing(null);
                        }}
                        onCancel={() => setEditing(null)}
                      />
                    ) : (
                      <span
                        className={`font-[family-name:var(--font-mono)] text-[13px] ${
                          isSavingsRow ? "font-[family-name:var(--font-display)] text-base font-semibold" : ""
                        } ${!month.isActual && rowIndex < 4 ? "italic" : ""}`}
                      >
                        {formatSigned(value, row.key)}
                        {isSavingsRow && month.shortfall && monthlySavingsTarget > 0 && (
                          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-400 align-middle" />
                        )}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

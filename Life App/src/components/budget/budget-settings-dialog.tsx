"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { BudgetSettings } from "@/types";

interface BudgetSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function BudgetSettingsDialog({
  open,
  onOpenChange,
  onSaved,
}: BudgetSettingsDialogProps) {
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [monthlySavingsTarget, setMonthlySavingsTarget] = useState("");
  const [savingsGoalTotal, setSavingsGoalTotal] = useState("");
  const [savingsGoalTargetDate, setSavingsGoalTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch("/api/budget-settings")
        .then((r) => r.json())
        .then((data) => {
          setSettings(data);
          setMonthlySavingsTarget(String(data.monthlySavingsTarget ?? 0));
          setSavingsGoalTotal(
            data.savingsGoalTotal != null ? String(data.savingsGoalTotal) : ""
          );
          setSavingsGoalTargetDate(data.savingsGoalTargetDate ?? "");
        });
    }
  }, [open]);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const res = await fetch("/api/budget-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthlySavingsTarget: parseFloat(monthlySavingsTarget) || 0,
          savingsGoalTotal:
            savingsGoalTotal === ""
              ? null
              : parseFloat(savingsGoalTotal) || null,
          savingsGoalTargetDate:
            savingsGoalTargetDate === "" ? null : savingsGoalTargetDate,
        }),
      });
      if (res.ok) {
        onSaved?.();
        onOpenChange(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Budget Settings</SheetTitle>
        </SheetHeader>
        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Currency</Label>
            <div>
              <Badge variant="secondary">
                {settings?.currency ?? "EUR"}
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthlySavingsTarget">Monthly savings target (€)</Label>
            <Input
              id="monthlySavingsTarget"
              type="number"
              min={0}
              step={0.01}
              value={monthlySavingsTarget}
              onChange={(e) => setMonthlySavingsTarget(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="savingsGoalTotal">Long-term savings goal (€)</Label>
            <Input
              id="savingsGoalTotal"
              type="number"
              min={0}
              step={0.01}
              placeholder="Optional"
              value={savingsGoalTotal}
              onChange={(e) => setSavingsGoalTotal(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="savingsGoalTargetDate">Target date</Label>
            <Input
              id="savingsGoalTargetDate"
              type="date"
              placeholder="Optional"
              value={savingsGoalTargetDate}
              onChange={(e) => setSavingsGoalTargetDate(e.target.value)}
            />
          </div>
        </div>
        <SheetFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

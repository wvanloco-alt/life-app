"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatEur } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import type { BudgetSettings, PlannedExpense, SpendingCategory } from "@/types";
import { MoreHorizontal, Plus, Pencil } from "lucide-react";
import { LucideIcon } from "@/components/ui/lucide-icon";

const MONTHS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
  "12",
];

export function BudgetGoals() {
  const currentYear = new Date().getFullYear();

  // Savings goal state
  const [settings, setSettings] = useState<BudgetSettings | null>(null);
  const [savingsProgress, setSavingsProgress] = useState<{
    saved: number;
    total: number;
    percentage: number;
  } | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDate, setGoalDate] = useState("");
  const [goalStartingBalance, setGoalStartingBalance] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  // Planned expenses state
  const [expenses, setExpenses] = useState<PlannedExpense[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [notes, setNotes] = useState("");

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/budget-settings");
    const data = await res.json();
    setSettings(data);
    setGoalAmount(
      data.savingsGoalTotal != null ? String(data.savingsGoalTotal) : ""
    );
    setGoalDate(data.savingsGoalTargetDate ?? "");
    setGoalStartingBalance(String(data.savingsStartingBalance ?? 0));
  }, []);

  const fetchSavingsProgress = useCallback(async () => {
    const res = await fetch("/api/budget/summary");
    const data = await res.json();
    if (data.savingsGoal) {
      setSavingsProgress({
        saved: data.savingsGoal.saved,
        total: data.savingsGoal.total,
        percentage: data.savingsGoal.percentage,
      });
    } else {
      setSavingsProgress(null);
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    const res = await fetch(`/api/planned-expenses?year=${currentYear}`);
    const data = await res.json();
    setExpenses(data);
  }, [currentYear]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchSettings(),
      fetchSavingsProgress(),
      fetchExpenses(),
      fetchCategories(),
    ]).finally(() => setLoading(false));
  }, [fetchSettings, fetchSavingsProgress, fetchExpenses, fetchCategories]);

  async function handleSaveGoal() {
    if (!settings) return;
    const amt = goalAmount ? parseFloat(goalAmount) : null;
    if (amt != null && (isNaN(amt) || amt < 0)) return;

    setSavingGoal(true);
    const res = await fetch("/api/budget-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        savingsGoalTotal: amt,
        savingsGoalTargetDate: goalDate && /^\d{4}-\d{2}-\d{2}$/.test(goalDate)
          ? goalDate
          : null,
        savingsStartingBalance: parseFloat(goalStartingBalance) || 0,
      }),
    });
    setSavingGoal(false);
    if (res.ok) {
      setEditingGoal(false);
      fetchSettings();
      fetchSavingsProgress();
    }
  }

  function openAddExpense() {
    setEditingId(null);
    setName("");
    setAmount("");
    setMonth(`${currentYear}-01`);
    setCategoryId("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEditExpense(exp: PlannedExpense) {
    setEditingId(exp.id);
    setName(exp.name);
    setAmount(String(exp.amount));
    setMonth(exp.month);
    setCategoryId(exp.categoryId != null ? String(exp.categoryId) : "");
    setNotes(exp.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSubmitExpense(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt < 0 || !month) return;

    if (editingId != null) {
      const res = await fetch(`/api/planned-expenses/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          month,
          categoryId: categoryId ? Number(categoryId) : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchExpenses();
      }
    } else {
      const res = await fetch("/api/planned-expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          month,
          categoryId: categoryId ? Number(categoryId) : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchExpenses();
      }
    }
  }

  async function handleDeleteExpense(id: number) {
    const res = await fetch(`/api/planned-expenses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) fetchExpenses();
  }

  const monthOptions = MONTHS.map((m) => ({
    value: `${currentYear}-${m}`,
    label: format(parseISO(`${currentYear}-${m}-01`), "MMMM"),
  }));

  const yearlyTotal = expenses.reduce((s, e) => s + e.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground py-8 text-center">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Savings Goal */}
      <Card>
        <CardHeader>
          <CardTitle>Savings Goal</CardTitle>
          <CardDescription>
            Track progress toward your savings target
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings && (
            <>
              {editingGoal ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Target amount (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={goalAmount}
                        onChange={(e) => setGoalAmount(e.target.value)}
                        placeholder="e.g. 10000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Target date</Label>
                      <Input
                        type="date"
                        value={goalDate}
                        onChange={(e) => setGoalDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>Existing savings (€)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={goalStartingBalance}
                        onChange={(e) => setGoalStartingBalance(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Money you already had saved before using this app</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveGoal}
                      disabled={savingGoal}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingGoal(false);
                        setGoalAmount(
                          settings.savingsGoalTotal != null
                            ? String(settings.savingsGoalTotal)
                            : ""
                        );
                        setGoalDate(settings.savingsGoalTargetDate ?? "");
                        setGoalStartingBalance(String(settings.savingsStartingBalance ?? 0));
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Target:{" "}
                        {settings.savingsGoalTotal != null
                          ? formatEur(settings.savingsGoalTotal)
                          : "Not set"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        By:{" "}
                        {settings.savingsGoalTargetDate
                          ? format(
                              parseISO(settings.savingsGoalTargetDate),
                              "PPP"
                            )
                          : "Not set"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingGoal(true)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                  {savingsProgress && settings.savingsGoalTotal != null && settings.savingsGoalTotal > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>
                          Current: {formatEur(savingsProgress.saved)} /{" "}
                          {formatEur(savingsProgress.total)}
                        </span>
                        <span>{savingsProgress.percentage}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${Math.min(100, savingsProgress.percentage)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Planned Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Planned Expenses</CardTitle>
            <CardDescription>
              One-off expenses planned for {currentYear}
            </CardDescription>
          </div>
          <Button onClick={openAddExpense} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Planned Expense
          </Button>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No planned expenses for {currentYear}.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_1fr_1fr_auto] gap-4 px-4 py-3 bg-muted/50 text-sm font-medium">
                  <div>Name</div>
                  <div className="text-right">Amount</div>
                  <div>Month</div>
                  <div>Category</div>
                  <div>Notes</div>
                  <div className="w-10" />
                </div>
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="grid grid-cols-[1fr_auto_auto_1fr_1fr_auto] gap-4 px-4 py-3 border-t items-center"
                  >
                    <div className="font-medium">{exp.name}</div>
                    <div className="text-right">{formatEur(exp.amount)}</div>
                    <div>
                      {format(parseISO(exp.month + "-01"), "MMM yyyy")}
                    </div>
                    <div className="text-muted-foreground text-sm flex items-center gap-1.5">
                      {exp.categoryName ? (
                        <>
                          <LucideIcon name={exp.categoryIcon ?? "package"} size="sm" />
                          {exp.categoryName}
                        </>
                      ) : "—"}
                    </div>
                    <div className="text-muted-foreground text-sm truncate max-w-[120px]">
                      {exp.notes ?? "—"}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => openEditExpense(exp)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDeleteExpense(exp.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
              <div className="flex justify-end pt-2 border-t">
                <span className="font-semibold">
                  Yearly total: {formatEur(yearlyTotal)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Edit planned expense" : "Add planned expense"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Christmas gifts"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      <span className="flex items-center gap-2"><LucideIcon name={c.icon} size="sm" />{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingId != null ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

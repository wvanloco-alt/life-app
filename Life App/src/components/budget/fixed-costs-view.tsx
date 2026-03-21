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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatEur } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import type { FixedCost, SpendingCategory } from "@/types";
import { MoreHorizontal, Plus } from "lucide-react";
import { LucideIcon } from "@/components/ui/lucide-icon";

interface FixedCostsViewProps {
  month: string;
}

export function FixedCostsView({ month }: FixedCostsViewProps) {
  const [costs, setCosts] = useState<FixedCost[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [startMonth, setStartMonth] = useState(month);
  const [endMonth, setEndMonth] = useState("");
  const [notes, setNotes] = useState("");

  const fetchCosts = useCallback(async () => {
    const res = await fetch(`/api/fixed-costs?month=${month}`);
    const data = await res.json();
    setCosts(data);
  }, [month]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchCosts(), fetchCategories()]).finally(() =>
      setLoading(false)
    );
  }, [fetchCosts, fetchCategories]);

  useEffect(() => {
    setStartMonth(month);
  }, [month]);

  const total = costs.reduce((s, fc) => s + fc.amount, 0);

  function openAdd() {
    setEditingId(null);
    setName("");
    setAmount("");
    setCategory(categories[0]?.name ?? "");
    setStartMonth(month);
    setEndMonth("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEdit(fc: FixedCost) {
    setEditingId(fc.id);
    setName(fc.name);
    setAmount(String(fc.amount));
    setCategory(fc.category);
    setStartMonth(fc.startMonth);
    setEndMonth(fc.endMonth ?? "");
    setNotes(fc.notes ?? "");
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!name.trim() || isNaN(amt) || amt < 0 || !startMonth) return;

    if (editingId != null) {
      const res = await fetch(`/api/fixed-costs/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          category: category.trim() || "",
          startMonth,
          endMonth: endMonth && /^\d{4}-\d{2}$/.test(endMonth) ? endMonth : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCosts();
      }
    } else {
      const res = await fetch("/api/fixed-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amt,
          category: category.trim() || null,
          startMonth,
          endMonth: endMonth && /^\d{4}-\d{2}$/.test(endMonth) ? endMonth : null,
          notes: notes.trim() || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        fetchCosts();
      }
    }
  }

  async function handleDeactivate(id: number) {
    const res = await fetch(`/api/fixed-costs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    if (res.ok) fetchCosts();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total fixed costs this month</CardDescription>
          <CardTitle className="text-2xl">{formatEur(total)}</CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Fixed costs</CardTitle>
          <Button onClick={openAdd} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Fixed Cost
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : costs.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No fixed costs for this month.
            </p>
          ) : (
            <ul className="space-y-3">
              {costs.map((fc) => (
                <li
                  key={fc.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{fc.name}</span>
                    <Badge variant="outline" className="text-xs">
                      from {format(parseISO(fc.startMonth + "-01"), "MMM yyyy")}
                    </Badge>
                    {fc.category && (
                      <span className="text-sm text-muted-foreground">
                        {fc.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatEur(fc.amount)}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(fc)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => handleDeactivate(fc.id)}
                        >
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId != null ? "Edit fixed cost" : "Add fixed cost"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rent"
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
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      <span className="flex items-center gap-2"><LucideIcon name={c.icon} size="sm" />{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start month</Label>
                <Input
                  type="month"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>End month (optional)</Label>
                <Input
                  type="month"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  placeholder="Leave empty if ongoing"
                />
              </div>
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

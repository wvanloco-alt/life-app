"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatEur } from "@/lib/currency";
import { format, parseISO } from "date-fns";
import type { SpendingEntry, SpendingCategory } from "@/types";
import { MoreHorizontal } from "lucide-react";
import { EmojiIcon } from "@/components/ui/emoji-icon";

interface SpendingLogProps {
  month: string;
}

export function SpendingLog({ month }: SpendingLogProps) {
  const [entries, setEntries] = useState<SpendingEntry[]>([]);
  const [categories, setCategories] = useState<SpendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isItemized, setIsItemized] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editIsItemized, setEditIsItemized] = useState(true);

  const fetchEntries = useCallback(async () => {
    const res = await fetch(`/api/spending?month=${month}`);
    const data = await res.json();
    setEntries(data);
  }, [month]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/spending-categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntries(), fetchCategories()]).finally(() =>
      setLoading(false)
    );
  }, [fetchEntries, fetchCategories]);

  useEffect(() => {
    setDate(format(new Date(), "yyyy-MM-dd"));
  }, [month]);

  const categoryMap = new Map(categories.map((c) => [c.name, c]));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0 || !category.trim()) return;

    const desc = isItemized ? description.trim() || null : `Total for ${category}`;

    const res = await fetch("/api/spending", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        category: category.trim(),
        description: desc,
        date,
        isItemized,
      }),
    });
    if (res.ok) {
      setAmount("");
      setDescription("");
      setDate(format(new Date(), "yyyy-MM-dd"));
      fetchEntries();
    }
  }

  function openEdit(entry: SpendingEntry) {
    setEditingId(entry.id);
    setEditAmount(String(entry.amount));
    setEditCategory(entry.category);
    setEditDescription(entry.description ?? "");
    setEditDate(entry.date);
    setEditIsItemized(entry.isItemized);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId == null) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt < 0 || !editCategory.trim()) return;

    const desc = editIsItemized
      ? editDescription.trim() || null
      : `Total for ${editCategory}`;

    const res = await fetch(`/api/spending/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: amt,
        category: editCategory.trim(),
        description: desc,
        date: editDate,
        isItemized: editIsItemized,
      }),
    });
    if (res.ok) {
      setEditingId(null);
      fetchEntries();
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`/api/spending/${id}`, { method: "DELETE" });
    if (res.ok) fetchEntries();
  }

  const total = entries.reduce((s, e) => s + e.amount, 0);

  const byDate = entries.reduce<Record<string, SpendingEntry[]>>((acc, e) => {
    (acc[e.date] = acc[e.date] ?? []).push(e);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick add</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <div className="space-y-2 w-24">
                <Label>Amount (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2 min-w-[140px]">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.name}>
                        <span className="flex items-center gap-2">
                          <EmojiIcon emoji={c.icon} size="sm" />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 flex-1 min-w-[160px]">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={isItemized ? "Optional" : `Total for ${category || "category"}`}
                  disabled={!isItemized}
                />
              </div>
              <div className="space-y-2 w-40">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="isCategoryTotal"
                checked={!isItemized}
                onCheckedChange={(v) => setIsItemized(!v)}
              />
              <Label htmlFor="isCategoryTotal" className="font-normal cursor-pointer">
                Category total (instead of single item)
              </Label>
            </div>
            <Button type="submit" disabled={!amount || !category}>
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent spending</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground py-8 text-center">
              Loading...
            </p>
          ) : sortedDates.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No spending recorded this month.
            </p>
          ) : (
            <div className="space-y-4">
              {sortedDates.map((d) => (
                <div key={d}>
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    {format(parseISO(d), "EEE, MMM d")}
                  </div>
                  <ul className="space-y-2">
                    {byDate[d].map((entry) => {
                      const cat = categoryMap.get(entry.category);
                      return (
                        <li
                          key={entry.id}
                          className="flex items-center justify-between py-2 border-b last:border-0"
                        >
                          <div className="flex items-center gap-2">
                            <EmojiIcon emoji={cat?.icon ?? "📦"} size="sm" />
                            <span>
                              {entry.description ??
                                (entry.isItemized ? entry.category : `Total for ${entry.category}`)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {formatEur(entry.amount)}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(entry)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => handleDelete(entry.id)}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              <div className="pt-4 font-semibold flex justify-between">
                <span>Monthly total</span>
                <span>{formatEur(total)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editingId != null} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit spending</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (€)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editCategory} onValueChange={setEditCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      <span className="flex items-center gap-2"><EmojiIcon emoji={c.icon} size="sm" />{c.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={!editIsItemized}
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={!editIsItemized}
                onCheckedChange={(v) => setEditIsItemized(!v)}
              />
              <Label className="font-normal">Category total</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

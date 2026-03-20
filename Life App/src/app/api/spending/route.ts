import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spendingEntries } from "@/db/schema";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const category = searchParams.get("category");
  const limit = Math.min(
    parseInt(searchParams.get("limit") ?? "100") || 100,
    500
  );

  const allEntries = await db.select().from(spendingEntries);
  let filtered = allEntries;

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    filtered = filtered.filter((e) => e.date.startsWith(month));
  }
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    filtered = filtered.filter((e) => e.date >= from);
  }
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    filtered = filtered.filter((e) => e.date <= to);
  }
  if (category) {
    filtered = filtered.filter((e) => e.category === category);
  }

  filtered.sort((a, b) => b.date.localeCompare(a.date));
  filtered = filtered.slice(0, limit);

  return NextResponse.json(filtered);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { amount, category, description, date, isItemized, notes } = body;

  if (amount === undefined || amount === null || Number(amount) < 0) {
    return NextResponse.json(
      { error: "amount is required and must be a non-negative number" },
      { status: 400 }
    );
  }

  if (!category || typeof category !== "string" || category.trim().length === 0) {
    return NextResponse.json(
      { error: "category is required" },
      { status: 400 }
    );
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date (YYYY-MM-DD) is required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(spendingEntries)
    .values({
      amount: Number(amount),
      category: category.trim(),
      description: description?.trim() || null,
      date,
      isItemized: Boolean(isItemized ?? true),
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

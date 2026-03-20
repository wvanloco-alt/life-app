import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plannedExpenses, spendingCategories } from "@/db/schema";
import { eq, like, asc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const currentYear = new Date().getFullYear().toString();
  const yyyy = year && /^\d{4}$/.test(year) ? year : currentYear;

  const rows = await db
    .select({
      id: plannedExpenses.id,
      name: plannedExpenses.name,
      amount: plannedExpenses.amount,
      month: plannedExpenses.month,
      categoryId: plannedExpenses.categoryId,
      notes: plannedExpenses.notes,
      createdAt: plannedExpenses.createdAt,
      updatedAt: plannedExpenses.updatedAt,
      categoryName: spendingCategories.name,
      categoryIcon: spendingCategories.icon,
    })
    .from(plannedExpenses)
    .leftJoin(
      spendingCategories,
      eq(plannedExpenses.categoryId, spendingCategories.id)
    )
    .where(like(plannedExpenses.month, `${yyyy}-%`))
    .orderBy(asc(plannedExpenses.month));

  const result = rows.map((r) => ({
    id: r.id,
    name: r.name,
    amount: r.amount,
    month: r.month,
    categoryId: r.categoryId,
    categoryName: r.categoryName ?? undefined,
    categoryIcon: r.categoryIcon ?? undefined,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, amount, month, categoryId, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt < 0) {
    return NextResponse.json(
      { error: "Valid amount is required" },
      { status: 400 }
    );
  }

  if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "Valid month (yyyy-MM) is required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(plannedExpenses)
    .values({
      name: name.trim(),
      amount: amt,
      month,
      categoryId:
        categoryId != null && categoryId !== ""
          ? Number(categoryId)
          : null,
      notes: notes && typeof notes === "string" ? notes.trim() || null : null,
    })
    .returning();

  const cat = created?.categoryId
    ? await db
        .select({ name: spendingCategories.name, icon: spendingCategories.icon })
        .from(spendingCategories)
        .where(eq(spendingCategories.id, created.categoryId))
    : [];

  const result = {
    ...created,
    categoryName: cat[0]?.name,
    categoryIcon: cat[0]?.icon,
  };

  return NextResponse.json(result, { status: 201 });
}

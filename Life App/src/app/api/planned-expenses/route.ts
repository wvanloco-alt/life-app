import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plannedExpenses, spendingCategories } from "@/db/schema";
import { eq, and, like, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

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
    .leftJoin(spendingCategories, eq(plannedExpenses.categoryId, spendingCategories.id))
    .where(and(like(plannedExpenses.month, `${yyyy}-%`), eq(plannedExpenses.userId, userId)))
    .orderBy(asc(plannedExpenses.month));

  return NextResponse.json(rows.map((r) => ({ id: r.id, name: r.name, amount: r.amount, month: r.month, categoryId: r.categoryId, categoryName: r.categoryName ?? undefined, categoryIcon: r.categoryIcon ?? undefined, notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt })));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { name, amount, month, categoryId, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const amt = Number(amount);
  if (isNaN(amt) || amt < 0) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
  if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "Valid month (yyyy-MM) is required" }, { status: 400 });

  const [created] = await db.insert(plannedExpenses).values({ name: name.trim(), amount: amt, month, categoryId: categoryId != null && categoryId !== "" ? Number(categoryId) : null, notes: notes && typeof notes === "string" ? notes.trim() || null : null, userId }).returning();

  const cat = created?.categoryId ? await db.select({ name: spendingCategories.name, icon: spendingCategories.icon }).from(spendingCategories).where(eq(spendingCategories.id, created.categoryId)) : [];
  return NextResponse.json({ ...created, categoryName: cat[0]?.name, categoryIcon: cat[0]?.icon }, { status: 201 });
}

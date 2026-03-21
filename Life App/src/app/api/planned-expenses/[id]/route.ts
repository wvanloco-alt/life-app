import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { plannedExpenses, spendingCategories } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const expenseId = parseInt(id);
  if (isNaN(expenseId)) return NextResponse.json({ error: "Invalid planned expense ID" }, { status: 400 });

  const existing = await db.select().from(plannedExpenses).where(and(eq(plannedExpenses.id, expenseId), eq(plannedExpenses.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Planned expense not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.month !== undefined) updates.month = body.month;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId == null || body.categoryId === "" ? null : Number(body.categoryId);
  if (body.notes !== undefined) updates.notes = body.notes == null || body.notes === "" ? null : body.notes;

  const [updated] = await db.update(plannedExpenses).set(updates).where(and(eq(plannedExpenses.id, expenseId), eq(plannedExpenses.userId, userId))).returning();
  const cat = updated?.categoryId != null ? await db.select({ name: spendingCategories.name, icon: spendingCategories.icon }).from(spendingCategories).where(eq(spendingCategories.id, updated.categoryId)) : [];
  return NextResponse.json({ ...updated, categoryName: cat[0]?.name, categoryIcon: cat[0]?.icon });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const expenseId = parseInt(id);
  if (isNaN(expenseId)) return NextResponse.json({ error: "Invalid planned expense ID" }, { status: 400 });

  const existing = await db.select().from(plannedExpenses).where(and(eq(plannedExpenses.id, expenseId), eq(plannedExpenses.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Planned expense not found" }, { status: 404 });

  await db.delete(plannedExpenses).where(and(eq(plannedExpenses.id, expenseId), eq(plannedExpenses.userId, userId)));
  return new NextResponse(null, { status: 204 });
}

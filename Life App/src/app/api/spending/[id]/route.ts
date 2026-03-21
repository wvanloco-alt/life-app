import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spendingEntries } from "@/db/schema";
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
  const entryId = parseInt(id);
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid spending entry ID" }, { status: 400 });

  const existing = await db.select().from(spendingEntries).where(and(eq(spendingEntries.id, entryId), eq(spendingEntries.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Spending entry not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.category !== undefined) updates.category = body.category;
  if (body.description !== undefined) updates.description = body.description == null ? null : body.description;
  if (body.date !== undefined) updates.date = body.date;
  if (body.isItemized !== undefined) updates.isItemized = Boolean(body.isItemized);
  if (body.notes !== undefined) updates.notes = body.notes == null ? null : body.notes;

  const [updated] = await db.update(spendingEntries).set(updates).where(and(eq(spendingEntries.id, entryId), eq(spendingEntries.userId, userId))).returning();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const entryId = parseInt(id);
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid spending entry ID" }, { status: 400 });

  const existing = await db.select().from(spendingEntries).where(and(eq(spendingEntries.id, entryId), eq(spendingEntries.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Spending entry not found" }, { status: 404 });

  await db.delete(spendingEntries).where(and(eq(spendingEntries.id, entryId), eq(spendingEntries.userId, userId)));
  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incomeEntries } from "@/db/schema";
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
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid income entry ID" }, { status: 400 });

  const existing = await db.select().from(incomeEntries).where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Income entry not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.source !== undefined) updates.source = body.source;
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.month !== undefined) updates.month = body.month;
  if (body.isRecurring !== undefined) updates.isRecurring = Boolean(body.isRecurring);
  if (body.notes !== undefined) updates.notes = body.notes == null ? null : body.notes;

  const [updated] = await db.update(incomeEntries).set(updates).where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, userId))).returning();
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
  if (isNaN(entryId)) return NextResponse.json({ error: "Invalid income entry ID" }, { status: 400 });

  const existing = await db.select().from(incomeEntries).where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Income entry not found" }, { status: 404 });

  await db.delete(incomeEntries).where(and(eq(incomeEntries.id, entryId), eq(incomeEntries.userId, userId)));
  return new NextResponse(null, { status: 204 });
}

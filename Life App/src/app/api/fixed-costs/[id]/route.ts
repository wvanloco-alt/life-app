import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";
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
  const costId = parseInt(id);
  if (isNaN(costId)) return NextResponse.json({ error: "Invalid fixed cost ID" }, { status: 400 });

  const existing = await db.select().from(fixedCosts).where(and(eq(fixedCosts.id, costId), eq(fixedCosts.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Fixed cost not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.category !== undefined) updates.category = body.category;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.startMonth !== undefined) updates.startMonth = body.startMonth;
  if (body.endMonth !== undefined) updates.endMonth = body.endMonth == null || body.endMonth === "" ? null : body.endMonth;
  if (body.notes !== undefined) updates.notes = body.notes == null ? null : body.notes;

  const [updated] = await db.update(fixedCosts).set(updates).where(and(eq(fixedCosts.id, costId), eq(fixedCosts.userId, userId))).returning();
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
  const costId = parseInt(id);
  if (isNaN(costId)) return NextResponse.json({ error: "Invalid fixed cost ID" }, { status: 400 });

  const existing = await db.select().from(fixedCosts).where(and(eq(fixedCosts.id, costId), eq(fixedCosts.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Fixed cost not found" }, { status: 404 });

  await db.delete(fixedCosts).where(and(eq(fixedCosts.id, costId), eq(fixedCosts.userId, userId)));
  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recurringActivities } from "@/db/schema";
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
  const recId = parseInt(id);
  if (isNaN(recId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const existing = await db.select().from(recurringActivities).where(and(eq(recurringActivities.id, recId), eq(recurringActivities.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.quadrant !== undefined) updates.quadrant = body.quadrant;
  if (body.dayOfWeek !== undefined) updates.dayOfWeek = Number(body.dayOfWeek);
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined) updates.endTime = body.endTime;
  if (body.isPaused !== undefined) updates.isPaused = Boolean(body.isPaused);
  if (body.roleId !== undefined) updates.roleId = body.roleId;

  const [updated] = await db.update(recurringActivities).set(updates).where(and(eq(recurringActivities.id, recId), eq(recurringActivities.userId, userId))).returning();
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
  const recId = parseInt(id);
  if (isNaN(recId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await db.delete(recurringActivities).where(and(eq(recurringActivities.id, recId), eq(recurringActivities.userId, userId)));
  return NextResponse.json({ success: true });
}

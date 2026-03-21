import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
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
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid activity ID" }, { status: 400 });

  const existing = await db.select().from(activities).where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.quadrant !== undefined) updates.quadrant = body.quadrant;
  if (body.activityDate !== undefined) updates.activityDate = body.activityDate;
  if (body.startTime !== undefined) updates.startTime = body.startTime;
  if (body.endTime !== undefined) updates.endTime = body.endTime;
  if (body.isCompleted !== undefined) updates.isCompleted = Boolean(body.isCompleted);
  if (body.isLogEntry !== undefined) updates.isLogEntry = Boolean(body.isLogEntry);
  if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
  if (body.roleId !== undefined) updates.roleId = body.roleId;
  if (body.goalId !== undefined) updates.goalId = body.goalId;
  if (body.activityTypeId !== undefined) updates.activityTypeId = body.activityTypeId;

  const [updated] = await db.update(activities).set(updates).where(and(eq(activities.id, activityId), eq(activities.userId, userId))).returning();
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
  const activityId = parseInt(id);
  if (isNaN(activityId)) return NextResponse.json({ error: "Invalid activity ID" }, { status: 400 });

  await db.delete(activities).where(and(eq(activities.id, activityId), eq(activities.userId, userId)));
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityTypes } from "@/db/schema";
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
  const body = await request.json();

  const updates: Record<string, unknown> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.type !== undefined) updates.type = body.type;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.isTracked !== undefined) updates.isTracked = body.isTracked;
  if (body.defaultCalories !== undefined) updates.defaultCalories = body.defaultCalories;
  if (body.defaultSteps !== undefined) updates.defaultSteps = body.defaultSteps;
  if (body.metricsConfig !== undefined) updates.metricsConfig = JSON.stringify(body.metricsConfig);
  if (body.variants !== undefined) updates.variants = body.variants ? JSON.stringify(body.variants) : null;
  if (body.gradeSystem !== undefined) updates.gradeSystem = body.gradeSystem;

  const [updated] = await db.update(activityTypes).set(updates).where(and(eq(activityTypes.id, parseInt(id)), eq(activityTypes.userId, userId))).returning();
  if (!updated) return NextResponse.json({ error: "Activity type not found" }, { status: 404 });

  return NextResponse.json({ ...updated, metricsConfig: JSON.parse(updated.metricsConfig), variants: updated.variants ? JSON.parse(updated.variants) : null });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  await db.delete(activityTypes).where(and(eq(activityTypes.id, parseInt(id)), eq(activityTypes.userId, userId)));
  return NextResponse.json({ success: true });
}

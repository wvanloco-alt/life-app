import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });

  const existing = await db.select().from(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Training plan not found" }, { status: 404 });

  await db.delete(trainingPlans).where(and(eq(trainingPlans.id, planId), eq(trainingPlans.userId, userId)));
  return NextResponse.json({ success: true });
}

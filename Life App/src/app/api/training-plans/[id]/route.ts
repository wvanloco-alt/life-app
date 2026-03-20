import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const planId = parseInt(id);
  if (isNaN(planId)) {
    return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(trainingPlans)
    .where(eq(trainingPlans.id, planId));

  if (existing.length === 0) {
    return NextResponse.json({ error: "Training plan not found" }, { status: 404 });
  }

  await db.delete(trainingPlans).where(eq(trainingPlans.id, planId));
  return NextResponse.json({ success: true });
}

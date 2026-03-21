import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const phaseId = parseInt(id);
  if (isNaN(phaseId)) return NextResponse.json({ error: "Invalid phase ID" }, { status: 400 });

  const phases = await db.select().from(trainingPhases).where(eq(trainingPhases.id, phaseId));
  if (phases.length === 0) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  const currentPhase = phases[0];

  // Verify the plan belongs to the user
  const planRows = await db.select().from(trainingPlans).where(and(eq(trainingPlans.id, currentPhase.trainingPlanId), eq(trainingPlans.userId, userId)));
  if (planRows.length === 0) return NextResponse.json({ error: "Phase not found" }, { status: 404 });

  if (currentPhase.status !== "active") return NextResponse.json({ error: "Only the active phase can be transitioned" }, { status: 400 });

  await db.update(trainingPhases).set({ status: "completed", updatedAt: new Date().toISOString() }).where(eq(trainingPhases.id, phaseId));

  const allPhases = await db.select().from(trainingPhases).where(eq(trainingPhases.trainingPlanId, currentPhase.trainingPlanId));
  allPhases.sort((a, b) => a.orderIndex - b.orderIndex);

  const nextPhase = allPhases.find((p) => p.orderIndex === currentPhase.orderIndex + 1);

  if (nextPhase) {
    await db.update(trainingPhases).set({ status: "active", updatedAt: new Date().toISOString() }).where(eq(trainingPhases.id, nextPhase.id));
    return NextResponse.json({ completedPhase: { ...currentPhase, status: "completed" }, activatedPhase: { ...nextPhase, status: "active" }, message: "Transitioned to next phase" });
  }

  await db.update(trainingPlans).set({ status: "completed", updatedAt: new Date().toISOString() }).where(and(eq(trainingPlans.id, currentPhase.trainingPlanId), eq(trainingPlans.userId, userId)));
  return NextResponse.json({ completedPhase: { ...currentPhase, status: "completed" }, activatedPhase: null, message: "Cycle complete" });
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildClimbingPhaseDescription, buildClimbingPhaseContent, buildClimbingLimitationNotes } from "@/lib/training/periodization";
import { buildPhaseDescription, buildLimitationNotes } from "@/lib/training/tennis-periodization";
import { buildRunningPhaseDescription, buildRunningLimitationNotes } from "@/lib/training/running-periodization";
import type { ClimbingPhaseType, ClimbingSportProfile, ClimbingLimitation, TennisSportProfile, TennisPlayingStyle, TennisPlayerLevel, PhysicalLimitation, ClimberLevel, RunningSportProfile, RunningPhaseType, RunningGoalDistance, RunnerLevel, RunningLimitation } from "@/types";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const allPlans = await db.select().from(trainingPlans).where(eq(trainingPlans.userId, userId));
  let updated = 0;

  for (const plan of allPlans) {
    const profile = JSON.parse(plan.sportProfile || "{}");
    const phases = await db.select().from(trainingPhases).where(eq(trainingPhases.trainingPlanId, plan.id));

    for (const phase of phases) {
      let description: string;
      let limitationNotes: string | null = null;
      // Climbing phases get the three layered content fields written separately
      // (training-supplemental-split V1). Tennis and running leave them NULL
      // until their content rollouts (V1.1, V1.2).
      let sportFocusContent: string | null = null;
      let supplementalContent: string | null = null;
      let mentalGameContent: string | null = null;

      if (plan.sport === "tennis") {
        const tp = profile as TennisSportProfile;
        description = buildPhaseDescription(phase.phaseType as any, (tp.playingStyle ?? "all-court") as TennisPlayingStyle, plan.playerLevel as TennisPlayerLevel);
        limitationNotes = buildLimitationNotes(phase.phaseType as any, (tp.physicalLimitations ?? []) as PhysicalLimitation[]);
      } else if (plan.sport === "running") {
        const rp = profile as RunningSportProfile;
        description = buildRunningPhaseDescription(phase.phaseType as RunningPhaseType, (rp.goalDistance ?? "general") as RunningGoalDistance, plan.playerLevel as RunnerLevel);
        limitationNotes = buildRunningLimitationNotes(phase.phaseType as RunningPhaseType, (rp.physicalLimitations ?? []) as RunningLimitation[]);
      } else {
        const cp = profile as ClimbingSportProfile;
        const discipline = cp.discipline ?? "bouldering";
        const level = plan.playerLevel as ClimberLevel;
        description = buildClimbingPhaseDescription(phase.phaseType as ClimbingPhaseType, discipline, level);
        limitationNotes = buildClimbingLimitationNotes(phase.phaseType as ClimbingPhaseType, (cp.physicalLimitations ?? []) as ClimbingLimitation[]);
        const layers = buildClimbingPhaseContent(phase.phaseType as ClimbingPhaseType, discipline, level);
        sportFocusContent = layers.sportFocusContent;
        supplementalContent = layers.supplementalContent;
        mentalGameContent = layers.mentalGameContent;
      }

      await db
        .update(trainingPhases)
        .set({ description, limitationNotes, sportFocusContent, supplementalContent, mentalGameContent })
        .where(eq(trainingPhases.id, phase.id));
      updated++;
    }
  }

  return NextResponse.json({ message: `Refreshed descriptions for ${updated} phases across ${allPlans.length} plan(s)`, updated });
}

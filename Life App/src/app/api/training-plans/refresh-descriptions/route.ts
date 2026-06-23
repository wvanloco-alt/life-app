import { NextResponse } from "next/server";
import { db } from "@/db";
import { trainingPlans, trainingPhases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { buildClimbingPhaseDescription, buildClimbingPhaseContent, buildClimbingLimitationNotes } from "@/lib/training/periodization";
import { buildPhaseDescription, buildTennisPhaseContent, buildLimitationNotes } from "@/lib/training/tennis-periodization";
import { buildRunningPhaseDescription, buildRunningPhaseContent, buildRunningLimitationNotes } from "@/lib/training/running-periodization";
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
        const phaseType = phase.phaseType as any;
        const style = (tp.playingStyle ?? "all-court") as TennisPlayingStyle;
        const level = plan.playerLevel as TennisPlayerLevel;
        description = buildPhaseDescription(phaseType, style, level);
        limitationNotes = buildLimitationNotes(phaseType, (tp.physicalLimitations ?? []) as PhysicalLimitation[]);
        const layers = buildTennisPhaseContent(phaseType, style, level);
        sportFocusContent = layers.sportFocusContent;
        supplementalContent = layers.supplementalContent;
        mentalGameContent = layers.mentalGameContent;
      } else if (plan.sport === "running") {
        const rp = profile as RunningSportProfile;
        const phaseType = phase.phaseType as RunningPhaseType;
        const goalDistance = (rp.goalDistance ?? "general") as RunningGoalDistance;
        const level = plan.playerLevel as RunnerLevel;
        description = buildRunningPhaseDescription(phaseType, goalDistance, level);
        limitationNotes = buildRunningLimitationNotes(phaseType, (rp.physicalLimitations ?? []) as RunningLimitation[]);
        const layers = buildRunningPhaseContent(phaseType, goalDistance, level);
        sportFocusContent = layers.sportFocusContent;
        supplementalContent = layers.supplementalContent;
        mentalGameContent = layers.mentalGameContent;
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

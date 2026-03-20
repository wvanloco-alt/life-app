import { NextRequest, NextResponse } from "next/server";
import { assessLevel } from "@/lib/training/periodization";
import { assessTennisLevel } from "@/lib/training/tennis-periodization";
import { assessRunningLevel } from "@/lib/training/running-periodization";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sport = "climbing" } = body;

  if (sport === "running") {
    const { runsPerWeek, yearsExperience, canRun30MinContinuous, hasRaced } = body;
    if (runsPerWeek == null || yearsExperience == null) {
      return NextResponse.json(
        { error: "runsPerWeek and yearsExperience are required for running assessment" },
        { status: 400 }
      );
    }
    const result = assessRunningLevel(
      runsPerWeek,
      yearsExperience,
      canRun30MinContinuous ?? false,
      hasRaced ?? false
    );
    return NextResponse.json(result);
  }

  if (sport === "tennis") {
    const { selfRating, yearsPlaying } = body;
    if (!selfRating || yearsPlaying == null) {
      return NextResponse.json(
        { error: "selfRating and yearsPlaying are required for tennis assessment" },
        { status: 400 }
      );
    }
    const result = assessTennisLevel(selfRating, yearsPlaying);
    return NextResponse.json(result);
  }

  const { maxBoulderGrade, maxSportGrade, yearsExperience } = body;
  if (!maxBoulderGrade || !maxSportGrade || yearsExperience == null) {
    return NextResponse.json(
      { error: "maxBoulderGrade, maxSportGrade, and yearsExperience are required" },
      { status: 400 }
    );
  }

  const result = assessLevel(maxBoulderGrade, maxSportGrade, yearsExperience);
  return NextResponse.json(result);
}

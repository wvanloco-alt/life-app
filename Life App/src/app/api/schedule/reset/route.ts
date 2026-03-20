import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activities } from "@/db/schema";
import { and, eq, gte, lte, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { start, end } = await request.json();

    if (!start || !end) {
      return NextResponse.json(
        { error: "start and end dates are required" },
        { status: 400 }
      );
    }

    const toDelete = await db
      .select({ id: activities.id })
      .from(activities)
      .where(
        and(
          gte(activities.activityDate, start),
          lte(activities.activityDate, end),
          eq(activities.isLogEntry, false),
          eq(activities.isCompleted, false)
        )
      );

    if (toDelete.length > 0) {
      await db
        .delete(activities)
        .where(inArray(activities.id, toDelete.map((r) => r.id)));
    }

    return NextResponse.json({ deleted: toDelete.length });
  } catch (error) {
    console.error("Schedule reset error:", error);
    return NextResponse.json(
      { error: "Failed to reset schedule", details: String(error) },
      { status: 500 }
    );
  }
}

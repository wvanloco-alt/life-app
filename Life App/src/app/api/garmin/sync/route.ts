import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { garminConnections } from "@/db/schema";
import { auth } from "@/lib/auth";
import { GarminClientUnavailableError, GarminSessionExpiredError } from "@/lib/garmin-client";
import {
  parseGarminSession,
  runGarminSyncForUser,
  serializeGarminSession,
} from "@/lib/garmin-sync-apply";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const daysRaw = parseInt(searchParams.get("days") ?? "7", 10);
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(daysRaw, 1), 30) : 7;

  const rows = await db
    .select()
    .from(garminConnections)
    .where(eq(garminConnections.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Garmin not connected" }, { status: 400 });
  }

  try {
    const garminSession = parseGarminSession(rows[0].sessionTokens);
    const { counts, session: updatedSession } = await runGarminSyncForUser(
      userId,
      garminSession,
      days
    );

    const now = new Date().toISOString();
    await db
      .update(garminConnections)
      .set({
        sessionTokens: serializeGarminSession(updatedSession),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(garminConnections.userId, userId));

    return NextResponse.json({
      activitiesAdded: counts.activitiesAdded,
      sleepRecordsUpserted: counts.sleepRecordsUpserted,
      dailyMetricsUpdated: counts.dailyMetricsUpdated,
      sessionsAutoCompleted: counts.sessionsAutoCompleted,
      lastSyncedAt: now,
    });
  } catch (err) {
    if (err instanceof GarminClientUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    if (err instanceof GarminSessionExpiredError) {
      return NextResponse.json(
        { error: err.message, code: "garmin_session_expired" },
        { status: 401 }
      );
    }
    const message = err instanceof Error ? err.message : "Garmin sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

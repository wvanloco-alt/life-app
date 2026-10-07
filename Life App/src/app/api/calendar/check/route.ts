import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, activityTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { brusselsToday } from "@/lib/dates";
import { and, eq } from "drizzle-orm";
import { format, parseISO } from "date-fns";

function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return format(parseISO(date), "yyyy-MM-dd") === date;
}

async function completionState(
  userId: string,
  activityTypeId: number,
  date: string
): Promise<{ checked: boolean; locked: boolean }> {
  const logs = await db
    .select({ source: activityLogs.source })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        eq(activityLogs.activityTypeId, activityTypeId),
        eq(activityLogs.date, date)
      )
    );

  if (logs.length === 0) return { checked: false, locked: false };

  const locked = logs.some((row) => row.source !== "calendar");
  return { checked: true, locked };
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: { date?: string; activityTypeId?: number; checked?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const date = body.date?.trim();
  const activityTypeId = body.activityTypeId;
  const checked = body.checked;

  if (!date || !isValidIsoDate(date)) {
    return NextResponse.json({ error: "date must be a valid YYYY-MM-DD string" }, { status: 400 });
  }
  if (date > brusselsToday()) {
    return NextResponse.json({ error: "Cannot check activities on a future date" }, { status: 400 });
  }
  if (!Number.isInteger(activityTypeId) || activityTypeId! <= 0) {
    return NextResponse.json({ error: "activityTypeId is required" }, { status: 400 });
  }
  if (typeof checked !== "boolean") {
    return NextResponse.json({ error: "checked must be a boolean" }, { status: 400 });
  }

  const typeRows = await db
    .select()
    .from(activityTypes)
    .where(and(eq(activityTypes.id, activityTypeId!), eq(activityTypes.userId, userId)))
    .limit(1);

  const activityType = typeRows[0];
  if (!activityType) {
    return NextResponse.json({ error: "Activity type not found" }, { status: 404 });
  }
  if (!activityType.calendarVisible) {
    return NextResponse.json({ error: "Activity is hidden on the calendar" }, { status: 400 });
  }

  if (checked) {
    const state = await completionState(userId, activityTypeId!, date);
    if (!state.checked) {
      await db.insert(activityLogs).values({
        activityTypeId: activityTypeId!,
        date,
        durationMinutes: 0,
        metrics: "{}",
        source: "calendar",
        userId,
      });
    }
  } else {
    await db
      .delete(activityLogs)
      .where(
        and(
          eq(activityLogs.userId, userId),
          eq(activityLogs.activityTypeId, activityTypeId!),
          eq(activityLogs.date, date),
          eq(activityLogs.source, "calendar")
        )
      );
  }

  const finalState = await completionState(userId, activityTypeId!, date);

  return NextResponse.json({
    date,
    activityTypeId,
    checked: finalState.checked,
    locked: finalState.locked,
  });
}

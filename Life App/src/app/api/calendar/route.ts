import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityLogs, activityTypes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { buildCalendarDays } from "@/lib/calendar-build";
import type { CalendarActivity, CalendarResponse } from "@/types";
import { and, eq, gte, lte } from "drizzle-orm";
import { format, parseISO } from "date-fns";

function isValidIsoDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return format(parseISO(date), "yyyy-MM-dd") === date;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const from = request.nextUrl.searchParams.get("from")?.trim();
  const to = request.nextUrl.searchParams.get("to")?.trim();

  if (!from || !to) {
    return NextResponse.json({ error: "from and to query params required (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!isValidIsoDate(from) || !isValidIsoDate(to)) {
    return NextResponse.json({ error: "from and to must be valid YYYY-MM-DD dates" }, { status: 400 });
  }
  if (from > to) {
    return NextResponse.json({ error: "from must not be after to" }, { status: 400 });
  }

  const typeRows = await db
    .select()
    .from(activityTypes)
    .where(eq(activityTypes.userId, userId));

  const activities: CalendarActivity[] = typeRows.map((row) => ({
    id: row.id,
    name: row.name,
    icon: row.icon,
    color: row.calendarColor,
    visible: row.calendarVisible,
  }));

  const visibleIds = new Set(
    typeRows.filter((row) => row.calendarVisible).map((row) => row.id)
  );

  const logRows = await db
    .select({
      date: activityLogs.date,
      activityTypeId: activityLogs.activityTypeId,
      source: activityLogs.source,
    })
    .from(activityLogs)
    .where(
      and(
        eq(activityLogs.userId, userId),
        gte(activityLogs.date, from),
        lte(activityLogs.date, to)
      )
    );

  const days = buildCalendarDays(from, to, logRows, visibleIds);

  const payload: CalendarResponse = { from, to, activities, days };
  return NextResponse.json(payload);
}

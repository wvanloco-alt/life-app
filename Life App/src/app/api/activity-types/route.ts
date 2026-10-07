import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { activityTypes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_ACTIVITY_TYPES } from "@/lib/defaults";
import { defaultCalendarColor } from "@/lib/calendar-colors";
import { auth } from "@/lib/auth";

async function seedDefaultActivityTypes(userId: string) {
  const existing = await db.select({ id: activityTypes.id }).from(activityTypes).where(eq(activityTypes.userId, userId)).limit(1);
  if (existing.length > 0) return;

  for (const at of DEFAULT_ACTIVITY_TYPES) {
    const [created] = await db
      .insert(activityTypes)
      .values({
        name: at.name,
        type: at.type,
        icon: at.icon,
        isTracked: at.isTracked,
        defaultCalories: at.defaultCalories,
        defaultSteps: at.defaultSteps,
        metricsConfig: JSON.stringify(at.metricsConfig),
        variants: at.variants ? JSON.stringify(at.variants) : null,
        gradeSystem: at.gradeSystem,
        calendarVisible: true,
        calendarColor: defaultCalendarColor(at.name, 0),
        userId,
      })
      .returning({ id: activityTypes.id });

    if (created) {
      await db
        .update(activityTypes)
        .set({ calendarColor: defaultCalendarColor(at.name, created.id) })
        .where(eq(activityTypes.id, created.id));
    }
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await seedDefaultActivityTypes(userId);

  const result = await db.select().from(activityTypes).where(eq(activityTypes.userId, userId));

  return NextResponse.json(result.map((s) => {
    let metricsConfig = [];
    let variants = null;
    try { metricsConfig = JSON.parse(s.metricsConfig); } catch { /* invalid JSON */ }
    try { variants = s.variants ? JSON.parse(s.variants) : null; } catch { /* invalid JSON */ }
    return { ...s, metricsConfig, variants };
  }));
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { name, type, icon, isTracked, defaultCalories, defaultSteps, defaultDurationMinutes, metricsConfig, variants, gradeSystem } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // defaultDurationMinutes is optional on POST and falls back to the schema's
  // 60-minute default. When provided, it must be a positive integer.
  let resolvedDuration: number | undefined = undefined;
  if (defaultDurationMinutes !== undefined && defaultDurationMinutes !== null) {
    if (!Number.isInteger(defaultDurationMinutes) || defaultDurationMinutes <= 0) {
      return NextResponse.json({ error: "defaultDurationMinutes must be a positive integer" }, { status: 400 });
    }
    resolvedDuration = defaultDurationMinutes;
  }

  const [created] = await db.insert(activityTypes).values({
    name: name.trim(),
    type: type ?? "cardio",
    icon: icon ?? "activity",
    isTracked: isTracked ?? false,
    defaultCalories: defaultCalories ?? null,
    defaultSteps: defaultSteps ?? null,
    ...(resolvedDuration !== undefined && { defaultDurationMinutes: resolvedDuration }),
    metricsConfig: JSON.stringify(metricsConfig ?? []),
    variants: variants ? JSON.stringify(variants) : null,
    gradeSystem: gradeSystem ?? null,
    calendarVisible: true,
    calendarColor: defaultCalendarColor(name.trim(), 0),
    userId,
  }).returning();

  if (created) {
    await db
      .update(activityTypes)
      .set({ calendarColor: defaultCalendarColor(name.trim(), created.id) })
      .where(eq(activityTypes.id, created.id));
  }

  return NextResponse.json({ ...created, metricsConfig: JSON.parse(created.metricsConfig), variants: created.variants ? JSON.parse(created.variants) : null }, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { recurringActivities, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const result = await db
    .select({
      id: recurringActivities.id,
      roleId: recurringActivities.roleId,
      title: recurringActivities.title,
      quadrant: recurringActivities.quadrant,
      dayOfWeek: recurringActivities.dayOfWeek,
      startTime: recurringActivities.startTime,
      endTime: recurringActivities.endTime,
      isPaused: recurringActivities.isPaused,
      createdAt: recurringActivities.createdAt,
      updatedAt: recurringActivities.updatedAt,
      roleName: roles.name,
      roleColor: roles.color,
    })
    .from(recurringActivities)
    .leftJoin(roles, eq(recurringActivities.roleId, roles.id))
    .where(eq(recurringActivities.userId, userId));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { title, quadrant, dayOfWeek, startTime, endTime, roleId } = body;

  if (!title || dayOfWeek === undefined || !startTime || !endTime) {
    return NextResponse.json({ error: "title, dayOfWeek, startTime, and endTime are required" }, { status: 400 });
  }

  const [created] = await db.insert(recurringActivities).values({ title: title.trim(), quadrant: quadrant ?? "Q2", dayOfWeek: Number(dayOfWeek), startTime, endTime, roleId: roleId ?? null, userId }).returning();
  return NextResponse.json(created, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { getNextRoleColor, isValidHexColor } from "@/lib/colors";
import { DEFAULT_ROLES } from "@/lib/defaults";
import { auth } from "@/lib/auth";

async function seedDefaultRoles(userId: string) {
  const existing = await db.select({ id: roles.id }).from(roles).where(eq(roles.userId, userId)).limit(1);
  if (existing.length > 0) return;

  for (let i = 0; i < DEFAULT_ROLES.length; i++) {
    const role = DEFAULT_ROLES[i];
    await db.insert(roles).values({
      name: role.name,
      description: role.description,
      color: role.color,
      displayOrder: i,
      isWorkRole: role.isWorkRole,
      maxWeeklyOccurrences: role.maxWeeklyOccurrences,
      minRestDays: role.minRestDays,
      userId,
    });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archived") === "true";

  await seedDefaultRoles(userId);

  const result = await db
    .select()
    .from(roles)
    .where(
      showArchived
        ? eq(roles.userId, userId)
        : and(eq(roles.userId, userId), eq(roles.isArchived, false))
    )
    .orderBy(asc(roles.displayOrder));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { name, description, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (name.trim().length > 50) {
    return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
  }

  const existing = await db.select().from(roles).where(and(eq(roles.userId, userId), eq(roles.isArchived, false)));

  if (existing.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json({ error: "A role with this name already exists" }, { status: 409 });
  }

  let roleColor = color;
  if (!roleColor || !isValidHexColor(roleColor)) {
    const usedColors = existing.map((r) => r.color);
    roleColor = getNextRoleColor(usedColors);
  }

  const maxOrder = existing.reduce((max, r) => Math.max(max, r.displayOrder), -1);

  const [created] = await db
    .insert(roles)
    .values({
      name: name.trim(),
      description: description?.trim() || null,
      color: roleColor,
      displayOrder: maxOrder + 1,
      isWorkRole: Boolean(body.isWorkRole ?? false),
      maxWeeklyOccurrences: Number(body.maxWeeklyOccurrences ?? 7),
      minRestDays: Number(body.minRestDays ?? 0),
      userId,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

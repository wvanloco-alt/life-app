import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { getNextRoleColor, isValidHexColor } from "@/lib/colors";
import { DEFAULT_ROLES } from "@/lib/defaults";

async function seedDefaultRoles() {
  const existing = await db.select({ id: roles.id }).from(roles).limit(1);
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
    });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showArchived = searchParams.get("archived") === "true";

  await seedDefaultRoles();

  const result = await db
    .select()
    .from(roles)
    .where(showArchived ? undefined : eq(roles.isArchived, false))
    .orderBy(asc(roles.displayOrder));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, color } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Name is required" },
      { status: 400 }
    );
  }

  if (name.trim().length > 50) {
    return NextResponse.json(
      { error: "Name must be 50 characters or less" },
      { status: 400 }
    );
  }

  // Check for duplicate name among active roles
  const existing = await db
    .select()
    .from(roles)
    .where(eq(roles.isArchived, false));

  if (existing.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) {
    return NextResponse.json(
      { error: "A role with this name already exists" },
      { status: 409 }
    );
  }

  // Determine color
  let roleColor = color;
  if (!roleColor || !isValidHexColor(roleColor)) {
    const usedColors = existing.map((r) => r.color);
    roleColor = getNextRoleColor(usedColors);
  }

  // Determine display order (append to end)
  const maxOrder = existing.reduce(
    (max, r) => Math.max(max, r.displayOrder),
    -1
  );

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
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { isValidHexColor } from "@/lib/colors";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const roleId = parseInt(id);
  if (isNaN(roleId)) return NextResponse.json({ error: "Invalid role ID" }, { status: 400 });

  const existing = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.userId, userId)));
  if (existing.length === 0) return NextResponse.json({ error: "Role not found" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    if (body.name.trim().length > 50) {
      return NextResponse.json({ error: "Name must be 50 characters or less" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.description !== undefined) updates.description = body.description?.trim() || null;
  if (body.color !== undefined) {
    if (!isValidHexColor(body.color)) return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
    updates.color = body.color;
  }
  if (body.isArchived !== undefined) updates.isArchived = Boolean(body.isArchived);
  if (body.displayOrder !== undefined) updates.displayOrder = Number(body.displayOrder);
  if (body.isWorkRole !== undefined) updates.isWorkRole = Boolean(body.isWorkRole);
  if (body.maxWeeklyOccurrences !== undefined) updates.maxWeeklyOccurrences = Number(body.maxWeeklyOccurrences);
  if (body.minRestDays !== undefined) updates.minRestDays = Number(body.minRestDays);
  updates.updatedAt = new Date().toISOString();

  const [updated] = await db
    .update(roles)
    .set(updates)
    .where(and(eq(roles.id, roleId), eq(roles.userId, userId)))
    .returning();

  return NextResponse.json(updated);
}

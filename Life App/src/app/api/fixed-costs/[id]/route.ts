import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const costId = parseInt(id);
  if (isNaN(costId)) {
    return NextResponse.json({ error: "Invalid fixed cost ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(fixedCosts)
    .where(eq(fixedCosts.id, costId));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Fixed cost not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.amount !== undefined) updates.amount = Number(body.amount);
  if (body.category !== undefined) updates.category = body.category;
  if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
  if (body.startMonth !== undefined) updates.startMonth = body.startMonth;
  if (body.endMonth !== undefined)
    updates.endMonth =
      body.endMonth == null || body.endMonth === ""
        ? null
        : body.endMonth;
  if (body.notes !== undefined)
    updates.notes = body.notes == null ? null : body.notes;

  const [updated] = await db
    .update(fixedCosts)
    .set(updates)
    .where(eq(fixedCosts.id, costId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const costId = parseInt(id);
  if (isNaN(costId)) {
    return NextResponse.json({ error: "Invalid fixed cost ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(fixedCosts)
    .where(eq(fixedCosts.id, costId));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Fixed cost not found" },
      { status: 404 }
    );
  }

  await db.delete(fixedCosts).where(eq(fixedCosts.id, costId));

  return new NextResponse(null, { status: 204 });
}

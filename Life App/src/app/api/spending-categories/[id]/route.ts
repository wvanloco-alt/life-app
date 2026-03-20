import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(spendingCategories)
    .where(eq(spendingCategories.id, categoryId));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }
    updates.name = body.name.trim();
  }
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.color !== undefined) updates.color = body.color;
  if (body.displayOrder !== undefined)
    updates.displayOrder = Number(body.displayOrder);
  if (body.isArchived !== undefined)
    updates.isArchived = Boolean(body.isArchived);

  const [updated] = await db
    .update(spendingCategories)
    .set(updates)
    .where(eq(spendingCategories.id, categoryId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const categoryId = parseInt(id);
  if (isNaN(categoryId)) {
    return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(spendingCategories)
    .where(eq(spendingCategories.id, categoryId));

  if (existing.length === 0) {
    return NextResponse.json(
      { error: "Category not found" },
      { status: 404 }
    );
  }

  await db
    .delete(spendingCategories)
    .where(eq(spendingCategories.id, categoryId));

  return new NextResponse(null, { status: 204 });
}

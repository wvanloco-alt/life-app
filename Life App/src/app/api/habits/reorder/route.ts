import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

/**
 * PUT /api/habits/reorder
 *
 * Body: `{ order: number[] }` where `order[i]` is the habit id that should
 * land at displayOrder = i. Per spec FR-010, every id in the array MUST
 * belong to the authenticated user AND be non-archived; otherwise the entire
 * request is rejected with 400 and no rows are updated.
 *
 * Validates the whole array up front (one SELECT) so a partial update is
 * impossible: either every id is good or nothing changes.
 */
export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { order } = body;

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "order must be a non-empty array of habit IDs" }, { status: 400 });
  }

  if (!order.every((id) => typeof id === "number" && Number.isInteger(id))) {
    return NextResponse.json({ error: "order must contain only integer habit IDs" }, { status: 400 });
  }

  // Verify every id belongs to this user and is non-archived. One round-trip
  // catches all four failure modes (foreign id, archived row, duplicate id,
  // missing row) cheaply.
  const found = await db
    .select({ id: habits.id })
    .from(habits)
    .where(
      and(
        eq(habits.userId, userId),
        eq(habits.isArchived, false),
        inArray(habits.id, order as number[]),
      ),
    );

  const foundIds = new Set(found.map((h) => h.id));
  if (foundIds.size !== order.length) {
    return NextResponse.json(
      { error: "One or more habit IDs are invalid (not owned by you, archived, or duplicated)" },
      { status: 400 },
    );
  }

  // Sequential UPDATEs are fine at v1 scale (max ~50 habits per user). Drizzle
  // does not have a clean batch-update for "different value per row" without
  // dropping into raw SQL.
  for (let i = 0; i < order.length; i++) {
    await db
      .update(habits)
      .set({ displayOrder: i, updatedAt: new Date().toISOString() })
      .where(and(eq(habits.id, order[i]), eq(habits.userId, userId)));
  }

  return new NextResponse(null, { status: 204 });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalSessionPatterns, goals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  // Verify the pattern belongs to the user (via goal ownership)
  const pattern = await db
    .select({ id: goalSessionPatterns.id })
    .from(goalSessionPatterns)
    .innerJoin(goals, eq(goalSessionPatterns.goalId, goals.id))
    .where(and(eq(goalSessionPatterns.id, numId), eq(goals.userId, userId)));

  if (pattern.length === 0) return NextResponse.json({ error: "Pattern not found" }, { status: 404 });

  await db.delete(goalSessionPatterns).where(eq(goalSessionPatterns.id, numId));
  return NextResponse.json({ success: true });
}

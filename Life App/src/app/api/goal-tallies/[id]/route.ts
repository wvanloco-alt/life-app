import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalTallies, goals } from "@/db/schema";
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
  const tallyId = parseInt(id);
  if (isNaN(tallyId)) return NextResponse.json({ error: "Invalid tally ID" }, { status: 400 });

  // Verify the tally belongs to the user (via the goal's userId)
  const tally = await db
    .select({ tallyId: goalTallies.id })
    .from(goalTallies)
    .innerJoin(goals, eq(goalTallies.goalId, goals.id))
    .where(and(eq(goalTallies.id, tallyId), eq(goals.userId, userId)));

  if (tally.length === 0) return NextResponse.json({ error: "Tally not found" }, { status: 404 });

  await db.delete(goalTallies).where(eq(goalTallies.id, tallyId));
  return NextResponse.json({ success: true });
}

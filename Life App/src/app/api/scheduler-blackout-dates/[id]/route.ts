import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedulerBlackoutDates } from "@/db/schema";
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

  await db.delete(schedulerBlackoutDates).where(and(eq(schedulerBlackoutDates.id, numId), eq(schedulerBlackoutDates.userId, userId)));
  return NextResponse.json({ success: true });
}

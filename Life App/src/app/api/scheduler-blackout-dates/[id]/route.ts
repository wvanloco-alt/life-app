import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedulerBlackoutDates } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  await db
    .delete(schedulerBlackoutDates)
    .where(eq(schedulerBlackoutDates.id, numId));

  return NextResponse.json({ success: true });
}

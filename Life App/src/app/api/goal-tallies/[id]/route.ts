import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalTallies } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tallyId = parseInt(id);
  if (isNaN(tallyId)) {
    return NextResponse.json({ error: "Invalid tally ID" }, { status: 400 });
  }

  await db.delete(goalTallies).where(eq(goalTallies.id, tallyId));
  return NextResponse.json({ success: true });
}

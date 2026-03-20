import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goalSessionPatterns } from "@/db/schema";
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
    .delete(goalSessionPatterns)
    .where(eq(goalSessionPatterns.id, numId));

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { db } from "@/db";
import { garminConnections } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const rows = await db
    .select({
      garminEmail: garminConnections.garminEmail,
      lastSyncedAt: garminConnections.lastSyncedAt,
    })
    .from(garminConnections)
    .where(eq(garminConnections.userId, userId))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ connected: false, garminEmail: null, lastSyncedAt: null });
  }

  return NextResponse.json({
    connected: true,
    garminEmail: rows[0].garminEmail,
    lastSyncedAt: rows[0].lastSyncedAt,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  await db.delete(garminConnections).where(eq(garminConnections.userId, userId));
  return NextResponse.json({ disconnected: true });
}

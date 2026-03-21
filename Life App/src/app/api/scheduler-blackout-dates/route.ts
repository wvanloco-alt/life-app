import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedulerBlackoutDates } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const rows = await db.select().from(schedulerBlackoutDates).where(eq(schedulerBlackoutDates.userId, userId)).orderBy(schedulerBlackoutDates.date);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { date, label, isRecurring } = body;

  if (!date) return NextResponse.json({ error: "date is required" }, { status: 400 });

  const [created] = await db.insert(schedulerBlackoutDates).values({ date, label: label || null, isRecurring: isRecurring ?? false, userId }).returning();
  return NextResponse.json(created, { status: 201 });
}

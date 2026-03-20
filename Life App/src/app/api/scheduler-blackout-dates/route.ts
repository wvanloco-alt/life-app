import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedulerBlackoutDates } from "@/db/schema";

export async function GET() {
  const rows = await db
    .select()
    .from(schedulerBlackoutDates)
    .orderBy(schedulerBlackoutDates.date);
  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { date, label, isRecurring } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(schedulerBlackoutDates)
    .values({
      date,
      label: label || null,
      isRecurring: isRecurring ?? false,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

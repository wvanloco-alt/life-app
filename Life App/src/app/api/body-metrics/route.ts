import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bodyMetrics } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const metricType = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let result = await db.select().from(bodyMetrics).where(eq(bodyMetrics.userId, userId));

  if (metricType) result = result.filter((m) => m.metricType === metricType);
  if (from) result = result.filter((m) => m.date >= from);
  if (to) result = result.filter((m) => m.date <= to);

  result.sort((a, b) => b.date.localeCompare(a.date));
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { date, metricType, value, unit } = body;

  if (!date || !metricType || value === undefined || !unit) {
    return NextResponse.json({ error: "date, metricType, value, and unit are required" }, { status: 400 });
  }

  const [created] = await db.insert(bodyMetrics).values({ date, metricType, value: Number(value), unit, userId }).returning();
  return NextResponse.json(created, { status: 201 });
}

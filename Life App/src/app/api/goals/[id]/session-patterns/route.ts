import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { goals, goalSessionPatterns } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const goalId = parseInt(id, 10);
  if (isNaN(goalId)) return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });

  const goalRows = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const patterns = await db.select().from(goalSessionPatterns).where(eq(goalSessionPatterns.goalId, goalId));
  return NextResponse.json(patterns.sort((a, b) => a.position - b.position));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { id } = await params;
  const goalId = parseInt(id, 10);
  if (isNaN(goalId)) return NextResponse.json({ error: "Invalid goal ID" }, { status: 400 });

  const goalRows = await db.select({ id: goals.id }).from(goals).where(and(eq(goals.id, goalId), eq(goals.userId, userId)));
  if (goalRows.length === 0) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const body = await request.json();
  const { patterns } = body;
  if (!Array.isArray(patterns)) return NextResponse.json({ error: "patterns array is required" }, { status: 400 });

  await db.delete(goalSessionPatterns).where(eq(goalSessionPatterns.goalId, goalId));

  const created = [];
  for (let i = 0; i < patterns.length; i++) {
    const p = patterns[i];
    const [row] = await db.insert(goalSessionPatterns).values({ goalId, position: i + 1, label: p.label || `Session ${i + 1}`, restDaysAfter: p.restDaysAfter ?? 1 }).returning();
    created.push(row);
  }

  return NextResponse.json(created, { status: 201 });
}

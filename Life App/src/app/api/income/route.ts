import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { incomeEntries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  if (!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month query param (YYYY-MM) is required" }, { status: 400 });

  const monthEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.month, month), eq(incomeEntries.userId, userId)));
  const recurringEntries = await db.select().from(incomeEntries).where(and(eq(incomeEntries.isRecurring, true), eq(incomeEntries.userId, userId)));

  const recurringBySource = new Map<string, (typeof recurringEntries)[0]>();
  for (const entry of recurringEntries) {
    const existing = recurringBySource.get(entry.source);
    if (!existing || (entry.createdAt && existing.createdAt && entry.createdAt > existing.createdAt)) recurringBySource.set(entry.source, entry);
  }

  const monthSources = new Set(monthEntries.map((e) => e.source));
  const recurringForMonth = Array.from(recurringBySource.values()).filter((e) => !monthSources.has(e.source));
  return NextResponse.json([...monthEntries, ...recurringForMonth]);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { source, amount, month, isRecurring, notes } = body;

  if (!source || typeof source !== "string" || source.trim().length === 0) return NextResponse.json({ error: "source is required" }, { status: 400 });
  if (amount === undefined || amount === null || Number(amount) < 0) return NextResponse.json({ error: "amount is required and must be a non-negative number" }, { status: 400 });
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ error: "month (YYYY-MM) is required" }, { status: 400 });

  const [created] = await db.insert(incomeEntries).values({ source: source.trim(), amount: Number(amount), month, isRecurring: Boolean(isRecurring ?? false), notes: notes?.trim() || null, userId }).returning();
  return NextResponse.json(created, { status: 201 });
}

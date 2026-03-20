import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { fixedCosts } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const allActive = await db
    .select()
    .from(fixedCosts)
    .where(eq(fixedCosts.isActive, true));

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(allActive);
  }

  const result = allActive.filter(
    (fc) =>
      fc.startMonth <= month &&
      (fc.endMonth == null || fc.endMonth >= month)
  );

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, amount, category, startMonth, endMonth, notes } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  if (amount === undefined || amount === null || Number(amount) < 0) {
    return NextResponse.json(
      { error: "amount is required and must be a non-negative number" },
      { status: 400 }
    );
  }

  if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) {
    return NextResponse.json(
      { error: "startMonth (YYYY-MM) is required" },
      { status: 400 }
    );
  }

  const [created] = await db
    .insert(fixedCosts)
    .values({
      name: name.trim(),
      amount: Number(amount),
      category: category?.trim() ?? "",
      startMonth,
      endMonth: endMonth && /^\d{4}-\d{2}$/.test(endMonth) ? endMonth : null,
      notes: notes?.trim() || null,
    })
    .returning();

  return NextResponse.json(created, { status: 201 });
}

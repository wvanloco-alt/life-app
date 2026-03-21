import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { spendingCategories } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { DEFAULT_SPENDING_CATEGORIES } from "@/lib/defaults";
import { auth } from "@/lib/auth";

async function seedDefaultCategories(userId: string) {
  const existing = await db.select({ id: spendingCategories.id }).from(spendingCategories).where(eq(spendingCategories.userId, userId)).limit(1);
  if (existing.length > 0) return;

  for (let i = 0; i < DEFAULT_SPENDING_CATEGORIES.length; i++) {
    const cat = DEFAULT_SPENDING_CATEGORIES[i];
    await db.insert(spendingCategories).values({ name: cat.name, icon: cat.icon, color: cat.color, displayOrder: i, userId });
  }
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const { searchParams } = new URL(request.url);
  const includeArchived = searchParams.get("archived") === "true";

  await seedDefaultCategories(userId);

  const result = await db
    .select()
    .from(spendingCategories)
    .where(includeArchived ? eq(spendingCategories.userId, userId) : and(eq(spendingCategories.userId, userId), eq(spendingCategories.isArchived, false)))
    .orderBy(asc(spendingCategories.displayOrder));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const { name, icon, color, displayOrder } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const maxOrder = (await db.select({ displayOrder: spendingCategories.displayOrder }).from(spendingCategories).where(eq(spendingCategories.userId, userId))).reduce((max, r) => Math.max(max, r.displayOrder), -1) + 1;

  const [created] = await db.insert(spendingCategories).values({ name: name.trim(), icon: icon ?? "package", color: color ?? "#6B7280", displayOrder: displayOrder ?? maxOrder, userId }).returning();
  return NextResponse.json(created, { status: 201 });
}

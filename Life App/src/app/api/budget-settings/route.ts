import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { budgetSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getOrCreateBudgetSettings() {
  const rows = await db.select().from(budgetSettings);
  if (rows.length > 0) return rows[0];

  const [created] = await db
    .insert(budgetSettings)
    .values({
      currency: "EUR",
      monthlySavingsTarget: 0,
    })
    .returning();
  return created!;
}

export async function GET() {
  const settings = await getOrCreateBudgetSettings();
  return NextResponse.json(settings);
}

export async function PATCH(request: NextRequest) {
  const settings = await getOrCreateBudgetSettings();
  const body = await request.json();
  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.currency !== undefined) updates.currency = body.currency;
  if (body.monthlySavingsTarget !== undefined)
    updates.monthlySavingsTarget = Number(body.monthlySavingsTarget);
  if (body.savingsGoalTotal !== undefined)
    updates.savingsGoalTotal =
      body.savingsGoalTotal == null ? null : Number(body.savingsGoalTotal);
  if (body.savingsGoalTargetDate !== undefined)
    updates.savingsGoalTargetDate =
      body.savingsGoalTargetDate == null
        ? null
        : String(body.savingsGoalTargetDate);

  const [updated] = await db
    .update(budgetSettings)
    .set(updates)
    .where(eq(budgetSettings.id, settings.id))
    .returning();

  return NextResponse.json(updated);
}

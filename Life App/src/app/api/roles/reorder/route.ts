import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { roles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { order } = body;

  if (!Array.isArray(order) || order.length === 0) {
    return NextResponse.json(
      { error: "order must be a non-empty array of role IDs" },
      { status: 400 }
    );
  }

  for (let i = 0; i < order.length; i++) {
    await db
      .update(roles)
      .set({ displayOrder: i, updatedAt: new Date().toISOString() })
      .where(eq(roles.id, order[i]));
  }

  return NextResponse.json({ success: true });
}

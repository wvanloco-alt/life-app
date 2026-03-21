import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { isActive } = body;

  if (isActive === undefined) return NextResponse.json({ error: "isActive is required" }, { status: 400 });

  const target = await db.select().from(users).where(eq(users.id, id));
  if (target.length === 0) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Prevent deactivating the last active admin
  if (!isActive && target[0].role === "admin") {
    const otherActiveAdmins = await db.select({ id: users.id }).from(users).where(
      and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, id))
    );
    if (otherActiveAdmins.length === 0) {
      return NextResponse.json({ error: "Cannot deactivate the last active admin account" }, { status: 409 });
    }
  }

  const [updated] = await db
    .update(users)
    .set({ isActive: Boolean(isActive) })
    .where(eq(users.id, id))
    .returning({ id: users.id, username: users.username, role: users.role, isActive: users.isActive, createdAt: users.createdAt });

  return NextResponse.json(updated);
}

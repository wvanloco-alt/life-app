import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const allUsers = await db
    .select({ id: users.id, username: users.username, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
    .from(users);

  return NextResponse.json(allUsers);
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { username, password, role = "user" } = body;

  if (!username || typeof username !== "string" || username.trim().length < 2) {
    return NextResponse.json({ error: "Username must be at least 2 characters" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }
  if (!["user", "admin"].includes(role)) {
    return NextResponse.json({ error: "Role must be 'user' or 'admin'" }, { status: 400 });
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username.trim()));
  if (existing.length > 0) return NextResponse.json({ error: "Username already taken" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const [created] = await db.insert(users).values({
    id: randomUUID(),
    username: username.trim(),
    passwordHash,
    role,
    isActive: true,
  }).returning({ id: users.id, username: users.username, role: users.role, isActive: users.isActive, createdAt: users.createdAt });

  return NextResponse.json(created, { status: 201 });
}

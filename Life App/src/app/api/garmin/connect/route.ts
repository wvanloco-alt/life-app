import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { garminConnections } from "@/db/schema";
import { auth } from "@/lib/auth";
import { GarminClientUnavailableError, loginGarmin } from "@/lib/garmin-client";
import { parseGarminSession, serializeGarminSession } from "@/lib/garmin-sync-apply";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const body = await request.json();
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const mfaCode = typeof body.mfaCode === "string" ? body.mfaCode.trim() : undefined;
  const pendingCookies = typeof body.pendingCookies === "string" ? body.pendingCookies : undefined;

  if (!pendingCookies && (!email || !password)) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const result = await loginGarmin({
      email: email || "connected@garmin.local",
      password,
      mfaCode,
      pendingCookies,
    });

    if (result.status === "mfa_required") {
      return NextResponse.json({ mfaRequired: true, pendingCookies: result.pendingCookies });
    }

    const encrypted = serializeGarminSession(result.session);
    const now = new Date().toISOString();

    const existing = await db
      .select({ id: garminConnections.id })
      .from(garminConnections)
      .where(eq(garminConnections.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(garminConnections)
        .set({
          sessionTokens: encrypted,
          garminEmail: result.garminEmail,
          updatedAt: now,
        })
        .where(eq(garminConnections.userId, userId));
    } else {
      await db.insert(garminConnections).values({
        userId,
        sessionTokens: encrypted,
        garminEmail: result.garminEmail,
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      connected: true,
      garminEmail: result.garminEmail,
    });
  } catch (err) {
    if (err instanceof GarminClientUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Garmin login failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

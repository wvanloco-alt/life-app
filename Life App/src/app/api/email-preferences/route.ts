import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailPreferences } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { EmailPreferences } from "@/types";
import { eq } from "drizzle-orm";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseExcluded(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

function rowToResponse(row: typeof emailPreferences.$inferSelect): EmailPreferences {
  return {
    email: row.email ?? null,
    cadence: row.cadence === "weekly" ? "weekly" : "daily",
    enabled: row.enabled,
    excludedLibraryTopics: parseExcluded(row.excludedLibraryTopics),
  };
}

const DEFAULT_PREFS: EmailPreferences = {
  email: null,
  cadence: "daily",
  enabled: false,
  excludedLibraryTopics: [],
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, session.user.id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json(DEFAULT_PREFS);
  }

  return NextResponse.json(rowToResponse(rows[0]));
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  let body: { email?: string; cadence?: string; enabled?: boolean; excludedLibraryTopics?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await db
    .select()
    .from(emailPreferences)
    .where(eq(emailPreferences.userId, userId))
    .limit(1);

  const current = existing[0];
  const now = new Date().toISOString();

  if (body.email !== undefined) {
    const trimmed = body.email.trim();
    if (trimmed && !EMAIL_RE.test(trimmed)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }

  if (body.cadence !== undefined && body.cadence !== "daily" && body.cadence !== "weekly") {
    return NextResponse.json({ error: "cadence must be daily or weekly" }, { status: 400 });
  }

  const nextEmail =
    body.email !== undefined ? (body.email.trim() || null) : (current?.email ?? null);
  const nextCadence =
    body.cadence === "weekly" || body.cadence === "daily"
      ? body.cadence
      : current?.cadence === "weekly"
        ? "weekly"
        : "daily";
  const nextEnabled = body.enabled !== undefined ? body.enabled : (current?.enabled ?? false);
  const nextExcluded =
    body.excludedLibraryTopics !== undefined
      ? JSON.stringify(body.excludedLibraryTopics)
      : (current?.excludedLibraryTopics ?? null);

  if (nextEnabled && !nextEmail) {
    return NextResponse.json({ error: "Cannot enable without email" }, { status: 400 });
  }

  const [saved] = await db
    .insert(emailPreferences)
    .values({
      userId,
      email: nextEmail,
      cadence: nextCadence,
      enabled: nextEnabled,
      excludedLibraryTopics: nextExcluded,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: emailPreferences.userId,
      set: {
        ...(body.email !== undefined ? { email: nextEmail } : {}),
        ...(body.cadence !== undefined ? { cadence: nextCadence } : {}),
        ...(body.enabled !== undefined ? { enabled: nextEnabled } : {}),
        ...(body.excludedLibraryTopics !== undefined ? { excludedLibraryTopics: nextExcluded } : {}),
        updatedAt: now,
      },
    })
    .returning();

  return NextResponse.json(rowToResponse(saved));
}

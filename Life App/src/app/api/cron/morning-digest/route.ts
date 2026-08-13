import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { emailPreferences, garminConnections } from "@/db/schema";
import { buildDailyContent, buildWeeklyContent } from "@/lib/digest-assembler";
import { getDigestSubject, renderDigest } from "@/lib/email-template";
import {
  parseGarminSession,
  runGarminSyncForUser,
  serializeGarminSession,
} from "@/lib/garmin-sync-apply";
import { sendMail } from "@/lib/mailer";
import { and, eq, isNotNull, ne, or, isNull } from "drizzle-orm";

const SYNC_TIMEOUT_MS = 30_000;

function getBrusselsHour(): number {
  const hourStr = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Brussels",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(hourStr, 10);
}

function getBrusselsToday(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Brussels" });
}

function isBrusselsMonday(): boolean {
  return (
    new Date().toLocaleDateString("en-US", {
      timeZone: "Europe/Brussels",
      weekday: "long",
    }) === "Monday"
  );
}

async function syncGarminWithTimeout(userId: string): Promise<void> {
  const rows = await db
    .select()
    .from(garminConnections)
    .where(eq(garminConnections.userId, userId))
    .limit(1);

  if (rows.length === 0) return;

  const syncPromise = (async () => {
    const garminSession = parseGarminSession(rows[0].sessionTokens);
    const { session: updatedSession } = await runGarminSyncForUser(userId, garminSession, 7);
    const now = new Date().toISOString();
    await db
      .update(garminConnections)
      .set({
        sessionTokens: serializeGarminSession(updatedSession),
        lastSyncedAt: now,
        updatedAt: now,
      })
      .where(eq(garminConnections.userId, userId));
  })();

  await Promise.race([
    syncPromise,
    new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error("Garmin sync timed out")), SYNC_TIMEOUT_MS);
    }),
  ]).catch((err) => {
    console.error(`[morning-digest] Garmin sync failed for ${userId}:`, err);
  });
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getBrusselsHour() < 7) {
    return NextResponse.json({ sent: 0, skipped: "too early" });
  }

  const today = getBrusselsToday();
  const isMonday = isBrusselsMonday();

  const candidates = await db
    .select({
      userId: emailPreferences.userId,
      email: emailPreferences.email,
      cadence: emailPreferences.cadence,
    })
    .from(emailPreferences)
    .where(
      and(
        eq(emailPreferences.enabled, true),
        isNotNull(emailPreferences.email),
        or(
          isNull(emailPreferences.lastDigestSentAt),
          ne(emailPreferences.lastDigestSentAt, today)
        )
      )
    );

  const recipients = candidates.filter((row) => {
    if (!row.email) return false;
    if (row.cadence === "weekly") return isMonday;
    return row.cadence === "daily";
  });

  let sent = 0;
  let skipped = 0;
  let errors = 0;

  for (const recipient of recipients) {
    try {
      await syncGarminWithTimeout(recipient.userId);

      const cadence = recipient.cadence === "weekly" ? "weekly" : "daily";
      const content =
        cadence === "weekly"
          ? await buildWeeklyContent(recipient.userId, today, db)
          : await buildDailyContent(recipient.userId, today, db);

      if (!content) {
        skipped += 1;
        continue;
      }

      const subject = getDigestSubject(content);
      const { html, text } = renderDigest(content);

      await sendMail({
        to: recipient.email!,
        subject,
        html,
        text,
      });

      await db
        .update(emailPreferences)
        .set({
          lastDigestSentAt: today,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(emailPreferences.userId, recipient.userId));

      sent += 1;
    } catch (err) {
      errors += 1;
      console.error(`[morning-digest] Failed for ${recipient.userId}:`, err);
    }
  }

  return NextResponse.json({ sent, skipped, errors });
}

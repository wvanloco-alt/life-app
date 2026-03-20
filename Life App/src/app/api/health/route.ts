import { NextResponse } from "next/server";
import { runDailyBackup } from "@/db/backup";

let backupRanToday = false;

export async function GET() {
  if (!backupRanToday) {
    runDailyBackup();
    backupRanToday = true;

    // Reset the flag at midnight so it runs again tomorrow
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(midnight.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();
    setTimeout(() => {
      backupRanToday = false;
    }, msUntilMidnight);
  }

  return NextResponse.json({ status: "ok" });
}

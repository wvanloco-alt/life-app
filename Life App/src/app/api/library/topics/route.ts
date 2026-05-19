import { NextResponse } from "next/server";
import { db } from "@/db";
import { libraryTopics } from "@/db/schema";
import { asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const topics = await db
    .select()
    .from(libraryTopics)
    .orderBy(asc(libraryTopics.displayOrder));

  return NextResponse.json(topics);
}

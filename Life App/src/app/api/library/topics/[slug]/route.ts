import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { libraryTopics, libraryCategories, libraryItems, libraryBookmarks } from "@/db/schema";
import { eq, asc, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import type { LibraryTopicWithCategories, LibraryCategoryWithItems, LibraryItemWithBookmark } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { slug } = await params;

  // 1. Fetch topic
  const [topic] = await db
    .select()
    .from(libraryTopics)
    .where(eq(libraryTopics.slug, slug));

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  // 2. Fetch categories for this topic
  const categories = await db
    .select()
    .from(libraryCategories)
    .where(eq(libraryCategories.topicId, topic.id))
    .orderBy(asc(libraryCategories.displayOrder));

  if (categories.length === 0) {
    const result: LibraryTopicWithCategories = {
      id: topic.id,
      slug: topic.slug,
      title: topic.title,
      icon: topic.icon,
      description: topic.description,
      displayOrder: topic.displayOrder,
      categories: [],
    };
    return NextResponse.json(result);
  }

  const categoryIds = categories.map((c) => c.id);

  // 3. Fetch all items for these categories
  const items = await db
    .select()
    .from(libraryItems)
    .where(inArray(libraryItems.categoryId, categoryIds))
    .orderBy(asc(libraryItems.displayOrder));

  // 4. Fetch user's bookmarks for these items
  const itemIds = items.map((i) => i.id);
  const bookmarkedItemIds = new Set<number>();

  if (itemIds.length > 0) {
    const bookmarks = await db
      .select({ itemId: libraryBookmarks.itemId })
      .from(libraryBookmarks)
      .where(
        and(
          eq(libraryBookmarks.userId, userId),
          inArray(libraryBookmarks.itemId, itemIds)
        )
      );
    for (const b of bookmarks) {
      bookmarkedItemIds.add(b.itemId);
    }
  }

  // 5. Assemble nested response
  const categoriesWithItems: LibraryCategoryWithItems[] = categories.map((cat) => {
    const catItems: LibraryItemWithBookmark[] = items
      .filter((item) => item.categoryId === cat.id)
      .map((item) => ({
        id: item.id,
        categoryId: item.categoryId,
        title: item.title,
        type: item.type as LibraryItemWithBookmark["type"],
        what: item.what,
        why: item.why,
        how: item.how,
        durationOrReps: item.durationOrReps,
        displayOrder: item.displayOrder,
        isBookmarked: bookmarkedItemIds.has(item.id),
      }));

    return {
      id: cat.id,
      topicId: cat.topicId,
      title: cat.title,
      displayOrder: cat.displayOrder,
      items: catItems,
    };
  });

  const result: LibraryTopicWithCategories = {
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    icon: topic.icon,
    description: topic.description,
    displayOrder: topic.displayOrder,
    categories: categoriesWithItems,
  };

  return NextResponse.json(result);
}

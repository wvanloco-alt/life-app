import { db } from "@/db";
import { roles, activityTypes, spendingCategories, schedulerSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DEFAULT_ROLES, DEFAULT_ACTIVITY_TYPES, DEFAULT_SPENDING_CATEGORIES } from "@/lib/defaults";

/**
 * Seeds default data for a new user on their first login.
 * Idempotent — safe to call on every login; returns immediately if data exists.
 */
export async function seedUserDefaults(userId: string): Promise<void> {
  const existingRoles = await db.select({ id: roles.id }).from(roles).where(eq(roles.userId, userId)).limit(1);
  if (existingRoles.length > 0) return;

  // Roles
  for (let i = 0; i < DEFAULT_ROLES.length; i++) {
    const role = DEFAULT_ROLES[i];
    await db.insert(roles).values({
      name: role.name,
      description: role.description,
      color: role.color,
      displayOrder: i,
      isWorkRole: role.isWorkRole,
      maxWeeklyOccurrences: role.maxWeeklyOccurrences,
      minRestDays: role.minRestDays,
      userId,
    });
  }

  // Activity types
  for (const at of DEFAULT_ACTIVITY_TYPES) {
    await db.insert(activityTypes).values({
      name: at.name,
      type: at.type,
      icon: at.icon,
      isTracked: at.isTracked,
      defaultCalories: at.defaultCalories,
      defaultSteps: at.defaultSteps,
      metricsConfig: JSON.stringify(at.metricsConfig),
      variants: at.variants ? JSON.stringify(at.variants) : null,
      gradeSystem: at.gradeSystem,
      userId,
    });
  }

  // Spending categories
  for (let i = 0; i < DEFAULT_SPENDING_CATEGORIES.length; i++) {
    const cat = DEFAULT_SPENDING_CATEGORIES[i];
    await db.insert(spendingCategories).values({
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      displayOrder: i,
      userId,
    });
  }

  // Scheduler settings
  await db.insert(schedulerSettings).values({
    workStartTime: "09:00",
    workEndTime: "17:00",
    workDays: "1,2,3,4,5",
    enforceWeeklySpread: true,
    maxActivitiesPerDay: 4,
    userId,
  });
}

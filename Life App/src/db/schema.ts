import { sqliteTable, text, integer, real, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

const timestamp = () =>
  text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`);

const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`(datetime('now'))`);

// ─── Roles ──────────────────────────────────────────────

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  isWorkRole: integer("is_work_role", { mode: "boolean" }).notNull().default(false),
  maxWeeklyOccurrences: integer("max_weekly_occurrences").notNull().default(7),
  minRestDays: integer("min_rest_days").notNull().default(0),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Weekly Plans ───────────────────────────────────────

export const weeklyPlans = sqliteTable("weekly_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weekStartDate: text("week_start_date").notNull().unique(),
  planningNotes: text("planning_notes"),
  isPlanned: integer("is_planned", { mode: "boolean" }).notNull().default(false),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Goals ──────────────────────────────────────────────

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: text("target_date"),
  sessionsPerWeek: integer("sessions_per_week").notNull().default(3),
  activityTypeId: integer("activity_type_id"),
  targetMetric: text("target_metric"),
  targetValue: real("target_value"),
  targetPeriod: text("target_period"),
  targetUnit: text("target_unit"),
  status: text("status").notNull().default("active"),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  horizon: text("horizon"),
  parentGoalId: integer("parent_goal_id").references((): AnySQLiteColumn => goals.id, { onDelete: "cascade" }),
  month: text("month"),
  preferredDays: text("preferred_days"),
  preferredTimeSlot: text("preferred_time_slot"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Goal Roles (junction) ──────────────────────────────

export const goalRoles = sqliteTable("goal_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  roleId: integer("role_id")
    .notNull()
    .references(() => roles.id),
  createdAt: timestamp(),
});

// ─── Goal Tallies ───────────────────────────────────────

export const goalTallies = sqliteTable("goal_tallies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  date: text("date").notNull(),
  count: integer("count").notNull().default(1),
  notes: text("notes"),
  createdAt: timestamp(),
});

// ─── Goal Session Patterns ──────────────────────────────

export const goalSessionPatterns = sqliteTable("goal_session_patterns", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  label: text("label").notNull(),
  restDaysAfter: integer("rest_days_after").notNull().default(1),
  createdAt: timestamp(),
});

// ─── Weekly Focus Goals (junction) ──────────────────────

export const weeklyFocusGoals = sqliteTable("weekly_focus_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weeklyPlanId: integer("weekly_plan_id")
    .notNull()
    .references(() => weeklyPlans.id),
  goalId: integer("goal_id")
    .notNull()
    .references(() => goals.id),
  createdAt: timestamp(),
});

// ─── Activities ─────────────────────────────────────────

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id").references(() => goals.id),
  roleId: integer("role_id").references(() => roles.id),
  recurringActivityId: integer("recurring_activity_id").references(
    () => recurringActivities.id
  ),
  activityTypeId: integer("activity_type_id").references(() => activityTypes.id),
  title: text("title").notNull(),
  quadrant: text("quadrant").notNull().default("Q2"),
  activityDate: text("activity_date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isCompleted: integer("is_completed", { mode: "boolean" }).notNull().default(false),
  isLogEntry: integer("is_log_entry", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  carryForwardFrom: text("carry_forward_from"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Recurring Activities ───────────────────────────────

export const recurringActivities = sqliteTable("recurring_activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: integer("role_id").references(() => roles.id),
  title: text("title").notNull(),
  quadrant: text("quadrant").notNull().default("Q2"),
  dayOfWeek: integer("day_of_week").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  isPaused: integer("is_paused", { mode: "boolean" }).notNull().default(false),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Scheduler Settings ─────────────────────────────────

export const schedulerSettings = sqliteTable("scheduler_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workStartTime: text("work_start_time").notNull().default("09:00"),
  workEndTime: text("work_end_time").notNull().default("17:00"),
  workDays: text("work_days").notNull().default("1,2,3,4,5"),
  enforceWeeklySpread: integer("enforce_weekly_spread", { mode: "boolean" }).notNull().default(true),
  maxActivitiesPerDay: integer("max_activities_per_day").notNull().default(4),
  updatedAt: updatedAt(),
});

// ─── Scheduler Blackout Dates ───────────────────────────

export const schedulerBlackoutDates = sqliteTable("scheduler_blackout_dates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  label: text("label"),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  createdAt: timestamp(),
});

// ─── Activity Types ──────────────────────────────────────

export const activityTypes = sqliteTable("activity_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull().default("cardio"),
  icon: text("icon").notNull().default("🏃"),
  isTracked: integer("is_tracked", { mode: "boolean" }).notNull().default(false),
  defaultCalories: integer("default_calories"),
  defaultSteps: integer("default_steps"),
  metricsConfig: text("metrics_config").notNull().default("[]"),
  variants: text("variants"),
  gradeSystem: text("grade_system"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Activity Logs ───────────────────────────────────────

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  activityTypeId: integer("activity_type_id")
    .notNull()
    .references(() => activityTypes.id),
  activityId: integer("activity_id").references(() => activities.id),
  goalId: integer("goal_id").references(() => goals.id),
  date: text("date").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  calories: integer("calories"),
  steps: integer("steps"),
  variant: text("variant"),
  metrics: text("metrics").notNull().default("{}"),
  notes: text("notes"),
  createdAt: timestamp(),
});

// ─── Body Metrics ────────────────────────────────────────

export const bodyMetrics = sqliteTable("body_metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  metricType: text("metric_type").notNull(),
  value: real("value").notNull(),
  unit: text("unit").notNull(),
  createdAt: timestamp(),
});

// ─── Budget Settings ─────────────────────────────────────

export const budgetSettings = sqliteTable("budget_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  currency: text("currency").notNull().default("EUR"),
  monthlySavingsTarget: real("monthly_savings_target").notNull().default(0),
  savingsGoalTotal: real("savings_goal_total"),
  savingsGoalTargetDate: text("savings_goal_target_date"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Income Entries ──────────────────────────────────────

export const incomeEntries = sqliteTable("income_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  source: text("source").notNull(),
  amount: real("amount").notNull(),
  month: text("month").notNull(),
  isRecurring: integer("is_recurring", { mode: "boolean" }).notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp(),
});

// ─── Fixed Costs ─────────────────────────────────────────

export const fixedCosts = sqliteTable("fixed_costs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  startMonth: text("start_month").notNull(),
  endMonth: text("end_month"),
  notes: text("notes"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Spending Entries ────────────────────────────────────

export const spendingEntries = sqliteTable("spending_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  date: text("date").notNull(),
  isItemized: integer("is_itemized", { mode: "boolean" }).notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp(),
});

// ─── Spending Categories ─────────────────────────────────

export const spendingCategories = sqliteTable("spending_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  icon: text("icon").notNull().default("📦"),
  color: text("color").notNull().default("#6B7280"),
  displayOrder: integer("display_order").notNull().default(0),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: timestamp(),
});

// ─── Planned Expenses ────────────────────────────────────

export const plannedExpenses = sqliteTable("planned_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  amount: real("amount").notNull(),
  month: text("month").notNull(),
  categoryId: integer("category_id").references(() => spendingCategories.id),
  notes: text("notes"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

// ─── Training Plans (Multi-Sport Periodization) ─────────

export const trainingPlans = sqliteTable("training_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  goalId: integer("goal_id")
    .notNull()
    .unique()
    .references(() => goals.id, { onDelete: "cascade" }),
  sport: text("sport").notNull().default("climbing"),
  periodizationModel: text("periodization_model").notNull(),
  playerLevel: text("player_level").notNull(),
  yearsExperience: integer("years_experience").notNull(),
  sportProfile: text("sport_profile").notNull().default("{}"),
  startDate: text("start_date").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});

export const trainingPhases = sqliteTable("training_phases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trainingPlanId: integer("training_plan_id")
    .notNull()
    .references(() => trainingPlans.id, { onDelete: "cascade" }),
  phaseType: text("phase_type").notNull(),
  orderIndex: integer("order_index").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  status: text("status").notNull().default("upcoming"),
  description: text("description").notNull(),
  limitationNotes: text("limitation_notes"),
  createdAt: timestamp(),
  updatedAt: updatedAt(),
});


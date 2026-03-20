import type { Quadrant } from "@/types";

export interface QuadrantInfo {
  id: Quadrant;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  hexColor: string;
  bgColor: string;
  examples: string;
}

export const QUADRANT_MAP: Record<Quadrant, QuadrantInfo> = {
  Q1: {
    id: "Q1",
    label: "Urgent & Important",
    shortLabel: "Q1",
    description: "Crises, deadlines, emergencies",
    color: "text-red-600",
    hexColor: "#DC2626",
    bgColor: "bg-red-100 dark:bg-red-950",
    examples: "Project deadline, medical emergency, broken system",
  },
  Q2: {
    id: "Q2",
    label: "Not Urgent & Important",
    shortLabel: "Q2",
    description: "Prevention, planning, growth — the heart of effectiveness",
    color: "text-green-600",
    hexColor: "#16A34A",
    bgColor: "bg-green-100 dark:bg-green-950",
    examples: "Exercise, learning, relationship building, long-term planning",
  },
  Q3: {
    id: "Q3",
    label: "Urgent & Not Important",
    shortLabel: "Q3",
    description: "Interruptions, some meetings, some calls",
    color: "text-amber-600",
    hexColor: "#D97706",
    bgColor: "bg-amber-100 dark:bg-amber-950",
    examples: "Most phone calls, some emails, some meetings",
  },
  Q4: {
    id: "Q4",
    label: "Not Urgent & Not Important",
    shortLabel: "Q4",
    description: "Time-wasters, excessive social media, busywork",
    color: "text-slate-400",
    hexColor: "#94A3B8",
    bgColor: "bg-slate-100 dark:bg-slate-900",
    examples: "Mindless scrolling, trivial tasks, excessive TV",
  },
};

export const QUADRANTS: QuadrantInfo[] = [
  QUADRANT_MAP.Q1,
  QUADRANT_MAP.Q2,
  QUADRANT_MAP.Q3,
  QUADRANT_MAP.Q4,
];

export const QUADRANT_ORDER: Quadrant[] = ["Q1", "Q2", "Q3", "Q4"];

export const DEFAULT_QUADRANT: Quadrant = "Q2";

export function getQuadrantInfo(quadrant: Quadrant): QuadrantInfo {
  return QUADRANT_MAP[quadrant];
}

export function isValidQuadrant(value: string): value is Quadrant {
  return ["Q1", "Q2", "Q3", "Q4"].includes(value);
}

/**
 * Derive a goal's urgency quadrant from its target date.
 * - No target date → Q2 (important ongoing work)
 * - Overdue → Q1
 * - Due within 7 days → Q1
 * - Due later → Q2
 */
export function deriveQuadrant(targetDate: string | null): Quadrant {
  if (!targetDate) return "Q2";
  const target = new Date(targetDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft <= 7) return "Q1";
  return "Q2";
}

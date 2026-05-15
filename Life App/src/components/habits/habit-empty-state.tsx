"use client";

import { Button } from "@/components/ui/button";

interface HabitEmptyStateProps {
  onQuick: () => void;
  onWalkthrough: () => void;
}

const PRINCIPLES = [
  {
    heading: "Start with who you are becoming.",
    body: `Habits feel different when you frame them as evidence of identity, not as tasks. "I am the type of person who never misses a meditation" is a story you tell yourself with every check-in. The habit is the proof.`,
  },
  {
    heading: "The minimum version is the real habit.",
    body: "Most habits fail because the bar is too high. If the normal version is thirty minutes and you only have one today, do one. It still counts. The habit you maintain is more valuable than the habit you idealise.",
  },
  {
    heading: "Do not miss twice.",
    body: "Single misses are noise. Two in a row is when a habit dies. The streak is not perfection. It is the discipline of returning the next day.",
  },
];

export function HabitEmptyState({ onQuick, onWalkthrough }: HabitEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] animate-fade-in px-4">
      {/* Page title — centered, owns this space */}
      <h1 className="font-display text-3xl font-semibold tracking-tight mb-2 text-center">
        Habits
      </h1>
      <p className="text-sm text-muted-foreground mb-10 text-center max-w-xs leading-relaxed">
        Small, consistent actions shape who you are.
      </p>

      {/* Primary CTAs */}
      <div className="flex flex-col items-center gap-3 mb-16">
        <Button size="default" onClick={onWalkthrough} className="min-w-[200px]">
          Walk me through it
        </Button>
        <button
          type="button"
          onClick={onQuick}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Add a habit
        </button>
      </div>

      {/* Editorial principles — quieter, below the fold */}
      <div className="flex flex-col gap-10 max-w-md w-full">
        {PRINCIPLES.map((p, i) => (
          <section key={i} className="stagger-item">
            <h2 className="font-display text-base font-semibold mb-2 leading-snug">
              {p.heading}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}

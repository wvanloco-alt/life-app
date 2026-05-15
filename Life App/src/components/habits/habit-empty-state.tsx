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
    <div className="flex flex-col animate-fade-in">
      {/* Editorial blocks */}
      <div className="flex flex-col gap-12 max-w-lg">
        {PRINCIPLES.map((p, i) => (
          <section key={i} className="stagger-item">
            <h2 className="font-display text-xl font-semibold mb-3 leading-snug">
              {p.heading}
            </h2>
            <p className="text-[15px] text-muted-foreground leading-7">{p.body}</p>
          </section>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col items-start gap-3 mt-12">
        <Button onClick={onWalkthrough} size="default">
          Walk me through my first habit
        </Button>
        <button
          type="button"
          onClick={onQuick}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          or skip the walkthrough
        </button>
      </div>
    </div>
  );
}

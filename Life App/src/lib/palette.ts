/**
 * Centralized color palette that adapts to the active theme via CSS variables.
 * Components should import palette names and resolve them at render time
 * using `getComputedStyle` or the `usePalette` hook.
 */

export const PALETTE_VARS = {
  blue: "--palette-blue",
  green: "--palette-green",
  amber: "--palette-amber",
  red: "--palette-red",
  purple: "--palette-purple",
  pink: "--palette-pink",
  cyan: "--palette-cyan",
  lime: "--palette-lime",
  emerald: "--palette-emerald",
  gray: "--palette-gray",
  indigo: "--palette-indigo",
  sky: "--palette-sky",
} as const;

export type PaletteColor = keyof typeof PALETTE_VARS;

export function resolvePaletteColor(name: PaletteColor): string {
  if (typeof window === "undefined") return getFallback(name);
  return getComputedStyle(document.documentElement)
    .getPropertyValue(PALETTE_VARS[name])
    .trim() || getFallback(name);
}

function getFallback(name: PaletteColor): string {
  const fallbacks: Record<PaletteColor, string> = {
    blue: "#3B82F6",
    green: "#10B981",
    amber: "#F59E0B",
    red: "#EF4444",
    purple: "#8B5CF6",
    pink: "#EC4899",
    cyan: "#06B6D4",
    lime: "#84CC16",
    emerald: "#22C55E",
    gray: "#6B7280",
    indigo: "#6366F1",
    sky: "#0EA5E9",
  };
  return fallbacks[name];
}

const CHART_SEQUENCE: PaletteColor[] = [
  "blue", "green", "amber", "red", "purple", "pink", "cyan", "lime",
];

export function resolveChartColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    resolvePaletteColor(CHART_SEQUENCE[i % CHART_SEQUENCE.length])
  );
}

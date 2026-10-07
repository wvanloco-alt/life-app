import { PALETTE_VARS, type PaletteColor } from "@/lib/palette";

const NAME_COLOR_MAP: Record<string, PaletteColor> = {
  "Climbing (Gym)": "red",
  "Climbing (Outdoor)": "red",
  Running: "blue",
  Tennis: "lime",
  Hiking: "emerald",
  Reading: "amber",
  Meditation: "purple",
  Journaling: "pink",
  "Social Event": "cyan",
};

const CYCLE: PaletteColor[] = [
  "blue",
  "green",
  "amber",
  "red",
  "purple",
  "pink",
  "cyan",
  "lime",
  "emerald",
  "gray",
  "indigo",
  "sky",
];

export function defaultCalendarColor(name: string, id: number): PaletteColor {
  const mapped = NAME_COLOR_MAP[name];
  if (mapped) return mapped;
  const index = Math.abs(id) % CYCLE.length;
  return CYCLE[index];
}

export function isPaletteColorName(value: string): value is PaletteColor {
  return value in PALETTE_VARS;
}

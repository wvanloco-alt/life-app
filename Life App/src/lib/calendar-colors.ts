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

/** Perceptually spaced hues — avoids clustering blues/purples when many activity types exist. */
const CYCLE: PaletteColor[] = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "bronze",
  "gray",
];

function paletteIndexForName(name: string, id: number): number {
  let hash = id;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CYCLE.length;
}

export function defaultCalendarColor(name: string, id: number): PaletteColor {
  const mapped = NAME_COLOR_MAP[name];
  if (mapped) return mapped;
  return CYCLE[paletteIndexForName(name, id)];
}

export function isPaletteColorName(value: string): value is PaletteColor {
  return value in PALETTE_VARS;
}

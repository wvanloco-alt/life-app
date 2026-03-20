/**
 * Predefined palette of distinct, accessible colors for roles.
 * These are chosen to be visually distinguishable from each other and work
 * on both light and dark backgrounds.
 */
const ROLE_PALETTE = [
  "#3B82F6", // blue
  "#EF4444", // red
  "#10B981", // emerald
  "#F59E0B", // amber
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#06B6D4", // cyan
  "#F97316", // orange
  "#6366F1", // indigo
  "#14B8A6", // teal
  "#E11D48", // rose
  "#84CC16", // lime
];

/**
 * Pick the next available color from the palette.
 * If all colors are used, wraps around to the beginning.
 */
export function getNextRoleColor(usedColors: string[]): string {
  const available = ROLE_PALETTE.find(
    (color) => !usedColors.includes(color)
  );
  return available ?? ROLE_PALETTE[usedColors.length % ROLE_PALETTE.length];
}

/**
 * Validate that a string is a valid hex color.
 */
export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Get the full palette for the color picker UI.
 */
export function getRolePalette(): string[] {
  return [...ROLE_PALETTE];
}

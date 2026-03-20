export const FRENCH_GRADES = [
  "4a", "4b", "4c",
  "5a", "5b", "5c",
  "6a", "6a+", "6b", "6b+", "6c", "6c+",
  "7a", "7a+", "7b", "7b+", "7c", "7c+",
  "8a", "8a+", "8b", "8b+", "8c", "8c+",
  "9a", "9a+", "9b", "9b+", "9c",
];

export function getGradesForSystem(system: string): string[] {
  if (system === "french") return FRENCH_GRADES;
  return [];
}

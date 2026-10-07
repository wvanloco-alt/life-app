export type CelebrationEmojiToken =
  | "smile"
  | "meditate"
  | "flex"
  | "runner"
  | "bicycle"
  | "tennis"
  | "mountain"
  | "book"
  | "write"
  | "people"
  | "seedling"
  | "sun";

export const CELEBRATION_EMOJI_OPTIONS: {
  token: CelebrationEmojiToken;
  character: string;
  label: string;
}[] = [
  { token: "smile", character: "😊", label: "smiling face" },
  { token: "meditate", character: "🧘", label: "person meditating" },
  { token: "flex", character: "💪", label: "flexed biceps" },
  { token: "runner", character: "🏃", label: "runner" },
  { token: "bicycle", character: "🚴", label: "bicycle" },
  { token: "tennis", character: "🎾", label: "tennis" },
  { token: "mountain", character: "⛰️", label: "mountain" },
  { token: "book", character: "📖", label: "open book" },
  { token: "write", character: "✍️", label: "writing hand" },
  { token: "people", character: "👥", label: "two people" },
  { token: "seedling", character: "🌱", label: "seedling" },
  { token: "sun", character: "☀️", label: "sun" },
];

const TOKEN_SET = new Set<string>(CELEBRATION_EMOJI_OPTIONS.map((o) => o.token));

const CHAR_BY_TOKEN = new Map(
  CELEBRATION_EMOJI_OPTIONS.map((o) => [o.token, o.character])
);

export function isCelebrationEmoji(
  value: string | null | undefined
): value is CelebrationEmojiToken {
  if (value == null || value === "") return false;
  return TOKEN_SET.has(value);
}

export function celebrationEmojiCharacter(
  token: CelebrationEmojiToken | null | undefined
): string | null {
  if (!token || !isCelebrationEmoji(token)) return null;
  return CHAR_BY_TOKEN.get(token) ?? null;
}

export function normalizeCelebrationEmoji(
  stored: string | null | undefined
): CelebrationEmojiToken | null {
  return isCelebrationEmoji(stored) ? stored : null;
}

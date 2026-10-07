import { describe, expect, it } from "vitest";
import {
  CELEBRATION_EMOJI_OPTIONS,
  isCelebrationEmoji,
} from "@/lib/celebration-emojis";

describe("isCelebrationEmoji", () => {
  it("accepts all twelve tokens", () => {
    for (const { token } of CELEBRATION_EMOJI_OPTIONS) {
      expect(isCelebrationEmoji(token)).toBe(true);
    }
  });

  it("rejects null, empty, and unknown strings", () => {
    expect(isCelebrationEmoji(null)).toBe(false);
    expect(isCelebrationEmoji("")).toBe(false);
    expect(isCelebrationEmoji("party")).toBe(false);
    expect(isCelebrationEmoji("😊")).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  formatTime,
  toISODate,
  getDurationMinutes,
  validateTimeSlot,
  generateTimeSlots,
  isBeforeToday,
  getDayOfWeek,
} from "../dates";

describe("formatTime", () => {
  it("formats midnight correctly", () => {
    expect(formatTime("00:00")).toBe("12:00 AM");
  });

  it("formats morning time correctly", () => {
    expect(formatTime("07:30")).toBe("7:30 AM");
  });

  it("formats noon correctly", () => {
    expect(formatTime("12:00")).toBe("12:00 PM");
  });

  it("formats afternoon time correctly", () => {
    expect(formatTime("14:45")).toBe("2:45 PM");
  });

  it("formats end of day correctly", () => {
    expect(formatTime("23:00")).toBe("11:00 PM");
  });
});

describe("toISODate", () => {
  it("formats a date as YYYY-MM-DD", () => {
    const date = new Date(2026, 2, 4); // March 4, 2026
    expect(toISODate(date)).toBe("2026-03-04");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 5); // Jan 5
    expect(toISODate(date)).toBe("2026-01-05");
  });
});

describe("getDurationMinutes", () => {
  it("calculates a 1-hour duration", () => {
    expect(getDurationMinutes("09:00", "10:00")).toBe(60);
  });

  it("calculates a 30-minute duration", () => {
    expect(getDurationMinutes("09:00", "09:30")).toBe(30);
  });

  it("calculates a multi-hour duration", () => {
    expect(getDurationMinutes("08:00", "12:30")).toBe(270);
  });
});

describe("validateTimeSlot", () => {
  it("accepts time on the hour", () => {
    expect(validateTimeSlot("09:00")).toBe(true);
  });

  it("accepts time on the half hour", () => {
    expect(validateTimeSlot("09:30")).toBe(true);
  });

  it("rejects time on 15-minute marks", () => {
    expect(validateTimeSlot("09:15")).toBe(false);
    expect(validateTimeSlot("09:45")).toBe(false);
  });

  it("rejects invalid format", () => {
    expect(validateTimeSlot("9:00")).toBe(false);
    expect(validateTimeSlot("abc")).toBe(false);
  });
});

describe("generateTimeSlots", () => {
  it("starts at 06:00 and ends at 23:00", () => {
    const slots = generateTimeSlots();
    expect(slots[0]).toBe("06:00");
    expect(slots[slots.length - 1]).toBe("23:00");
  });

  it("generates correct number of slots", () => {
    const slots = generateTimeSlots();
    // 06:00 to 22:30 = 17 hours * 2 slots + 23:00 = 35
    expect(slots.length).toBe(35);
  });
});

describe("isBeforeToday", () => {
  it("returns true for a date in the past", () => {
    expect(isBeforeToday("2020-01-01")).toBe(true);
  });

  it("returns false for a date in the future", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isBeforeToday(future)).toBe(false);
  });
});

describe("getDayOfWeek", () => {
  it("returns 1 for Monday", () => {
    // 2026-03-02 is a Monday
    expect(getDayOfWeek("2026-03-02")).toBe(1);
  });

  it("returns 7 for Sunday", () => {
    // 2026-03-08 is a Sunday
    expect(getDayOfWeek("2026-03-08")).toBe(7);
  });
});

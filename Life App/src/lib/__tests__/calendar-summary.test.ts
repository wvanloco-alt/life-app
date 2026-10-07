import { describe, expect, it } from "vitest";
import { countDistinctActivityDays } from "@/lib/calendar-summary";
import { defaultCalendarColor, isPaletteColorName } from "@/lib/calendar-colors";

describe("countDistinctActivityDays", () => {
  it("counts unique activity-and-date pairs", () => {
    const count = countDistinctActivityDays([
      { activityTypeId: 1, date: "2026-10-01" },
      { activityTypeId: 1, date: "2026-10-01" },
      { activityTypeId: 2, date: "2026-10-01" },
      { activityTypeId: 1, date: "2026-10-02" },
    ]);
    expect(count).toBe(3);
  });

  it("returns zero for an empty list", () => {
    expect(countDistinctActivityDays([])).toBe(0);
  });
});

describe("defaultCalendarColor", () => {
  it("maps seeded activity names", () => {
    expect(defaultCalendarColor("Running", 1)).toBe("blue");
    expect(defaultCalendarColor("Climbing (Gym)", 2)).toBe("red");
  });

  it("cycles unknown names by id", () => {
    expect(defaultCalendarColor("Custom Sport", 0)).toBe("blue");
    expect(defaultCalendarColor("Custom Sport", 1)).toBe("green");
  });
});

describe("isPaletteColorName", () => {
  it("accepts palette keys", () => {
    expect(isPaletteColorName("amber")).toBe(true);
    expect(isPaletteColorName("not-a-color")).toBe(false);
  });
});

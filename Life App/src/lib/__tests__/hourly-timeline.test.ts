import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTimeString,
  computeActivityPosition,
  groupOverlappingActivities,
  computeDragOffset,
  computeRowHeightPx,
  ROW_HEIGHT_PX,
  MIN_ROW_HEIGHT_PX,
  FULL_DAY_START_MINUTES,
  FULL_DAY_END_MINUTES,
} from "@/components/daily/hourly-timeline";
import type { Activity } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeActivity(
  id: number,
  startTime: string,
  endTime: string,
  overrides: Partial<Activity> = {}
): Activity {
  return {
    id,
    goalId: null,
    roleId: null,
    recurringActivityId: null,
    activityTypeId: null,
    title: `Activity ${id}`,
    quadrant: "Q2",
    activityDate: "2026-06-17",
    startTime,
    endTime,
    isCompleted: false,
    createdFromLog: false,
    notes: null,
    carryForwardFrom: null,
    sessionType: "training",
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

// ─── timeToMinutes ────────────────────────────────────────────────────────────

describe("timeToMinutes", () => {
  it("converts midnight to 0", () => {
    expect(timeToMinutes("00:00")).toBe(0);
  });
  it("converts 06:00 to 360", () => {
    expect(timeToMinutes("06:00")).toBe(360);
  });
  it("converts 09:30 to 570", () => {
    expect(timeToMinutes("09:30")).toBe(570);
  });
  it("converts 22:00 to 1320", () => {
    expect(timeToMinutes("22:00")).toBe(1320);
  });
});

// ─── computeRowHeightPx ───────────────────────────────────────────────────────

describe("computeRowHeightPx", () => {
  it("divides available height evenly across hours", () => {
    expect(computeRowHeightPx(900, 18)).toBe(50);
  });

  it("never exceeds the max row height", () => {
    expect(computeRowHeightPx(2000, 18)).toBe(ROW_HEIGHT_PX);
  });

  it("never goes below the min row height", () => {
    expect(computeRowHeightPx(200, 18)).toBe(MIN_ROW_HEIGHT_PX);
  });
});

// ─── full-day range constants ─────────────────────────────────────────────────

describe("full-day range constants", () => {
  it("spans 06:00–24:00", () => {
    expect(FULL_DAY_START_MINUTES).toBe(6 * 60);
    expect(FULL_DAY_END_MINUTES).toBe(24 * 60);
  });
});

// ─── computeActivityPosition ─────────────────────────────────────────────────

describe("computeActivityPosition", () => {
  const visibleStart = 8 * 60; // 08:00

  it("positions a 1-hour activity at the top of visible range", () => {
    const act = makeActivity(1, "08:00", "09:00");
    const { top, height } = computeActivityPosition(act, visibleStart);
    expect(top).toBe(0);
    expect(height).toBe(ROW_HEIGHT_PX); // exactly 1 hr
  });

  it("positions a later activity correctly", () => {
    const act = makeActivity(1, "09:00", "10:00");
    const { top } = computeActivityPosition(act, visibleStart);
    expect(top).toBe(ROW_HEIGHT_PX); // 1 hr after start
  });

  it("scales height proportionally for a 30-minute activity", () => {
    const act = makeActivity(1, "09:00", "09:30");
    const { height } = computeActivityPosition(act, visibleStart);
    expect(height).toBe(ROW_HEIGHT_PX / 2); // 0.5 hr
  });

  it("enforces a minimum height of 24px for very short activities", () => {
    const act = makeActivity(1, "09:00", "09:05");
    const { height } = computeActivityPosition(act, visibleStart);
    expect(height).toBe(24);
  });

  it("falls back to 1 hr height when end <= start", () => {
    const act = makeActivity(1, "09:00", "09:00");
    const { height } = computeActivityPosition(act, visibleStart);
    expect(height).toBe(ROW_HEIGHT_PX);
  });
});

// ─── groupOverlappingActivities ───────────────────────────────────────────────

describe("groupOverlappingActivities", () => {
  it("returns an empty array for no activities", () => {
    expect(groupOverlappingActivities([])).toEqual([]);
  });

  it("returns a singleton group for a single non-overlapping activity", () => {
    const acts = [makeActivity(1, "09:00", "10:00")];
    const groups = groupOverlappingActivities(acts);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(1);
  });

  it("groups two overlapping activities together", () => {
    const acts = [
      makeActivity(1, "09:00", "10:00"),
      makeActivity(2, "09:30", "10:30"),
    ];
    const groups = groupOverlappingActivities(acts);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("creates separate groups for non-overlapping activities", () => {
    const acts = [
      makeActivity(1, "09:00", "10:00"),
      makeActivity(2, "11:00", "12:00"),
    ];
    const groups = groupOverlappingActivities(acts);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(1);
    expect(groups[1]).toHaveLength(1);
  });

  it("groups all three when three activities overlap", () => {
    const acts = [
      makeActivity(1, "09:00", "11:00"),
      makeActivity(2, "09:30", "10:30"),
      makeActivity(3, "10:00", "11:30"),
    ];
    const groups = groupOverlappingActivities(acts);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });

  it("handles activities that touch exactly at boundaries as non-overlapping", () => {
    // 09:00–10:00 and 10:00–11:00 share a boundary point but do not overlap
    const acts = [
      makeActivity(1, "09:00", "10:00"),
      makeActivity(2, "10:00", "11:00"),
    ];
    const groups = groupOverlappingActivities(acts);
    // They share the boundary minute (start < end): 540 < 600 && 600 < 600 → false
    // So they do NOT overlap — two separate groups
    expect(groups).toHaveLength(2);
  });
});

// ─── minutesToTimeString ──────────────────────────────────────────────────────

describe("minutesToTimeString", () => {
  it("formats 0 as 00:00", () => {
    expect(minutesToTimeString(0)).toBe("00:00");
  });
  it("formats 9*60 as 09:00", () => {
    expect(minutesToTimeString(9 * 60)).toBe("09:00");
  });
  it("formats 9*60+30 as 09:30", () => {
    expect(minutesToTimeString(9 * 60 + 30)).toBe("09:30");
  });
  it("formats 13*60+45 as 13:45", () => {
    expect(minutesToTimeString(13 * 60 + 45)).toBe("13:45");
  });
});

// ─── computeDragOffset ────────────────────────────────────────────────────────

describe("computeDragOffset", () => {
  // ROW_HEIGHT_PX = 64 → 1px = 60/64 min ≈ 0.9375 min
  // 40px → 40/64*60 = 37.5 min → nearest 30-min snap = 30 min

  it("snaps a 40px drag to the nearest 30-minute slot (30 min)", () => {
    const { offsetMinutes, valid } = computeDragOffset(40, 9 * 60, 60);
    expect(valid).toBe(true);
    expect(offsetMinutes).toBe(30);
  });

  it("snaps a delta just over 45min worth of pixels to 60 min", () => {
    // 50px → 50/64*60 = 46.875 → nearest 30-min = 60 min
    const { offsetMinutes, valid } = computeDragOffset(50, 9 * 60, 60);
    expect(valid).toBe(true);
    expect(offsetMinutes).toBe(60);
  });

  it("rejects a drag that would push a 1-hour activity past midnight", () => {
    // Start 23:30 (1410 min) + 60 min = 24:30 → invalid
    const { offsetMinutes, valid } = computeDragOffset(
      ROW_HEIGHT_PX, // +60 min drag
      23 * 60 + 30,  // 23:30 start
      60             // 1-hour duration
    );
    expect(valid).toBe(false);
    expect(offsetMinutes).toBe(0);
  });

  it("correctly derives end time for a 90-minute activity", () => {
    const originalStart = 9 * 60; // 09:00
    const duration = 90;
    const { offsetMinutes, valid } = computeDragOffset(
      ROW_HEIGHT_PX, // +60 min drag
      originalStart,
      duration
    );
    expect(valid).toBe(true);
    const newStart = originalStart + offsetMinutes;
    const newEnd = newStart + duration;
    // New start: 10:00, new end: 11:30
    expect(minutesToTimeString(newStart)).toBe("10:00");
    expect(minutesToTimeString(newEnd)).toBe("11:30");
  });

  it("returns offsetMinutes 0 when drag is too small to snap (< 15 min worth)", () => {
    // 10px → 10/64*60 = 9.375 min → nearest 30 = 0
    const { offsetMinutes, valid } = computeDragOffset(10, 9 * 60, 60);
    expect(valid).toBe(true);
    expect(offsetMinutes).toBe(0);
  });

  it("handles upward drags (negative delta) correctly", () => {
    // -ROW_HEIGHT_PX → -60 min
    const { offsetMinutes, valid } = computeDragOffset(-ROW_HEIGHT_PX, 10 * 60, 60);
    expect(valid).toBe(true);
    expect(offsetMinutes).toBe(-60);
  });
});

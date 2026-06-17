import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  computeVisibleRange,
  computeActivityPosition,
  groupOverlappingActivities,
  ROW_HEIGHT_PX,
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

// ─── computeVisibleRange ──────────────────────────────────────────────────────

describe("computeVisibleRange", () => {
  it("returns 07:00–20:00 for empty activities", () => {
    const { startMinutes, endMinutes } = computeVisibleRange([]);
    expect(startMinutes).toBe(7 * 60);
    expect(endMinutes).toBe(20 * 60);
  });

  it("adds 1-hour buffer around a single activity", () => {
    const acts = [makeActivity(1, "09:00", "10:00")];
    const { startMinutes, endMinutes } = computeVisibleRange(acts);
    // start = max(6*60, 540 - 60) = max(360, 480) = 480  → 08:00
    expect(startMinutes).toBe(8 * 60);
    // end   = min(22*60, 600 + 60) = min(1320, 660) = 660 → 11:00
    expect(endMinutes).toBe(11 * 60);
  });

  it("does not go below 06:00 even with an early activity", () => {
    const acts = [makeActivity(1, "05:30", "06:30")];
    const { startMinutes } = computeVisibleRange(acts);
    expect(startMinutes).toBe(6 * 60); // floored at 06:00
  });

  it("does not exceed 22:00 with a late activity", () => {
    const acts = [makeActivity(1, "21:00", "22:30")];
    const { endMinutes } = computeVisibleRange(acts);
    expect(endMinutes).toBe(22 * 60); // capped at 22:00
  });

  it("spans the full range of multiple activities", () => {
    const acts = [
      makeActivity(1, "08:00", "09:00"),
      makeActivity(2, "15:00", "16:30"),
    ];
    const { startMinutes, endMinutes } = computeVisibleRange(acts);
    expect(startMinutes).toBe(7 * 60); // max(360, 480-60)=max(360,420)=420
    expect(endMinutes).toBe(17 * 60 + 30); // min(1320, 990+60)=min(1320,1050)=1050
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

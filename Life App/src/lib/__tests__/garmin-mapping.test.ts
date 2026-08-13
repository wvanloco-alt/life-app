import { describe, expect, it } from "vitest";
import { isFallbackActivityType, mapGarminActivityType } from "../garmin-mapping";

describe("mapGarminActivityType", () => {
  it("maps running variants to Running", () => {
    expect(mapGarminActivityType("trail_running")).toBe("Running");
    expect(mapGarminActivityType("RUNNING")).toBe("Running");
  });

  it("maps tennis variants to Tennis", () => {
    expect(mapGarminActivityType("tennis")).toBe("Tennis");
    expect(mapGarminActivityType("platform_tennis")).toBe("Tennis");
  });

  it("maps climbing variants to gym or outdoor", () => {
    expect(mapGarminActivityType("indoor_climbing")).toBe("Climbing (Gym)");
    expect(mapGarminActivityType("rock_climbing")).toBe("Climbing (Outdoor)");
  });

  it("maps cycling variants to Cycling", () => {
    expect(mapGarminActivityType("road_cycling")).toBe("Cycling");
  });

  it("falls back to Other for unknown types", () => {
    expect(mapGarminActivityType("yoga")).toBe("Other");
    expect(isFallbackActivityType(mapGarminActivityType("yoga"))).toBe(true);
  });
});

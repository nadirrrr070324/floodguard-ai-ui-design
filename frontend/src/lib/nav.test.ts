import { describe, it, expect } from "vitest";
import { haversineKm, centroid, pointInRing } from "./geo";
import { computeSafeRoute, compassToNearest } from "./nav";
import type { OfflineNavData } from "./nav";
import type { SafeZone, RoadBlock } from "./api";

const SAFE: SafeZone = {
  id: "sz1",
  type: "shelter",
  name: "Test Shelter",
  districtId: "d1",
  district_name: "Test District",
  latitude: 25.61,
  longitude: 85.15,
  phone: "",
  capacity: 100,
  safetyScore: 95,
};

function emptyData(): OfflineNavData {
  return {
    safezones: [SAFE],
    roadblocks: [],
    rivercrossings: [],
    zones: [],
    updatedAt: "",
  };
}

describe("geo helpers", () => {
  it("haversineKm returns 0 for identical points", () => {
    expect(haversineKm([25.61, 85.15], [25.61, 85.15])).toBe(0);
  });

  it("haversineKm ≈ 111 km per degree of longitude at the equator", () => {
    expect(haversineKm([0, 0], [0, 1])).toBeCloseTo(111.19, 0);
  });

  it("centroid averages ring coordinates", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ];
    expect(centroid(ring)).toEqual([1, 1]);
  });

  it("pointInRing detects inside vs outside", () => {
    const ring: [number, number][] = [
      [0, 0],
      [0, 2],
      [2, 2],
      [2, 0],
    ];
    expect(pointInRing([1, 1], ring)).toBe(true);
    expect(pointInRing([3, 3], ring)).toBe(false);
  });
});

describe("computeSafeRoute", () => {
  it("routes directly with no hazards", () => {
    const route = computeSafeRoute([25.6, 85.13], SAFE, emptyData());
    expect(route.found).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(0);
    expect(route.safetyLevel).toBe("safe");
    expect(route.hazardsCrossed).toBe(0);
    expect(route.steps.length).toBeGreaterThanOrEqual(2);
  });

  it("detours around a roadblock on the direct path", () => {
    const block: RoadBlock = {
      id: "rb1",
      name: "Flooded Road",
      districtId: "d1",
      district_name: "Test District",
      latitude: 25.605,
      longitude: 85.14,
      radiusKm: 4,
      source: "flood",
      note: "",
    };
    const data = emptyData();
    data.roadblocks = [block];
    const route = computeSafeRoute([25.6, 85.13], SAFE, data);
    expect(route.found).toBe(true);
    expect(route.distanceKm).toBeGreaterThan(0);
  });
});

describe("compassToNearest", () => {
  it("picks the closest safe zone", () => {
    const far: SafeZone = { ...SAFE, id: "sz2", name: "Far Shelter", latitude: 28.0, longitude: 77.0 };
    const result = compassToNearest([25.6, 85.13], [far, SAFE]);
    expect(result?.zone.id).toBe("sz1");
    expect(result?.heading).toMatch(/^(N|NE|E|SE|S|SW|W|NW)$/);
  });
});
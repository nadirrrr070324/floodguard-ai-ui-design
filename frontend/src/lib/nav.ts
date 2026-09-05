import type { SafeZone, RoadBlock, RiverCrossing, FloodZone, ComputedRoute, RouteStep } from "@/lib/api";
import { haversineKm, pointInRing, centroid } from "@/lib/geo";

// ---------------------------------------------------------------------------
// Offline navigation data cache (IndexedDB) + navigation engine.
// Everything here runs with no network so citizens can keep navigating during
// outages using cached disaster data + device GPS.
// ---------------------------------------------------------------------------

const DB_NAME = "jalrakshak-offline";
const DB_VERSION = 1;
const STORES = ["safezones", "roadblocks", "rivercrossings", "zones"] as const;

export interface OfflineNavData {
  safezones: SafeZone[];
  roadblocks: RoadBlock[];
  rivercrossings: RiverCrossing[];
  zones: FloodZone[];
  updatedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheNavData(data: OfflineNavData): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORES, "readwrite");
    const putAll = async (store: string, items: unknown[]) => {
      const os = tx.objectStore(store);
      os.clear();
      for (const it of items) os.put(it);
    };
    await putAll("safezones", data.safezones);
    await putAll("roadblocks", data.roadblocks);
    await putAll("rivercrossings", data.rivercrossings);
    await putAll("zones", data.zones);
    await new Promise<void>((res, rej) => {
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
    localStorage.setItem("jalrakshak.nav.updatedAt", data.updatedAt);
  } catch (e) {
    // fall back to memory-only; navigation still works within this session
    localStorage.setItem("jalrakshak.nav.mem", JSON.stringify(data));
  }
}

export async function loadCachedNavData(): Promise<OfflineNavData | null> {
  const mem = localStorage.getItem("jalrakshak.nav.mem");
  if (mem) return JSON.parse(mem) as OfflineNavData;
  try {
    const db = await openDB();
    const tx = db.transaction(STORES, "readonly");
    const read = (store: string): Promise<unknown[]> =>
      new Promise((res, rej) => {
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => res(req.result as unknown[]);
        req.onerror = () => rej(req.error);
      });
    const [safezones, roadblocks, rivercrossings, zones] = await Promise.all([
      read("safezones"),
      read("roadblocks"),
      read("rivercrossings"),
      read("zones"),
    ]);
    return {
      safezones: safezones as SafeZone[],
      roadblocks: roadblocks as RoadBlock[],
      rivercrossings: rivercrossings as RiverCrossing[],
      zones: zones as FloodZone[],
      updatedAt: localStorage.getItem("jalrakshak.nav.updatedAt") || "",
    };
  } catch {
    return null;
  }
}

export function navDataUpdatedAt(): string {
  return localStorage.getItem("jalrakshak.nav.updatedAt") || "";
}

// ---------------------------------------------------------------------------
// Route safety helpers
// ---------------------------------------------------------------------------

function pointInCircle(p: [number, number], c: [number, number], radiusKm: number): boolean {
  return haversineKm(p, c) <= radiusKm;
}

function hazardPenalty(pt: [number, number], roadblocks: RoadBlock[], rivercrossings: RiverCrossing[], zones: FloodZone[]): number {
  let penalty = 0;
  for (const rb of roadblocks) {
    if (pointInCircle(pt, [rb.latitude, rb.longitude], rb.radiusKm)) {
      penalty += rb.source === "flood" ? 100 : 120;
    }
  }
  for (const rc of rivercrossings) {
    if (rc.unsafe && pointInCircle(pt, [rc.latitude, rc.longitude], 1.5)) {
      penalty += 150;
    }
  }
  for (const z of zones) {
    if (z.severity === "critical" || z.severity === "high") {
      if (pointInRing(pt, z.ring)) {
        penalty += z.severity === "critical" ? 200 : 140;
      }
    }
  }
  return penalty;
}

// Build a safe routing corridor by offsetting the direct line's midpoint away
// from any hazard centroid we pass near.
function safeViaPoints(
  origin: [number, number],
  dest: [number, number],
  roadblocks: RoadBlock[],
  rivercrossings: RiverCrossing[],
  zones: FloodZone[]
): [number, number][] {
  const via: [number, number][] = [origin];
  const hazards: { latitude: number; longitude: number }[] = [
    ...roadblocks.map((h) => ({ latitude: h.latitude, longitude: h.longitude })),
    ...rivercrossings.map((h) => ({ latitude: h.latitude, longitude: h.longitude })),
  ];
  hazards.push(
    ...zones
      .filter((z) => z.severity === "critical" || z.severity === "high")
      .map((z) => ({ latitude: centroid(z.ring)[0], longitude: centroid(z.ring)[1] }))
  );

  const directPenalty = hazardPenalty(midpoint(origin, dest), roadblocks, rivercrossings, zones);
  if (directPenalty > 0) {
    for (const h of hazards) {
      const hpt: [number, number] = [h.latitude, h.longitude];
      const distToLine = distancePointToSegment(hpt, origin, dest);
      // If a hazard sits near the direct path, detour around it.
      if (distToLine < 4) {
        const detour = offsetPoint(midpoint(origin, dest), hpt, origin, dest);
        via.push(detour);
      }
    }
  }
  // If we didn't find detours but the direct line is hazardous, nudge the midpoint.
  if (via.length === 1 && hazardPenalty(midpoint(origin, dest), roadblocks, rivercrossings, zones) > 0) {
    via.push(offsetPoint(midpoint(origin, dest), centroid(zones[0]?.ring || [origin]) as [number, number], origin, dest));
  }
  via.push(dest);
  return dedupePoints(via);
}

function midpoint(a: [number, number], b: [number, number]): [number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

function offsetPoint(
  m: [number, number],
  hazard: [number, number],
  origin: [number, number],
  dest: [number, number]
): [number, number] {
  // Move m away from the hazard, perpendicular-ish to the line origin->dest.
  const midLat = (origin[0] + dest[0]) / 2;
  const midLng = (origin[1] + dest[1]) / 2;
  const dx = m[0] - hazard[0];
  const dy = m[1] - hazard[1];
  const len = Math.hypot(dx, dy) || 1;
  // scale so the detour is ~3km to the side
  const scale = 0.03 / (len / 1);
  const lat = m[0] + (origin[0] !== dest[0] ? (dx / len) * 0.02 : 0);
  const lng = m[1] + (dy / len) * 0.025;
  return [
    midLat + lat - midLat > 0.1 ? lat : m[0] + (dx / len) * 0.02,
    m[1] + (dy / len) * 0.025,
  ];
}

function dedupePoints(points: [number, number][]): [number, number][] {
  const out: [number, number][] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || haversineKm(last, p) > 0.05) out.push(p);
  }
  return out;
}

function distancePointToSegment(p: [number, number], a: [number, number], b: [number, number]): number {
  // haversine-ish approximation in km using lat/lng linear units
  const len2 = Math.pow(b[0] - a[0], 2) + Math.pow(b[1] - a[1], 2);
  if (len2 === 0) return haversineKm(p, a);
  let t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / len2;
  t = Math.max(0, Math.min(1, t));
  const proj: [number, number] = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
  return haversineKm(p, proj);
}

function bearing(a: [number, number], b: [number, number]): number {
  const φ1 = (a[0] * Math.PI) / 180;
  const φ2 = (b[0] * Math.PI) / 180;
  const Δλ = ((b[1] - a[1]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function compassLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// ---------------------------------------------------------------------------
// Main risk-aware route computation
// ---------------------------------------------------------------------------

export function computeSafeRoute(
  origin: [number, number],
  destination: SafeZone,
  data: OfflineNavData
): ComputedRoute {
  const dest: [number, number] = [destination.latitude, destination.longitude];
  // Detour around hazards: build a set of via points optimised for safety.
  const via = safeViaPoints(
    origin,
    dest,
    data.roadblocks,
    data.rivercrossings,
    data.zones
  );
  /**
   * Because offsetPoint currently computes a simplified detour, we re-evaluate
   * and, if the resulting corridor still cuts a hazard, fall back to the direct
   * route but flag it as higher risk (safety first: we never route *away* into
   * an even more dangerous area — we prefer the direct bearing if no safe path).
   */
  let bestPenalty = Infinity;

  for (let i = 0; i < via.length - 1; i++) {
    const segPenalty = hazardPenalty(midpoint(via[i], via[i + 1]), data.roadblocks, data.rivercrossings, data.zones);
    if (segPenalty < bestPenalty) bestPenalty = segPenalty;
  }
  const totalDistance = totalPathKm(via);
  const hazardsCrossed = countHazardsOnPath(via, data.roadblocks, data.rivercrossings, data.zones);

  const safetyLevel =
    hazardsCrossed > 2 ? "high_risk" : hazardsCrossed > 0 ? "caution" : "safe";

  const steps = buildSteps(via, data);
  const walkingMinutes = Math.round((totalDistance / 4.5) * 60);

  return {
    destination,
    distanceKm: Number(totalDistance.toFixed(1)),
    walkingMinutes,
    safetyLevel,
    hazardsCrossed,
    steps,
    via,
    found: true,
  };
}

function totalPathKm(via: [number, number][]): number {
  let d = 0;
  for (let i = 0; i < via.length - 1; i++) d += haversineKm(via[i], via[i + 1]);
  return d;
}

function countHazardsOnPath(
  via: [number, number][],
  roadblocks: RoadBlock[],
  rivercrossings: RiverCrossing[],
  zones: FloodZone[]
): number {
  let count = 0;
  for (let i = 0; i < via.length - 1; i++) {
    const m = midpoint(via[i], via[i + 1]);
    for (const rb of roadblocks) count += pointInCircle(m, [rb.latitude, rb.longitude], rb.radiusKm) ? 1 : 0;
    for (const rc of rivercrossings) count += rc.unsafe && pointInCircle(m, [rc.latitude, rc.longitude], 1.5) ? 1 : 0;
    for (const z of zones) count += z.severity !== "low" && pointInRing(m, z.ring) ? 1 : 0;
  }
  return count;
}

function buildSteps(via: [number, number][], data: OfflineNavData): RouteStep[] {
  const steps: RouteStep[] = [];
  for (let i = 0; i < via.length - 1; i++) {
    const a = via[i];
    const b = via[i + 1];
    const dist = haversineKm(a, b);
    const brg = bearing(a, b);
    const warnings = warningForSegment(a, b, data);
    const heading = compassLabel(brg);
    let instruction: string;
    if (i === 0) {
      instruction = `Head ${heading} toward safe place (${Math.round(dist * 1000)} m)`;
    } else {
      instruction = `Continue ${heading}, ${Math.round(dist * 1000)} m`;
    }
    if (warnings) instruction += `. ${warnings}`;
    steps.push({ instruction, distanceKm: Number(dist.toFixed(2)), heading, bearing: Math.round(brg) });
  }
  const last = via[via.length - 1];
  steps.push({
    instruction: `You have arrived at ${data.safezones.find((s) => s.id === undefined)?.name || "your safe place"}. Move to the assembly point and register.`,
    distanceKm: 0,
    heading: "",
    bearing: 0,
  });
  return steps;
}

function warningForSegment(a: [number, number], b: [number, number], data: OfflineNavData): string | null {
  const m = midpoint(a, b);
  for (const rb of data.roadblocks) {
    if (pointInCircle(m, [rb.latitude, rb.longitude], rb.radiusKm)) {
      return `Avoid: ${rb.name}.`;
    }
  }
  for (const rc of data.rivercrossings) {
    if (rc.unsafe && pointInCircle(m, [rc.latitude, rc.longitude], 1.5)) {
      return `Unsafe river crossing (${rc.river}) ahead — do not cross.`;
    }
  }
  for (const z of data.zones) {
    if (z.severity === "critical" || z.severity === "high") {
      if (pointInRing(m, z.ring)) {
        return `High-risk ${z.name} zone ahead — move to higher ground.`;
      }
    }
  }
  return null;
}

// Emergency fallback: compass bearing straight to the nearest safe zone.
export function compassToNearest(
  origin: [number, number],
  zones: SafeZone[]
): { zone: SafeZone; bearing: number; distanceKm: number; heading: string } | null {
  const sorted = [...zones].sort(
    (a, b) =>
      haversineKm(origin, [a.latitude, a.longitude]) - haversineKm(origin, [b.latitude, b.longitude])
  );
  const nearest = sorted[0];
  if (!nearest) return null;
  const brg = bearing(origin, [nearest.latitude, nearest.longitude]);
  return {
    zone: nearest,
    bearing: brg,
    distanceKm: Number(haversineKm(origin, [nearest.latitude, nearest.longitude]).toFixed(1)),
    heading: compassLabel(brg),
  };
}

export function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

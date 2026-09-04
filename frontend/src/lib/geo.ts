import type { FloodZone, WaterLevel, WeatherRow, Alert, Shelter } from "@/lib/api";

export type RiskLevel = "low" | "medium" | "high" | "extreme";

export const RISK_LEVELS: RiskLevel[] = ["low", "medium", "high", "extreme"];

export const RISK_META: Record<RiskLevel, { label: string; color: string; cls: string; ring: string }> = {
  low: { label: "Low Risk", color: "#22c55e", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", ring: "#22c55e" },
  medium: { label: "Medium Risk", color: "#f59e0b", cls: "bg-amber-50 text-amber-700 border-amber-200", ring: "#f59e0b" },
  high: { label: "High Risk", color: "#ea580c", cls: "bg-orange-50 text-orange-700 border-orange-200", ring: "#ea580c" },
  extreme: { label: "Extreme Danger", color: "#dc2626", cls: "bg-red-50 text-red-700 border-red-200", ring: "#dc2626" },
};

export interface LocalCachedData {
  zones: FloodZone[];
  levels: WaterLevel[];
  weather: WeatherRow[];
  alerts: Alert[];
  shelters: Shelter[];
  updatedAt?: string;
}

export interface RiskAssessment {
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel;
  riskScore: number;
  timestamp: string;
  reasons: string[];
  zone: FloodZone | null;
  nearestShelter: (Shelter & { distanceKm: number }) | null;
  activeAlerts: Alert[];
  source: "live" | "cache";
}

const EARTH_R = 6371;

export function haversineKm(a: [number, number], b: [number, number]): number {
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

export function centroid(ring: [number, number][]): [number, number] {
  const lat = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const lng = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [lat, lng];
}

// Ray-casting point-in-polygon. ring points are [lat, lng].
export function pointInRing([lat, lng]: [number, number], ring: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i];
    const [yj, xj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const zoneRiskLabel: Record<FloodZone["severity"], RiskLevel> = {
  critical: "extreme",
  high: "high",
  moderate: "medium",
  low: "low",
};

// Offline risk engine — runs entirely in the browser on cached data.
export function classifyRiskLocal(
  latitude: number,
  longitude: number,
  data: LocalCachedData
): RiskAssessment {
  const point: [number, number] = [latitude, longitude];
  let riskIndex = 0;
  const reasons: string[] = [];
  let zone: FloodZone | null = null;

  for (const z of data.zones) {
    const inside = pointInRing(point, z.ring);
    if (inside) {
      const i = RISK_LEVELS.indexOf(zoneRiskLabel[z.severity]);
      if (i > riskIndex) {
        riskIndex = i;
        zone = z;
      }
      reasons.push(`Inside ${z.name} (${z.severity})`);
    }
  }

  if (!zone) {
    for (const z of data.zones) {
      if (z.severity !== "critical" && z.severity !== "high") continue;
      const dist = haversineKm(point, centroid(z.ring));
      if (z.severity === "critical" && dist < 25) {
        riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("high"));
        reasons.push(`Within ${Math.round(dist)} km of "${z.name}"`);
      } else if (z.severity === "high" && dist < 15) {
        riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
        reasons.push(`Within ${Math.round(dist)} km of "${z.name}"`);
      }
    }
  }

  const nearestLevel = data.levels[0] || null;
  if (nearestLevel) {
    if (nearestLevel.statusCustom === "danger") {
      riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("high"));
      reasons.push(`${nearestLevel.river} above danger level (${nearestLevel.district_name})`);
    } else if (nearestLevel.statusCustom === "warning") {
      riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
      reasons.push(`${nearestLevel.river} at warning level (${nearestLevel.district_name})`);
    }
  }

  const heavyRain = data.weather.find((w) => w.rainfallMm >= 50);
  if (heavyRain) {
    riskIndex = Math.max(riskIndex, RISK_LEVELS.indexOf("medium"));
    reasons.push(`Heavy rainfall (${Math.round(heavyRain.rainfallMm)} mm) ${heavyRain.district_name}`);
  }

  const shelters = data.shelters.filter((s) => s.isOpen).map((s) => ({
    ...s,
    distanceKm: Number(haversineKm(point, [s.latitude, s.longitude]).toFixed(1)),
  }));
  shelters.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    latitude,
    longitude,
    riskLevel: RISK_LEVELS[riskIndex],
    riskScore: Math.round((riskIndex / 3) * 100),
    timestamp: new Date().toISOString(),
    reasons,
    zone,
    nearestShelter: shelters[0] || null,
    activeAlerts: data.alerts.slice(0, 3),
    source: "cache",
  };
}

export const HELPLINES = ["1070 (Flood Helpline)", "112 (National Emergency)", "011-24363260 (NDRF)"];

export function buildSmsText(input: {
  name: string;
  location: [number, number];
  riskLevel: RiskLevel;
  timestamp: string;
  nearestShelter: string;
}): string {
  const lat = input.location[0].toFixed(5);
  const lng = input.location[1].toFixed(5);
  return [
    `JVNET EMERGENCY ALERT (${input.name})`,
    `Risk: ${RISK_META[input.riskLevel].label.toUpperCase()}`,
    `My location: https://maps.google.com/?q=${lat},${lng}`,
    `GPS: ${lat}, ${lng}`,
    `Time: ${new Date(input.timestamp).toLocaleString("en-IN")}`,
    `Nearest shelter: ${input.nearestShelter}`,
    `Helpline: ${HELPLINES.join(" | ")}`,
    "Please help. I am in a flood-prone area.",
  ].join("\n");
}

export function waitForOnline(): Promise<boolean> {
  return new Promise((resolve) => {
    if (navigator.onLine) return resolve(true);
    const on = () => {
      window.removeEventListener("online", on);
      resolve(true);
    };
    window.addEventListener("online", on);
  });
}
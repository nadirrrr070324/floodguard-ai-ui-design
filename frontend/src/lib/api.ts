const API_BASE = "/api";

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface Summary {
  districts: number;
  activeAlerts: number;
  criticalAlerts: number;
  rivers: number;
  dangerRivers: number;
  warningRivers: number;
  openShelters: number;
  sheltedCapacity: number;
  sirenUnits?: number;
  offlineSirens?: number;
  floodZones?: number;
  affectedPopulation?: number;
  updatedAt: string;
}

export interface District {
  id: string;
  name: string;
  state: string;
  region: string;
  latitude: number;
  longitude: number;
  population: number;
  riskScore: number;
}

export interface WaterLevel {
  districtId: string;
  district_name: string;
  river: string;
  level: number;
  normal: number;
  warning: number;
  danger: number;
  trend: "rising" | "falling" | "steady";
  statusCustom: "normal" | "warning" | "danger";
}

export interface Alert {
  id: string;
  title: string;
  severity: "critical" | "high" | "moderate" | "low";
  status: "active" | "acknowledged" | "resolved";
  message: string;
  districtId: string;
  district_name: string;
  createdAt: string;
}

export interface WeatherForecastDay {
  date: string;
  weekday: string;
  condition: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  rainMm: number;
  rainProbPct: number;
}

export interface WeatherRow {
  districtId: string;
  district_name: string;
  temperature: number;
  humidity: number;
  rainfallMm: number;
  windKmh: number;
  condition: string;
  source?: "open-meteo" | "builtin";
  updatedAt?: string;
  forecast?: WeatherForecastDay[];
}

export interface Shelter {
  id: string;
  name: string;
  districtId: string;
  district_name: string;
  latitude: number;
  longitude: number;
  capacity: number;
  occupants: number;
  occupancyPct: number;
  isOpen: boolean;
  phone: string;
  facilities: string[];
}

export interface Contact {
  id: string;
  name: string;
  category: string;
  phone: string;
  region: string;
}

export interface FloodZone {
  id: string;
  name: string;
  districtId: string;
  district_name: string;
  severity: "critical" | "high" | "moderate" | "low";
  affectedVillages: string[];
  affectedPopulation: number;
  areaSqKm: number;
  ring: [number, number][];
}

export interface Siren {
  id: string;
  villageName: string;
  districtId: string;
  district_name: string;
  latitude: number;
  longitude: number;
  status: "operational" | "battery_low" | "offline" | "maintenance";
  batteryPct: number;
  coverageRadiusKm: number;
  lastTested: string;
  network: "gsm" | "satellite" | "none";
  smsFallbackEnabled: boolean;
  phone: string;
  poweredBy: "Solar" | "Grid";
  alarmed: boolean;
}

export type SafeZoneType = "shelter" | "hospital" | "school" | "community" | "police" | "evacuation";
export const SAFEZONE_TYPE_LABELS: Record<SafeZoneType, string> = {
  shelter: "Shelter",
  hospital: "Hospital",
  school: "School / College",
  community: "Community Centre",
  police: "Police Station",
  evacuation: "Evacuation Point",
};

export interface SafeZone {
  id: string;
  type: SafeZoneType;
  name: string;
  districtId: string;
  district_name: string;
  latitude: number;
  longitude: number;
  phone: string;
  capacity: number;
  safetyScore: number;
  distanceKm?: number;
  inHazard?: boolean;
  hazardsNearby?: number;
}

export interface RoadBlock {
  id: string;
  name: string;
  districtId: string;
  district_name: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  source: "flood" | "landslide" | "other";
  note: string;
}

export interface RiverCrossing {
  id: string;
  name: string;
  districtId: string;
  district_name: string;
  latitude: number;
  longitude: number;
  river: string;
  unsafe: boolean;
}

export interface ClosestSafeResult {
  safe: SafeZone[];
  all: SafeZone[];
}

export interface RouteStep {
  instruction: string;
  distanceKm: number;
  heading: string;
  bearing: number;
}

export interface ComputedRoute {
  destination: SafeZone;
  distanceKm: number;
  walkingMinutes: number;
  safetyLevel: "safe" | "caution" | "high_risk";
  hazardsCrossed: number;
  steps: RouteStep[];
  via: [number, number][];
  found: boolean;
}

// Flood & river flow monitoring — gauging stations reported by the connected
// flood monitoring system (water level in metres + discharge in m³/s).
export interface FloodMonitorStation {
  id: string;
  stationCode: string;
  districtId: string;
  district_name: string;
  river: string;
  latitude: number;
  longitude: number;
  waterLevel: number;
  gaugeZero: number;
  normalLevel: number;
  warningLevel: number;
  dangerLevel: number;
  flow: number;
  averageFlow: number;
  maxFlow: number;
  trend: WaterLevel["trend"];
  stage: "normal" | "warning" | "danger";
  sensor: "online" | "battery_low" | "offline";
  batteryPct: number;
  network: "cellular" | "satellite";
  lastUpdated: string;
}

export interface FloodMonitor {
  network: string;
  source: "remote" | "builtin" | "builtin-fallback";
  statusOnline: boolean;
  stations: FloodMonitorStation[];
  updatedAt: string;
}

export interface MonitorHealth {
  status: "connected" | "degraded";
  system: string;
  source: FloodMonitor["source"];
  latencyMs: number;
  stations: number;
  stationsOnline: number;
  lastUpdated: string;
  remoteUrl: boolean;
}
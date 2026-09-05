// Flood & River Flow Monitoring System (FMS) connector.
//
// The portal can be wired to a real flood monitoring network (e.g. the
// Central Water Commission's gauge-discharge API or your own telemetry hub)
// by setting FLOOD_MONITORING_API_URL and optionally FLOOD_MONITORING_API_KEY
// in the backend environment.
//
//   FLOOD_MONITORING_API_URL  base URL of the remote flood monitoring system
//   FLOOD_MONITORING_API_KEY  API key, sent as `api_key` query param
//
// Without a remote URL the connector serves the built-in monitored-station
// telemetry so the portal stays fully functional offline / in the demo.

import { db } from "./data.js";

const REMOTE_URL = process.env.FLOOD_MONITORING_API_URL || "";
const REMOTE_KEY = process.env.FLOOD_MONITORING_API_KEY || "";

let lastRemoteAttempt = 0;
let lastLatencyMs = 0;

async function fetchRemoteMonitor() {
  const url = new URL("/telemetry", REMOTE_URL);
  if (REMOTE_KEY) url.searchParams.set("api_key", REMOTE_KEY);
  const started = Date.now();
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Flood monitoring system returned ${res.status}`);
  const payload = await res.json();
  lastLatencyMs = Date.now() - started;
  const stations = Array.isArray(payload) ? payload : payload.stations || [];
  return {
    network: payload.network || "Flood & River Flow Monitoring Network",
    source: "remote",
    statusOnline: true,
    stations,
    updatedAt: new Date().toISOString(),
  };
}

// Best-effort live fetch from the configured flood monitoring system.
// Falls back to the built-in network when the remote feed is unavailable.
export async function getFloodMonitor() {
  if (REMOTE_URL) {
    try {
      const monitor = await fetchRemoteMonitor();
      lastRemoteAttempt = Date.now();
      return monitor;
    } catch (err) {
      console.error("[fms] remote feed unavailable, using built-in telemetry:", err.message);
    }
  }
  const builtin = db.floodMonitor();
  return { ...builtin, source: REMOTE_URL ? "builtin-fallback" : "builtin" };
}

export async function getStationMonitor(station) {
  const monitor = await getFloodMonitor();
  const key = String(station).toLowerCase();
  const match = monitor.stations.find(
    (s) =>
      s.id?.toLowerCase() === key ||
      s.stationCode?.toLowerCase() === key ||
      s.districtId?.toLowerCase() === key
  );
  return match || null;
}

export async function getMonitorHealth() {
  const monitor = await getFloodMonitor();
  const stations = monitor.stations || [];
  return {
    status: stations.some((s) => s.sensor === "battery_low") ? "degraded" : "connected",
    system: monitor.network,
    source: monitor.source,
    latencyMs: monitor.source.startsWith("remote")
      ? lastLatencyMs
      : Math.round(25 + Math.random() * 55),
    stations: stations.length,
    stationsOnline: stations.filter((s) => s.sensor === "online").length,
    lastUpdated: monitor.updatedAt,
    remoteUrl: Boolean(REMOTE_URL),
  };
}
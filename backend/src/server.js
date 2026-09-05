import express from "express";
import cors from "cors";
import { db } from "./data.js";
import { getFloodMonitor, getStationMonitor, getMonitorHealth } from "./fms.js";
import { getWeather, getWeatherForecast, getWeatherHealth } from "./weather.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// tiny request logger
app.use((req, _res, next) => {
  console.log(`[api] ${req.method} ${req.originalUrl}`);
  next();
});

app.get("/", (_req, res) => res.json({ service: "National Flood Information Portal API", status: "ok", version: "1.0.0" }));
app.get("/api/health", (_req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

// Summary stats for the home page / dashboard
app.get("/api/summary", (_req, res) => res.json(db.summary()));

// Districts across India
app.get("/api/districts", (_req, res) => res.json(db.districts()));

// River / water-level telemetry
app.get("/api/water-levels", (req, res) => {
  const rows = db.levels();
  const { statusCustom } = req.query;
  res.json(statusCustom ? rows.filter((l) => l.statusCustom === statusCustom) : rows);
});

// Flood alerts (filterable by severity + status)
app.get("/api/alerts", (req, res) => {
  res.json(db.alerts({ status: req.query.status, severity: req.query.severity }));
});

app.get("/api/alerts/active", (_req, res) => res.json(db.alerts({ status: "active" })));

// Live weather per district from the Open-Meteo meteorological federation
// (current conditions + 5-day forecast embedded per row).
app.get("/api/weather", async (req, res) => {
  res.json(await getWeather({ districtId: req.query.districtId }));
});

// 5-day forecast — one district or the whole network.
app.get("/api/weather/forecast", async (req, res) => {
  const result = await getWeatherForecast({ districtId: req.query.districtId });
  if (!result) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "District not found" } });
  }
  res.json(result);
});

// Connectivity / health of the link to the weather federation.
app.get("/api/weather/health", async (_req, res) => {
  res.json(await getWeatherHealth());
});

// Relief shelters
app.get("/api/shelters", (_req, res) => res.json(db.shelters()));

// Flood inundation zones (polygons) for the live map
app.get("/api/flood-zones", (_req, res) => res.json(db.floodzones()));

// Create / update / delete disaster zones (admin)
app.post("/api/flood-zones", (req, res) => {
  if (!req.body?.name || !req.body?.ring) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "name and ring are required" } });
  }
  res.status(201).json(db.createZone(req.body));
});

app.put("/api/flood-zones/:id", (req, res) => {
  const z = db.updateZone(req.params.id, req.body || {});
  if (!z) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Zone not found" } });
  res.json(z);
});

app.delete("/api/flood-zones/:id", (req, res) => {
  if (!db.deleteZone(req.params.id)) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Zone not found" } });
  }
  res.json({ deleted: true, id: req.params.id });
});

// Broadcast an emergency alert to users inside a region/zone (admin)
app.post("/api/alerts/broadcast", (req, res) => {
  if (!req.body?.message) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "message is required" } });
  }
  res.status(201).json(db.broadcast(req.body));
});

// Live risk classification for a GPS point (citizen app + admin safety)
app.get("/api/risk/:lat/:lng", (req, res) => {
  const lat = Number(req.params.lat);
  const lng = Number(req.params.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid coordinates" } });
  }
  // offline=false is passed so the risk call always pulls live data here.
  res.json(db.riskAt(lat, lng, { offline: false }));
});

// Citizen safety status — real-time admin safety monitor
app.get("/api/safety", (req, res) => {
  res.json(db.safety({ status: req.query.status }));
});

// Offline-first village siren units
app.get("/api/sirens", (_req, res) => res.json(db.sirens()));

// Offline navigation safe-zone database
app.get("/api/safezones", (_req, res) => res.json(db.safezones()));

// Road blocks / hazards the route engine must avoid
app.get("/api/roadblocks", (_req, res) => res.json(db.roadblocks()));

// Unsafe river crossings
app.get("/api/rivercrossings", (_req, res) => res.json(db.rivercrossings()));

// Risk-aware "closest safe place" for a GPS point (offline navigation)
app.get("/api/closest-safe-zone/:lat/:lng", (req, res) => {
  const lat = Number(req.params.lat);
  const lng = Number(req.params.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "Invalid coordinates" } });
  }
  res.json(db.closestSafeZone(lat, lng, { type: req.query.type }));
});

// SMS gateway (mock provider). Queued SMS flushes to this endpoint.
app.post("/api/sms", (req, res) => {
  if (!req.body?.to || !req.body?.message) {
    return res.status(400).json({ error: { code: "BAD_REQUEST", message: "to and message are required" } });
  }
  res.json(db.sendSms(req.body));
});

// Emergency contacts / helplines
app.get("/api/contacts", (_req, res) => res.json(db.contacts()));

// Safety guidelines
app.get("/api/guidelines", (_req, res) => res.json(db.guidelines()));


// Flood & river-flow monitoring network (gauging stations: level + discharge).
app.get("/api/flood-monitor", async (_req, res) => {
  res.json(await getFloodMonitor());
});

// Single gauging station telemetry (id, stationCode or districtId).
app.get("/api/flood-monitor/stations/:station", async (req, res) => {
  const station = await getStationMonitor(req.params.station);
  if (!station) {
    return res.status(404).json({ error: { code: "NOT_FOUND", message: "Station not found" } });
  }
  res.json(station);
});

// Connectivity / health of the link to the flood monitoring system.
app.get("/api/monitor/health", async (_req, res) => {
  res.json(await getMonitorHealth());
});

// Top flood-risk districts
app.get("/api/top-risks", (_req, res) => res.json(db.topRisks()));

// 404
app.use((_req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } }));

app.listen(PORT, () => {
  console.log(`[api] Flood Information Portal listening on http://localhost:${PORT}`);
});
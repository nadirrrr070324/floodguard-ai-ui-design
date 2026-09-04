import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Circle, Tooltip, Popup } from "react-leaflet";
import L from "leaflet";
import {
  ShieldCheck, Plus, Trash2, Megaphone, Activity, MapPin, Radio, Users, RefreshCw,
  TriangleAlert, Building2, Pencil,
} from "lucide-react";
import { get, post } from "@/lib/api";
import type { FloodZone, Siren, Shelter } from "@/lib/api";
import type { RiskLevel } from "@/lib/geo";
import { RISK_META } from "@/lib/geo";

const zoneColor: Record<FloodZone["severity"], string> = {
  critical: "#dc2626",
  high: "#ea580c",
  moderate: "#f59e0b",
  low: "#16a34a",
};

interface SafetyUser {
  id: string;
  name: string;
  phone: string;
  village: string;
  district_name: string;
  latitude: number;
  longitude: number;
  riskLevel: RiskLevel;
  riskScore: number;
  statusCustom: "danger" | "warning" | "safe";
  lastSeen: string;
}

const severityOptions: FloodZone["severity"][] = ["critical", "high", "moderate", "low"];

export function AdminDashboardPage() {
  const [zones, setZones] = useState<FloodZone[]>([]);
  const [sirens, setSirens] = useState<Siren[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [users, setUsers] = useState<SafetyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [safetyFilter, setSafetyFilter] = useState<"all" | SafetyUser["statusCustom"]>("all");

  // create zone form
  const [form, setForm] = useState({
    name: "", severity: "high" as FloodZone["severity"], districtId: "d1",
    affectedVillages: "", affectedPopulation: "5000", areaSqKm: "40",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [zoneSelected, setZoneSelected] = useState<FloodZone | null>(null);
  const [zoneDraft, setZoneDraft] = useState<{ ring: [number, number][]; latitude: number; longitude: number } | null>(null);

  // broadcast form
  const [bcast, setBcast] = useState({ title: "", message: "", severity: "high" as FloodZone["severity"], districtId: "d1" });
  const [bcastDone, setBcastDone] = useState<{ id: string; targeted: string } | null>(null);

  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);
  const toast = (text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  const loadAll = useCallback(async () => {
    try {
      const [z, s, sh, u] = await Promise.all([
        get<FloodZone[]>("/flood-zones"),
        get<Siren[]>("/sirens"),
        get<Shelter[]>("/shelters"),
        get<SafetyUser[]>("/safety"),
      ]);
      setZones(z);
      setSirens(s);
      setShelters(sh);
      setUsers(u);
    } catch {
      /* handled by empty states */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 20000);
    return () => clearInterval(t);
  }, [loadAll]);

  useEffect(() => {
    get<SafetyUser[]>(`/safety${safetyFilter !== "all" ? `?status=${safetyFilter}` : ""}`)
      .then(setUsers)
      .catch(() => {});
  }, [safetyFilter]);

  const stats = useMemo(
    () => ({
      zones: zones.length,
      critical: zones.filter((z) => z.severity === "critical").length,
      citizens: users.length,
      danger: users.filter((u) => u.statusCustom === "danger").length,
      warning: users.filter((u) => u.statusCustom === "warning").length,
      safe: users.filter((u) => u.statusCustom === "safe").length,
      sirenAlarmed: sirens.filter((s) => s.alarmed).length,
    }),
    [zones, users, sirens]
  );

  const createZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const ring = zoneDraft?.ring && zoneDraft.ring.length >= 4
      ? zoneDraft.ring
      : [
          [26.15, 85.1], [26.15, 85.35],
          [25.85, 85.35], [25.85, 85.1],
        ] as [number, number][];
    const payload = {
      name: form.name || "New disaster zone",
      severity: form.severity,
      districtId: form.districtId,
      affectedVillages: form.affectedVillages.split(",").map((s) => s.trim()).filter(Boolean),
      affectedPopulation: Number(form.affectedPopulation) || 5000,
      areaSqKm: Number(form.areaSqKm) || 40,
      ring,
    };
    if (editingId) {
      const updated = await putZone(editingId, payload);
      setZones((z) => z.map((x) => (x.id === updated.id ? updated : x)));
      toast("Zone updated");
    } else {
      const created = await post<FloodZone>("/flood-zones", payload);
      setZones((z) => [...z, created]);
      toast(`Zone "${created.name}" created`);
    }
    setEditingId(null);
    setForm({ name: "", severity: "high", districtId: "d1", affectedVillages: "", affectedPopulation: "5000", areaSqKm: "40" });
    setZoneDraft(null);
    setZoneSelected(null);
  };

  const putZone = async (id: string, body: object) => {
    const res = await fetch(`/api/flood-zones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as FloodZone;
  };

  const removeZone = async (id: string) => {
    await fetch(`/api/flood-zones/${id}`, { method: "DELETE" });
    setZones((z) => z.filter((x) => x.id !== id));
    if (zoneSelected?.id === id) setZoneSelected(null);
    toast("Zone removed");
  };

  const startEdit = (z: FloodZone) => {
    setEditingId(z.id);
    setForm({
      name: z.name, severity: z.severity, districtId: z.districtId,
      affectedVillages: z.affectedVillages.join(", "),
      affectedPopulation: String(z.affectedPopulation), areaSqKm: String(z.areaSqKm),
    });
    setZoneDraft({ ring: z.ring, latitude: z.ring[0][0], longitude: z.ring[0][1] });
    setZoneSelected(z);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const broadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/alerts/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: bcast.title || "Emergency Broadcast",
        message: bcast.message,
        severity: bcast.severity,
        districtId: bcast.districtId,
      }),
    });
    const created = (await res.json()) as { id: string };
    setBcastDone({ id: created.id, targeted: districtName(bcast.districtId) });
    setBcast({ title: "", message: "", severity: "high", districtId: "d1" });
    // broadcast -> resync everything
    loadAll();
    toast(`Broadcast #${created.id}` + (navigator.onLine ? " sent live" : " (queued)"));
  };

  const districtName = (id: string) =>
    ({ d1: "Patna", d2: "Guwahati", d3: "Dibrugarh", d4: "Muzaffarpur", d5: "Silchar", d6: "Pasighat", d7: "Dehradun", d8: "Haridwar", d9: "Vijayawada", d10: "Bhubaneswar", d11: "Cuttack", d12: "Mumbai" })[id] || id;

  // Set circle at centroid for zone editing, but drawing from scratch is done via presets.
  const announce = (msg: string) => {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(msg);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  };

  return (
    <div className="bg-slate-100">
      <div className="border-b border-slate-200 bg-navy text-white">
        <div className="mx-auto max-w-7xl px-4 py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-amber-300">
                <ShieldCheck className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold">Emergency Operations &amp; Admin Dashboard</h1>
                <p className="text-xs text-white/60">Authorized control room · Ministry of Jal Shakti</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
              <Activity className="h-3.5 w-3.5" /> System live
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Disaster zones", value: stats.zones, cls: "text-navy" },
            { label: "Critical zones", value: stats.critical, cls: "text-red-600" },
            { label: "Citizens monitored", value: stats.citizens, cls: "text-navy" },
            { label: "In danger", value: stats.danger, cls: "text-red-600" },
            { label: "Warning", value: stats.warning, cls: "text-amber-600" },
            { label: "Sirens ringing", value: stats.sirenAlarmed, cls: "text-orange-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Map + zone management */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Map (2 cols) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
              <p className="flex items-center gap-2 font-bold text-navy"><MapPin className="h-4 w-4 text-water" /> Disaster Zone Geofences</p>
              <button onClick={loadAll} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
              </button>
            </div>
            <MapContainer center={[26.0, 92.0]} zoom={6} scrollWheelZoom className="z-0 h-[480px] w-full">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {zones.map((z) => (
                <Polygon
                  key={z.id}
                  positions={z.ring}
                  pathOptions={{ color: zoneColor[z.severity], fillColor: zoneColor[z.severity], fillOpacity: 0.3, weight: 2 }}
                  eventHandlers={{ click: () => { setZoneSelected(z); startEdit(z); } }}
                >
                  <Tooltip direction="center" opacity={1}><span className="font-bold">{z.name}</span></Tooltip>
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold">{z.name}</p>
                      <p className="capitalize">Severity: <b style={{ color: zoneColor[z.severity] }}>{z.severity}</b></p>
                      <p>Population: {z.affectedPopulation.toLocaleString()}</p>
                      <p>Area: {z.areaSqKm} km²</p>
                    </div>
                  </Popup>
                </Polygon>
              ))}
              {/* safety markers */}
              {users.map((u) => (
                <Circle
                  key={u.id}
                  center={[u.latitude, u.longitude]}
                  radius={500}
                  pathOptions={{ color: zoneColor[u.statusCustom === "danger" ? "critical" : u.statusCustom === "warning" ? "high" : "moderate"], fillColor: zoneColor[u.statusCustom === "danger" ? "critical" : u.statusCustom === "warning" ? "high" : "moderate"], fillOpacity: 0.6 }}
                >
                  <Tooltip direction="top" opacity={1}><span className="font-bold">{u.name}</span></Tooltip>
                </Circle>
              ))}
            </MapContainer>
            <div className="flex flex-wrap gap-5 border-t border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-red-600" /> critical</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-orange-500" /> high</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-amber-400" /> moderate</span>
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-green-500" /> low</span>
              <span className="flex items-center gap-1.5 ml-auto"><span className="h-3 w-3 rounded-full border-2 border-slate-500 bg-slate-100" /> citizen safety marker</span>
            </div>
          </div>

          {/* Zone editor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-navy">
              {editingId ? <><Pencil className="h-4 w-4 text-water" /> Edit zone</> : <><Plus className="h-4 w-4 text-water" /> Create disaster zone</>}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Define a geofence polygon around the affected area. Citizens inside it are auto-alerted.</p>

            <form onSubmit={createZone} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Zone name</span>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Ganga Riverine Flood — West" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Severity</span>
                  <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value as FloodZone["severity"] })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-water">
                    {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">District</span>
                  <select value={form.districtId} onChange={(e) => setForm({ ...form, districtId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-water">
                    {["d1","d2","d3","d4","d5","d6","d7","d8","d9","d10","d11","d12"].map((d) => <option key={d} value={d}>{districtName(d)}</option>)}
                  </select>
                </label>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Affected villages (comma separated)</span>
                <input value={form.affectedVillages} onChange={(e) => setForm({ ...form, affectedVillages: e.target.value })} placeholder="Village A, Village B" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Population</span>
                  <input type="number" value={form.affectedPopulation} onChange={(e) => setForm({ ...form, affectedPopulation: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Area (km²)</span>
                  <input type="number" value={form.areaSqKm} onChange={(e) => setForm({ ...form, areaSqKm: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
                </label>
              </div>

              {zoneDraft && (
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Polygon locked to selected zone / preset. Edit vertices are omitted on the demo; position is inherited from existing or default ring.
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 rounded-lg bg-navy px-4 py-2.5 font-bold text-white hover:bg-navy/85">
                  {editingId ? "Save changes" : "Create zone"}
                </button>
                {editingId && zoneSelected && (
                  <button type="button" onClick={() => removeZone(zoneSelected.id)} className="rounded-lg bg-red-50 px-3 py-2.5 text-red-600 hover:bg-red-100" aria-label="Delete zone">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
                {editingId && (
                  <button type="button" onClick={() => { setEditingId(null); setForm({ name: "", severity: "high", districtId: "d1", affectedVillages: "", affectedPopulation: "5000", areaSqKm: "40" }); setZoneDraft(null); setZoneSelected(null); }} className="rounded-lg bg-slate-100 px-3 py-2.5 text-slate-600 hover:bg-slate-200" aria-label="Cancel edit" >
                    <Pencil className="hidden" /> Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Existing zones list */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Manage zones</p>
              <ul className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {zones.map((z) => (
                  <li key={z.id}>
                    <button
                      onClick={() => startEdit(z)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${zoneSelected?.id === z.id ? "border-navy bg-navy text-white" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: zoneColor[z.severity] }} />
                        {z.name}
                      </span>
                      <span className={`text-xs capitalize ${zoneSelected?.id === z.id ? "text-white/70" : "text-slate-400"}`}>{z.severity}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Broadcast + safety monitor */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Broadcast */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-navy"><Megaphone className="h-4 w-4 text-red-600" /> Broadcast Emergency Alert</h2>
            <p className="mt-1 text-xs text-slate-500">Push to all citizens inside the selected district/zone.</p>
            <form onSubmit={broadcast} className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Title</span>
                <input value={bcast.title} onChange={(e) => setBcast({ ...bcast, title: e.target.value })} placeholder="e.g. Evacuate now — Patna" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Message</span>
                <textarea required value={bcast.message} onChange={(e) => setBcast({ ...bcast, message: e.target.value })} rows={3} placeholder="Public warning message…" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">Severity</span>
                  <select value={bcast.severity} onChange={(e) => setBcast({ ...bcast, severity: e.target.value as FloodZone["severity"] })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-water">
                    {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">District</span>
                  <select value={bcast.districtId} onChange={(e) => setBcast({ ...bcast, districtId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-water">
                    {["d1","d2","d3","d4","d5","d6","d7","d8","d9","d10","d11","d12"].map((d) => <option key={d} value={d}>{districtName(d)}</option>)}
                  </select>
                </label>
              </div>
              <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700">
                <Megaphone className="h-4 w-4" /> {navigator.onLine ? "Broadcast now" : "Broadcast (queued)"}
              </button>
              {bcastDone && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Broadcast #{bcastDone.id} dispatched to citizens in {bcastDone.targeted}. SMS + push sent.
                </div>
              )}
            </form>
          </div>

          {/* Safety monitor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-bold text-navy"><Users className="h-4 w-4 text-water" /> Citizen Safety Monitor</h2>
              <div className="flex flex-wrap gap-1.5">
                {(["all","danger","warning","safe"] as const).map((k) => (
                  <button key={k} onClick={() => setSafetyFilter(k)} className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition-colors ${safetyFilter === k ? "bg-navy text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {users
                .filter((u) => safetyFilter === "all" || u.statusCustom === safetyFilter)
                .map((u) => {
                  const m = RISK_META[u.riskLevel];
                  const bad = u.statusCustom === "danger";
                  return (
                    <div key={u.id} className={`rounded-xl border p-4 ${bad ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-navy">{u.name}</p>
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase" style={{ background: m.color, color: "#fff" }}>{u.riskLevel}</span>
                      </div>
                      <p className="text-xs text-slate-500">{u.village}, {u.district_name}</p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Risk</span><span>{u.riskScore}/100</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                            <div className="h-full rounded-full" style={{ width: `${u.riskScore}%`, background: m.color }} />
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {u.latitude.toFixed(3)}, {u.longitude.toFixed(3)}</span>
                        <span>{new Date(u.lastSeen).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      {bad && (
                        <button onClick={() => announce(`Emergency for ${u.name}, located in ${u.village}. Risk level ${u.riskLevel}.`)} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-bold text-white hover:bg-red-700">
                          <TriangleAlert className="h-3.5 w-3.5" /> Alert responder
                        </button>
                      )}
                    </div>
                  );
                })}
              {!users.length && !loading && (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">No citizens in this status filter.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sirens + shelters strip */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-navy"><Radio className="h-4 w-4 text-amber-500" /> Village Siren Network</h2>
            <ul className="mt-3 space-y-1.5">
              {sirens.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2 font-semibold text-navy">
                    <span className={`h-2 w-2 rounded-full ${s.status === "operational" ? "bg-emerald-500" : s.status === "battery_low" ? "bg-amber-500" : s.status === "offline" ? "bg-red-500" : "bg-slate-400"}`} />
                    {s.villageName}
                  </span>
                  <span className="text-xs text-slate-400">{s.batteryPct}% · {s.status.replace("_", " ")}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-navy"><Building2 className="h-4 w-4 text-water" /> Open Relief Shelters</h2>
            <ul className="mt-3 space-y-1.5">
              {shelters.filter((s) => s.isOpen).map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-semibold text-navy">{s.name}</span>
                  <span className="text-xs text-slate-400">{s.occupancyPct}% full</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-bold text-navy"><ShieldCheck className="h-4 w-4 text-emerald-500" /> Privacy &amp; Security Notes</h2>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex gap-2"><span className="text-emerald-600">✓</span> Location is shared only after explicit permission (opt-in).</li>
              <li className="flex gap-2"><span className="text-emerald-600">✓</span> Emergency contacts are encrypted at rest on the device.</li>
              <li className="flex gap-2"><span className="text-emerald-600">✓</span> Users can disable tracking anytime; alerts fall back to cached safe data.</li>
              <li className="flex gap-2"><span className="text-emerald-600">✓</span> SMS + broadcasts are geo-targeted to affected regions only.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[200] w-[92%] max-w-sm -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl bg-navy/95 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg">{t.text}</div>
        ))}
      </div>
    </div>
  );
}
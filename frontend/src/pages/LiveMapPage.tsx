import { useEffect, useMemo, useState } from "react";
import { Droplets, TrendingUp, TrendingDown, Minus, RefreshCw, Users, Map as MapIcon, Radio, Layers, ExternalLink } from "lucide-react";
import { get, type District, type WaterLevel, type FloodZone, type Siren } from "@/lib/api";
import { openInGoogleMaps, type GoogleMapType } from "@/lib/mapLayers";
import { FloodMap, type FloodMarker, type FloodPolygon } from "@/components/FloodMap";
import { FloodMonitorPanel } from "@/components/FloodMonitorPanel";

const statusColor: Record<string, string> = {
  danger: "#dc2626",
  warning: "#f59e0b",
  normal: "#22c55e",
};

const statusLabel: Record<string, string> = {
  danger: "DANGER",
  warning: "WARNING",
  normal: "NORMAL",
};

const zoneColor: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  moderate: "#f59e0b",
  low: "#16a34a",
};

const sirenColor: Record<string, string> = {
  operational: "#22c55e",
  battery_low: "#f59e0b",
  offline: "#dc2626",
  maintenance: "#64748b",
};

const Trend = ({ t }: { t: WaterLevel["trend"] }) =>
  t === "rising" ? (
    <span className="inline-flex items-center gap-1 text-red-600">
      <TrendingUp className="h-3.5 w-3.5" /> Rising
    </span>
  ) : t === "falling" ? (
    <span className="inline-flex items-center gap-1 text-emerald-600">
      <TrendingDown className="h-3.5 w-3.5" /> Falling
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-slate-500">
      <Minus className="h-3.5 w-3.5" /> Steady
    </span>
  );

type Tab = "gauges" | "zones" | "sirens";

export function LiveMapPage() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [levels, setLevels] = useState<WaterLevel[]>([]);
  const [zones, setZones] = useState<FloodZone[]>([]);
  const [sirens, setSirens] = useState<Siren[]>([]);
  const [filter, setFilter] = useState<"all" | "normal" | "warning" | "danger">("all");
  const [mapType, setMapType] = useState<GoogleMapType>("satellite");
  const [showZones, setShowZones] = useState(true);
  const [showSirens, setShowSirens] = useState(true);
  const [tab, setTab] = useState<Tab>("gauges");
  const [selected, setSelected] = useState<WaterLevel | null>(null);
  const [selectedZone, setSelectedZone] = useState<FloodZone | null>(null);
  const [flyLabel, setFlyLabel] = useState<[number, number] | null>(null);
  const [zoneRing, setZoneRing] = useState<[number, number][] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      get<District[]>("/districts"),
      get<WaterLevel[]>("/water-levels"),
      get<FloodZone[]>("/flood-zones"),
      get<Siren[]>("/sirens"),
    ])
      .then(([d, l, z, s]) => {
        setDistricts(d);
        setLevels(l);
        setZones(z);
        setSirens(s);
        setSelected((l.find((x) => x.statusCustom !== "normal") || l[0]) ?? null);
        setSelectedZone(z.find((x) => x.severity === "critical") ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const distMap = useMemo(() => new Map(districts.map((d) => [d.id, d])), [districts]);

  const visible = levels.filter((l) => filter === "all" || l.statusCustom === filter);

  const counts = {
    all: levels.length,
    normal: levels.filter((l) => l.statusCustom === "normal").length,
    warning: levels.filter((l) => l.statusCustom === "warning").length,
    danger: levels.filter((l) => l.statusCustom === "danger").length,
  };

  const openSirens = sirens.filter((s) => s.status === "operational").length;

  const pickGauge = (l: WaterLevel) => {
    setSelected(l);
    setTab("gauges");
    const d = distMap.get(l.districtId);
    if (d) setFlyLabel([d.latitude, d.longitude]);
    setZoneRing(null);
  };

  const pickZone = (z: FloodZone) => {
    setSelectedZone(z);
    setTab("zones");
    setFlyLabel(null);
    setZoneRing(z.ring);
  };

  const gaugeMarkers: FloodMarker[] = visible
    .map((l): FloodMarker | null => {
      const d = distMap.get(l.districtId);
      if (!d) return null;
      const isSel = selected?.districtId === l.districtId;
      return {
        id: `g-${l.districtId}`,
        position: [d.latitude, d.longitude],
        color: statusColor[l.statusCustom],
        size: isSel ? 22 : 16,
        active: isSel,
        label: d.name,
        onClick: () => pickGauge(l),
        popup: (
          <div className="text-sm">
            <p className="font-bold">
              {d.name} · {l.river}
            </p>
            <p>Water level: {l.level.toFixed(2)} m</p>
            <p className="font-bold" style={{ color: statusColor[l.statusCustom] }}>
              {statusLabel[l.statusCustom]}
            </p>
            <button
              onClick={() => openInGoogleMaps(d.latitude, d.longitude, d.name)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-water hover:underline"
            >
              View in Google Maps <ExternalLink className="h-3 w-3" />
            </button>
          </div>
        ),
      };
    })
    .filter((m): m is FloodMarker => m !== null);

  const sirenMarkers: FloodMarker[] = showSirens
    ? sirens.map((s) => ({
        id: `s-${s.id}`,
        position: [s.latitude, s.longitude],
        color: sirenColor[s.status],
        size: 24,
        pulse: s.alarmed,
        symbol: "siren",
        label: `Siren · ${s.villageName}`,
        onClick: () => {
          setFlyLabel([s.latitude, s.longitude]);
          setZoneRing(null);
        },
        popup: (
          <div className="text-sm">
            <p className="font-bold">Siren · {s.villageName}</p>
            <p className="capitalize">Status: {s.status.replace("_", " ")}</p>
            <p>Battery: {s.batteryPct}%</p>
            <p>Network: {s.network === "none" ? "No mobile network — SMS fallback ready" : s.network}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
              {s.phone}
              <button
                onClick={() => openInGoogleMaps(s.latitude, s.longitude, `${s.villageName} siren`)}
                className="inline-flex items-center gap-0.5 font-semibold text-water hover:underline"
              >
                Maps <ExternalLink className="h-3 w-3" />
              </button>
            </p>
          </div>
        ),
      }))
    : [];

  const zonePolygons: FloodPolygon[] = showZones
    ? zones.map((z) => ({
        id: z.id,
        ring: z.ring,
        color: zoneColor[z.severity],
        fillOpacity: selectedZone?.id === z.id ? 0.5 : 0.28,
        selected: selectedZone?.id === z.id,
        label: z.name,
        onClick: () => pickZone(z),
        popup: (
          <div className="text-sm">
            <p className="font-bold">{z.name}</p>
            <p className="capitalize">
              Severity: <span className="font-bold" style={{ color: zoneColor[z.severity] }}>{z.severity}</span>
            </p>
            <p>Affected: {z.affectedPopulation.toLocaleString()} people</p>
            <p>Area: {z.areaSqKm} km²</p>
            <p>Villages: {z.affectedVillages.join(", ")}</p>
          </div>
        ),
      }))
    : [];

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">Live Flood & River Map</h1>
            <p className="text-sm text-slate-500">Real-time Google Maps satellite view of flood inundation, river-flow gauges and village siren units</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "normal", "warning", "danger"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase transition-colors ${
                  filter === k ? "bg-navy text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                }`}
              >
                <span className={`h-2.5 w-2.5 rounded-full ${k === "all" ? "bg-slate-400" : ""}`} style={k !== "all" ? { background: statusColor[k] } : undefined} />
                {k} ({counts[k]})
              </button>
            ))}

            <span className="ml-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
              <Layers className="h-3.5 w-3.5" /> Layers
            </span>
            <button
              onClick={() => setShowZones(!showZones)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                showZones ? "bg-water text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-100"
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" /> Flood zones
            </button>
            <button
              onClick={() => setShowSirens(!showSirens)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                showSirens ? "bg-navy text-white" : "bg-white text-slate-500 shadow-sm hover:bg-slate-100"
              }`}
            >
              <Radio className="h-3.5 w-3.5" /> Sirens
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Map */}
        <div className="min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <FloodMap
            className="h-full w-full"
            center={[25.8, 91.8]}
            zoom={6}
            mapType={mapType}
            onMapTypeChange={setMapType}
            markers={[...gaugeMarkers, ...sirenMarkers]}
            polygons={zonePolygons}
            flyTo={flyLabel}
            fitToRing={zoneRing}
          />
        </div>

        {/* Side panel */}
        <aside className="w-full shrink-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:w-96">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-bold text-navy">Monitor Panel</h2>
              <p className="text-xs text-slate-500">Layers update live from telemetry</p>
            </div>
            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </div>

          {/* Tabs */}
          <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-bold">
            {(
              [
                ["gauges", `Gauges ${counts.all}`],
                ["zones", `Zones ${zones.length}`],
                ["sirens", `Sirens ${openSirens}/${sirens.length}`],
              ] as [Tab, string][]
            ).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-2 py-1.5 transition-colors ${tab === t ? "bg-white text-navy shadow" : "text-slate-500 hover:text-navy"}`}>
                {label}
              </button>
            ))}
          </div>

          {tab === "gauges" && (
            <>
              {selected && (
                <div className="mt-4 rounded-xl bg-slate-900 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{selected.district_name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${selected.statusCustom === "danger" ? "bg-red-500" : selected.statusCustom === "warning" ? "bg-amber-500 text-black" : "bg-emerald-500"}`}>
                      {statusLabel[selected.statusCustom]}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-white/60">
                    <Droplets className="h-3.5 w-3.5 text-water" /> {selected.river} river
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-white/10 py-2">
                      <p className="text-lg font-extrabold">{selected.level.toFixed(1)}m</p>
                      <p className="text-[10px] uppercase text-white/50">Current</p>
                    </div>
                    <div className="rounded-lg bg-white/10 py-2">
                      <p className="text-lg font-extrabold text-amber-300">{selected.warning.toFixed(1)}m</p>
                      <p className="text-[10px] uppercase text-white/50">Warning</p>
                    </div>
                    <div className="rounded-lg bg-white/10 py-2">
                      <p className="text-lg font-extrabold text-red-400">{selected.danger.toFixed(1)}m</p>
                      <p className="text-[10px] uppercase text-white/50">Danger</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-white/60">Trend</span>
                    <Trend t={selected.trend} />
                  </div>
                </div>
              )}

              <ul className="mt-4 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
                {visible.map((l) => (
                  <li key={l.districtId}>
                    <button
                      onClick={() => pickGauge(l)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected?.districtId === l.districtId ? "border-navy bg-navy text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: statusColor[l.statusCustom] }} />
                        {l.district_name}
                      </span>
                      <span className={`text-xs font-bold ${selected?.districtId === l.districtId ? "text-white/70" : "text-slate-400"}`}>
                        {l.level.toFixed(1)}m
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "zones" && (
            <>
              {selectedZone && (
                <div className="mt-4 rounded-xl border p-4" style={{ borderColor: zoneColor[selectedZone.severity] + "55", background: zoneColor[selectedZone.severity] + "0d" }}>
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-navy">{selectedZone.name}</p>
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase text-white" style={{ background: zoneColor[selectedZone.severity] }}>
                      {selectedZone.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{selectedZone.district_name} district</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                      <p className="text-[11px] text-slate-400">Population at risk</p>
                      <p className="font-bold text-navy">{selectedZone.affectedPopulation.toLocaleString()}</p>
                    </div>
                    <div className="rounded-lg bg-white px-2.5 py-1.5 shadow-sm">
                      <p className="text-[11px] text-slate-400">Affected area</p>
                      <p className="font-bold text-navy">{selectedZone.areaSqKm} km²</p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Users className="h-3.5 w-3.5" /> Villages: {selectedZone.affectedVillages.join(", ")}
                  </p>
                </div>
              )}

              <ul className="mt-4 max-h-[320px] space-y-1.5 overflow-y-auto pr-1">
                {zones.map((z) => (
                  <li key={z.id}>
                    <button
                      onClick={() => pickZone(z)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        selectedZone?.id === z.id ? "border-navy bg-navy text-white" : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: zoneColor[z.severity] }} />
                        {z.name}
                      </span>
                      <span className={`text-xs font-bold capitalize ${selectedZone?.id === z.id ? "text-white/70" : "text-slate-400"}`}>
                        {z.severity}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tab === "sirens" && (
            <>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-navy p-3 text-xs text-white">
                <Radio className="h-5 w-5 shrink-0 text-amber-300" />
                <p>
                  IoT siren units auto-ring on flood crossing danger level. If a village has <b>no mobile network</b>, the siren still sounds and an <b>SMS broadcast / WhatsApp alert</b> goes out via satellite fallback.
                </p>
              </div>

              <ul className="mt-4 max-h-[330px] space-y-1.5 overflow-y-auto pr-1">
                {sirens.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        const d = distMap.get(s.districtId);
                        if (d) setFlyLabel([s.latitude, s.longitude]);
                        setZoneRing(null);
                      }}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sirenColor[s.status] }} />
                        {s.villageName}
                        <span className="text-[10px] font-medium text-slate-400">{s.district_name}</span>
                      </span>
                      <span className="flex items-center gap-2 text-xs font-bold capitalize text-slate-500">
                        {s.alarmed && <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] text-red-700">ALARM</span>}
                        {s.status.replace("_", " ")}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </aside>
      </div>

      {/* Legend */}
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <div className="flex flex-wrap gap-6 rounded-2xl border border-slate-200 bg-white p-4 text-xs">
          <div>
            <p className="mb-2 font-bold uppercase tracking-wide text-slate-500">Flood zones</p>
            <div className="flex flex-wrap gap-3">
              {(["critical", "high", "moderate"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 capitalize text-slate-600">
                  <span className="h-3 w-3 rounded-sm" style={{ background: zoneColor[k] }} /> {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold uppercase tracking-wide text-slate-500">River gauges</p>
            <div className="flex flex-wrap gap-3">
              {(["danger", "warning", "normal"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-3 w-3 rounded-full" style={{ background: statusColor[k] }} /> {k}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-bold uppercase tracking-wide text-slate-500">Siren units</p>
            <div className="flex flex-wrap gap-3">
              {(["operational", "battery_low", "offline", "maintenance"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 capitalize text-slate-600">
                  <span className="h-3 w-3 rounded-full" style={{ background: sirenColor[k] }} /> {k.replace("_", " ")}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Flood & river flow monitoring — connected to the flood monitoring system */}
      <div className="border-t border-slate-200 bg-slate-50 pt-8">
        <FloodMonitorPanel />
      </div>
    </div>
  );
}
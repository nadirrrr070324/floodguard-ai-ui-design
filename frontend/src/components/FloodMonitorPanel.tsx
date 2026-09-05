import { useEffect, useState } from "react";
import {
  Activity, Droplets, RefreshCw, Satellite, ShieldCheck, TrendingDown, TrendingUp,
  Wifi, Waves,
} from "lucide-react";
import { get, type FloodMonitor, type FloodMonitorStation, type MonitorHealth } from "@/lib/api";

const stageColor: Record<FloodMonitorStation["stage"], string> = {
  danger: "#dc2626",
  warning: "#f59e0b",
  normal: "#22c55e",
};

const stageLabel: Record<FloodMonitorStation["stage"], string> = {
  danger: "DANGER",
  warning: "WARNING",
  normal: "NORMAL",
};

const sensorColor: Record<FloodMonitorStation["sensor"], string> = {
  online: "#22c55e",
  battery_low: "#f59e0b",
  offline: "#dc2626",
};

function Trend({ t }: { t: FloodMonitorStation["trend"] }) {
  if (t === "rising")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600">
        <TrendingUp className="h-3.5 w-3.5" /> Rising
      </span>
    );
  if (t === "falling")
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
        <TrendingDown className="h-3.5 w-3.5" /> Falling
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500">
      <Waves className="h-3.5 w-3.5" /> Steady
    </span>
  );
}

// Water level position relative to its warning/danger band (0..100).
function levelPct(s: FloodMonitorStation) {
  const span = Math.max(1, s.dangerLevel - s.normalLevel);
  return Math.min(100, Math.max(0, ((s.waterLevel - s.normalLevel) / span) * 100));
}

export function FloodMonitorPanel() {
  const [monitor, setMonitor] = useState<FloodMonitor | null>(null);
  const [health, setHealth] = useState<MonitorHealth | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [m, h] = await Promise.all([get<FloodMonitor>("/flood-monitor"), get<MonitorHealth>("/monitor/health")]);
      setMonitor(m);
      setHealth(h);
    } catch {
      /* handled by empty state */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, []);

  const stations = monitor?.stations ?? [];
  const danger = stations.filter((s) => s.stage === "danger").length;
  const warning = stations.filter((s) => s.stage === "warning").length;
  const online = health?.stationsOnline ?? stations.filter((s) => s.sensor === "online").length;
  const connected = health?.status === "connected";
  const sourceLabel = health?.source === "remote" ? "Remote feed" : health?.source === "builtin-fallback" ? "Built-in (remote offline)" : "Built-in network";

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Header / system status */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 bg-navy px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-amber-300">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <h2 className="flex items-center gap-2 font-extrabold">
                Flood &amp; River Flow Monitoring
                {sourceLabel === "Remote feed" ? <Satellite className="h-4 w-4 text-water" /> : <Wifi className="h-4 w-4 text-water" />}
              </h2>
              <p className="text-xs text-white/55">{monitor?.network ?? "Connecting to monitoring network…"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${connected ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              {connected ? "CONNECTED" : "DEGRADED"} · {sourceLabel}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
              {health ? `${health.latencyMs} ms lag` : "…"}
            </span>
          </div>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 sm:grid-cols-4">
          {[
            { label: "Gauging stations online", value: `${online}/${stations.length}`, cls: "text-emerald-600" },
            { label: "Rivers monitored", value: stations.length, cls: "text-navy" },
            { label: "At flood danger", value: danger, cls: danger ? "text-red-600" : "text-emerald-600" },
            { label: "At warning level", value: warning, cls: warning ? "text-amber-600" : "text-slate-500" },
          ].map((c) => (
            <div key={c.label} className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
              <p className={`text-xl font-extrabold ${c.cls}`}>{c.value}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Station cards */}
        {loading && (
          <p className="px-5 py-6 text-sm text-slate-400">Loading flood monitoring telemetry…</p>
        )}
        {!loading && stations.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 px-5 py-6 text-sm text-slate-400">
            No gauging-station readings yet — the monitoring network has not reported.
          </p>
        )}

        <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-3">
          {stations.map((s) => {
            const pct = levelPct(s);
            return (
              <div key={s.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-navy">
                      <Droplets className="h-4 w-4 shrink-0 text-water" />
                      <span className="truncate">{s.river}</span>
                    </p>
                    <p className="truncate text-[11px] text-slate-400">
                      {s.stationCode} · {s.district_name}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold text-white" style={{ background: stageColor[s.stage] }}>
                    {stageLabel[s.stage]}
                  </span>
                </div>

                {/* Level bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>Water level</span>
                    <span className="text-slate-500">{s.waterLevel.toFixed(2)} m</span>
                  </div>
                  <div className="relative mt-1 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{ width: `${pct}%`, background: stageColor[s.stage] }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-red-700"
                      style={{ left: "100%" }}
                      title={`Danger ${s.dangerLevel} m`}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>Normal {s.normalLevel} m</span>
                    <span>Danger {s.dangerLevel} m</span>
                  </div>
                </div>

                {/* Flow + trend */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Discharge</p>
                    <p className="text-lg font-extrabold text-navy">{s.flow.toLocaleString("en-IN")} <span className="text-[11px] font-semibold text-slate-400">m³/s</span></p>
                    <p className="text-[10px] text-slate-400">avg {s.averageFlow.toLocaleString("en-IN")} m³/s</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-[10px] uppercase text-slate-400">Trend</p>
                    <div className="mt-1.5"><Trend t={s.trend} /></div>
                    <p className="mt-1 text-[10px] text-slate-400">{new Date(s.lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>

                {/* Sensor telemetry */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <span className="h-2 w-2 rounded-full" style={{ background: sensorColor[s.sensor] }} />
                    Sensor {s.sensor.replace("_", " ")}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Battery {s.batteryPct}%
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-500">
                    {s.network}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[11px] text-slate-400">
          <span>
            Linked to the flood monitoring system · last sync{" "}
            {monitor ? new Date(monitor.updatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "…"}
          </span>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 font-bold text-slate-600 hover:bg-slate-200">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>
    </section>
  );
}
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, Bell, Droplets, Home as HomeIcon, MapPin, CloudRain,
} from "lucide-react";
import { get, type Summary, type District, type Alert } from "@/lib/api";
import heroImg from "@/assets/hero-flood.jpg";

function StatCard({ icon: Icon, label, value, sub, accent }: { icon: any; label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="glass rounded-2xl p-5 text-center">
      <Icon className={`mx-auto h-6 w-6 ${accent || "text-white/80"}`} />
      <p className="mt-2 text-3xl font-extrabold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/60">{label}</p>
      {sub && <p className="text-[11px] text-white/40">{sub}</p>}
    </div>
  );
}

const severityCls: Record<string, string> = {
  critical: "bg-flood-critical",
  high: "bg-flood-high",
  moderate: "bg-flood-moderate",
  low: "bg-flood-low",
};

function riskColor(score: number) {
  if (score >= 80) return { bar: "bg-red-600", chip: "bg-red-50 text-red-700" };
  if (score >= 60) return { bar: "bg-orange-500", chip: "bg-orange-50 text-orange-700" };
  if (score >= 40) return { bar: "bg-amber-500", chip: "bg-amber-50 text-amber-700" };
  return { bar: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" };
}

export function HomePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [risks, setRisks] = useState<District[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get<Summary>("/summary"), get<District[]>("/top-risks"), get<Alert[]>("/alerts/active")])
      .then(([s, r, a]) => { setSummary(s); setRisks(r); setAlerts(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy/90" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/10 px-4 py-1.5 text-xs font-semibold text-amber-300">
              <Bell className="h-3.5 w-3.5" /> Official Early Warning Portal · Government of India
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Know Before the{" "}
              <span className="bg-gradient-to-r from-amber-400 to-green-300 bg-clip-text text-transparent">Water Rises</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">
              Live flood alerts, real-time river levels, weather forecasts and relief shelters — a single
              national portal to keep every citizen safe during the monsoon.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to="/live-map" className="inline-flex items-center gap-2 rounded-lg bg-saffron px-6 py-3 font-bold text-white shadow-lg shadow-saffron/30 hover:bg-amber-500">
                <MapPin className="h-4 w-4" /> View Live Map
              </Link>
              <Link to="/flood-alerts" className="inline-flex items-center gap-2 rounded-lg border-2 border-white/20 px-6 py-3 font-semibold text-white hover:bg-white/10">
                <AlertTriangle className="h-4 w-4" /> Flood Alerts
              </Link>
            </div>
          </div>

          {summary && (
            <div className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard icon={MapPin} label="Districts Tracked" value={summary.districts} />
              <StatCard icon={Bell} label="Active Alerts" value={summary.activeAlerts} accent="text-red-300" />
              <StatCard icon={Droplets} label="River Gauges" value={summary.rivers} />
              <StatCard
                icon={Activity}
                label="At Danger"
                value={summary.dangerRivers}
                accent={summary.dangerRivers ? "text-red-300" : "text-emerald-300"}
              />
              <StatCard icon={HomeIcon} label="Open Shelters" value={summary.openShelters} />
              <StatCard icon={CloudRain} label="Shelter Capacity" value={summary.sheltedCapacity.toLocaleString()} />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-14">
        {/* Top risks */}
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-navy">Highest Flood-Risk Districts</h2>
            <p className="text-sm text-navy/60">Compiled flood-risk index across monitored districts</p>
          </div>
          <Link to="/live-map" className="inline-flex items-center gap-1 text-sm font-semibold text-water hover:underline">
            Open map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {risks.map((d) => {
            const c = riskColor(d.riskScore);
            return (
              <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-navy">{d.name}</p>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.chip}`}>{d.riskScore}/100</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{d.state} · {d.region}</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${c.bar}`} style={{ width: `${d.riskScore}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Active alerts */}
        <div className="mt-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold text-navy">Active Flood Advisories</h2>
              <p className="text-sm text-navy/60">Issued by the National Flood Monitoring Centre</p>
            </div>
            <Link to="/flood-alerts" className="inline-flex items-center gap-1 text-sm font-semibold text-water hover:underline">
              All alerts <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {alerts.slice(0, 4).map((a) => (
              <div key={a.id} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${severityCls[a.severity]}`}>
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold text-navy">{a.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white ${severityCls[a.severity]}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{a.message}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {a.district_name} · {new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
              </div>
            ))}
            {!alerts.length && !loading && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                No active flood advisories at the moment.
              </div>
            )}
            {loading && <div className="rounded-2xl border border-slate-100 bg-white p-6 text-sm text-slate-400">Loading advisories…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Radio, BatteryMedium, Wifi, WifiOff, Satellite, Sun, Zap, PhoneCall, BellRing, CheckCircle2, TriangleAlert } from "lucide-react";
import { get, type Siren } from "@/lib/api";

const statusMeta: Record<Siren["status"], { label: string; cls: string; bar: string }> = {
  operational: { label: "Operational", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-500" },
  battery_low: { label: "Battery Low", cls: "bg-amber-50 text-amber-700 border-amber-200", bar: "bg-amber-500" },
  offline: { label: "Offline", cls: "bg-red-50 text-red-700 border-red-200", bar: "bg-red-500" },
  maintenance: { label: "Maintenance", cls: "bg-slate-100 text-slate-600 border-slate-200", bar: "bg-slate-400" },
};

const statusDot: Record<Siren["status"], string> = {
  operational: "bg-emerald-500",
  battery_low: "bg-amber-500",
  offline: "bg-red-500",
  maintenance: "bg-slate-400",
};

export function SirenSystemPage() {
  const [sirens, setSirens] = useState<Siren[]>([]);
  const [filter, setFilter] = useState<"all" | Siren["status"]>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<Siren[]>("/sirens")
      .then(setSirens)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => sirens.filter((s) => filter === "all" || s.status === filter), [sirens, filter]);

  const stats = useMemo(
    () => ({
      total: sirens.length,
      operational: sirens.filter((s) => s.status === "operational").length,
      attended: sirens.filter((s) => s.status === "operational" || s.status === "maintenance").length,
      offline: sirens.filter((s) => s.status === "offline" || s.status === "battery_low").length,
      alarmed: sirens.filter((s) => s.alarmed).length,
      satellite: sirens.filter((s) => s.network === "satellite" || s.network === "none").length,
    }),
    [sirens]
  );

  const batteryColor = (p: number) => (p >= 70 ? "text-emerald-600" : p >= 40 ? "text-amber-600" : "text-red-600");

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-extrabold text-navy">Offline Village Siren System</h1>
          <p className="text-sm text-slate-500">Solar-powered IoT siren units in flood-prone villages with SMS fallback alerting</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Explanation banner */}
        <div className="flex flex-col gap-4 rounded-2xl bg-navy p-6 text-white lg:flex-row lg:items-center">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-saffron/20 text-saffron">
            <Radio className="h-7 w-7" />
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-extrabold">Siren first, SMS second — alerting that survives a network failure</h2>
            <p className="mt-1 max-w-4xl text-sm leading-relaxed text-white/70">
              Each flood-prone village gets a solar-powered <b className="text-white">IoT siren unit</b>. When a river gauge crosses
              the danger mark, the siren rings instantly — <b className="text-white">no internet required</b>. If the mobile network is
              down in the village, alerts are still sent as <b className="text-white">SMS broadcast / WhatsApp to registered community
              members via satellite fallback</b> the moment uplink is available, and via 2G SMS where GSM exists. Villages with no
              network remain protected by the physical siren.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Siren units deployed", value: stats.total, cls: "text-navy" },
            { label: "Operational", value: stats.operational, cls: "text-emerald-600" },
            { label: "Maintenance", value: sirens.filter((s) => s.status === "maintenance").length, cls: "text-slate-500" },
            { label: "Low battery / offline", value: stats.offline, cls: "text-red-600" },
            { label: "Currently ringing", value: stats.alarmed, cls: "text-amber-600" },
            { label: "No-network villages (SMS fallback)", value: stats.satellite, cls: "text-water" },
          ].map((c) => (
            <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className={`text-2xl font-extrabold ${c.cls}`}>{c.value}</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase text-slate-500">View</span>
          {(["all", "operational", "battery_low", "offline", "maintenance"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                filter === k ? "bg-navy text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              }`}
            >
              {k !== "all" && <span className={`h-2 w-2 rounded-full ${statusDot[k]}`} />}
              {k === "all" ? "All units" : k.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Siren cards */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => {
            const m = statusMeta[s.status];
            return (
              <div key={s.id} className={`rounded-2xl border p-5 shadow-sm ${s.alarmed ? "border-red-300 ring-1 ring-red-100" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-navy">{s.villageName}</p>
                    <p className="text-xs text-slate-500">{s.district_name} district</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${m.cls}`}>
                    {m.label}
                  </span>
                </div>

                {s.alarmed && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    <BellRing className="h-4 w-4 animate-pulse" /> ALARM RINGING — move to higher ground
                  </div>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-500">
                      <BatteryMedium className="h-3.5 w-3.5" /> Battery
                    </span>
                    <span className={`font-extrabold ${batteryColor(s.batteryPct)}`}>{s.batteryPct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${s.batteryPct}%` }} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      {s.network === "none" ? <WifiOff className="h-3 w-3" /> : s.network === "satellite" ? <Satellite className="h-3 w-3" /> : <Wifi className="h-3 w-3" />}
                      Connectivity
                    </p>
                    <p className={`font-bold capitalize ${s.network === "none" ? "text-red-600" : "text-navy"}`}>
                      {s.network === "none" ? "None (offline)" : s.network}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                    <p className="flex items-center gap-1 text-[11px] text-slate-400">
                      {s.poweredBy === "Solar" ? <Sun className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
                      Power & coverage
                    </p>
                    <p className="font-bold text-navy">{s.poweredBy} · {s.coverageRadiusKm} km</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {s.smsFallbackEnabled ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> SMS fallback enabled
                      </>
                    ) : (
                      <>
                        <TriangleAlert className="h-3.5 w-3.5 text-amber-500" /> SMS fallback off
                      </>
                    )}
                  </span>
                  <span className="text-[11px] text-slate-400">Last test: {s.lastTested}</span>
                </div>

                <a href={`tel:${s.phone.replace(/\D/g, "")}`} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy/85">
                  <PhoneCall className="h-3.5 w-3.5" /> {s.phone}
                </a>
              </div>
            );
          })}
          {!visible.length && !loading && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              No siren units in this category.
            </p>
          )}
        </div>

        {loading && <p className="mt-4 text-sm text-slate-400">Loading siren telemetry…</p>}

        {/* How it works */}
        <div className="mt-12">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
            <Radio className="h-5 w-5 text-saffron" /> How the offline alert chain works
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            {[
              { n: "1", icon: TriangleAlert, t: "Danger detected", d: "River gauge crosses the danger mark — central flood cell issues a warning." },
              { n: "2", icon: BellRing, t: "Siren rings instantly", d: "The village IoT siren blasts a coded alarm. Works with zero internet and zero dependency on mobile towers." },
              { n: "3", icon: WifiOff, t: "SMS when network returns", d: "If GSM is down, alerts are queued and broadcast as SMS/WhatsApp via satellite uplink, or over 2G when available." },
              { n: "4", icon: CheckCircle2, t: "Community confirmed", d: "Village volunteers acknowledge via keypad, which logs acknowledgement to the control room." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saffron text-xs font-extrabold text-white">{s.n}</span>
                  <s.icon className="h-4 w-4 text-saffron" />
                </div>
                <p className="mt-3 font-bold text-navy">{s.t}</p>
                <p className="mt-1 text-sm text-slate-500">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
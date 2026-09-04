import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, Filter, Siren } from "lucide-react";
import { get, type Alert } from "@/lib/api";

const severityCls: Record<string, { bg: string; chip: string; icon: string }> = {
  critical: { bg: "bg-red-600", chip: "bg-red-50 text-red-700 border-red-200", icon: "text-red-600" },
  high: { bg: "bg-orange-500", chip: "bg-orange-50 text-orange-700 border-orange-200", icon: "text-orange-500" },
  moderate: { bg: "bg-amber-400", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: "text-amber-500" },
  low: { bg: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "text-emerald-600" },
};

const statusCls: Record<string, string> = {
  active: "bg-red-50 text-red-700 border-red-200",
  acknowledged: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function FloodAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [severe, setSevere] = useState(false);
  const [status, setStatus] = useState<"all" | Alert["status"]>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get<Alert[]>("/alerts")
      .then(setAlerts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      alerts.filter((a) => {
        if (severe && a.severity !== "critical" && a.severity !== "high") return false;
        if (status !== "all" && a.status !== status) return false;
        return true;
      }),
    [alerts, severe, status]
  );

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-extrabold text-navy">Flood & Weather Advisories</h1>
          <p className="text-sm text-slate-500">Official alerts issued for inundation, flash floods and heavy rainfall</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
              <Filter className="h-3.5 w-3.5" /> Filter
            </span>
            <button
              onClick={() => setSevere(!severe)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                severe ? "bg-red-600 text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              }`}
            >
              <Siren className="h-3.5 w-3.5" /> High severity only
            </button>
            {(["all", "active", "acknowledged", "resolved"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                  status === s ? "bg-navy text-white" : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading && <p className="text-sm text-slate-400">Loading alerts…</p>}

        {!loading && !filtered.length && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-12 text-center">
            <BellRing className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-slate-600">No alerts match the current filters.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((a) => {
            const s = severityCls[a.severity];
            return (
              <article key={a.id} className={`rounded-2xl border p-5 shadow-sm ${a.severity === "critical" ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"}`}>
                <div className="flex items-start gap-4">
                  <span className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${s.bg}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-bold text-navy">{a.title}</h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${s.chip}`}>
                        {a.severity}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${statusCls[a.status]}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.message}</p>
                    <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span className="font-semibold text-slate-500">📍 {a.district_name}</span>
                      <span>Issued {new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
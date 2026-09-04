import { useEffect, useMemo, useState } from "react";
import { CloudSun, Droplets, Wind, Thermometer, CloudRain, Sun, Cloud, Cloudy, CloudLightning } from "lucide-react";
import { get, type WeatherRow } from "@/lib/api";

function conditionIcon(c: string) {
  const n = c.toLowerCase();
  if (n.includes("rain") || n.includes("storm")) return <CloudRain className="h-6 w-6 text-blue-500" />;
  if (n.includes("thunder") || n.includes("lightning")) return <CloudLightning className="h-6 w-6 text-amber-500" />;
  if (n.includes("cloud")) return <Cloud className="h-6 w-6 text-slate-400" />;
  if (n.includes("overcast")) return <Cloudy className="h-6 w-6 text-slate-500" />;
  return <Sun className="h-6 w-6 text-amber-400" />;
}

export function WeatherPage() {
  const [rows, setRows] = useState<WeatherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"name" | "rainfallMm" | "temperature">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    get<WeatherRow[]>("/weather")
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      let diff = 0;
      if (sortKey === "name") diff = a.district_name.localeCompare(b.district_name);
      else diff = a[sortKey] - b[sortKey];
      return sortDir === "asc" ? diff : -diff;
    });
    return arr;
  }, [rows, sortKey, sortDir]);

  const heavyRain = useMemo(() => rows.filter((r) => r.rainfallMm >= 50).length, [rows]);
  const avgRain = useMemo(() => (rows.length ? rows.reduce((s, r) => s + r.rainfallMm, 0) / rows.length : 0), [rows]);

  const toggleSort = (k: "name" | "rainfallMm" | "temperature") => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const SortBtn = ({ k, label }: { k: "name" | "rainfallMm" | "temperature"; label: string }) => (
    <button
      onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${
        sortKey === k ? "bg-navy text-white" : "text-slate-500 hover:bg-slate-100"
      }`}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </button>
  );

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <div>
            <h1 className="text-2xl font-extrabold text-navy">District Weather Watch</h1>
            <p className="text-sm text-slate-500">Live rainfall, temperature and humidity by district</p>
          </div>
          <div className="flex gap-2">
            <SortBtn k="name" label="District" />
            <SortBtn k="rainfallMm" label="Rainfall" />
            <SortBtn k="temperature" label="Temp" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((r) => (
            <div key={r.districtId} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="font-bold text-navy">{r.district_name}</p>
                {conditionIcon(r.condition)}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">{r.condition}</p>

              <div className="mt-3 flex items-baseline gap-1">
                <Thermometer className="h-4 w-4 text-red-400" />
                <span className="text-2xl font-extrabold text-navy">{r.temperature}°C</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Droplets className="h-3 w-3" /> Rain (24h)
                  </p>
                  <p className={`font-bold ${r.rainfallMm >= 50 ? "text-red-600" : "text-navy"}`}>{r.rainfallMm} mm</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Wind className="h-3 w-3" /> Wind
                  </p>
                  <p className="font-bold text-navy">{r.windKmh} km/h</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                <CloudSun className="h-3.5 w-3.5" /> Humidity {r.humidity}%
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-navy p-6 text-white">
          <h2 className="font-bold">Rainfall Summary</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-3xl font-extrabold text-sky-300">{heavyRain}</p>
              <p className="text-xs text-white/60">Districts with ≥50 mm/24h (heavy rainfall)</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-amber-300">{avgRain.toFixed(1)} mm</p>
              <p className="text-xs text-white/60">Average 24h rainfall across monitored stations</p>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-emerald-300">{rows.length}</p>
              <p className="text-xs text-white/60">Active weather monitoring stations</p>
            </div>
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-slate-400">Loading weather data…</p>}
      </div>
    </div>
  );
}
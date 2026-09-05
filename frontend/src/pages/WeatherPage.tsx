import { useEffect, useMemo, useState } from "react";
import { CloudSun, Droplets, Wind, Thermometer, ExternalLink } from "lucide-react";
import { get, type WeatherRow } from "@/lib/api";
import { AnimatedWeatherIcon } from "@/components/AnimatedWeatherIcon";

function getWeatherCardStyle(condition: string, rainfall: number) {
  const n = condition.toLowerCase();

  // Heavy rain - red warning background
  if (rainfall >= 50) {
    return "bg-gradient-to-br from-red-50 to-orange-50 border-red-200";
  }

  // Rain / showers / drizzle - blue gradient
  if (n.includes("rain") || n.includes("storm") || n.includes("shower") || n.includes("drizzle")) {
    return "bg-gradient-to-br from-blue-50 to-sky-50 border-blue-200";
  }

  // Thunder - amber gradient
  if (n.includes("thunder") || n.includes("lightning")) {
    return "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200";
  }

  // Cloudy / overcast / fog - gray gradient
  if (n.includes("cloud") || n.includes("overcast") || n.includes("fog")) {
    return "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-300";
  }

  // Sunny - warm gradient
  return "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200";
}

export function WeatherPage() {
  const [rows, setRows] = useState<WeatherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"name" | "rainfallMm" | "temperature">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const load = () =>
    get<WeatherRow[]>("/weather")
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = rows[0]?.source === "open-meteo";

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
            <p className="text-sm text-slate-500">Live rainfall, temperature, humidity and 5-day forecast by district</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold ${
                live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${live ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`} />
              {live ? "Live · Open-Meteo federation" : "Offline snapshot"}
              {rows[0]?.updatedAt && (
                <span className="font-medium opacity-70">· {new Date(rows[0].updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              )}
            </span>
            <SortBtn k="name" label="District" />
            <SortBtn k="rainfallMm" label="Rainfall" />
            <SortBtn k="temperature" label="Temp" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {!live && !loading && (
          <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
            The weather federation is unreachable right now — showing stored snapshot readings (5-day outlook generated locally).
          </p>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sorted.map((r, i) => (
            <div
              key={r.districtId}
              className={`weather-card rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md ${getWeatherCardStyle(r.condition, r.rainfallMm)}`}
              style={{ animationDelay: `${Math.min(i, 12) * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <p className="font-bold text-navy">{r.district_name}</p>
                <AnimatedWeatherIcon condition={r.condition} />
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                {r.condition}
                {r.forecast?.[0] && (
                  <span className="ml-1 text-slate-300">· {r.forecast[0].weekday} {r.forecast[0].tempMax}° / {r.forecast[0].tempMin}°</span>
                )}
              </p>

              <div className="mt-3 flex items-baseline gap-1">
                <Thermometer className="h-4 w-4 text-red-400" />
                <span className="text-2xl font-extrabold text-navy">{r.temperature}°C</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg bg-white/70 px-2.5 py-1.5 backdrop-blur">
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Droplets className="h-3 w-3" /> Rain (24h)
                  </p>
                  <p className={`font-bold ${r.rainfallMm >= 50 ? "text-red-600" : "text-navy"}`}>{r.rainfallMm} mm</p>
                </div>
                <div className="rounded-lg bg-white/70 px-2.5 py-1.5 backdrop-blur">
                  <p className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Wind className="h-3 w-3" /> Wind
                  </p>
                  <p className="font-bold text-navy">{r.windKmh} km/h</p>
                </div>
              </div>

              <div className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CloudSun className="h-3.5 w-3.5" /> Humidity {r.humidity}%
                </span>
                <a
                  href={`https://open-meteo.com/en/docs#latitude=${r.forecast?.[0]?.weatherCode ?? 0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-water hover:underline"
                  title="View forecast model on open-meteo.com"
                >
                  open-meteo <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              {/* 5-day forecast */}
              {r.forecast && r.forecast.length > 0 && (
                <div className="mt-3 grid grid-cols-5 gap-1 border-t border-slate-200/60 pt-2">
                  {r.forecast.map((d) => (
                    <div
                      key={d.date}
                      className="flex flex-col items-center gap-0.5 text-center"
                      title={`${d.condition} · ${d.rainMm} mm · ${d.rainProbPct}% rain chance`}
                    >
                      <span className="text-[9px] font-bold uppercase text-slate-400">{d.weekday}</span>
                      <AnimatedWeatherIcon condition={d.condition} className="h-4 w-4" iconSize="h-4 w-4" dim={!live} />
                      <span className="text-[10px] font-bold leading-none text-navy">
                        {d.tempMax}°<span className="font-medium text-slate-400">/{d.tempMin}°</span>
                      </span>
                      <span className={`flex items-center gap-0.5 text-[9px] font-bold ${d.rainProbPct >= 50 ? "text-blue-600" : "text-slate-300"}`}>
                        <Droplets className="h-2 w-2" /> {d.rainProbPct}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-navy p-6 text-white">
          <h2 className="font-bold">Rainfall Summary · 5-Day Outlook</h2>
          <p className="mt-0.5 text-xs text-white/60">
            Fed by the Open-Meteo meteorological federation — a blend of GFS, ICON and ECMWF global weather models.
          </p>
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
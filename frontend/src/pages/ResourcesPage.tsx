import { useEffect, useMemo, useState } from "react";
import { Phone, Users, Building, Link2, BookOpen, CloudRain, Radio } from "lucide-react";
import { get, type Shelter, type Contact } from "@/lib/api";

export function ResourcesPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get<Shelter[]>("/shelters"), get<Contact[]>("/contacts")])
      .then(([s, c]) => {
        setShelters(s);
        setContacts(c);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () =>
      shelters.filter(
        (s) =>
          (!onlyOpen || s.isOpen) &&
          (!query || s.district_name.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [shelters, onlyOpen, query]
  );

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-extrabold text-navy">Relief Shelters & Emergency Resources</h1>
          <p className="text-sm text-slate-500">Open evacuation shelters, emergency numbers and useful resources</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Shelters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
            <Building className="h-5 w-5 text-water" /> Evacuation Shelters
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search district or shelter…"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-water"
            />
            <button
              onClick={() => setOnlyOpen(!onlyOpen)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                onlyOpen ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Open only
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((s) => (
            <div key={s.id} className={`rounded-2xl border p-5 shadow-sm ${s.isOpen ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{s.name}</p>
                  <p className="text-xs text-slate-500">{s.district_name}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${s.isOpen ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-500"}`}>
                  {s.isOpen ? "Open" : "Full"}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Occupancy</span>
                    <span>{s.occupancyPct}%</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${s.occupancyPct >= 80 ? "bg-red-500" : s.occupancyPct >= 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${s.occupancyPct}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {s.occupants.toLocaleString()} / {s.capacity.toLocaleString()} persons
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.facilities.map((f) => (
                  <span key={f} className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    {f}
                  </span>
                ))}
              </div>

              <a href={`tel:${s.phone}`} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy/85">
                <Phone className="h-3.5 w-3.5" /> {s.phone}
              </a>
            </div>
          ))}
          {!visible.length && !loading && (
            <p className="col-span-full rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              No shelters match your filters.
            </p>
          )}
        </div>

        {/* Emergency contacts */}
        <h2 className="mt-12 flex items-center gap-2 text-lg font-extrabold text-navy">
          <Phone className="h-5 w-5 text-red-500" /> Emergency Helpline Contacts
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contacts.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                <Phone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-navy">{c.name}</p>
                <p className="text-xs text-slate-500">{c.category} · {c.region}</p>
              </div>
              <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="shrink-0 text-sm font-extrabold text-navy hover:text-water">
                {c.phone}
              </a>
            </div>
          ))}
        </div>

        {/* Useful links */}
        <h2 className="mt-12 flex items-center gap-2 text-lg font-extrabold text-navy">
          <BookOpen className="h-5 w-5 text-water" /> Useful Resources
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: CloudRain, title: "India Meteorological Department", desc: "Official weather forecasts and radar imagery", href: "https://mausam.imd.gov.in" },
            { icon: Radio, title: "NDMA Warning Dissemination", desc: "National Disaster Management Authority updates", href: "https://ndma.gov.in" },
            { icon: Link2, title: "CWC Water Level Data", desc: "Central Water Commission live gauge data", href: "https://cwc.gov.in" },
            { icon: BookOpen, title: "State Disaster Mgmt Plans", desc: "State-level flood response plans and SOPs", href: "/guidelines" },
          ].map((r) => (
            <a
              key={r.title}
              href={r.href}
              target={r.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-water"
            >
              <r.icon className="h-6 w-6 text-water" />
              <p className="mt-3 font-bold text-navy group-hover:text-water">{r.title}</p>
              <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
            </a>
          ))}
        </div>

        {loading && <p className="mt-4 text-sm text-slate-400">Loading resources…</p>}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { ShieldCheck, Footprints, Package, PhoneCall, Home as HomeIcon, HeartPulse } from "lucide-react";
import { get, type Alert } from "@/lib/api";

export interface GuidelineGroup {
  category: string;
  items: string[];
}

const sections = [
  { key: "before", match: /^before/i, icon: ShieldCheck, title: "Before a Flood", color: "text-emerald-600 bg-emerald-50" },
  { key: "during", match: /^during/i, icon: HomeIcon, title: "During a Flood", color: "text-red-600 bg-red-50" },
  { key: "after", match: /^after/i, icon: HeartPulse, title: "After a Flood", color: "text-amber-600 bg-amber-50" },
];

export function GuidelinesPage() {
  const [guidelines, setGuidelines] = useState<GuidelineGroup[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([get<GuidelineGroup[]>("/guidelines"), get<Alert[]>("/alerts/active")])
      .then(([g, a]) => {
        setGuidelines(g);
        setActiveAlerts(a);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Map each fetched guideline group to its matching section.
  const itemsFor = (key: string): string[] => {
    const sec = sections.find((s) => s.key === key);
    if (!sec) return [];
    const grp = guidelines.find((g) => sec.match.test(g.category));
    return grp ? grp.items : [];
  };

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-extrabold text-navy">Flood Safety Guidelines</h1>
          <p className="text-sm text-slate-500">Do’s and don’ts published by the National Disaster Management Authority (NDMA)</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Emergency banner */}
        {activeAlerts.length > 0 && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl bg-red-600 p-5 text-white shadow-lg shadow-red-200">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <PhoneCall className="h-6 w-6" />
            </span>
            <div>
              <p className="font-extrabold">Flood advisory in effect for {activeAlerts.length} district{activeAlerts.length > 1 ? "s" : ""} — avoid flood-prone low-lying areas.</p>
              <p className="text-sm text-red-100">Call 1070 (flood helpline) or 112 (national emergency) if you need rescue or assistance.</p>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {sections.map((s) => {
            const items = itemsFor(s.key);
            return (
              <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${s.color}`}>
                  <s.icon className="h-6 w-6" />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-navy">{s.title}</h2>
                <ul className="mt-3 space-y-2.5">
                  {items.map((item, i) => {
                    const isDo = !/^[✗·]|do not|avoid|never|don't/i.test(item) && !/\bnot\b/i.test(item);
                    return (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${isDo ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {isDo ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-600">{item}</span>
                      </li>
                    );
                  })}
                  {!items.length && <li className="text-sm text-slate-400">Guidelines will appear here once published.</li>}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Preparedness kit */}
        <div className="mt-10 grid gap-6 rounded-2xl bg-navy p-6 text-white lg:grid-cols-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Package className="h-5 w-5 text-amber-300" /> Emergency Kit Checklist
            </h2>
            <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/85">
              {["Drinking water (3-day supply)", "Non-perishable food", "Torch & spare batteries", "First-aid kit & medicines", "Important documents (waterproof)", "Cash & power bank", "Whistle & life jackets", "Blankets & dry clothes", "Mobile phone with charger", "Emergency contact numbers"].map((k) => (
                <li key={k} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  {k}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold">
              <Footprints className="h-5 w-5 text-amber-300" /> Key Evacuation Rules
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/85">
              <li className="flex gap-2"><span className="text-amber-300">1.</span> Move to higher ground immediately when a warning is issued.</li>
              <li className="flex gap-2"><span className="text-amber-300">2.</span> Follow designated evacuation routes — never wade through floodwater.</li>
              <li className="flex gap-2"><span className="text-amber-300">3.</span> Turn off electricity and gas before leaving home.</li>
              <li className="flex gap-2"><span className="text-amber-300">4.</span> Carry your emergency kit and important documents.</li>
              <li className="flex gap-2"><span className="text-amber-300">5.</span> Listen to official announcements on radio/TV and this portal.</li>
            </ul>
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-slate-400">Loading guidelines…</p>}
      </div>
    </div>
  );
}
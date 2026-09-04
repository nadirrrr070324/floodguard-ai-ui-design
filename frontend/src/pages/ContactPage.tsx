import { useState } from "react";
import { Phone, Mail, MapPin, Clock, Send, CheckCircle2, MessageSquareText } from "lucide-react";

export function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", district: "", message: "" });
  const [sent, setSent] = useState(false);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setForm({ name: "", email: "", phone: "", district: "", message: "" });
    setTimeout(() => setSent(false), 6000);
  };

  const cards = [
    { icon: Phone, title: "Emergency Helplines", lines: ["Flood Helpline: 1070", "National Emergency: 112", "NDRF Control: 011-24363260"] },
    { icon: Mail, title: "Email Us", lines: ["support@jalrakshak.gov.in", "press@jalrakshak.gov.in"] },
    { icon: MapPin, title: "Head Office", lines: ["Ministry of Jal Shakti", "Shram Shakti Bhawan, Rafi Marg", "New Delhi - 110001"] },
    { icon: Clock, title: "Working Hours", lines: ["Mon–Sat: 8:00 AM – 8:00 PM", "Emergency cell: 24×7", "Monsoon duty: round the clock"] },
  ];

  return (
    <div className="bg-white">
      <div className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <h1 className="text-2xl font-extrabold text-navy">Contact & Report</h1>
          <p className="text-sm text-slate-500">Reach the national flood monitoring team or report a flood situation</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-white">
                <c.icon className="h-5 w-5" />
              </span>
              <h2 className="mt-3 font-bold text-navy">{c.title}</h2>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {c.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Form */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-navy">
              <MessageSquareText className="h-5 w-5 text-water" /> Report a Flood Situation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              For emergencies call <a href="tel:1070" className="font-bold text-red-600">1070</a> directly. Use this form for non-urgent
              reports and enquiries.
            </p>

            {sent && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" /> Report submitted successfully. Our team will respond shortly.
              </div>
            )}

            <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">Full Name</span>
                <input required value={form.name} onChange={update("name")} placeholder="Your name" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">Phone</span>
                <input required value={form.phone} onChange={update("phone")} placeholder="10-digit mobile" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">Email</span>
                <input type="email" value={form.email} onChange={update("email")} placeholder="you@example.com" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold text-navy">District</span>
                <input value={form.district} onChange={update("district")} placeholder="e.g. Patna, Bihar" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="mb-1 block font-semibold text-navy">Message</span>
                <textarea required value={form.message} onChange={update("message")} rows={4} placeholder="Describe the flood situation, water level, or issue…" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water" />
              </label>
              <div className="sm:col-span-2">
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-saffron px-6 py-2.5 font-bold text-white hover:bg-amber-500">
                  <Send className="h-4 w-4" /> Submit Report
                </button>
              </div>
            </form>
          </div>

          {/* Quick contacts */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-navy p-6 text-white">
              <h2 className="text-lg font-extrabold">State Control Rooms</h2>
              <p className="mt-1 text-sm text-white/60">Round-the-clock flood control rooms in high-risk states</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ["Assam (ASDMA)", "1070"],
                  ["Bihar (BDMC)", "1070"],
                  ["Odisha (OSDMA)", "1070"],
                  ["Uttarakhand", "1070"],
                ].map(([name, line]) => (
                  <div key={name} className="rounded-xl bg-white/10 p-3">
                    <p className="text-sm font-semibold">{name}</p>
                    <a href={`tel:${line}`} className="text-lg font-extrabold text-amber-300">{line}</a>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border-2 border-saffron/40 bg-saffron/5 p-6">
              <h2 className="text-lg font-extrabold text-navy">Emergency Response Tiers</h2>
              <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
                <li className="flex gap-2"><span className="font-bold text-red-600">Immediate danger:</span> Call NDRF 011-24363260 or dial 112.</li>
                <li className="flex gap-2"><span className="font-bold text-amber-600">Flooding water:</span> Flood Helpline 1070 with your location.</li>
                <li className="flex gap-2"><span className="font-bold text-amber-600">Medical emergency:</span> Ambulance 102 · Disaster mgmt 108.</li>
                <li className="flex gap-2"><span className="font-bold text-emerald-600">Road/cyclone alerts:</span> Follow live map and this portal for updates.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
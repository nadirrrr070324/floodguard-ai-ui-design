import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Droplets, Menu, X, Phone } from "lucide-react";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/live-map", label: "Live Map" },
  { to: "/flood-alerts", label: "Alerts" },
  { to: "/siren-system", label: "Sirens" },
  { to: "/emergency", label: "App" },
  { to: "/weather", label: "Weather" },
  { to: "/admin", label: "Admin" },
  { to: "/resources", label: "Resources" },
  { to: "/guidelines", label: "Guidelines" },
  { to: "/contact", label: "Contact" },
];

export function Emblem({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <div
      className={`${className} flex items-center justify-center rounded-full border-2 border-amber-600/70 bg-gradient-to-b from-amber-100 to-amber-200`}
    >
      <svg viewBox="0 0 48 48" className="h-3/4 w-3/4" fill="none">
        <path d="M24 4L20 12H28L24 4Z" fill="#8B7355" />
        <path d="M14 16C14 16 18 12 24 12C30 12 34 16 34 16" stroke="#8B7355" strokeWidth="1.5" />
        <circle cx="24" cy="18" r="2" fill="#8B7355" />
        <path d="M16 20C16 20 20 18 24 18C28 18 32 20 32 20" stroke="#8B7355" strokeWidth="1" />
        <path d="M14 24C14 24 19 22 24 22C29 22 34 24 34 24" stroke="#8B7355" strokeWidth="1" />
        <path d="M12 28C12 28 18 26 24 26C30 26 36 28 36 28" stroke="#8B7355" strokeWidth="1" />
        <path d="M10 32C10 32 17 30 24 30C31 30 38 32 38 32" stroke="#8B7355" strokeWidth="1" />
        <path d="M8 36C8 36 16 34 24 34C32 34 40 36 40 36" stroke="#8B7355" strokeWidth="1.5" />
        <path d="M18 40L24 46L30 40" stroke="#8B7355" strokeWidth="1.5" fill="#8B7355" opacity="0.3" />
      </svg>
    </div>
  );
}

const TICKER = [
  "SEVERE FLOOD WARNING: Brahmaputra above danger level in Assam — stay alert",
  "River levels rising across Bihar (Ganga, Gandak) — monitor live map",
  "Flash flood watch issued for Arunachal Pradesh (Siang basin)",
  "Flood Helpline: 1070 | NDRF: 011-24363260 | National Emergency: 112",
];

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header className="sticky top-0 z-50">
      {/* Top strip */}
      <div className="bg-navy text-white/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-medium">Government of India</span>
            <span className="hidden text-white/40 sm:inline">|</span>
            <span className="hidden text-white/60 sm:inline">Ministry of Jal Shakti</span>
          </div>
          <a href="tel:1070" className="flex items-center gap-1 font-semibold text-red-300 hover:text-red-200">
            <Phone className="h-3 w-3" /> Flood Helpline 1070
          </a>
        </div>
      </div>

      {/* Main bar */}
      <nav
        className={`border-b transition-all ${
          scrolled ? "bg-white/95 shadow-md backdrop-blur" : "bg-white shadow-sm"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
          <Link to="/" className="flex items-center gap-3">
            <Emblem />
            <div className="flex flex-col">
              <span className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight text-navy">
                <Droplets className="h-5 w-5 text-water" /> JalRakshak
              </span>
              <span className="text-[10px] font-medium leading-tight text-navy/60">
                National Flood Information Portal
              </span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive ? "bg-navy text-white" : "text-navy/70 hover:bg-navy/5 hover:text-navy"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>

          <button className="rounded-md p-2 text-navy hover:bg-navy/5 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="border-t bg-white px-4 pb-4 lg:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `block rounded-md px-3 py-2.5 text-sm font-medium ${
                    isActive ? "bg-navy text-white" : "text-navy/70 hover:bg-navy/5"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* Ticker */}
      <div className="flex items-center gap-3 overflow-hidden border-b border-saffron/30 bg-saffron/10">
        <span className="relative z-10 shrink-0 bg-saffron px-3 py-1.5 text-xs font-extrabold text-white">
          LIVE ALERT
        </span>
        <div className="w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-ticker px-4 py-1.5 text-xs font-medium text-saffron">
            {TICKER.map((t, i) => (
              <span key={i} className="mx-8">
                ⚠ {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              <Emblem className="h-11 w-11" />
              <div>
                <p className="font-bold">JalRakshak · जलरक्षक</p>
                <p className="text-xs text-white/50">National Flood Information Portal</p>
              </div>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              Official source for flood alerts, live river levels, weather forecasts and relief shelter
              information across India. Managed by the Ministry of Jal Shakti, Government of India.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded bg-white/10 px-2.5 py-1 font-semibold">
                <span className="text-amber-300">Digital</span> <span className="text-green-300">India</span>
              </span>
              <span className="rounded bg-white/10 px-2.5 py-1">NDMA</span>
              <span className="rounded bg-white/10 px-2.5 py-1">IMD</span>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-saffron">Emergency Numbers</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex justify-between"><span>National Emergency</span><a href="tel:112" className="font-bold text-white hover:text-saffron">112</a></li>
              <li className="flex justify-between"><span>Flood Helpline</span><a href="tel:1070" className="font-bold text-white hover:text-saffron">1070</a></li>
              <li className="flex justify-between"><span>NDRF Control</span><a href="tel:01124363260" className="font-bold text-white hover:text-saffron">011-24363260</a></li>
              <li className="flex justify-between"><span>Ambulance</span><a href="tel:102" className="font-bold text-white hover:text-saffron">102</a></li>
              <li className="flex justify-between"><span>Disaster Mgmt</span><a href="tel:108" className="font-bold text-white hover:text-saffron">108</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-saffron">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.to}>
                  <Link to={n.to} className="text-white/70 hover:text-white">
                    → {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-white/40 sm:flex-row">
          <span>© {new Date().getFullYear()} JalRakshak — National Flood Information Portal, Government of India</span>
          <span>भारत सरकार · जल शक्ति मंत्रालय</span>
        </div>
      </div>
    </footer>
  );
}
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin, Navigation, ShieldAlert, Wifi, WifiOff, BellRing, PhoneCall, Volume2, VolumeX, Siren,
  Copy, Check, Satellite, Radar, Users, Plus, Trash2, ChevronDown, ChevronUp, CircleUserRound,
  TriangleAlert, History,
} from "lucide-react";
import { get, post } from "@/lib/api";
import {
  classifyRiskLocal, buildSmsText, RISK_META, type RiskAssessment,
} from "@/lib/geo";
import {
  loadPrefs, savePrefs, loadContacts, saveContacts, loadAlerts, pushAlert, clearAlerts,
  loadCache, saveCache, enqueueSms, queuedSms, dequeueSms, type TrustedContact,
  type AppPrefs, type CacheBundle, type LocalAlertEntry,
} from "@/lib/store";
import {
  LANGS, FLASH_FLOOD_STEPS, SURVIVAL_CHECKLIST, FIRST_AID, HELPLINE_INFO, PANIC_MESSAGE,
  VOICE_SCRIPT, speak, stopSpeaking, safeExit, type Lang,
} from "@/lib/protocol";
import { OfflineSafetyMap } from "@/components/OfflineSafetyMap";

const STATIONS: { label: string; lat: number; lng: number; note: string }[] = [
  { label: "Inside Guwahati critical zone", lat: 26.14, lng: 91.73, note: "Extreme danger demo" },
  { label: "Inside Patna high-risk zone", lat: 25.6, lng: 85.1, note: "High risk demo" },
  { label: "Inside Silchar moderate zone", lat: 24.8, lng: 92.8, note: "Medium risk demo" },
  { label: "Vijayawada — outside zones", lat: 16.5, lng: 80.66, note: "Low risk demo" },
  { label: "Far from any alert (Rajpur)", lat: 30.42, lng: 78.06, note: "Low risk demo" },
];

const GARAGE_NOTICE =
  "Location is used only to compute your flood risk. You can opt out anytime — the app then uses your last known safe position.";

function useNow(tickMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), tickMs);
    return () => clearInterval(t);
  }, [tickMs]);
  return now;
}

export function EmergencyAppPage() {
  const prefsRef = useRef<AppPrefs>(loadPrefs());
  const contactRef = useRef<TrustedContact[]>(loadContacts());

  const [prefs, setPrefs] = useState<AppPrefs>(prefsRef.current);
  const [contacts, setContacts] = useState<TrustedContact[]>(contactRef.current);
  const [position, setPosition] = useState<{ lat: number; lng: number; source: "gps" | "manual" } | null>(
    prefsRef.current.manual ? { ...prefsRef.current.manual, source: "manual" } : null
  );
  const [risk, setRisk] = useState<RiskAssessment | null>(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [useCache, setUseCache] = useState<CacheBundle | null>(loadCache());
  const [alarmed, setAlarmed] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [history, setHistory] = useState<LocalAlertEntry[]>(loadAlerts());
  const [showHistory, setShowHistory] = useState(false);
  const [name, setName] = useState(prefsRef.current.name);
  const [newContact, setNewContact] = useState({ name: "", phone: "" });
  const [sosMsg, setSosMsg] = useState<{ text: string; to: number; queued: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [assessing, setAssessing] = useState(false);
  const now = useNow(1000);

  // Offline Safety Protocol state
  const [protocolLang, setProtocolLang] = useState<Lang>("en");
  const [protocolTab, setProtocolTab] = useState<"steps" | "checklist" | "firstaid" | "sos" | "route">("steps");
  const [checked, setChecked] = useState<string[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const speakStopRef = useRef<(() => void) | null>(null);
  const protocolRef = useRef<HTMLDivElement | null>(null);
  const [offlineMode, setOfflineMode] = useState(false);
  const alarmedRef = useRef(false);

  const watchId = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const vibrateTimer = useRef<number | null>(null);
  const assessingRef = useRef(false);
  const gestureRef = useRef(false);

  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastId = useRef(0);
  const toast = (text: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  };

  useEffect(() => {
    const onLine = () => { setOnline(true); flushQueue(); };
    const offLine = () => {
      setOnline(false);
      // Offline Safety Protocol — auto-activate with a calm guide when connection
      // drops, so users have survival steps regardless of any live alert.
      if (!alarmedRef.current) {
        setDismissed(false);
        setAlarmed(true);
        setOfflineMode(true);
        maybeQueuedOfflineSms();
        if (gestureRef.current) speakStopRef.current = speak(VOICE_SCRIPT[protocolLang], { lang: protocolLang });
      }
    };
    window.addEventListener("online", onLine);
    window.addEventListener("offline", offLine);
    const gesture = () => { gestureRef.current = true; };
    window.addEventListener("pointerdown", gesture, { once: true });
    return () => {
      window.removeEventListener("online", onLine);
      window.removeEventListener("offline", offLine);
      window.removeEventListener("pointerdown", gesture);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contacts]);

  // ---- data sync: keep offline cache fresh whenever online ------------------
  const syncCache = useCallback(async () => {
    try {
      const [zones, levels, weather, alerts, shelters, sirens] = await Promise.all([
        get<any>("/flood-zones"),
        get<any>("/water-levels"),
        get<any>("/weather"),
        get<any>("/alerts"),
        get<any>("/shelters"),
        get<any>("/sirens"),
      ]);
      saveCache({ zones, levels, weather, alerts, shelters, sirens });
      setUseCache(loadCache());
    } catch {
      /* keep existing cache */
    }
  }, []);

  useEffect(() => {
    syncCache();
    const t = setInterval(() => {
      if (navigator.onLine) syncCache();
    }, 60000);
    return () => clearInterval(t);
  }, [syncCache]);

  // ---- risk assessment -------------------------------------------------------
  const assess = useCallback(async (lat: number, lng: number, source: "gps" | "manual") => {
    if (assessingRef.current) return;
    assessingRef.current = true;
    setAssessing(true);
    try {
      let result: RiskAssessment | null = null;
      if (navigator.onLine) {
        try {
          const r = await get<RiskAssessment>(`/risk/${lat}/${lng}`);
          result = { ...r, source: "live" };
        } catch {
          result = null;
        }
      }
      if (!result && useCache) {
        result = classifyRiskLocal(lat, lng, useCache);
      }
      if (!result) {
        result = {
          latitude: lat, longitude: lng, riskLevel: "low", riskScore: 0,
          timestamp: new Date().toISOString(), reasons: ["No cached risk map available"],
          zone: null, nearestShelter: null, activeAlerts: [], source: "cache",
        };
      }
      setRisk(result);
      const all = pushAlert({ ...result, dismissed: false });
      setHistory(all);
      if (result.riskLevel === "high" || result.riskLevel === "extreme") {
        setDismissed(false);
        setAlarmed(true);
        setOfflineMode(!navigator.onLine);
        queueAutoSms(result, `Auto warning (${riskLabel(result)})`);
      } else if (!navigator.onLine) {
        // Keep the calm offline protocol active even at low risk when offline.
        setDismissed(false);
        setAlarmed(true);
        setOfflineMode(true);
      } else {
        setAlarmed(false);
        setOfflineMode(false);
        setDismissed(false);
      }
    } finally {
      assessingRef.current = false;
      setAssessing(false);
    }
  }, [useCache, contacts]);

  const riskLabel = (r: RiskAssessment) => RISK_META[r.riskLevel].label;

  // ---- GPS tracking ----------------------------------------------------------
  const startTracking = useCallback(() => {
    setGpsBusy(true);
    setGpsError(null);
    
    if (!("geolocation" in navigator)) {
      setGpsError("Geolocation is not supported on this device/browser.");
      setGpsBusy(false);
      return;
    }
    
    const ok = (pos: GeolocationPosition) => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" as const };
      setPosition(p);
      setGpsBusy(false);
      setGpsError(null);
      assess(p.lat, p.lng, "gps");
      toast("Location tracking enabled");
    };
    const err = (e: GeolocationPositionError) => {
      let errorMsg = "Unable to fetch location.";
      if (e.code === e.PERMISSION_DENIED) {
        errorMsg = "Location permission denied. Please enable location access in your browser settings.";
      } else if (e.code === e.POSITION_UNAVAILABLE) {
        errorMsg = "Location information is unavailable.";
      } else if (e.code === e.TIMEOUT) {
        errorMsg = "Location request timed out.";
      }
      setGpsError(errorMsg);
      setGpsBusy(false);
    };
    const id = navigator.geolocation.watchPosition(ok, err, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000,
    });
    watchId.current = id;
  }, [assess]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setGpsBusy(false);
    // Don't clear the error immediately, let the user see what happened
  }, []);

  const applyPrefs = (p: AppPrefs) => {
    prefsRef.current = p;
    savePrefs(p);
    setPrefs(p);
  };

  const toggleTracking = async (on: boolean) => {
    applyPrefs({ ...prefs, tracking: on });
    if (on) {
      // Clear previous error before starting
      setGpsError(null);
      await startTracking();
    } else {
      stopTracking();
      toast("Location tracking disabled");
    }
  };

  const nameRef = useRef(name);
  nameRef.current = name;
  useEffect(() => {
    const t = setTimeout(() => {
      if (nameRef.current.trim() && nameRef.current !== prefsRef.current.name) {
        applyPrefs({ ...prefsRef.current, name: nameRef.current.trim() });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [name]);

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  // Boot: resume last session — resume GPS or re-assess a saved manual position.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    
    if (prefs.tracking) startTracking();
    else if (position) assess(position.lat, position.lng, position.source);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- alarm: sound + vibration ---------------------------------------------
  const ensureAudio = () => {
    if (!audioCtx.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) audioCtx.current = new Ctx();
    }
    return audioCtx.current;
  };

  const startSiren = (): (() => void) | undefined => {
    if (!gestureRef.current) return undefined;
    const ctx = ensureAudio();
    if (!ctx || ctx.state !== "running") ctx?.resume().catch(() => {});
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sawtooth";
    gain.gain.value = 0.04;
    osc.connect(gain).connect(ctx!.destination);
    osc.start();
    let step = 0;
    const lfo = setInterval(() => {
      const f = step % 2 === 0 ? 900 : 620;
      osc.frequency.setValueAtTime(f, ctx!.currentTime);
      step++;
    }, 260);
    return () => {
      clearInterval(lfo);
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    };
  };

  useEffect(() => {
    let stopSound: (() => void) | null | undefined = null;
    // Calm offline mode: show the survival guide WITHOUT a blaring siren to avoid panic.
    const playAlarm = alarmed && !offlineMode;
    if (playAlarm) {
      const doSound = () => { stopSound = startSiren(); };
      if (gestureRef.current) doSound();
      else {
        const once = () => { doSound(); window.removeEventListener("pointerdown", once); };
        window.addEventListener("pointerdown", once);
      }
      const blow = () => {
        if ("vibrate" in navigator && document.hasFocus()) {
          navigator.vibrate([900, 300, 900, 300, 1200]);
        }
      };
      blow();
      vibrateTimer.current = window.setInterval(blow, 4500);
    }
    return () => {
      stopSound?.();
      if (vibrateTimer.current !== null) window.clearInterval(vibrateTimer.current);
    };
  }, [alarmed, offlineMode]);

  const ringing = !!alarmed;

  // ---- auto SMS + SOS + queue/flush ------------------------------------------
  const smsBody = (r: RiskAssessment) =>
    buildSmsText({
      name: prefs.name,
      location: [r.latitude, r.longitude],
      riskLevel: r.riskLevel,
      timestamp: r.timestamp,
      nearestShelter: r.nearestShelter ? `${r.nearestShelter.name} (${r.nearestShelter.distanceKm} km)` : "see live map",
    });

  const queueAutoSms = (r: RiskAssessment, tag: string) => {
    const body = smsBody(r);
    let queued = 0;
    for (const c of contactRef.current) {
      if (navigator.onLine) {
        post("/sms", { to: c.phone, message: body }).catch(() => enqueueSms(c.phone, body));
      } else {
        enqueueSms(c.phone, body);
        queued++;
      }
    }
    if (contactRef.current.length) {
      toast(`${tag}: sms dispatched to ${contactRef.current.length} contact(s), ${queued} queued offline`);
    }
  };

  const maybeQueuedOfflineSms = () => {
    // When network drops, queue an alert to trusted contacts so the system
    // auto-sends once signal returns (requirement: queue + auto-send on reconnect).
    if (position) {
      let queued = 0;
      for (const c of contactRef.current) {
        enqueueSms(
          c.phone,
          buildSmsText({
            name: prefs.name,
            location: [position.lat, position.lng],
            riskLevel: risk?.riskLevel || "medium",
            timestamp: new Date().toISOString(),
            nearestShelter: risk?.nearestShelter ? `${risk.nearestShelter.name} (${risk.nearestShelter.distanceKm} km)` : "see live map",
          })
        );
        queued++;
      }
      if (queued) toast(`${queued} offline alert SMS queued — will send on reconnect`);
    }
  };

  const sos = () => {
    if (!position) {
      toast("Enable GPS or set a location to send SOS");
      return;
    }
    const base: RiskAssessment = {
      ...(risk || {
        latitude: position.lat, longitude: position.lng, riskLevel: "medium", riskScore: 33,
        timestamp: new Date().toISOString(), reasons: [], zone: null, nearestShelter: null,
        activeAlerts: [], source: "cache",
      }),
      latitude: position.lat,
      longitude: position.lng,
    };
    const body = smsBody(base);
    const localList = contacts.length ? contacts : contactRef.current;
    let queued = 0;
    let fired = 0;
    for (const c of localList) {
      if (navigator.onLine) {
        post("/sms", { to: c.phone, message: body }).catch(() => enqueueSms(c.phone, body));
        fired++;
      } else {
        enqueueSms(c.phone, body);
        queued++;
      }
    }
    if (!localList.length) {
      const fallback = STATIONS[0].label;
      enqueueSms("(no contacts — add below)", body);
      queued++;
    }
    // On mobile, also hand off to the native SMS composer for immediate action.
    if (localList.length && /android|iphone|ipad|mobile/i.test(navigator.userAgent)) {
      const first = localList[0].phone.replace(/\D/g, "");
      window.location.href = `sms:${first}?&body=${encodeURIComponent(body)}`;
    }
    setSosMsg({ text: body, to: localList.length, queued });
    navigator.vibrate?.([500, 200, 500]);
    toast("SOS dispatched to your trusted contacts");
  };

  const flushQueue = async () => {
    const q = queuedSms();
    if (!q.length) return;
    let sent = 0;
    const done: string[] = [];
    for (const item of q) {
      try {
        await post("/sms", { to: item.to, message: item.message });
        sent++;
        done.push(item.id);
      } catch {
        break;
      }
    }
    if (done.length) dequeueSms(done);
    if (sent) toast(`${sent} queued SMS sent after reconnect`);
  };

  // SMS display throttling for `now` re-renders -> avoid stale "sos" only
  // ---- manual simulate --------------------------------------------------------
  const simulate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const st = STATIONS.find((x) => x.label === e.target.value);
    if (!st) return;
    const pos = { lat: st.lat, lng: st.lng, source: "manual" as const };
    setPosition(pos);
    applyPrefs({ ...prefs, manual: { lat: st.lat, lng: st.lng } });
    assess(st.lat, st.lng, "manual");
    toast(`Simulated location: ${st.label}`);
  };

  const dismissAlarm = () => {
    setAlarmed(false);
    setOfflineMode(false);
    setDismissed(true);
    stopSpeaking();
    setSpeaking(false);
    navigator.vibrate?.(0);
    toast("Protocol dismissed. Stay alert.");
  };

  // Keep alarmedRef in sync for the offline handler + cleanup speech on close.
  useEffect(() => {
    alarmedRef.current = alarmed;
    if (!alarmed) {
      stopSpeaking();
      setSpeaking(false);
    }
    return () => stopSpeaking();
  }, [alarmed]);

  const clear = () => {
    clearAlerts();
    setHistory([]);
    toast("Local history cleared");
  };

  const mark = RISK_META[risk?.riskLevel ?? "low"];

  return (
    <div className="bg-slate-100 pb-28">
      {/* Phone-style container */}
      <div className="mx-auto max-w-md px-0 pb-4 pt-0 sm:px-4 sm:pt-6">
        {/* App header */}
        <div className="sticky top-[112px] z-30 border-b border-slate-200 bg-white/95 backdrop-blur sm:rounded-t-2xl sm:border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-navy text-white">
                <Siren className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-extrabold leading-none text-navy">JalRakshak · Citizen App</p>
                <p className="mt-0.5 text-[11px] text-slate-500">24×7 flood risk monitor</p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                online ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {online ? "Live" : "Offline"}
            </span>
          </div>
        </div>

        {/* Offline banner */}
        {!online && (
          <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
            <Satellite className="h-4 w-4 shrink-0" />
            Offline mode — using cached risk maps &amp; last-synced data. Alerts and SMS messages are stored locally and sent on reconnect.
          </div>
        )}

        {/* Tracking control */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${prefs.tracking ? "bg-water/10 text-water" : "bg-slate-100 text-slate-400"}`}>
                <Navigation className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-navy">Live Location Monitoring</p>
                <p className="text-[11px] text-slate-500">
                  {prefs.tracking ? "Tracking your GPS for geofenced danger alerts" : "Tracking is OFF — you won't get auto alerts"}
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleTracking(!prefs.tracking)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs.tracking ? "bg-water" : "bg-slate-300"}`}
              aria-label="Toggle tracking"
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${prefs.tracking ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>

          {position && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-water" />
              <div className="text-slate-600">
                <p className="font-semibold text-navy">
                  {position.source === "gps" ? "Live GPS fix" : "Manual / simulated location"} ·{" "}
                  <span className="tabular-nums">{position.lat.toFixed(5)}, {position.lng.toFixed(5)}</span>
                </p>
                <p className="mt-0.5">Last change: {new Date(now).toLocaleTimeString("en-IN")}</p>
              </div>
            </div>
          )}
          {gpsError && (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="flex-1">
                <p>{gpsError}</p>
                {gpsError.includes("permission denied") && (
                  <button
                    onClick={() => {
                      setGpsError(null);
                      // Try to request permission again by attempting to get current position
                      navigator.geolocation.getCurrentPosition(
                        (pos) => {
                          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, source: "gps" as const };
                          setPosition(p);
                          assess(p.lat, p.lng, "gps");
                          toast("Location access granted!");
                        },
                        (e) => {
                          if (e.code === e.PERMISSION_DENIED) {
                            setGpsError("Permission still denied. Please enable location in browser settings.");
                          } else {
                            setGpsError(e.message || "Unable to fetch location.");
                          }
                        },
                        { enableHighAccuracy: true, timeout: 10000 }
                      );
                    }}
                    className="mt-1 text-xs font-bold underline hover:text-red-800"
                  >
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
          <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] leading-relaxed text-slate-400">{GARAGE_NOTICE}</p>
        </div>

        {/* Simulate */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            <Radar className="h-4 w-4" /> Demo — simulate a location
          </label>
          <select onChange={simulate} className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-water">
            <option value="">Choose a station…</option>
            {STATIONS.map((s) => (
              <option key={s.label} value={s.label}>{s.label} — {s.note}</option>
            ))}
          </select>
        </div>

        {/* Risk card */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Live Risk Classification</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${risk?.source === "live" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {risk?.source === "live" ? "Live data" : "Cached data"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-4">
            {/* Gauge */}
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke={mark.color} strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${(risk?.riskScore ?? 0) * 2.64} 999`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-navy tabular-nums">{risk?.riskScore ?? "–"}</span>
                <span className="text-[10px] font-bold uppercase text-slate-400">risk index</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-extrabold" style={{ color: mark.color }}>{mark.label}</p>
              <p className="text-[11px] text-slate-500">
                {assessing ? "Analyzing live flood & rainfall data…" : risk ? `Updated ${new Date(risk.timestamp).toLocaleTimeString("en-IN")}` : "No assessment yet"}
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(Object.keys(RISK_META) as (keyof typeof RISK_META)[]).map((k) => (
                  <span key={k} className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase ${RISK_META[k].cls}`}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: RISK_META[k].color }} />
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {risk?.reasons.length ? (
            <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
              {risk.reasons.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-xs text-slate-600">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" /> {r}
                </li>
              ))}
            </ul>
          ) : null}

          {risk?.activeAlerts?.length ? (
            <div className="mt-3 rounded-xl bg-red-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase text-red-700">Active advisories in effect</p>
              <p className="mt-0.5 text-xs text-red-800">{risk.activeAlerts.map((a) => a.title).join(" · ")}</p>
            </div>
          ) : null}
        </div>

        {/* Shelter */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Nearest Open Shelter</p>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">OPEN</span>
          </div>
          {risk?.nearestShelter ? (
            <div className="mt-2 flex items-center justify-between gap-2">
              <div>
                <p className="font-bold text-navy">{risk.nearestShelter.name}</p>
                <p className="text-xs text-slate-500">{risk.nearestShelter.distanceKm} km away · {risk.nearestShelter.facilities.join(", ")}</p>
              </div>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${risk.nearestShelter.latitude},${risk.nearestShelter.longitude}`}
                target="_blank" rel="noreferrer"
                className="shrink-0 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy/85"
              >
                Navigate
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Select a location or enable GPS to find the nearest shelter.</p>
          )}
        </div>

        {/* Contacts */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4" /> Trusted Emergency Contacts <span className="rounded bg-navy px-1.5 text-[10px] text-white">{contacts.length}</span>
            </p>
            <span className="text-[10px] font-semibold text-slate-400">stored encrypted</span>
          </div>

          <div className="mt-2 flex gap-2">
            <input
              value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              placeholder="Contact name" className="w-1/2 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-water"
            />
            <input
              value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value.replace(/[^\d+ ]/g, "") })}
              placeholder="+91 …" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-water"
            />
            <button
              onClick={() => {
                if (!newContact.name.trim() || !newContact.phone.trim()) return;
                const c: TrustedContact = { id: `c${Date.now()}`, name: newContact.name.trim(), phone: newContact.phone.trim() };
                const list = [...contacts, c];
                contactRef.current = list;
                setContacts(list);
                saveContacts(list);
                setNewContact({ name: "", phone: "" });
                toast("Contact added & encrypted");
              }}
              className="inline-flex items-center justify-center rounded-lg bg-water px-3 text-white hover:bg-water-deep"
              aria-label="Add contact"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {contacts.length ? (
            <ul className="mt-3 space-y-1.5">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <CircleUserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-semibold text-navy">{c.name}</span>
                    <span className="text-slate-400 tabular-nums">{c.phone}</span>
                  </span>
                  <button
                    onClick={() => {
                      const list = contacts.filter((x) => x.id !== c.id);
                      contactRef.current = list;
                      setContacts(list);
                      saveContacts(list);
                      toast("Contact removed");
                    }}
                    className="text-slate-400 hover:text-red-600"
                    aria-label="Delete contact"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-400">Add family or friends — SOS will notify them with your location and status.</p>
          )}
        </div>

        {/* History */}
        <div className="mx-3 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <button onClick={() => setShowHistory(!showHistory)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <History className="h-4 w-4" /> Local Alert History <span className="rounded bg-slate-100 px-1.5 text-[10px] text-slate-500">{history.length}</span>
            </span>
            {history.length ? (
              <span className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); clear(); }} className="text-[11px] font-semibold text-red-500" aria-label="Clear history">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                {showHistory ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </span>
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {showHistory && (
            <ul className="max-h-56 overflow-y-auto border-t border-slate-100">
              {history.map((h, i) => (
                <li key={h.timestamp + i} className="flex items-center justify-between border-b border-slate-50 px-4 py-2.5 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: RISK_META[h.riskLevel].color }} />
                    <span className="font-semibold text-navy">{h.riskLevel}</span>
                    <span className="text-[11px] text-slate-400 capitalize">{h.source}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    {new Date(h.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {h.riskScore}
                  </span>
                </li>
              ))}
              {!history.length && <li className="px-4 py-4 text-center text-xs text-slate-400">No local assessments recorded yet.</li>}
            </ul>
          )}
        </div>

        {/* Profile */}
        <div className="mx-3 mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Citizen name (for SMS)</label>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Your name" className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-water"
          />
        </div>

        {/* SOS message preview */}
        {sosMsg && (
          <div className="mx-3 mt-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-extrabold text-red-700">
                <BellRing className="h-4 w-4" /> Emergency SMS
              </p>
              <span className="text-[11px] font-semibold text-red-500">
                {sosMsg.to || "—"} contact(s) · {sosMsg.queued ? `${sosMsg.queued} queued offline` : "sent live"}
              </span>
            </div>
            <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[11px] leading-relaxed text-slate-700">{sosMsg.text}</pre>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => { navigator.clipboard?.writeText(sosMsg.text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white hover:bg-navy/85"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy message"}
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(sosMsg.text)}`} target="_blank" rel="noreferrer"
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Share via WhatsApp
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-3">
          <div className="flex flex-col items-center">
            <span className={`flex h-6 w-6 items-center justify-center ${ringing ? "text-red-600" : "text-slate-400"}`}>
              {alarmed ? <BellRing className="h-5 w-5 animate-pulse" /> : <Navigation className="h-5 w-5" />}
            </span>
            <span className="text-[10px] font-semibold text-slate-500">{ringing ? "ALARM" : prefs.tracking ? "Tracking" : "Off"}</span>
          </div>
          <button
            onClick={sos}
            className={`flex h-16 w-16 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-95 ${ringing ? "animate-pulse bg-red-700" : "bg-red-600"}`}
            style={{ boxShadow: "0 8px 24px rgba(220,38,38,0.45)" }}
            aria-label="SOS"
          >
            <span className="text-center text-[11px] font-extrabold leading-tight">SOS<br />ALERT</span>
          </button>
          <div className="flex flex-col items-center">
            <span className="flex h-6 w-6 items-center justify-center text-slate-400"><Users className="h-5 w-5" /></span>
            <span className="text-[10px] font-semibold text-slate-500">{contacts.length} contacts</span>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none fixed left-1/2 top-4 z-[200] w-[92%] max-w-sm -translate-x-1/2 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="rounded-xl bg-navy/95 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-lg">
            {t.text}
          </div>
        ))}
      </div>

      {/* ================= OFFLINE SAFETY PROTOCOL (full screen) ================= */}
      {alarmed && (
        <div ref={protocolRef} className="fixed inset-0 z-[150] flex flex-col overflow-y-auto bg-slate-950 text-white">
          {/* Top bar */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/15 bg-slate-950/95 px-4 py-3 backdrop-blur">
            <button
              onClick={() => { stopTracking(); toggleTracking(false); }}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-white/70 hover:text-white"
            >
              <VolumeX className="h-4 w-4" /> Light mode
            </button>
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setProtocolLang(l.code)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${protocolLang === l.code ? "bg-white text-slate-900" : "text-white/70"}`}
                >
                  {l.native}
                </button>
              ))}
            </div>
            <button onClick={dismissAlarm} className="inline-flex items-center gap-1.5 text-xs font-bold uppercase text-white/70 hover:text-white">
              <ShieldAlert className="h-4 w-4" /> I'm Safe
            </button>
          </div>

          {/* Panic-reduction hero */}
          <div className="px-4 pt-5 text-center">
            <div className="mx-auto inline-flex items-center gap-3 rounded-full bg-red-600/30 px-5 py-2 ring-1 ring-red-500/50">
              <Siren className="h-5 w-5 animate-pulse text-red-400" />
              <span className="text-sm font-extrabold uppercase tracking-widest text-red-300">
                {offlineMode
                  ? "Offline Safety Protocol"
                  : risk?.riskLevel === "extreme"
                    ? "Extreme Danger"
                    : "High Risk Alert"}
              </span>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-lg font-semibold leading-relaxed text-white sm:text-xl">
              {offlineMode
                ? "You are offline. This survival guide was stored on your device and works without any network. Stay calm and follow the steps below."
                : PANIC_MESSAGE[protocolLang]}
            </p>
            <p className="mt-2 text-xs text-white/60 tabular-nums">
              📍 {risk?.latitude.toFixed(5)}, {risk?.longitude.toFixed(5)} · {new Date(risk?.timestamp || now).toLocaleTimeString("en-IN")}
              {!online && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 font-bold text-amber-300">OFFLINE MODE</span>}
            </p>

            {/* Voice guidance */}
            <div className="mx-auto mt-4 flex max-w-md items-center justify-center gap-2">
              <button
                onClick={() => {
                  if (speaking) {
                    stopSpeaking();
                    setSpeaking(false);
                  } else {
                    speakStopRef.current = speak(VOICE_SCRIPT[protocolLang], { lang: protocolLang });
                    setSpeaking(true);
                  }
                }}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold ${speaking ? "bg-amber-400 text-slate-900" : "bg-white text-slate-900"}`}
              >
                {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                {speaking ? "Stop voice" : "▶ Voice guidance (offline)"}
              </button>
            </div>
          </div>

          {/* Why this alert */}
          {risk?.reasons?.length ? (
            <div className="mx-4 mt-5 rounded-2xl bg-red-950/60 p-4 ring-1 ring-red-500/30">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Why this alert</p>
              <ul className="mt-1 space-y-0.5 text-sm">
                {risk.reasons.map((r) => <li key={r} className="text-white/90">• {r}</li>)}
              </ul>
            </div>
          ) : null}

          {/* Tabs */}
          <div className="sticky top-[48px] z-10 mt-5 grid grid-cols-5 gap-1 bg-slate-950/95 px-3 py-2 backdrop-blur">
            {(
              [
                ["steps", "1️⃣ Steps"],
                ["checklist", "🛟 Kit"],
                ["firstaid", "⛑️ First aid"],
                ["route", "🗺️ Route"],
                ["sos", "📞 SOS"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setProtocolTab(k)}
                className={`rounded-lg px-1 py-2 text-[11px] font-bold ${protocolTab === k ? "bg-white text-slate-900" : "bg-white/5 text-white/70 hover:bg-white/10"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-28 pt-2">
            {protocolTab === "steps" && (
              <div>
                <h2 className="text-base font-extrabold text-amber-300">Flood Safety Protocol — follow in order</h2>
                <ol className="mt-3 space-y-2.5">
                  {FLASH_FLOOD_STEPS[protocolLang].map((step, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-extrabold text-slate-900">
                        {i + 1}
                      </span>
                      <span className="pt-1 text-base font-medium leading-relaxed text-white">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {protocolTab === "checklist" && (
              <div>
                <h2 className="text-base font-extrabold text-emerald-300">Emergency Survival Checklist</h2>
                <p className="mt-1 text-sm text-white/60">Tick off items as you prepare your kit.</p>
                <div className="mt-3 space-y-2">
                  {SURVIVAL_CHECKLIST[protocolLang].map((it) => {
                    const on = checked.includes(it.item);
                    return (
                      <button
                        key={it.item}
                        onClick={() => setChecked((c) => (on ? c.filter((x) => x !== it.item) : [...c, it.item]))}
                        className={`flex w-full items-center gap-3 rounded-2xl p-4 text-left ring-1 transition-colors ${on ? "bg-emerald-500/20 ring-emerald-500/40" : "bg-white/5 ring-white/10"}`}
                      >
                        <span className="text-2xl">{it.icon}</span>
                        <span className={`flex-1 text-base font-semibold ${on ? "text-emerald-200 line-through" : "text-white"}`}>{it.item}</span>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${on ? "border-emerald-400 bg-emerald-400 text-slate-900" : "border-white/40"}`}>
                          {on ? <Check className="h-4 w-4" /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setChecked([])}
                  className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/20"
                >
                  Reset checklist
                </button>
              </div>
            )}

            {protocolTab === "firstaid" && (
              <div>
                <h2 className="text-base font-extrabold text-sky-300">First-Aid Instructions</h2>
                <ol className="mt-3 space-y-2.5">
                  {FIRST_AID[protocolLang].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-400 text-xs font-extrabold text-slate-900">{i + 1}</span>
                      <span className="pt-1 text-sm font-medium leading-relaxed text-white">{f}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {protocolTab === "route" && (
              <div>
                <h2 className="text-base font-extrabold text-emerald-300">Offline Safe Route</h2>
                <p className="mt-1 text-sm text-white/60">Cached map — works without any network.</p>
                {risk ? (
                  <div className="mt-3 overflow-hidden rounded-2xl ring-1 ring-white/15">
                    <OfflineSafetyMap
                      latitude={risk.latitude}
                      longitude={risk.longitude}
                      zones={useCache?.zones ?? []}
                      shelters={useCache?.shelters ?? []}
                      riskLevel={risk.riskLevel}
                    />
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-white/50">Location required to show your position.</p>
                )}
                {risk && (() => {
                  const exit = safeExit([risk.latitude, risk.longitude], risk.zone);
                  return (
                    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-emerald-500/15 p-4 ring-1 ring-emerald-500/30">
                      <span className="text-3xl">{exit.dirEmoji}</span>
                      <p className="text-sm font-semibold text-emerald-100">{exit.bearingHint}</p>
                    </div>
                  );
                })()}
                {risk?.nearestShelter && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-400">Nearest open shelter</p>
                      <p className="font-bold">{risk.nearestShelter.name}</p>
                      <p className="text-sm text-white/60">{risk.nearestShelter.distanceKm} km · {risk.nearestShelter.facilities.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {protocolTab === "sos" && (
              <div>
                <h2 className="text-base font-extrabold text-red-300">SOS Information</h2>
                <div className="mt-3 space-y-2">
                  <div className="rounded-2xl bg-red-600/20 p-4 ring-1 ring-red-500/40">
                    <p className="text-[10px] font-bold uppercase text-red-400">Emergency helplines</p>
                    {HELPLINE_INFO[protocolLang].map((h) => (
                      <a key={h.number} href={`tel:${h.number.replace(/\D/g, "")}`} className="mt-1.5 flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
                        <span className="font-semibold">{h.label} <span className="text-white/50">· {h.note}</span></span>
                        <span className="font-extrabold text-amber-300">{h.number}</span>
                      </a>
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-sm font-bold text-white/80">Your family emergency contacts</p>
                {contacts.length ? (
                  <ul className="mt-2 space-y-1.5">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                        <span className="font-semibold">{c.name}</span>
                        <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="font-bold text-sky-300">{c.phone}</a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-white/50">No trusted contacts added yet. Add them from the main app screen.</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href="tel:1070" className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold"><PhoneCall className="h-4 w-4" /> 1070</a>
                  <a href="tel:112" className="inline-flex items-center gap-1.5 rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-bold text-slate-900"><PhoneCall className="h-4 w-4" /> 112</a>
                </div>
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-3 gap-2 border-t border-white/15 bg-slate-950/95 px-4 py-3 backdrop-blur">
            <button onClick={sos} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 px-3 py-3 text-sm font-extrabold">
              <Siren className="h-4 w-4" /> SOS
            </button>
            <button
              onClick={dismissAlarm}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-3 text-sm font-bold text-white/80 hover:bg-white/20"
            >
              <ShieldAlert className="h-4 w-4" /> I'm Safe
            </button>
            <button
              onClick={() => {
                if (speaking) { stopSpeaking(); setSpeaking(false); }
                else { speakStopRef.current = speak(VOICE_SCRIPT[protocolLang], { lang: protocolLang }); setSpeaking(true); }
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-3 text-sm font-bold ${speaking ? "bg-amber-400 text-slate-900" : "bg-white/10 text-white/80 hover:bg-white/20"}`}
            >
              {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />} {speaking ? "Stop" : "Voice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
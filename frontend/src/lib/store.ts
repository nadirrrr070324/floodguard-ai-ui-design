import type { Siren } from "@/lib/api";
import type { LocalCachedData, RiskAssessment } from "@/lib/geo";

const NS = "fg:";

// ---------------------------------------------------------------------------
// Offline cache — risk maps + last-synced disaster data for offline use.
// ---------------------------------------------------------------------------

export interface CacheBundle extends LocalCachedData {
  sirens: Siren[];
}

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(NS + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — degrade silently */
  }
}

export function loadCache(): CacheBundle | null {
  return read<CacheBundle>("cache");
}

export function saveCache(data: CacheBundle): void {
  write("cache", { ...data, updatedAt: new Date().toISOString() });
}

// ---------------------------------------------------------------------------
// SMS queue — messages generated offline, flushed when network returns.
// ---------------------------------------------------------------------------

export interface QueuedSms {
  id: string;
  to: string;
  message: string;
  createdAt: string;
}

export function queuedSmsCount(): number {
  return queuedSms().length;
}

export function queuedSms(): QueuedSms[] {
  return read<QueuedSms[]>("sms-queue") || [];
}

export function enqueueSms(to: string, message: string): QueuedSms {
  const q = queuedSms();
  const item: QueuedSms = { id: `q${Date.now()}`, to, message, createdAt: new Date().toISOString() };
  q.push(item);
  write("sms-queue", q);
  return item;
}

export function dequeueSms(ids: string[]): void {
  write("sms-queue", queuedSms().filter((x) => !ids.includes(x.id)));
}

// ---------------------------------------------------------------------------
// Local alert history — stored on device so it survives offline sessions.
// ---------------------------------------------------------------------------

export interface LocalAlertEntry extends RiskAssessment {
  dismissed?: boolean;
}

export function loadAlerts(): LocalAlertEntry[] {
  return read<LocalAlertEntry[]>("alerts") || [];
}

export function pushAlert(entry: LocalAlertEntry): LocalAlertEntry[] {
  const all = loadAlerts();
  all.unshift(entry);
  write("alerts", all.slice(0, 100));
  return all;
}

export function clearAlerts(): void {
  write("alerts", []);
}

// ---------------------------------------------------------------------------
// Emergency contacts — encrypted at rest (simple XOR + Base64 demo of a
// production enclave/storage-encryption flow).
// ---------------------------------------------------------------------------

export interface TrustedContact {
  id: string;
  name: string;
  phone: string;
}

const ENC_KEY = (localStorage.getItem(NS + "enc-key") ||
  Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join("")) as string;
if (!localStorage.getItem(NS + "enc-key")) localStorage.setItem(NS + "enc-key", ENC_KEY);

// XOR every UTF-16 code unit with the key, then Base64 (btoa-safe via URI encode).
function xorEncrypt(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += String.fromCharCode(text.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
  }
  return btoa(unescape(encodeURIComponent(out)));
}

function xorDecrypt(blob: string): string {
  const decoded = decodeURIComponent(escape(atob(blob)));
  let out = "";
  for (let i = 0; i < decoded.length; i++) {
    out += String.fromCharCode(decoded.charCodeAt(i) ^ ENC_KEY.charCodeAt(i % ENC_KEY.length));
  }
  return out;
}

export function encryptContacts(contacts: TrustedContact[]): string {
  return xorEncrypt(JSON.stringify(contacts));
}

export function decryptContacts(blob: string): TrustedContact[] {
  try {
    return JSON.parse(xorDecrypt(blob)) as TrustedContact[];
  } catch {
    return [];
  }
}

export function loadContacts(): TrustedContact[] {
  const blob = localStorage.getItem(NS + "contacts");
  if (!blob) return [];
  return decryptContacts(blob);
}

export function saveContacts(contacts: TrustedContact[]): void {
  localStorage.setItem(NS + "contacts", encryptContacts(contacts));
}

// ---------------------------------------------------------------------------
// Privacy prefs — opt-in/out of location tracking.
// ---------------------------------------------------------------------------

export interface AppPrefs {
  tracking: boolean;
  name: string;
  manual: { lat: number; lng: number } | null;
}

export function loadPrefs(): AppPrefs {
  return (
    read<AppPrefs>("prefs") || {
      tracking: false,
      name: "Citizen",
      manual: null,
    }
  );
}

export function savePrefs(p: AppPrefs): void {
  write("prefs", p);
}
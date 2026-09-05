import { Layers } from "lucide-react";
import { FALLBACK_LAYERS, GOOGLE_MAP_TYPES, type GoogleMapType } from "@/lib/mapLayers";

interface MapTypeSwitcherProps {
  value: GoogleMapType;
  onChange: (t: GoogleMapType) => void;
  className?: string;
}

export function MapTypeSwitcher({ value, onChange, className = "" }: MapTypeSwitcherProps) {
  return (
    <div className={`absolute bottom-3 left-3 z-[1000] flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 p-1 shadow-md backdrop-blur sm:bottom-4 sm:left-4 ${className}`}>
      <span className="pointer-events-none hidden items-center gap-1 pl-2 pr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 sm:flex">
        <Layers className="h-3 w-3" /> Map
      </span>
      {GOOGLE_MAP_TYPES.map((t) => {
        const def = FALLBACK_LAYERS[t];
        const active = value === t;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            title={`${def.label} view`}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
              active ? "bg-navy text-white shadow" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {def.label}
          </button>
        );
      })}
    </div>
  );
}
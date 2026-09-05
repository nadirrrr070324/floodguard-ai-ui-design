import { MapContainer, Polygon, Marker, Circle, Polyline, Popup } from "react-leaflet";
import L from "leaflet";
import type { FloodZone, Shelter } from "@/lib/api";
import { haversineKm } from "@/lib/geo";
import { FallbackTileLayer } from "@/components/FallbackTileLayer";

const zoneColor: Record<string, string> = { critical: "#dc2626", high: "#ea580c", moderate: "#f59e0b", low: "#16a34a" };

function shelterIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:18px;height:18px;border-radius:4px;background:#0369a1;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;font-weight:800;
      ">🏠</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function selfIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:16px;height:16px;border-radius:9999px;background:#dc2626;border:3px solid #fff;
      box-shadow:0 0 0 6px rgba(220,38,38,0.25);
      "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export interface OfflineMapProps {
  latitude: number;
  longitude: number;
  zones: FloodZone[];
  shelters: Shelter[];
  riskLevel: string;
}

// Self-contained cached-map fragment used inside the offline safety protocol.
export function OfflineSafetyMap({ latitude, longitude, zones, shelters, riskLevel }: OfflineMapProps) {
  const point: [number, number] = [latitude, longitude];
  const openShelters = shelters.filter((s) => s.isOpen);
  const nearest = [...openShelters]
    .map((s) => ({ s, d: haversineKm(point, [s.latitude, s.longitude]) }))
    .sort((a, b) => a.d - b.d)[0];

  return (
    <MapContainer
      center={point}
      zoom={11}
      className="z-0 h-56 w-full rounded-xl"
      scrollWheelZoom={false}
      attributionControl={false}
    >
      <FallbackTileLayer type="hybrid" />
      {/* Hazard zone */}
      {zones.map((z) => (
        <Polygon
          key={z.id}
          positions={z.ring}
          pathOptions={{ color: zoneColor[z.severity], fillColor: zoneColor[z.severity], fillOpacity: 0.18, weight: 1.5 }}
        >
          <Popup><span className="text-xs font-bold">{z.name} ({z.severity})</span></Popup>
        </Polygon>
      ))}
      {/* Safety ring around user */}
      <Circle center={point} radius={800} pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.08 }} />
      {/* Route to nearest shelter */}
      {nearest && (
        <Polyline
          positions={[point, [nearest.s.latitude, nearest.s.longitude]]}
          pathOptions={{ color: "#16a34a", weight: 3, dashArray: "6,6" }}
        />
      )}
      {/* Shelters */}
      {openShelters.map((s) => (
        <Marker key={s.id} position={[s.latitude, s.longitude]} icon={shelterIcon()}>
          <Popup><span className="text-xs">{s.name} · {(nearest && nearest.s.id === s.id ? nearest.d : haversineKm(point, [s.latitude, s.longitude])).toFixed(1)} km</span></Popup>
        </Marker>
      ))}
      {/* User */}
      <Marker position={point} icon={selfIcon()}>
        <Popup><span className="text-xs font-bold capitalize">{riskLevel} risk — you are here</span></Popup>
      </Marker>
    </MapContainer>
  );
}

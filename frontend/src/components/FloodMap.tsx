import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  MapContainer, Marker as LMarker, Polygon as LPolygon,
  Polyline as LPolyline, Circle as LCircle, Tooltip, Popup, useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  GoogleMap, InfoWindow, OverlayView, useJsApiLoader,
  Polygon as GPolygon, Polyline as GPolyline, Circle as GCircle,
} from "@react-google-maps/api";
import { GOOGLE_TYPE_ID, GOOGLE_MAPS_API_KEY, HAS_GOOGLE_MAPS_KEY, type GoogleMapType } from "@/lib/mapLayers";
import { MapTypeSwitcher } from "@/components/MapTypeSwitcher";
import { FallbackTileLayer } from "@/components/FallbackTileLayer";

export interface FloodMarker {
  id: string;
  position: [number, number];
  color: string;
  size?: number;
  active?: boolean;
  pulse?: boolean;
  symbol?: "siren";
  label?: string;
  popup?: ReactNode;
  onClick?: () => void;
}

export interface FloodPolygon {
  id: string;
  ring: [number, number][];
  color: string;
  fillOpacity?: number;
  selected?: boolean;
  label?: string;
  popup?: ReactNode;
  onClick?: () => void;
}

export interface FloodPolyline {
  id: string;
  path: [number, number][];
  color: string;
  weight?: number;
  dashed?: boolean;
}

export interface FloodCircle {
  id: string;
  center: [number, number];
  radius: number;
  color: string;
  fillOpacity?: number;
  label?: string;
  popup?: ReactNode;
}

interface FloodMapProps {
  center?: [number, number];
  zoom?: number;
  mapType?: GoogleMapType;
  onMapTypeChange?: (t: GoogleMapType) => void;
  markers?: FloodMarker[];
  polygons?: FloodPolygon[];
  polylines?: FloodPolyline[];
  circles?: FloodCircle[];
  flyTo?: [number, number] | null;
  fitToRing?: [number, number][] | null;
  className?: string;
}

interface GMapLike {
  panTo: (p: { lat: number; lng: number }) => void;
  fitBounds: (b: unknown) => void;
  setMapTypeId?: (t: string) => void;
}

function markerShell(m: FloodMarker): string {
  const size = m.size ?? (m.active ? 22 : 16);
  const pulse = m.pulse ? "animation:pulse 1s infinite;" : "";
  const glyph =
    m.symbol === "siren"
      ? '<svg viewBox="0 0 24 24" width="12" height="12" fill="#fff"><path d="M3 11h2v2H3zM7 6h2v12H7zM11 3h2v18h-2zM15 8h2v8h-2zM19 4h2v16h-2z"/></svg>'
      : "";
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${m.color};border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;${pulse}">${glyph}</div>`;
}

function markerSize(m: FloodMarker) {
  return (m.size ?? (m.active ? 22 : 16)) + 6;
}

function ringCenter(ring: [number, number][]): [number, number] {
  const la = ring.reduce((s, p) => s + p[0], 0) / ring.length;
  const ln = ring.reduce((s, p) => s + p[1], 0) / ring.length;
  return [la, ln];
}

function LeafletController({ flyTo, fitToRing }: { flyTo?: [number, number] | null; fitToRing?: [number, number][] | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo(flyTo, 8, { duration: 0.8 });
  }, [flyTo, map]);
  useEffect(() => {
    if (fitToRing) map.flyToBounds(L.polygon(fitToRing).getBounds(), { padding: [50, 50], maxZoom: 9, duration: 0.8 });
  }, [fitToRing, map]);
  return null;
}

export function FloodMap({
  center = [25.8, 91.8],
  zoom = 6,
  mapType = "satellite",
  onMapTypeChange,
  markers = [],
  polygons = [],
  polylines = [],
  circles = [],
  flyTo = null,
  fitToRing = null,
  className = "",
}: FloodMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "floodguard-google-map",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
  const useGoogle = HAS_GOOGLE_MAPS_KEY && isLoaded && !loadError;

  const [gmap, setGmap] = useState<GMapLike | null>(null);
  const [openPopup, setOpenPopup] = useState<{ kind: "marker" | "polygon" | "circle"; id: string } | null>(null);

  useEffect(() => {
    if (!gmap) return;
    if (flyTo) gmap.panTo({ lat: flyTo[0], lng: flyTo[1] });
  }, [flyTo, gmap]);
  useEffect(() => {
    if (!gmap || !fitToRing) return;
    gmap.fitBounds(fitToRing.map(([la, ln]) => ({ lat: la, lng: ln })));
  }, [fitToRing, gmap]);
  useEffect(() => {
    gmap?.setMapTypeId?.(GOOGLE_TYPE_ID[mapType]);
  }, [mapType, gmap]);

  const googleOptions = useMemo(
    () => ({
      mapTypeControl: false,
      fullscreenControl: true,
      streetViewControl: false,
      zoomControl: true,
    }),
    []
  );

  const openLayer = openPopup
    ? openPopup.kind === "marker"
      ? (markers.find((m) => m.id === openPopup.id) ?? null)
      : openPopup.kind === "polygon"
        ? (polygons.find((p) => p.id === openPopup.id) ?? null)
        : (circles.find((c) => c.id === openPopup.id) ?? null)
    : null;
  const openPos: [number, number] | null =
    openPopup?.kind === "marker" && openLayer
      ? (openLayer as FloodMarker).position
      : openPopup && openLayer
        ? openPopup.kind === "polygon"
          ? ringCenter((openLayer as FloodPolygon).ring)
          : (openLayer as FloodCircle).center
        : null;

  const loadingGoogle = HAS_GOOGLE_MAPS_KEY && (!isLoaded || Boolean(loadError)) && !loadError;

  return (
    <div className={`relative w-full ${className}`}>
      {useGoogle ? (
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={{ lat: center[0], lng: center[1] }}
          zoom={zoom}
          mapTypeId={GOOGLE_TYPE_ID[mapType]}
          options={googleOptions}
          onLoad={(map) => setGmap(map as unknown as GMapLike)}
          onUnmount={() => setGmap(null)}
        >
          {polygons.map((p) => (
            <GPolygon
              key={p.id}
              paths={p.ring.map(([la, ln]) => ({ lat: la, lng: ln }))}
              options={{
                strokeColor: p.color,
                strokeWeight: p.selected ? 3 : 2,
                strokeOpacity: 0.9,
                fillColor: p.color,
                fillOpacity: p.fillOpacity ?? 0.28,
              }}
              onClick={() => {
                p.onClick?.();
                setOpenPopup({ kind: "polygon", id: p.id });
              }}
            />
          ))}
          {polylines.map((pl) => (
            <GPolyline
              key={pl.id}
              path={pl.path.map(([la, ln]) => ({ lat: la, lng: ln }))}
              options={{
                strokeColor: pl.color,
                strokeWeight: pl.weight ?? 3,
                strokeOpacity: 0.9,
                ...(pl.dashed ? { strokeDasharray: "6 6" } : {}),
              }}
            />
          ))}
          {circles.map((c) => (
            <GCircle
              key={c.id}
              center={{ lat: c.center[0], lng: c.center[1] }}
              radius={c.radius}
              options={{
                strokeColor: c.color,
                fillColor: c.color,
                fillOpacity: c.fillOpacity ?? 0.15,
              }}
              onClick={() => setOpenPopup({ kind: "circle", id: c.id })}
            />
          ))}
          {markers.map((m) => (
            <OverlayView
              key={m.id}
              position={{ lat: m.position[0], lng: m.position[1] }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            >
              <div
                style={{
                  position: "absolute",
                  width: markerSize(m),
                  height: markerSize(m),
                  transform: "translate(-50%,-50%)",
                  cursor: "pointer",
                }}
                title={m.label}
                onClick={() => {
                  m.onClick?.();
                  setOpenPopup({ kind: "marker", id: m.id });
                }}
                dangerouslySetInnerHTML={{ __html: markerShell(m) }}
              />
            </OverlayView>
          ))}
          {openLayer && openPos && (
            <InfoWindow
              position={{ lat: openPos[0], lng: openPos[1] }}
              onCloseClick={() => setOpenPopup(null)}
            >
              <div className="text-sm">{openLayer.popup}</div>
            </InfoWindow>
          )}
          <MapTypeSwitcher value={mapType} onChange={(t) => onMapTypeChange?.(t)} />
          <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow backdrop-blur">
            Google Maps
          </div>
        </GoogleMap>
      ) : (
        <MapContainer center={center} zoom={zoom} scrollWheelZoom className="h-full w-full">
          <FallbackTileLayer type={mapType} />
          <LeafletController flyTo={flyTo} fitToRing={fitToRing} />
          {polygons.map((p) => (
            <LPolygon
              key={p.id}
              positions={p.ring}
              pathOptions={{
                color: p.color,
                fillColor: p.color,
                fillOpacity: p.fillOpacity ?? 0.28,
                weight: p.selected ? 3 : 2,
                opacity: 0.9,
              }}
              eventHandlers={{ click: () => p.onClick?.() }}
            >
              {p.label && (
                <Tooltip direction="center" opacity={1}>
                  <span className="font-bold">{p.label}</span>
                </Tooltip>
              )}
              {p.popup && <Popup>{p.popup}</Popup>}
            </LPolygon>
          ))}
          {polylines.map((pl) => (
            <LPolyline
              key={pl.id}
              positions={pl.path}
              pathOptions={{
                color: pl.color,
                weight: pl.weight ?? 3,
                opacity: 0.9,
                ...(pl.dashed ? { dashArray: "6,6" } : {}),
              }}
            />
          ))}
          {circles.map((c) => (
            <LCircle
              key={c.id}
              center={c.center}
              radius={c.radius}
              pathOptions={{ color: c.color, fillColor: c.color, fillOpacity: c.fillOpacity ?? 0.15 }}
            >
              {c.label && (
                <Tooltip direction="top" opacity={1}>
                  <span className="font-bold">{c.label}</span>
                </Tooltip>
              )}
              {c.popup && <Popup>{c.popup}</Popup>}
            </LCircle>
          ))}
          {markers.map((m) => (
            <LMarker
              key={m.id}
              position={m.position}
              icon={L.divIcon({
                className: "",
                html: markerShell(m),
                iconSize: [markerSize(m), markerSize(m)],
                iconAnchor: [markerSize(m) / 2, markerSize(m) / 2],
              })}
              eventHandlers={{ click: () => m.onClick?.() }}
            >
              {m.label && (
                <Tooltip direction="top" offset={[0, -12]} opacity={1}>
                  <span className="font-bold">{m.label}</span>
                </Tooltip>
              )}
              {m.popup && <Popup>{m.popup}</Popup>}
            </LMarker>
          ))}
          <MapTypeSwitcher value={mapType} onChange={(t) => onMapTypeChange?.(t)} />
          {loadingGoogle && (
            <div className="pointer-events-none absolute right-3 top-3 z-[1000] rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow backdrop-blur">
              Loading Google Maps…
            </div>
          )}
        </MapContainer>
      )}
    </div>
  );
}
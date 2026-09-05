import { TileLayer } from "react-leaflet";
import { FALLBACK_LAYERS, type GoogleMapType } from "@/lib/mapLayers";

export function FallbackTileLayer({ type }: { type: GoogleMapType }) {
  const def = FALLBACK_LAYERS[type];
  return (
    <>
      {def.layers.map((l, i) => (
        <TileLayer key={i} attribution={l.attribution} url={l.url} />
      ))}
    </>
  );
}
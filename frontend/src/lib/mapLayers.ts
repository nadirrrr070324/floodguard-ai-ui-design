export type GoogleMapType = "satellite" | "hybrid" | "roadmap";

export interface FallbackLayerDef {
  id: GoogleMapType;
  label: string;
  layers: { url: string; attribution: string }[];
}

// Fallback base layers used when the native Google Maps widget has no API key
// configured. Esri World Imagery is reliable everywhere (no key, no account)
// and uses the same Maxar satellite imagery Google Maps shows.
export const FALLBACK_LAYERS: Record<GoogleMapType, FallbackLayerDef> = {
  satellite: {
    id: "satellite",
    label: "Satellite",
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar, Earthstar Geographics',
      },
    ],
  },
  hybrid: {
    id: "hybrid",
    label: "Hybrid",
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution: 'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>, Maxar',
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri",
      },
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        attribution: "&copy; Esri, Garmin, TomTom",
      },
    ],
  },
  roadmap: {
    id: "roadmap",
    label: "Roadmap",
    layers: [
      {
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
        attribution: '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      },
    ],
  },
};

export const GOOGLE_MAP_TYPES = Object.keys(FALLBACK_LAYERS) as GoogleMapType[];

// API key for the native Google Maps widget. Empty until the developer adds it.
export const GOOGLE_MAPS_API_KEY: string = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";
export const HAS_GOOGLE_MAPS_KEY = GOOGLE_MAPS_API_KEY.length > 0;

// Google map typeId values the widget accepts (see @react-google-maps/api docs).
export const GOOGLE_TYPE_ID: Record<GoogleMapType, "roadmap" | "satellite" | "hybrid"> = {
  satellite: "satellite",
  hybrid: "hybrid",
  roadmap: "roadmap",
};

// Open the exact location in the Google Maps web app (driving directions etc.).
export function openInGoogleMaps(latitude: number, longitude: number, label?: string) {
  const query = label ? `${label} ${latitude},${longitude}` : `${latitude},${longitude}`;
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
import { useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import { Loader2 } from "lucide-react";

// Fix marker icon paths (Leaflet default assets from unpkg)
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const highlightIcon = L.divIcon({
  className: "amt-marker",
  html: `<div style="width:20px;height:20px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 0 0 2px #ef4444;"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export type LeadPoint = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  lat: number;
  lng: number;
  status: string;
};

function Recenter({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom ?? map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
}

export function LeadsMap({
  leads,
  focus,
  height = 380,
}: {
  leads: LeadPoint[];
  focus?: { lat: number; lng: number; label?: string } | null;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const geocoded = useMemo(
    () =>
      leads.filter(
        (l) =>
          typeof l.lat === "number" &&
          typeof l.lng === "number" &&
          !Number.isNaN(l.lat) &&
          !Number.isNaN(l.lng),
      ),
    [leads],
  );

  const center: [number, number] = focus
    ? [focus.lat, focus.lng]
    : geocoded.length
      ? [geocoded[0].lat, geocoded[0].lng]
      : [-14.235, -51.9253]; // Brasil

  const zoom = focus ? 10 : geocoded.length ? 6 : 4;

  if (!mounted) {
    return (
      <div
        className="flex items-center justify-center rounded border bg-muted/30"
        style={{ height }}
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded border" style={{ height }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter center={center} zoom={zoom} />
        {focus && (
          <>
            <Marker position={[focus.lat, focus.lng]} icon={highlightIcon}>
              {focus.label && <Popup>{focus.label}</Popup>}
            </Marker>
            <Circle
              center={[focus.lat, focus.lng]}
              radius={30000}
              pathOptions={{ color: "#ef4444", fillOpacity: 0.08 }}
            />
          </>
        )}
        {geocoded.map((l) => (
          <Marker key={l.id} position={[l.lat, l.lng]} icon={defaultIcon}>
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{l.name}</div>
                <div className="text-muted-foreground">
                  {l.city}
                  {l.state ? `, ${l.state}` : ""}
                </div>
                <div className="mt-1">
                  Status: <span className="font-medium">{l.status}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project } from '@/data/projectData';

// Custom teal marker icon matching brand
const markerIcon = L.divIcon({
  className: 'pm-map-marker',
  html: `
    <div style="
      width: 28px; height: 28px;
      transform: translate(-50%, -100%);
      position: relative;
    ">
      <div style="
        width: 28px; height: 28px;
        border-radius: 50% 50% 50% 0;
        background: hsl(173 64% 33%);
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transform: rotate(-45deg);
      "></div>
      <div style="
        position: absolute; top: 7px; left: 7px;
        width: 12px; height: 12px;
        border-radius: 50%;
        background: white;
      "></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

interface ProjectMapProps {
  projects: Project[];
  onProjectClick?: (project: Project) => void;
  height?: number;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 11, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
  }, [points, map]);
  return null;
}

export function ProjectMap({ projects, onProjectClick, height = 360 }: ProjectMapProps) {
  const geoProjects = useMemo(
    () =>
      projects.filter(
        (p): p is Project & { latitude: number; longitude: number } =>
          typeof (p as any).latitude === 'number' &&
          typeof (p as any).longitude === 'number'
      ),
    [projects]
  );

  const points = useMemo<[number, number][]>(
    () => geoProjects.map((p) => [(p as any).latitude, (p as any).longitude]),
    [geoProjects]
  );

  // Default view = central Sweden
  const fallbackCenter: [number, number] = [62.0, 15.0];

  if (geoProjects.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/30 text-sm text-muted-foreground"
      >
        Inga projekt med adress ännu. Lägg till adress på ett projekt för att visa det på kartan.
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/50 shadow-sm" style={{ height }}>
      <MapContainer
        center={fallbackCenter}
        zoom={5}
        scrollWheelZoom={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {geoProjects.map((p) => {
          const lat = (p as any).latitude as number;
          const lon = (p as any).longitude as number;
          return (
            <Marker
              key={p.id}
              position={[lat, lon]}
              icon={markerIcon}
              eventHandlers={onProjectClick ? { click: () => onProjectClick(p) } : undefined}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[180px]">
                  <div className="font-semibold text-sm">
                    {p.code} – {p.name}
                  </div>
                  {p.customer && (
                    <div>
                      <span className="text-muted-foreground">Kund:</span> {p.customer}
                    </div>
                  )}
                  {(p as any).address && (
                    <div className="text-muted-foreground">{(p as any).address}</div>
                  )}
                  {p.projectManager && (
                    <div>
                      <span className="text-muted-foreground">PL:</span> {p.projectManager}
                    </div>
                  )}
                  {onProjectClick && (
                    <button
                      type="button"
                      onClick={() => onProjectClick(p)}
                      className="mt-1 text-primary underline text-xs"
                    >
                      Öppna projekt
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

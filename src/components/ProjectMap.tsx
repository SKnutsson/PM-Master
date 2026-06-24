import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Project, Phase } from '@/data/projectData';

type ActivePhase = Phase | null;

const PHASE_COLORS: Record<Phase, string> = {
  Konstruktion: 'hsl(160 20% 55%)',
  Produktion: 'hsl(168 35% 18%)',
  Montage: 'hsl(160 55% 36%)',
};

const PHASE_PRIORITY: Phase[] = ['Montage', 'Produktion', 'Konstruktion'];

function getActivePhase(p: Project): ActivePhase {
  for (const phase of PHASE_PRIORITY) {
    if (
      p.activities.some(
        (a) => a.phase === phase && (a.status === 'Pågår' || a.status === 'Försenad')
      )
    ) {
      return phase;
    }
  }
  return null;
}

// Build a clean SVG teardrop pin icon. iconAnchor is at the tip (bottom-center).
function buildIcon(color: string) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
  <path d="M15 1 C7 1 1 7 1 15 C1 24 15 41 15 41 C15 41 29 24 29 15 C29 7 23 1 15 1 Z"
        fill="${color}" stroke="white" stroke-width="2" stroke-linejoin="round"
        filter="drop-shadow(0 2px 3px rgba(0,0,0,0.35))"/>
  <circle cx="15" cy="15" r="5" fill="white"/>
</svg>`.trim();
  return L.divIcon({
    className: 'pm-map-marker',
    html: svg,
    iconSize: [30, 42],
    iconAnchor: [15, 41],
    popupAnchor: [0, -36],
  });
}

const ICONS: Record<string, L.DivIcon> = {
  Konstruktion: buildIcon(PHASE_COLORS.Konstruktion),
  Produktion: buildIcon(PHASE_COLORS.Produktion),
  Montage: buildIcon(PHASE_COLORS.Montage),
  none: buildIcon('hsl(0 0% 50%)'),
};

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
      projects
        .filter(
          (p): p is Project & { latitude: number; longitude: number } =>
            typeof (p as any).latitude === 'number' &&
            typeof (p as any).longitude === 'number'
        )
        .map((p) => ({ project: p, phase: getActivePhase(p) })),
    [projects]
  );

  const points = useMemo<[number, number][]>(
    () => geoProjects.map(({ project: p }) => [(p as any).latitude, (p as any).longitude]),
    [geoProjects]
  );

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
    <div
      className="relative rounded-xl overflow-hidden border border-border/50 shadow-sm"
      style={{ height }}
    >
      <MapContainer
        center={fallbackCenter}
        zoom={5}
        scrollWheelZoom={true}
        wheelPxPerZoomLevel={80}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {geoProjects.map(({ project: p, phase }) => {
          const lat = (p as any).latitude as number;
          const lon = (p as any).longitude as number;
          const icon = ICONS[phase ?? 'none'];
          return (
            <Marker
              key={p.id}
              position={[lat, lon]}
              icon={icon}
              eventHandlers={onProjectClick ? { click: () => onProjectClick(p) } : undefined}
            >
              <Popup>
                <div className="text-xs space-y-1 min-w-[200px]">
                  <div className="font-semibold text-sm">
                    {p.code} – {p.name}
                  </div>
                  {phase && (
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[11px] font-medium text-white"
                      style={{ backgroundColor: PHASE_COLORS[phase] }}
                    >
                      {phase}
                    </span>
                  )}
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
                      Visa projekt
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Phase legend overlay */}
      <div className="absolute bottom-2 left-2 z-[400] flex items-center gap-3 rounded-md bg-background/90 backdrop-blur px-3 py-1.5 shadow-md border border-border/60 text-[11px]">
        {(['Konstruktion', 'Produktion', 'Montage'] as Phase[]).map((phase) => (
          <div key={phase} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PHASE_COLORS[phase] }}
            />
            <span className="text-foreground/80 font-medium">{phase}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

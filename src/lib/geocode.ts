// Geocoding helper using OpenStreetMap Nominatim (free, no API key).
// Respect the Nominatim usage policy: identify the app via User-Agent / Referer,
// and avoid spamming requests (we only geocode on save).

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const q = address.trim();
  if (!q) return null;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=se&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!data || data.length === 0) {
      // Fallback: try without country restriction
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res2.ok) return null;
      const data2 = (await res2.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data2 || data2.length === 0) return null;
      return {
        lat: parseFloat(data2[0].lat),
        lon: parseFloat(data2[0].lon),
        displayName: data2[0].display_name,
      };
    }
    return {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (err) {
    console.warn('Geocoding failed:', err);
    return null;
  }
}

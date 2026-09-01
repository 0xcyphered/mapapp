import distance from '@turf/distance';
import { point } from '@turf/helpers';

/**
 * OSRM public demo server — free, OSM-based, works for Iran.
 * Falls back to haversine if OSRM is unreachable.
 */
const OSRM_BASE = 'https://router.project-osrm.org';

export interface RouteResult {
  /** Road-network distance in meters */
  routedDistance: number;
  /** GeoJSON LineString coordinates as [lng, lat] pairs */
  geometry: [number, number][];
}

/**
 * Straight-line distance via Haversine (turf). Used as fallback.
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const from = point([lng1, lat1]);
  const to = point([lng2, lat2]);
  return distance(from, to, { units: 'meters' });
}

/**
 * Fetch a driving route between two points from OSRM.
 * Returns road-network distance + route geometry.
 * Falls back to haversine + straight line on failure.
 */
export async function fetchRoute(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): Promise<RouteResult> {
  const fallback: RouteResult = {
    routedDistance: haversineDistance(lat1, lng1, lat2, lng2),
    geometry: [[lng1, lat1], [lng2, lat2]],
  };

  try {
    // OSRM expects lng,lat order
    const url = `${OSRM_BASE}/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=full&geometries=geojson`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return fallback;

    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return fallback;

    const route = data.routes[0];
    return {
      routedDistance: route.distance, // meters
      geometry: route.geometry.coordinates as [number, number][],
    };
  } catch {
    return fallback;
  }
}

/**
 * Sequentially fetch routes between all consecutive waypoints pairs.
 * Returns one RouteResult per segment.
 */
export async function fetchAllRoutes(
  waypoints: { lat: number; lng: number }[]
): Promise<RouteResult[]> {
  const results: RouteResult[] = [];
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    // eslint-disable-next-line no-await-in-loop
    results.push(await fetchRoute(a.lat, a.lng, b.lat, b.lng));
  }
  return results;
}

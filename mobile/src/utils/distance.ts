import type { Waypoint, SegmentDistance } from '../types';
import { fetchAllRoutes, haversineDistance } from './routing';

/**
 * Compute all segment distances between sequential waypoints.
 * Fetches road-network routes from OSRM (falls back to haversine on failure).
 */
export async function computeSegments(waypoints: Waypoint[]): Promise<SegmentDistance[]> {
  if (waypoints.length < 2) return [];

  const routes = await fetchAllRoutes(waypoints);

  return routes.map((route, i) => ({
    from: i,
    to: i + 1,
    straight: haversineDistance(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng),
    routed: route.routedDistance,
    routeGeometry: route.geometry,
  }));
}

/**
 * Total road-network distance across all segments.
 */
export function totalRoutedDistance(segments: SegmentDistance[]): number {
  return segments.reduce((sum, s) => sum + s.routed, 0);
}

/**
 * Total straight-line distance across all segments.
 */
export function totalStraightDistance(segments: SegmentDistance[]): number {
  return segments.reduce((sum, s) => sum + s.straight, 0);
}
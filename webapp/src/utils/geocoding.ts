import type { SearchResult } from '../types';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const HEADERS = {
  'Accept-Language': 'fa,en',
  'User-Agent': 'IranMapApp/1.0',
};

/**
 * Search for places using Nominatim. Supports Persian queries.
 */
export async function searchPlaces(query: string, limit = 5): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'jsonv2',
    limit: String(limit),
    'accept-language': 'fa,en',
    addressdetails: '1',
  });
  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Search failed: ${res.status}`);
  return res.json();
}

/**
 * Reverse geocode a lat/lng to get Persian address.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    'accept-language': 'fa,en',
    addressdetails: '1',
  });
  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, { headers: HEADERS });
  if (!res.ok) return '';
  const data = await res.json();
  return data.display_name || '';
}

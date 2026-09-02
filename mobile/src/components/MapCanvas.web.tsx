import {
  GeoJSONSource,
  Map as MlMap,
  Marker,
  type StyleSpecification,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Feature, FeatureCollection, LineString, Point } from 'geojson';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { MapMode, SegmentDistance, Waypoint } from '../types';
import type { UserPosition } from '../hooks/useUserLocation';
import { COLORS, TEHRAN } from '../theme';

export type MapCanvasHandle = {
  flyTo: (lngLat: [number, number], zoom?: number) => void;
};

type MapCanvasProps = {
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  mode: MapMode;
  position: UserPosition | null;
  onMapClick: (lat: number, lng: number) => void;
  onWaypointPress?: (id: string) => void;
};

/** The web app's exact OSM raster tiles — the same style object the native canvas uses. */
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'osmTiles', type: 'raster', source: 'osm' }],
};

function accuracyRadiusPx(accuracy: number, lat: number, zoom: number): number {
  const metersPerPixel =
    (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  const px = accuracy / metersPerPixel;
  return Math.min(300, Math.max(10, px));
}

const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

let pulseStyleInjected = false;
function injectPulseKeyframes(): void {
  if (pulseStyleInjected || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.textContent =
    '@keyframes mlrn-pulse{0%{transform:scale(0.8);opacity:1}100%{transform:scale(2.2);opacity:0}}';
  document.head.appendChild(style);
  pulseStyleInjected = true;
}

function createMarkerElement(label: string): HTMLElement {
  const marker = document.createElement('div');
  marker.style.cssText =
    'width:32px;height:32px;border-radius:16px;background:#ef4444;' +
    'border:3px solid #ffffff;display:flex;align-items:center;justify-content:center;box-sizing:border-box;';
  const text = document.createElement('span');
  text.textContent = label;
  text.style.cssText =
    'color:#ffffff;font-weight:bold;font-size:14px;' +
    'font-family:Vazirmatn_700Bold,sans-serif;line-height:1;';
  marker.appendChild(text);
  return marker;
}

function createPulseElement(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    'width:44px;height:44px;display:flex;align-items:center;justify-content:center;position:relative;';
  const ring = document.createElement('div');
  ring.style.cssText =
    'position:absolute;width:14px;height:14px;border-radius:7px;background:#3b82f6;' +
    'animation:mlrn-pulse 1.5s ease-out infinite;';
  const dot = document.createElement('div');
  dot.style.cssText =
    'width:14px;height:14px;border-radius:7px;background:#3b82f6;' +
    'border:2px solid #ffffff;box-sizing:border-box;';
  wrap.appendChild(ring);
  wrap.appendChild(dot);
  return wrap;
}

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ waypoints, segments, mode, position, onMapClick, onWaypointPress }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<MlMap | null>(null);
    const markersRef = useRef(new Map<string, Marker>());
    const userMarkerRef = useRef<Marker | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [zoom, setZoom] = useState(12);
    // Latest props for the map's long-lived click handler (no re-bind needed).
    const clickProps = useRef({ mode, onMapClick });
    clickProps.current = { mode, onMapClick };
    const waypointPressRef = useRef(onWaypointPress);
    waypointPressRef.current = onWaypointPress;

    useImperativeHandle(ref, () => ({
      flyTo: (lngLat: [number, number], zoomLevel = 15) => {
        mapRef.current?.flyTo({ center: lngLat, zoom: zoomLevel, duration: 1500 });
      },
    }));

    // Create the map once, exactly like the native canvas: basemap first,
    // then line layers, then markers on top.
    useEffect(() => {
      injectPulseKeyframes();
      const container = containerRef.current;
      if (!container) return;
      const map = new MlMap({
        container,
        style: OSM_STYLE,
        center: TEHRAN,
        zoom: 12,
      });
      mapRef.current = map;
      map.on('click', (e) => {
        const { mode: m, onMapClick: onClick } = clickProps.current;
        if (m !== 'measure') return;
        onClick(e.lngLat.lat, e.lngLat.lng);
      });
      map.on('move', () => setZoom(map.getZoom()));
      map.on('load', () => {
        map.addSource('straightLines', { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'straightLines',
          type: 'line',
          source: 'straightLines',
          paint: {
            'line-color': COLORS.gray,
            'line-width': 2,
            'line-opacity': 0.7,
            'line-dasharray': [2, 3],
          },
        });
        map.addSource('otherRoutes', { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'otherRoutes',
          type: 'line',
          source: 'otherRoutes',
          paint: {
            'line-color': COLORS.blue,
            'line-width': 3,
            'line-opacity': 0.85,
          },
        });
        map.addSource('shortestRoutes', { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'shortestRoutes',
          type: 'line',
          source: 'shortestRoutes',
          paint: {
            'line-color': COLORS.green,
            'line-width': 5,
            'line-opacity': 0.85,
          },
        });
        map.addSource('userAccuracy', { type: 'geojson', data: EMPTY_FC });
        map.addLayer({
          id: 'userAccuracy',
          type: 'circle',
          source: 'userAccuracy',
          paint: {
            'circle-radius': 0,
            'circle-color': COLORS.blue,
            'circle-opacity': 0.15,
            'circle-stroke-width': 1,
            'circle-stroke-color': COLORS.blue,
            'circle-stroke-opacity': 0.4,
          },
        });
        setLoaded(true);
      });
      // The browser may not have laid the container out yet on the first tick.
      requestAnimationFrame(() => map.resize());
      return () => {
        markersRef.current.forEach((m) => m.remove());
        markersRef.current.clear();
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        map.remove();
        mapRef.current = null;
      };
    }, []);

    // Dashed straight lines between consecutive waypoints.
    useEffect(() => {
      const map = mapRef.current;
      if (!loaded || !map) return;
      const source = map.getSource('straightLines') as
        | GeoJSONSource
        | undefined;
      if (!source) return;
      const features: Feature<LineString>[] =
        waypoints.length >= 2
          ? waypoints.slice(0, -1).map((wp, i) => ({
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: [
                  [wp.lng, wp.lat],
                  [waypoints[i + 1].lng, waypoints[i + 1].lat],
                ],
              },
            }))
          : [];
      source.setData({ type: 'FeatureCollection', features });
    }, [loaded, waypoints]);

    // Road routes: blue for all, green for the shortest when >= 2 segments.
    const minRouted = segments.length
      ? Math.min(...segments.map((s) => s.routed))
      : Infinity;
    useEffect(() => {
      const map = mapRef.current;
      if (!loaded || !map) return;
      const other = map.getSource('otherRoutes') as
        | GeoJSONSource
        | undefined;
      const shortest = map.getSource('shortestRoutes') as
        | GeoJSONSource
        | undefined;
      if (!other || !shortest) return;
      const toFeature = (seg: SegmentDistance): Feature<LineString> => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: seg.routeGeometry },
      });
      const otherFeatures: Feature<LineString>[] =
        segments.length >= 2
          ? segments.filter((seg) => seg.routed !== minRouted).map(toFeature)
          : segments.map(toFeature);
      const shortestFeatures: Feature<LineString>[] =
        segments.length >= 2
          ? segments.filter((seg) => seg.routed === minRouted).map(toFeature)
          : [];
      other.setData({ type: 'FeatureCollection', features: otherFeatures });
      shortest.setData({ type: 'FeatureCollection', features: shortestFeatures });
    }, [loaded, segments, minRouted]);

    // Numbered waypoint markers.
    useEffect(() => {
      const map = mapRef.current;
      if (!loaded || !map) return;
      const seen = new Set<string>();
      for (const wp of waypoints) {
        seen.add(wp.id);
        const existing = markersRef.current.get(wp.id);
        if (existing) {
          existing.setLngLat([wp.lng, wp.lat]);
        } else {
          const marker = new Marker({
            element: createMarkerElement(wp.label),
          })
            .setLngLat([wp.lng, wp.lat])
            .addTo(map);
          marker.getElement().addEventListener('click', (e) => {
            e.stopPropagation();
            waypointPressRef.current?.(wp.id);
          });
          markersRef.current.set(wp.id, marker);
        }
      }
      for (const [id, marker] of markersRef.current) {
        if (!seen.has(id)) {
          marker.remove();
          markersRef.current.delete(id);
        }
      }
    }, [loaded, waypoints]);

    // User location pulse marker (never enters waypoints — same as web app).
    useEffect(() => {
      const map = mapRef.current;
      if (!loaded || !map) return;
      if (!position) {
        userMarkerRef.current?.remove();
        userMarkerRef.current = null;
        return;
      }
      if (!userMarkerRef.current) {
        userMarkerRef.current = new Marker({
          element: createPulseElement(),
        })
          .setLngLat([position.lng, position.lat])
          .addTo(map);
      } else {
        userMarkerRef.current.setLngLat([position.lng, position.lat]);
      }
    }, [loaded, position]);

    // Blue accuracy circle, radius driven by the real zoom (same formula as native).
    useEffect(() => {
      const map = mapRef.current;
      if (!loaded || !map) return;
      const source = map.getSource('userAccuracy') as
        | GeoJSONSource
        | undefined;
      if (!source) return;
      const features: Feature<Point>[] = position
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Point',
                coordinates: [position.lng, position.lat],
              },
            },
          ]
        : [];
      source.setData({ type: 'FeatureCollection', features });
      if (position) {
        map.setPaintProperty(
          'userAccuracy',
          'circle-radius',
          accuracyRadiusPx(position.accuracy, position.lat, zoom)
        );
      }
    }, [loaded, position, zoom]);

    return (
      <View style={styles.container}>
        <View
          ref={(node: View | null) => {
            containerRef.current = node as HTMLDivElement | null;
          }}
          style={styles.mapContainer}
        />
      </View>
    );
  }
);

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
});

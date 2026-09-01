import {
  Camera,
  GeoJSONSource,
  Layer,
  Map,
  ViewAnnotation,
  type CameraRef,
  type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

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
};

/** The web app's exact OSM raster tiles, as an inline MapLibre style. */
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

const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
  ({ waypoints, segments, mode, position, onMapClick }, ref) => {
    const cameraRef = useRef<CameraRef | null>(null);
    const [zoom, setZoom] = useState(12);
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      );
      animation.start();
      return () => animation.stop();
    }, [pulse]);

    useImperativeHandle(ref, () => ({
      flyTo: (lngLat: [number, number], zoomLevel = 15) => {
        cameraRef.current?.flyTo({
          center: lngLat,
          zoom: zoomLevel,
          duration: 1500,
        });
      },
    }));

    const minRouted = useMemo(
      () => (segments.length ? Math.min(...segments.map((s) => s.routed)) : Infinity),
      [segments]
    );

    const shortestRoutes = useMemo(
      () => ({
        type: 'FeatureCollection' as const,
        features: (segments.length >= 2
          ? segments.filter((seg) => seg.routed === minRouted)
          : []
        ).map((seg) => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates: seg.routeGeometry },
        })),
      }),
      [segments, minRouted]
    );

    const otherRoutes = useMemo(
      () => ({
        type: 'FeatureCollection' as const,
        features: (segments.length >= 2
          ? segments.filter((seg) => seg.routed !== minRouted)
          : segments
        ).map((seg) => ({
          type: 'Feature' as const,
          properties: {},
          geometry: { type: 'LineString' as const, coordinates: seg.routeGeometry },
        })),
      }),
      [segments, minRouted]
    );

    const straightLines = useMemo(
      () => ({
        type: 'FeatureCollection' as const,
        features:
          waypoints.length >= 2
            ? waypoints.slice(0, -1).map((wp, i) => ({
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'LineString' as const,
                  coordinates: [
                    [wp.lng, wp.lat],
                    [waypoints[i + 1].lng, waypoints[i + 1].lat],
                  ] as [number, number][],
                },
              }))
            : [],
      }),
      [waypoints]
    );
    const userLocationGeoJSON = useMemo(
      () => ({
        type: 'FeatureCollection' as const,
        features: position
          ? [
              {
                type: 'Feature' as const,
                properties: {},
                geometry: {
                  type: 'Point' as const,
                  coordinates: [position.lng, position.lat] as [number, number],
                },
              },
            ]
          : [],
      }),
      [position]
    );

    const handleMapPress = (e: {
      nativeEvent: { lngLat: [number, number] };
    }) => {
      if (mode !== 'measure') return;
      const [lng, lat] = e.nativeEvent.lngLat;
      onMapClick(lat, lng);
    };

    const pulseScale = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 2.2],
    });
    const pulseOpacity = pulse.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    });

    return (
      <Map
        mapStyle={OSM_STYLE}
        onPress={handleMapPress}
        onRegionDidChange={(e) => setZoom(e.nativeEvent.zoom)}
        style={{ flex: 1 }}
      >
        <Camera
          ref={cameraRef}
          initialViewState={{ center: TEHRAN, zoom: 12 }}
        />

        {/* Straight dashed lines between consecutive waypoints */}
        <GeoJSONSource id="straightLines" data={straightLines}>
          <Layer
            type="line"
            paint={{
              'line-color': COLORS.gray,
              'line-width': 2,
              'line-opacity': 0.7,
              'line-dasharray': [2, 3],
            }}
          />
        </GeoJSONSource>

        {/* Non-shortest road routes (blue) */}
        <GeoJSONSource id="otherRoutes" data={otherRoutes}>
          <Layer
            type="line"
            paint={{
              'line-color': COLORS.blue,
              'line-width': 3,
              'line-opacity': 0.85,
            }}
          />
        </GeoJSONSource>

        {/* Shortest road route (green, only when >= 2 segments) */}
        <GeoJSONSource id="shortestRoutes" data={shortestRoutes}>
          <Layer
            type="line"
            paint={{
              'line-color': COLORS.green,
              'line-width': 5,
              'line-opacity': 0.85,
            }}
          />
        </GeoJSONSource>

        {/* User location accuracy circle (radius driven by the real zoom) */}
        {position ? (
          <GeoJSONSource id="userAccuracy" data={userLocationGeoJSON}>
            <Layer
              type="circle"
              paint={{
                'circle-radius': accuracyRadiusPx(
                  position.accuracy,
                  position.lat,
                  zoom
                ),
                'circle-color': COLORS.blue,
                'circle-opacity': 0.15,
                'circle-stroke-width': 1,
                'circle-stroke-color': COLORS.blue,
                'circle-stroke-opacity': 0.4,
              }}
            />
          </GeoJSONSource>
        ) : null}

        {/* Waypoint markers */}
        {waypoints.map((wp) => (
          <ViewAnnotation key={wp.id} id={wp.id} lngLat={[wp.lng, wp.lat]}>
            <View style={styles.marker}>
              <Text style={styles.markerText}>{wp.label}</Text>
            </View>
          </ViewAnnotation>
        ))}

        {/* User location pulse marker */}
        {position ? (
          <ViewAnnotation
            id="userLocation"
            lngLat={[position.lng, position.lat]}
          >
            <View style={styles.pulseWrap}>
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                ]}
              />
              <View style={styles.pulseDot} />
            </View>
          </ViewAnnotation>
        ) : null}
      </Map>
    );
  }
);

const styles = StyleSheet.create({
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.red,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Vazirmatn_700Bold',
  },
  pulseWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
  },
  pulseDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.blue,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});

MapCanvas.displayName = 'MapCanvas';

export default MapCanvas;
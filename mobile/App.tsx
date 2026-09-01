import { StatusBar } from 'expo-status-bar';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  useFonts,
} from '@expo-google-fonts/vazirmatn';
import { StyleSheet, Text, I18nManager, View } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { MapMode, SegmentDistance, Waypoint } from './src/types';
import { computeSegments } from './src/utils/distance';
import { toPersianNumber } from './src/utils/persian';
import {
  LOCATION_UNAVAILABLE_MESSAGE,
  useUserLocation,
} from './src/hooks/useUserLocation';
import MapCanvas, { type MapCanvasHandle } from './src/components/MapCanvas';
import SearchBar from './src/components/SearchBar';

// RTL must be set at module scope, before the app renders.
// Note: forceRTL fully applies after an app restart — first launch may show
// some LTR layout; that is known RN behavior, not a bug.
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

// One shared counter for waypoints added by map taps AND search selections.
let waypointCounter = 0;

function AppRoot() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [segments, setSegments] = useState<SegmentDistance[]>([]);
  const [mode, setMode] = useState<MapMode>('explore');
  const [panelOpen, setPanelOpen] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const { position, request } = useUserLocation();

  // Toast auto-dismiss (4s), same as the web app.
  useEffect(() => {
    if (!locationError) return;
    const timer = setTimeout(() => setLocationError(null), 4000);
    return () => clearTimeout(timer);
  }, [locationError]);

  const recalcSegments = useCallback(async (wps: Waypoint[]) => {
    if (wps.length < 2) {
      setSegments([]);
      return;
    }
    const segs = await computeSegments(wps);
    setSegments(segs);
  }, []);

  const addWaypoint = useCallback(
    (lat: number, lng: number, address?: string) => {
      waypointCounter += 1;
      const wp: Waypoint = {
        id: `wp-${Date.now()}-${waypointCounter}`,
        lat,
        lng,
        label: toPersianNumber(waypointCounter),
        address,
      };
      const next = [...waypoints, wp];
      setWaypoints(next);
      // Fire-and-forget: the UI never awaits the recalculation.
      void recalcSegments(next);
    },
    [waypoints, recalcSegments]
  );

  const removeWaypoint = useCallback(
    (id: string) => {
      const next = waypoints.filter((wp) => wp.id !== id);
      setWaypoints(next);
      void recalcSegments(next);
    },
    [waypoints, recalcSegments]
  );

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
    setSegments([]);
  }, []);

  const mapRef = useRef<MapCanvasHandle | null>(null);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      addWaypoint(lat, lng);
    },
    [addWaypoint]
  );

  const handleSearchSelect = useCallback(
    (lat: number, lng: number) => {
      mapRef.current?.flyTo([lng, lat]);
      if (mode === 'measure') {
        addWaypoint(lat, lng);
      }
    },
    [mode, addWaypoint]
  );

  const handleGpsPress = useCallback(async () => {
    try {
      const loc = position ?? (await request());
      // Fly to the GPS result — it never enters `waypoints`.
      mapRef.current?.flyTo([loc.lng, loc.lat]);
    } catch (e) {
      setLocationError(
        e instanceof Error ? e.message : LOCATION_UNAVAILABLE_MESSAGE
      );
    }
  }, [position, request]);

  return (
    <View style={styles.container}>
      <MapCanvas
        ref={mapRef}
        waypoints={waypoints}
        segments={segments}
        mode={mode}
        position={position}
        onMapClick={handleMapClick}
      />
      <SearchBar onSelect={handleSearchSelect} />
      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
  });

  if (!fontsLoaded) {
    // Keep the splash up until the fonts are ready.
    return null;
  }

  return <AppRoot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

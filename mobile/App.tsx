import { StatusBar } from 'expo-status-bar';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  useFonts,
} from '@expo-google-fonts/vazirmatn';
import {
  Animated,
  FlatList,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import type { MapMode, SegmentDistance, Waypoint } from './src/types';
import {
  computeSegments,
  totalRoutedDistance,
  totalStraightDistance,
} from './src/utils/distance';
import { formatCoordinate, formatDistance, toPersianNumber } from './src/utils/persian';
import {
  LOCATION_UNAVAILABLE_MESSAGE,
  useUserLocation,
} from './src/hooks/useUserLocation';
import MapCanvas, { type MapCanvasHandle } from './src/components/MapCanvas';
import SearchBar from './src/components/SearchBar';
import { COLORS } from './src/theme';

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
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle | null>(null);
  const panelAnim = useRef(new Animated.Value(0)).current;

  // Vertical stacking: search bar is ~56px tall (padding 12+12 + input ~32) plus
  // top: insets.top + 8. Mode toggle sits just below it.
  const SEARCH_BOTTOM = insets.top + 68; // 8 (top offset) + ~60 (card height with border)
  const TOGGLE_TOP = SEARCH_BOTTOM + 8;
  const TOAST_TOP = TOGGLE_TOP + 48; // below the mode toggle pills
  const TOGGLE_TOGGLE_TOP = TOGGLE_TOP + 48; // below mode toggle pills

  // Bottom stacking: FABs are the anchor at insets.bottom + 24.
  // Summary card and measure hint float above them with a gap.
  const FABS_BOTTOM = insets.bottom + 24;
  const CARD_BOTTOM = FABS_BOTTOM + 72; // 48 (FAB height) + 24 (gap)

  // Toast auto-dismiss (4s), same as the web app.
  useEffect(() => {
    if (!locationError) return;
    const timer = setTimeout(() => setLocationError(null), 4000);
    return () => clearTimeout(timer);
  }, [locationError]);

  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: panelOpen ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [panelOpen, panelAnim]);

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

  const undoWaypoint = useCallback(() => {
    if (waypoints.length === 0) return;
    const lastId = waypoints[waypoints.length - 1].id;
    removeWaypoint(lastId);
  }, [waypoints, removeWaypoint]);

  const handleWaypointPress = useCallback(
    (id: string) => {
      removeWaypoint(id);
    },
    [removeWaypoint]
  );

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
        onWaypointPress={handleWaypointPress}
      />

      {/* Search overlay */}
      <SearchBar onSelect={handleSearchSelect} />

      {/* Mode toggle */}
      <View style={[styles.modeToggle, { top: TOGGLE_TOP }]}>
        <Pressable
          style={[styles.modeButton, mode === 'explore' && styles.modeActive]}
          onPress={() => setMode('explore')}
        >
          <Text
            style={[
              styles.modeText,
              mode === 'explore' && styles.modeTextActive,
            ]}
          >
            کاوش نقشه
          </Text>
        </Pressable>
        <Pressable
          style={[styles.modeButton, mode === 'measure' && styles.modeActive]}
          onPress={() => setMode('measure')}
        >
          <Text
            style={[
              styles.modeText,
              mode === 'measure' && styles.modeTextActive,
            ]}
          >
            اندازه‌گیری مسیر
          </Text>
        </Pressable>
      </View>

      {/* GPS toast */}
      {locationError ? (
        <View style={[styles.toast, { top: TOAST_TOP }]}>
          <Ionicons name="warning" size={16} color={COLORS.white} />
          <Text style={styles.toastText}>{locationError}</Text>
        </View>
      ) : null}

      {/* Summary card */}
      {waypoints.length >= 2 ? (
        <View style={[styles.summaryCard, { bottom: CARD_BOTTOM }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summarySquare} />
            <Text style={styles.summaryLabel}>مجموع مسافت</Text>
            <Text style={styles.summaryValue}>
              {formatDistance(totalRoutedDistance(segments))}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <View
              style={[styles.summarySquare, { backgroundColor: COLORS.gray }]}
            />
            <Text style={styles.summaryLabel}>خط مستقیم</Text>
            <Text style={styles.summaryValue}>
              {formatDistance(totalStraightDistance(segments))}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Measure hint */}
      {mode === 'measure' && waypoints.length === 0 ? (
        <View style={[styles.measureHint, { bottom: CARD_BOTTOM }]}>
          <Text style={styles.measureHintText}>
            روی نقشه کلیک کنید • روی نقطه بزنید تا حذف شود
          </Text>
        </View>
      ) : null}

      {/* FABs */}
      <View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
        {mode === 'measure' && waypoints.length > 0 ? (
          <Pressable style={styles.fab} onPress={undoWaypoint}>
            <Ionicons name="arrow-undo" size={20} color={COLORS.textMid} />
          </Pressable>
        ) : null}
        {waypoints.length > 0 ? (
          <Pressable style={styles.fab} onPress={clearWaypoints}>
            <Ionicons name="trash" size={22} color={COLORS.red} />
          </Pressable>
        ) : null}
        <Pressable style={styles.fab} onPress={handleGpsPress}>
          <Ionicons name="navigate" size={22} color={COLORS.blue} />
        </Pressable>
      </View>

      {/* Control panel (slides from the left edge) */}
      <Animated.View
        style={[
          styles.panel,
          {
            transform: [
              {
                translateX: panelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-320, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.panelHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.panelTitle}>پنل کنترل</Text>
        </View>
        <FlatList
          data={waypoints}
          keyExtractor={(item) => item.id}
          style={styles.panelList}
          renderItem={({ item }) => (
            <View style={styles.panelRow}>
              <View style={styles.panelRowBody}>
                <Text style={styles.panelRowTitle}>نقطه {item.label}</Text>
                <Text style={styles.panelRowCoords}>
                  {formatCoordinate(item.lat, item.lng)}
                </Text>
              </View>
              <Pressable
                hitSlop={8}
                onPress={() => removeWaypoint(item.id)}
                style={styles.panelRemove}
              >
                <Ionicons name="close" size={18} color={COLORS.textMid} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.panelEmpty}>نقطه‌ای ثبت نشده است</Text>
          }
        />
        <View style={styles.panelFooter}>
          <View style={styles.panelTotalsRow}>
            <Text style={styles.panelTotalsLabel}>مجموع مسافت</Text>
            <Text style={styles.panelTotalsValue}>
              {formatDistance(totalRoutedDistance(segments))}
            </Text>
          </View>
          <View style={styles.panelTotalsRow}>
            <Text style={styles.panelTotalsLabel}>خط مستقیم</Text>
            <Text style={styles.panelTotalsValue}>
              {formatDistance(totalStraightDistance(segments))}
            </Text>
          </View>
          {waypoints.length > 0 ? (
            <Pressable style={styles.panelClear} onPress={clearWaypoints}>
              <Text style={styles.panelClearText}>پاک کردن همه</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>

      {/* Panel chevron toggle (starts closed) */}
      <Pressable
        style={[styles.panelToggle, { top: TOGGLE_TOGGLE_TOP }]}
        onPress={() => setPanelOpen((v) => !v)}
      >
        <Ionicons
          name={panelOpen ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={COLORS.textDark}
        />
      </Pressable>

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

  return (
    <SafeAreaProvider>
      <AppRoot />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modeToggle: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 900,
  },
  modeButton: {
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 40, // ensures adequate touch target
  },
  modeActive: {
    backgroundColor: COLORS.blue,
    borderColor: COLORS.blue,
  },
  modeText: {
    color: COLORS.textMid,
    fontSize: 14,
    fontFamily: 'Vazirmatn_500Medium',
  },
  modeTextActive: {
    color: COLORS.white,
  },
  toast: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1100,
  },
  toastText: {
    color: COLORS.white,
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    fontFamily: 'Vazirmatn_400Regular',
  },
  summaryCard: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    zIndex: 800,
    minWidth: 220,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summarySquare: {
    width: 12,
    height: 12,
    borderRadius: 3,
    backgroundColor: COLORS.blue,
    marginRight: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textMid,
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Vazirmatn_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  measureHint: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 800,
  },
  measureHintText: {
    color: COLORS.white,
    fontSize: 13,
    fontFamily: 'Vazirmatn_400Regular',
  },
  fabs: {
    position: 'absolute',
    left: 16,
    zIndex: 900,
    gap: 12,
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 300,
    backgroundColor: COLORS.white,
    zIndex: 1200,
    elevation: 8,
  },
  panelHeader: {
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  panelList: {
    flex: 1,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  panelRowBody: {
    flex: 1,
  },
  panelRowTitle: {
    fontSize: 14,
    color: COLORS.textDark,
    textAlign: 'right',
    fontFamily: 'Vazirmatn_500Medium',
  },
  panelRowCoords: {
    fontSize: 12,
    color: COLORS.textMid,
    textAlign: 'right',
    marginTop: 2,
    fontFamily: 'Vazirmatn_400Regular',
  },
  panelRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelEmpty: {
    padding: 16,
    color: COLORS.textMid,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: 'Vazirmatn_400Regular',
  },
  panelFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  panelTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  panelTotalsLabel: {
    fontSize: 13,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_400Regular',
  },
  panelTotalsValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  panelClear: {
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  panelClearText: {
    color: COLORS.red,
    fontSize: 13,
    fontFamily: 'Vazirmatn_500Medium',
  },
  panelToggle: {
    position: 'absolute',
    left: 0,
    width: 28,
    height: 44,
    backgroundColor: COLORS.white,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1100,
  },
});
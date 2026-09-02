# Plan 009: Redesign Mobile UI to Match Google Maps Layout and UX

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat a8221cc..HEAD -- mobile/App.tsx mobile/src/ mobile/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none (supersedes plans 004-005 which addressed the old sidebar layout)
- **Category**: direction / ux
- **Planned at**: commit `a8221cc`, 2026-09-02

## Why this matters

The current mobile UI uses a 300px-wide full-height sidebar panel that slides
in from the left edge — a desktop/web pattern, not a mobile one. On phones,
this sidebar covers the entire map viewport, making it impossible to see the
map while viewing waypoint data. The toggle to open it is a tiny 28×44px
chevron on the edge, which is hard to discover and hard to hit.

Google Maps solves this with a **bottom sheet**: a panel that slides up from
the bottom, snaps to a collapsed "peek" height (showing a summary), and
expands to full height when dragged up. The map remains visible even in
collapsed state. FABs are on the right side, not stacked on the left.

This plan replaces the sidebar with a bottom sheet, repositions controls to
match Google Maps conventions, and eliminates the mode toggle in favor of
inline mode chips — making the app feel like a native mapping tool.

**What changes:**

| Element | BEFORE (current) | AFTER (Google Maps style) |
|---------|------------------|---------------------------|
| Waypoints panel | 300px sidebar from left edge | Bottom sheet: peek 120px (summary), half 40%, full 90% |
| Panel toggle | 28×44 chevron on left edge | REMOVED (bottom sheet drag replaces this) |
| Mode toggle | Centered pill row below search | Compact chips inline below search bar (centered, smaller) |
| Summary card | Floating centered card above FABs | REMOVED (lives inside bottom sheet peek) |
| FABs | Left side vertical stack (undo, trash, compass, GPS) | Right side vertical stack: GPS, Compass (top), then Trash (when waypoints exist) |
| Undo FAB | Inside FAB stack | Inside bottom sheet header (bottom-right corner) |
| Clear button | Inside panel footer | Bottom of bottom sheet |
| Measure hint | Floating centered pill | REMOVED (instruction shown as empty state inside bottom sheet) |

## Current state

The relevant files and their roles:

- `mobile/App.tsx` (678 lines) — Single monolithic file containing ALL UI
  overlays: map, search bar, mode toggle, toast, summary card, measure hint,
  FABs, panel backdrop, sidebar panel (FlatList of waypoints), and panel toggle.
- `mobile/src/components/SearchBar.tsx` (203 lines) — Search bar with Nominatim
  autocomplete. Already uses safe area insets correctly.
- `mobile/src/components/MapCanvas.native.tsx` (336 lines) — MapLibre v11 map
  with markers, routes, and user location. No changes needed here.
- `mobile/src/theme.ts` (13 lines) — COLORS constant and TEHRAN center coords.
- `mobile/src/types.ts` (28 lines) — Waypoint, SearchResult, SegmentDistance, MapMode types.
- `mobile/src/utils/haptics.ts` (37 lines) — hapticLight/Medium/Warning/Success wrappers.
- `mobile/package.json` — Dependencies: Expo 57, React 19, RN 0.86, MapLibre 11.3.

**Excerpt — Current panel and FABs in App.tsx:**

Lines 297-315 (FABs, positioned at `left: 16`):
```tsx
<View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
  {mode === 'measure' && waypoints.length > 0 ? (
    <Pressable style={styles.fab} onPress={() => { hapticMedium(); undoWaypoint(); }}>
      <Ionicons name="arrow-undo" size={20} color={COLORS.textMid} />
    </Pressable>
  ) : null}
  {waypoints.length > 0 ? (
    <Pressable style={styles.fab} onPress={() => { hapticMedium(); clearWaypoints(); }}>
      <Ionicons name="trash" size={22} color={COLORS.red} />
    </Pressable>
  ) : null}
  <Pressable style={styles.fab} onPress={() => { hapticLight(); handleCompassPress(); }}>
    <Ionicons name="compass" size={22} color={COLORS.textDark} />
  </Pressable>
  <Pressable style={styles.fab} onPress={() => { hapticLight(); void handleGpsPress(); }}>
    <Ionicons name="navigate" size={22} color={COLORS.blue} />
  </Pressable>
</View>
```

Lines 326-389 (sidebar panel with FlatList, panel header, footer):
```tsx
<Animated.View
  {...panelResponder.panHandlers}
  style={[styles.panel, { transform: [{ translateX: panelAnim.interpolate({...}) }] }]}
>
  <View style={[styles.panelHeader, { paddingTop: insets.top + 16 }]}>
    <Text style={styles.panelTitle}>پنل کنترل</Text>
  </View>
  <FlatList
    data={waypoints}
    keyExtractor={(item) => item.id}
    style={styles.panelList}
    renderItem={({ item }) => ( /* waypoint row with remove button */ )}
    ListEmptyComponent={<Text style={styles.panelEmpty}>نقطه‌ای ثبت نشده است</Text>}
  />
  <View style={styles.panelFooter}>
    {/* Total distance, clear button */}
  </View>
</Animated.View>
```

Lines 392-401 (panel toggle — tiny chevron on left edge):
```tsx
<Pressable
  style={[styles.panelToggle, { top: TOGGLE_TOGGLE_TOP }]}
  onPress={() => { hapticLight(); setPanelOpen((v) => !v); }}
>
  <Ionicons name={panelOpen ? 'chevron-back' : 'chevron-forward'} size={18} ... />
</Pressable>
```

**App conventions to honor:**
- RTL layout is forced (`I18nManager.forceRTL(true)` at module scope)
- All text uses Vazirmatn font family: `'Vazirmatn_400Regular'`, `'Vazirmatn_500Medium'`, `'Vazirmatn_700Bold'`
- Haptics: `hapticLight()` for selections, `hapticMedium()` for destructive, `hapticWarning()` for undo
- Colors from `COLORS` in `theme.ts`
- Safe area insets via `useSafeAreaInsets()` hook
- No test infrastructure — verification is lint + typecheck + manual
- JSX uses Pressable (not TouchableOpacity) for all press interactions

## Commands you will need

| Purpose    | Command                          | Expected on success          |
|------------|----------------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint`     | 0 errors (warnings OK)      |
| Typecheck  | `cd mobile && npx tsc --noEmit`  | 0 errors                    |
| Install    | `cd mobile && npx expo install @gorhom/bottom-sheet` | exit 0, version-compatible |
| Check dep  | `cd mobile && node -e "require('@gorhom/bottom-sheet'); console.log('ok')"` | ok |

## Scope

**In scope** (the only files you should modify):
- `mobile/package.json` (install new dependency)
- `mobile/src/components/WaypointsSheet.tsx` (NEW — bottom sheet component)
- `mobile/App.tsx` (major rewrite of overlay layout)

**Out of scope** (do NOT touch, even though they look related):
- `mobile/src/components/MapCanvas.native.tsx` — map rendering, no changes needed.
- `mobile/src/components/MapCanvas.web.tsx` — web canvas, separate concern.
- `mobile/src/components/SearchBar.tsx` — search bar works fine as-is, only its parent container in App.tsx changes position.
- `mobile/src/utils/*` — no utility changes needed.
- `mobile/webapp/` — separate project, frozen as reference.
- `mobile/app.json` — no config changes needed.

## Git workflow

- Branch: `advisor/009-google-maps-style-redesign`
- Commit messages: `feat(009): <description>` (matches repo convention from `git log`)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install @gorhom/bottom-sheet

Google Maps uses a bottom sheet for route info and waypoints. The standard
React Native library for this is `@gorhom/bottom-sheet`. It handles gesture
conflicts, backdrop, snap points, and animations out of the box.

```bash
cd mobile && npx expo install @gorhom/bottom-sheet react-native-reanimated react-native-gesture-handler
```

Note: `@gorhom/bottom-sheet` requires `react-native-reanimated` and
`react-native-gesture-handler` as peer dependencies. Expo 57 bundles both.
If `npx expo install` reports version conflicts, check Expo SDK 57 docs at
https://docs.expo.dev/versions/v57.0.0/ for compatible versions.

**Verify**:
```bash
cd mobile && node -e "require('@gorhom/bottom-sheet'); console.log('ok')"
```
Expected: `ok`

Also add `react-native-reanimated/plugin` to babel config if not already present.
Check `mobile/babel.config.js` — if it exists, ensure `plugins: ['react-native-reanimated/plugin']` is the last entry. If no babel config exists, check if Expo's default config handles it (SDK 57+ typically does via `expo/babel` preset).

### Step 2: Create WaypointsSheet.tsx — the bottom sheet component

Create a new file `mobile/src/components/WaypointsSheet.tsx`. This replaces the
entire sidebar panel (header, waypoint FlatList, totals, clear button) with a
Google Maps-style bottom sheet.

```tsx
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../theme';
import type { Waypoint, SegmentDistance } from '../types';
import { formatCoordinate, formatDistance, toPersianNumber } from '../utils/persian';
import { totalRoutedDistance, totalStraightDistance } from '../utils/distance';
import { hapticLight, hapticMedium, hapticWarning } from '../utils/haptics';

type WaypointsSheetProps = {
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onUndo: () => void;
  sheetRef: React.RefObject<BottomSheet | null>;
};

export default function WaypointsSheet({
  waypoints,
  segments,
  onRemove,
  onClear,
  onUndo,
  sheetRef,
}: WaypointsSheetProps) {
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['12%', '45%', '85%'], []);

  const renderItem = useCallback(
    ({ item, index }: { item: Waypoint; index: number }) => (
      <View style={styles.row}>
        <View style={styles.indexBadge}>
          <Text style={styles.indexText}>{toPersianNumber(index + 1)}</Text>
        </View>
        <View style={styles.rowBody}>
          <Text style={styles.rowTitle}>نقطه {item.label}</Text>
          <Text style={styles.rowCoords}>
            {formatCoordinate(item.lat, item.lng)}
          </Text>
        </View>
        <Pressable
          hitSlop={8}
          onPress={() => { hapticLight(); onRemove(item.id); }}
          style={styles.removeBtn}
        >
          <Ionicons name="close" size={18} color={COLORS.textMid} />
        </Pressable>
      </View>
    ),
    [onRemove],
  );

  const headerRight = waypoints.length > 0 ? (
    <Pressable
      onPress={() => { hapticMedium(); onUndo(); }}
      style={styles.undoBtn}
    >
      <Ionicons name="arrow-undo" size={18} color={COLORS.textMid} />
    </Pressable>
  ) : null;

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableHandlePanning={true}
      handleIndicatorStyle={styles.handle}
      handleStyle={styles.handleContainer}
      backgroundStyle={styles.background}
      style={{ zIndex: 1300 }}
    >
      {/* Header with title and undo button */}
      <View style={[styles.header, { paddingBottom: insets.bottom > 0 ? 12 : 8 }]}>
        <Text style={styles.title}>نقاط مسیر</Text>
        {headerRight}
      </View>

      {/* Waypoint list */}
      <BottomSheetFlatList
        data={waypoints}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          waypoints.length === 0 ? styles.emptyContainer : styles.listContent
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={40} color={COLORS.gray} />
            <Text style={styles.emptyTitle}>نقطه‌ای اضافه نشده</Text>
            <Text style={styles.emptyHint}>
              روی نقشه کلیک کنید تا نقطه اضافه شود
            </Text>
          </View>
        }
      />

      {/* Footer: totals + clear */}
      {waypoints.length > 0 ? (
        <View style={styles.footer}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>مجموع مسافت</Text>
            <Text style={styles.totalsValue}>
              {formatDistance(totalRoutedDistance(segments))}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>خط مستقیم</Text>
            <Text style={styles.totalsValue}>
              {formatDistance(totalStraightDistance(segments))}
            </Text>
          </View>
          <Pressable
            style={styles.clearBtn}
            onPress={() => { hapticWarning(); onClear(); }}
          >
            <Ionicons name="trash-outline" size={16} color={COLORS.red} />
            <Text style={styles.clearText}>پاک کردن همه نقاط</Text>
          </Pressable>
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    backgroundColor: '#d1d5db',
  },
  background: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  undoBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  indexText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'Vazirmatn_700Bold',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_500Medium',
    textAlign: 'right',
  },
  rowCoords: {
    fontSize: 12,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_400Regular',
    marginTop: 2,
    textAlign: 'right',
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_500Medium',
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.gray,
    fontFamily: 'Vazirmatn_400Regular',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 13,
    color: COLORS.textMid,
    fontFamily: 'Vazirmatn_400Regular',
  },
  totalsValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textDark,
    fontFamily: 'Vazirmatn_700Bold',
  },
  clearBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    paddingVertical: 10,
  },
  clearText: {
    color: COLORS.red,
    fontSize: 13,
    fontFamily: 'Vazirmatn_500Medium',
  },
});
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 3: Rewrite App.tsx — remove sidebar, add bottom sheet, reposition controls

This is the main step. The entire overlay layout in AppRoot() is rewritten.
Read the current `mobile/App.tsx` in full, then apply these changes:

#### 3a. Update imports

Replace the import block (lines 1-37) with:

```tsx
import { StatusBar } from 'expo-status-bar';
import {
  Vazirmatn_400Regular,
  Vazirmatn_500Medium,
  Vazirmatn_700Bold,
  useFonts,
} from '@expo-google-fonts/vazirmatn';
import {
  Animated,
  BackHandler,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type BottomSheet from '@gorhom/bottom-sheet';
import { hapticLight, hapticMedium, hapticWarning } from './src/utils/haptics';

import type { MapMode, SegmentDistance, Waypoint } from './src/types';
import {
  computeSegments,
  totalRoutedDistance,
  totalStraightDistance,
} from './src/utils/distance';
import { formatDistance, toPersianNumber } from './src/utils/persian';
import {
  LOCATION_UNAVAILABLE_MESSAGE,
  useUserLocation,
} from './src/hooks/useUserLocation';
import MapCanvas, { type MapCanvasHandle } from './src/components/MapCanvas';
import SearchBar from './src/components/SearchBar';
import WaypointsSheet from './src/components/WaypointsSheet';
import { COLORS } from './src/theme';
```

Key import changes:
- REMOVED: `FlatList`, `PanResponder` (no more sidebar)
- ADDED: `import type BottomSheet from '@gorhom/bottom-sheet'` and `WaypointsSheet`

#### 3b. Rewrite the state and refs inside AppRoot()

Replace the state/refs section (lines 49-86) with:

```tsx
function AppRoot() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [segments, setSegments] = useState<SegmentDistance[]>([]);
  const [mode, setMode] = useState<MapMode>('explore');
  const [locationError, setLocationError] = useState<string | null>(null);
  const { position, request } = useUserLocation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapCanvasHandle | null>(null);
  const sheetRef = useRef<BottomSheet | null>(null);
```

Removed: `panelOpen`, `panelAnim`, `panelWidth`, `panelResponder`.
Added: `sheetRef`.

#### 3c. Remove all panel-related offset computations

Remove the entire offset computation block (lines 88-98):
```tsx
const SEARCH_BOTTOM = insets.top + 68;
const TOGGLE_TOP = SEARCH_BOTTOM + 8;
const TOAST_TOP = TOGGLE_TOP + 48;
const TOGGLE_TOGGLE_TOP = TOGGLE_TOP + 48;
const FABS_BOTTOM = insets.bottom + 24;
const CARD_BOTTOM = FABS_BOTTOM + 72;
```

Replace with simpler Google Maps-style offsets:
```tsx
// Google Maps layout: search bar at top, FABs on right side, bottom sheet at bottom.
const FABS_BOTTOM = insets.bottom + 24;
const FABS_RIGHT = 16;
```

Note: the search bar and mode toggle are positioned by their own component styles
(no need for offset constants). The toast is positioned relative to the search bar.

#### 3d. Remove the panel animation effect

Remove (lines 107-113):
```tsx
useEffect(() => {
  Animated.timing(panelAnim, {
    toValue: panelOpen ? 1 : 0,
    duration: 200,
    useNativeDriver: true,
  }).start();
}, [panelOpen, panelAnim]);
```

And remove the Android BackHandler effect for the panel (lines 116-123):
```tsx
useEffect(() => {
  if (!panelOpen) return;
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    setPanelOpen(false);
    return true;
  });
  return () => handler.remove();
}, [panelOpen]);
```

Note: the bottom sheet handles its own gestures and BackHandler internally.

#### 3e. Remove handleMapClick waypoints logic for explore mode

Currently `handleMapClick` adds waypoints on any map click. In the Google Maps
pattern, tapping the map in explore mode should do nothing (it's just a tap on
the map). Only in measure mode should tapping add waypoints. This is already the
case — the MapCanvas.native.tsx line 172 checks `if (mode !== 'measure') return`.
So the `handleMapClick` callback is fine as-is.

However, remove the auto-open-panel behavior. Currently, after adding a waypoint,
the sidebar opens. Instead, expand the bottom sheet when a waypoint is added:

After the `addWaypoint` callback, add:
```tsx
// Auto-expand bottom sheet when waypoints are added
useEffect(() => {
  if (waypoints.length > 0) {
    sheetRef.current?.snapToIndex(1); // snap to 45%
  }
}, [waypoints.length]);
```

Remove `setSidebarOpen(true)` if present (it was in the web app's addWaypoint, not in mobile).

#### 3f. Rewrite the return JSX — the complete overlay layout

Replace the entire return block (lines 212-405) with this new layout:

```tsx
return (
  <View style={styles.container}>
    {/* 1. Map (fills entire screen) */}
    <MapCanvas
      ref={mapRef}
      waypoints={waypoints}
      segments={segments}
      mode={mode}
      position={position}
      onMapClick={handleMapClick}
      onWaypointPress={handleWaypointPress}
    />

    {/* 2. Search bar — Google Maps style, floating at top */}
    <SearchBar onSelect={handleSearchSelect} />

    {/* 3. Mode chips — centered below search bar, Google Maps style */}
    <View style={[styles.modeChips, { top: insets.top + 68 }]}>
      <Pressable
        style={[styles.chip, mode === 'explore' && styles.chipActive]}
        onPress={() => { hapticLight(); setMode('explore'); }}
      >
        <Ionicons
          name="compass-outline"
          size={16}
          color={mode === 'explore' ? COLORS.white : COLORS.textMid}
        />
        <Text style={[styles.chipText, mode === 'explore' && styles.chipTextActive]}>
          کاوش
        </Text>
      </Pressable>
      <Pressable
        style={[styles.chip, mode === 'measure' && styles.chipActive]}
        onPress={() => { hapticLight(); setMode('measure'); }}
      >
        <Ionicons
          name="route-outline"
          size={16}
          color={mode === 'measure' ? COLORS.white : COLORS.textMid}
        />
        <Text style={[styles.chipText, mode === 'measure' && styles.chipTextActive]}>
          اندازه‌گیری
        </Text>
      </Pressable>
    </View>

    {/* 4. GPS error toast */}
    {locationError ? (
      <View style={[styles.toast, { top: insets.top + 110 }]}>
        <Ionicons name="warning" size={16} color={COLORS.white} />
        <Text style={styles.toastText}>{locationError}</Text>
      </View>
    ) : null}

    {/* 5. FABs — right side, Google Maps position */}
    <View style={[styles.fabs, { bottom: FABS_BOTTOM, right: FABS_RIGHT }]}>
      {waypoints.length > 0 ? (
        <Pressable style={styles.fab} onPress={() => { hapticMedium(); clearWaypoints(); }}>
          <Ionicons name="trash" size={22} color={COLORS.red} />
        </Pressable>
      ) : null}
      <Pressable style={styles.fab} onPress={() => { hapticLight(); handleCompassPress(); }}>
        <Ionicons name="compass" size={22} color={COLORS.textDark} />
      </Pressable>
      <Pressable style={styles.fab} onPress={() => { hapticLight(); void handleGpsPress(); }}>
        <Ionicons name="navigate" size={22} color={COLORS.blue} />
      </Pressable>
    </View>

    {/* 6. Waypoints bottom sheet (replaces the entire sidebar) */}
    <WaypointsSheet
      ref={sheetRef}
      waypoints={waypoints}
      segments={segments}
      onRemove={removeWaypoint}
      onClear={clearWaypoints}
      onUndo={undoWaypoint}
    />

    <StatusBar style="auto" />
  </View>
);
```

**What was removed from the JSX:**
- Mode toggle (`styles.modeToggle` block — lines 228-255) → replaced with mode chips
- Summary card (lines 266-286) → moved into bottom sheet
- Measure hint (lines 289-295) → replaced by empty state in bottom sheet
- Undo FAB (inside FABs block) → moved to bottom sheet header
- Panel backdrop (lines 318-323) → bottom sheet has its own backdrop
- Sidebar panel (lines 326-389) → replaced by WaypointsSheet
- Panel toggle (lines 392-401) → removed entirely (bottom sheet replaces this)

**What was kept:**
- MapCanvas — unchanged
- SearchBar — unchanged
- GPS error toast — same logic, repositioned below mode chips
- FABs (GPS, compass, trash) — repositioned to right side

#### 3g. Rewrite the StyleSheet

Replace the entire StyleSheet (lines 427-679) with:

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  // --- Mode chips (Google Maps style, below search bar) ---
  modeChips: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    zIndex: 900,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: COLORS.blue,
  },
  chipText: {
    color: COLORS.textMid,
    fontSize: 13,
    fontFamily: 'Vazirmatn_500Medium',
  },
  chipTextActive: {
    color: COLORS.white,
  },

  // --- Toast ---
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

  // --- FABs (right side, Google Maps position) ---
  fabs: {
    position: 'absolute',
    gap: 12,
    zIndex: 900,
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
});
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 4: Handle WaypointsSheet ref forwarding

The `WaypointsSheet` component receives a `ref` prop. Since `@gorhom/bottom-sheet`
`BottomSheet` is a class component (or forwardRef component), the ref is passed
through. However, in the current `WaypointsSheet` component above, we used
`sheetRef` as a prop, not a forwarded ref.

We need to update `WaypointsSheet` to use `forwardRef` instead of a prop:

Replace the component signature in `WaypointsSheet.tsx`:

```tsx
// Change from:
type WaypointsSheetProps = {
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onUndo: () => void;
  sheetRef: React.RefObject<BottomSheet | null>;
};

export default function WaypointsSheet({
  waypoints, segments, onRemove, onClear, onUndo, sheetRef,
}: WaypointsSheetProps) {

// To:
import { forwardRef } from 'react';

type WaypointsSheetProps = {
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onUndo: () => void;
};

const WaypointsSheet = forwardRef<BottomSheet, WaypointsSheetProps>(
  ({ waypoints, segments, onRemove, onClear, onUndo }, ref) => {
```

And close the component with `);` and add `export default WaypointsSheet;` at the bottom.

Update the JSX inside to use `ref` instead of `sheetRef`:
```tsx
<BottomSheet
  ref={ref}   // was sheetRef
  index={0}
  snapPoints={snapPoints}
  ...
>
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 5: Verify the GestureHandlerRootView requirement

`@gorhom/bottom-sheet` requires the entire app to be wrapped in
`GestureHandlerRootView`. Check if this is already present in the app.

In `mobile/App.tsx`, the current `App` component wraps in `<SafeAreaProvider>`.
Add `GestureHandlerRootView` around it:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  const [fontsLoaded] = useFonts({
    Vazirmatn_400Regular,
    Vazirmatn_500Medium,
    Vazirmatn_700Bold,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppRoot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 6: Remove old panel-related styles from StyleSheet

After the rewrite in Step 3g, confirm the following styles were REMOVED:
- `modeToggle`, `modeButton`, `modeActive`, `modeText`, `modeTextActive` (replaced by chips)
- `summaryCard`, `summaryRow`, `summarySquare`, `summaryLabel`, `summaryValue`, `summaryDivider` (moved to bottom sheet)
- `measureHint`, `measureHintText` (moved to bottom sheet empty state)
- `panel`, `panelBackdrop`, `panelHeader`, `panelTitle`, `panelList`, `panelRow`, `panelRowBody`, `panelRowTitle`, `panelRowCoords`, `panelRemove`, `panelEmpty`, `panelFooter`, `panelTotalsRow`, `panelTotalsLabel`, `panelTotalsValue`, `panelClear`, `panelClearText`, `panelToggle` (all replaced by bottom sheet)

If any of these still exist, remove them. They are dead code now.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0. `cd mobile && npx expo lint` → 0 errors.

### Step 7: Run final verification

```bash
cd mobile && npx tsc --noEmit
```
Expected: exit 0, no errors.

```bash
cd mobile && npx expo lint
```
Expected: 0 errors (warnings OK).

```bash
grep -n "panelOpen\|panelAnim\|panelResponder\|panelWidth\|panelToggle\|panelBackdrop\|panelHeader\|panelTitle\|panelList\|panelRow\|panelFooter\|panelEmpty\|panelRemove\|panelClear\|panelTotals" mobile/App.tsx
```
Expected: no matches (all sidebar code removed).

## Test plan

No test infrastructure. Verification is manual:

1. `cd mobile && npx expo start` → open on iOS Simulator or Android emulator.
2. **Bottom sheet peek**: On initial load, a bottom sheet peek (12% height) is
   visible at the bottom. It shows "نقاط مسیر" title and an empty state.
3. **Add waypoints**: Tap the map in measure mode → waypoint added → bottom
   sheet auto-expands to 45% showing the waypoint with a blue index badge.
4. **Expand/collapse**: Drag the bottom sheet handle up to expand (85%),
   drag down to collapse (12%). The map remains partially visible when collapsed.
5. **Remove waypoint**: Tap the X on a waypoint row → removed from list.
6. **Undo**: Tap the undo button in the sheet header → last waypoint removed.
7. **Clear all**: Tap "پاک کردن همه نقاط" → all waypoints removed, sheet shows empty state.
8. **Mode chips**: Tap "کاوش" → map tap does nothing. Tap "اندازه‌گیری" → map tap adds waypoints.
9. **FABs**: Right side of screen. GPS button flies to location. Compass resets north. Trash clears all.
10. **Search**: Type in search bar → results dropdown → select → map flies to location.
11. **No sidebar**: The old sidebar panel and chevron toggle should NOT appear.
12. **No summary card**: The old floating summary card should NOT appear.
13. **RTL**: All text is right-aligned. Sheet content flows RTL.
14. **Safe area**: On iPhone with notch, the search bar and bottom sheet respect safe area.

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] `@gorhom/bottom-sheet` is in `mobile/package.json` dependencies
- [ ] `mobile/src/components/WaypointsSheet.tsx` exists and exports a BottomSheet
- [ ] `grep -n "panelOpen\|panelAnim\|panelResponder\|panelWidth" mobile/App.tsx` returns no matches
- [ ] `grep -n "GestureHandlerRootView" mobile/App.tsx` returns a match
- [ ] `grep -n "styles.fabs.*right" mobile/App.tsx` returns a match (FABs on right side)
- [ ] Bottom sheet renders with 3 snap points (12%, 45%, 85%)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:
- `@gorhom/bottom-sheet` fails to install or import (Expo SDK 57 compatibility issue).
- `GestureHandlerRootView` causes a runtime crash or render error.
- The bottom sheet's vertical gestures conflict with MapLibre's pan/zoom gestures
  (the map becomes unresponsive to touch when the sheet is collapsed).
- A step's verification fails twice after a reasonable fix attempt.
- The code at the locations in "Current state" doesn't match the excerpts
  (codebase has drifted since this plan was written).

## Maintenance notes

- The bottom sheet snap points (12%, 45%, 85%) may need tuning after visual
  testing. The collapsed peek at 12% should show just the handle and title bar;
  the 45% view should show a few waypoints; 85% shows the full list.
- The `@gorhom/bottom-sheet` library is maintained and widely used. If Expo SDK
  updates break it, check the library's GitHub issues for version compatibility.
- The mode chips use shorter labels ("کاوش" and "اندازه‌گیری") instead of the
  full phrases. If longer labels are needed, the chip `paddingHorizontal` can
  be increased.
- The bottom sheet height is percentage-based, which works well across screen
  sizes. On tablets, consider using fixed heights instead.
- Future follow-up: add a draggable waypoint reordering gesture inside the
  bottom sheet (currently waypoints can only be removed, not reordered).
- Future follow-up: add Google Maps-style "Directions" UI with origin/destination
  inputs at the top of the bottom sheet, replacing the manual waypoint mode.

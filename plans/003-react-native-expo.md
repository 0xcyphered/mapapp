# Plan 003: React Native (Expo) Version of the Iran Map App for iOS and Android

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 31d47ef..HEAD -- src/ package.json package-lock.json vite.config.ts index.html tsconfig.json tsconfig.app.json tsconfig.node.json`
> The web app at the repo root is the **behavioral source of truth** for this
> plan. If any of those files changed since `31d47ef`, re-read the named web
> files and reconcile this plan's behavior descriptions against them before
> proceeding. On a real mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: XL
- **Risk**: MED
- **Depends on**: none (Plan 001 is merged into the web app; Plan 002 / Capacitor was **reverted** — do not resurrect `ios/`, `android/`, or `@capacitor/*` anywhere)
- **Category**: migration
- **Planned at**: commit `31d47ef`, 2026-09-01
- **Reviewed at**: commit `39938b1`, 2026-09-01 — pinned MapLibre to the v11
  line (the v10 pin dead-ended against the Expo SDK 57 template), added the
  missing `@turf/*` + `@expo/vector-icons` deps, rewrote Step 4 to the
  verified v11 API (`Map`/`GeoJSONSource`/`ViewAnnotation`/style-spec paint)

## Why this matters

The operator wants **true native iOS/Android apps**, not a WebView wrap. An
earlier Capacitor plan (002) was executed, reviewed, merged, and then
deliberately reverted — the direction is React Native. A RN version cannot
reuse the web UI: Leaflet is DOM-based and cannot run outside a browser, and
Tailwind/lucide-react do not exist in React Native. What **does** transfer
verbatim is the pure logic layer: `types.ts`, `utils/persian.ts`,
`utils/distance.ts`, `utils/geocoding.ts`, `utils/routing.ts` — all
fetch-based, no DOM. Everything else (map engine, all four components, GPS
stack, styling) is rebuilt with RN primitives and **MapLibre React Native**
as the map engine (it renders the app's existing OSM raster tiles; Google/
Apple map engines are rejected — Iran coverage and OSM parity are poor).

## Strategy (read before typing anything)

- Create a **new Expo app in `mobile/`** inside this same repository. The web
  app stays untouched at the repo root and remains the product while the
  mobile app reaches parity.
- **Copy** the five logic files from `../src` into `mobile/src/` — do not
  import across the boundary (Metro monorepo config is a trap this plan
  avoids deliberately). One small, documented change to `routing.ts` is
  required (Hermes does not reliably provide `AbortSignal.timeout`).
- Use **Expo** (not bare RN CLI) because: permissions/fonts/splash are config
  not code, `npx expo export` can verify JS bundles **without Xcode or
  Android Studio** (this machine has neither), and prebuild handles native
  projects when a real build machine is available later.
- Map engine: `@maplibre/maplibre-react-native` **v11 line** (npm latest
  11.3.8; v11 peers are `expo>=54, react>=19.1, react-native>=0.80` —
  exactly the SDK 57 blank template. The v10 line targets react-native
  0.59-era peers and the old architecture; do NOT pin v10). MapLibre does
  not run inside **Expo Go** — a dev client (`expo-dev-client`, installed
  in Step 1) is required. No Ionic/Expo UI kit components, no
  react-native-maps, no Mapbox token requirement.

## Current state — the behavioral source of truth

Web app (repo root): Vite 8 + React 19 + Leaflet. `npm run build` = `tsc -b
&& vite build`; `npm run lint` = oxlint. Plan 001 features are all present in
the web app (numbered Persian waypoints, GPS toast, accuracy circle, dashed
straight lines, floating summary card, 300ms search debounce). The mobile app
must reproduce this behavior set.

### Files to copy into `mobile/src/` (types + logic)

Copy these five files **verbatim except the one `routing.ts` edit** noted
below. If the live files differ from this summary, the live files win
(copy those, apply the same single edit).

- `src/types.ts` — `Waypoint {id, lat, lng, label, address?, isUserLocation?}`,
  `SearchResult {place_id, display_name, lat: string, lon: string, type?}`,
  `SegmentDistance {from, to, straight, routed, routeGeometry: [number,number][]}`,
  `MapMode = 'explore' | 'measure'`. Pure; copy as-is.
- `src/utils/persian.ts` — `toPersianDigits`, `formatDistance` (متر under
  1000m; کیلومتر with 2/1/0 decimals under 10/100/∞ km), `formatCoordinate`,
  `toPersianNumber`. Pure; copy as-is.
- `src/utils/geocoding.ts` — `searchPlaces(query, limit=5)` and
  `reverseGeocode(lat, lng)` against `https://nominatim.openstreetmap.org`
  with headers `{'Accept-Language': 'fa,en', 'User-Agent': 'IranMapApp/1.0'}`.
  fetch + URLSearchParams work in RN; copy as-is.
- `src/utils/distance.ts` — `computeSegments(waypoints)` (calls
  `fetchAllRoutes`, pairs each route with haversine straight distance),
  `totalRoutedDistance`, `totalStraightDistance`. Copy as-is.
- `src/utils/routing.ts` — OSRM `https://router.project-osrm.org`;
  `fetchRoute` with 5s timeout + haversine fallback
  (`{ routedDistance: haversine, geometry: [[lng1,lat1],[lng2,lat2]] }` on
  any failure); `fetchAllRoutes` **sequential** — the public OSRM server
  rate-limits concurrency, never `Promise.all` it. **The one required
  edit**: replace `signal: AbortSignal.timeout(5000)` with an
  AbortController so Hermes is safe:

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), 5000);
try {
  const res = await fetch(url, { signal: controller.signal });
  // ... existing response body, unchanged ...
} finally {
  clearTimeout(timer);
}
```

### Web behaviors the mobile app must reproduce

- **Map**: OSM raster tiles; center Tehran, zoom 12; tap in measure mode
  adds a waypoint.
- **Waypoints**: red `#ef4444` circular markers, 32px, white 3px border,
  bold white Persian-digit label via `toPersianNumber(counter)` (۱, ۲, ۳…
  — **not** letters); one module-level counter shared by map taps and
  search selections; `id: \`wp-${Date.now()}-${counter}\``.
- **Routes**: OSRM road geometry — blue `#3b82f6` weight 3; shortest
  segment green `#22c55e` weight 5 (only when ≥2 segments); plus gray
  `#9ca3af` dashed straight lines between consecutive waypoints.
- **User location**: one-shot on FAB tap (no watch); pulse marker (blue dot
  + expanding fading ring) + blue accuracy circle at low fill opacity;
  user location is **never** pushed into `waypoints`.
- **GPS errors**: Persian toast near the top, auto-dismiss after 4s.
  Denied: 'دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات دستگاه اجازه دهید.'
  Unavailable: 'خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.'
- **Search**: top overlay, Nominatim results, **300ms** debounce, Persian
  placeholder 'جستجوی مکان... (مثال: میدان آزادی تهران)'; selecting flies to
  the place (zoom 15) and — in measure mode — adds a waypoint; input blurs
  and the keyboard dismisses on select.
- **Measure hint**: 'روی نقشه کلیک کنید تا نقطه اضافه شود' when measure mode
  and zero waypoints.
- **Summary card**: when ≥2 waypoints, 'مجموع مسافت' =
  `formatDistance(totalRoutedDistance(segments))`; 'خط مستقیم' =
  `formatDistance(totalStraightDistance(segments))`.
- **Control panel**: slide-in sidebar listing waypoints as
  `` `نقطه ${wp.label}` `` with per-item remove (X), 'پاک کردن همه'
  clear-all, and a totals section.
- **Mode toggle**: 'کاوش نقشه' (explore) / 'اندازه‌گیری مسیر' (measure);
  explore = taps only pan/zoom; measure = taps/search add waypoints.
- Cursor styling and Leaflet popups are web-only; skip. Waypoint removal in
  the mobile app goes through the control panel only (matching the web app,
  where the map popup delete is a deliberate no-op).

## Commands you will need

Run everything from `mobile/` after Step 1 (the scaffold command itself runs
from the repo root). Do NOT run native builds on this machine (no Xcode, no
JDK — see STOP conditions).

| Purpose | Command | Expected |
|---------|---------|----------|
| Scaffold | `npx create-expo-app@latest mobile --template blank-typescript` (from repo root) | exit 0, `mobile/` created |
| Install deps | `npx expo install <pkg>` / `npm install <pkg>` | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Lint | `npx expo lint` | exit 0 (warnings tolerable, errors not) |
| Bundle gate (no native toolchain) | `npx expo export --platform ios` then `npx expo export --platform android` | exit 0, bundle written under `mobile/dist/` |
| Dev (manual only) | `npx expo start` | Metro runs |

## Scope

**In scope** (create/modify only these): everything under `mobile/**`, and
the `plans/README.md` status row for 003 if you maintain the index.

**Out of scope** (do NOT touch):

- Everything at the repo root: `src/`, `index.html`, `vite.config.ts`,
  `package.json`, `package-lock.json`, `tsconfig*.json`, `dist/`, `public/`.
  Note the root `tsconfig.app.json` / `tsconfig.node.json` are Vite/web
  configs — the mobile app has its own `mobile/tsconfig.json` and must not
  reference the root's (the template's tsconfig references its own types;
  do not add root extends or file references).
  The web app is frozen as the behavioral reference — zero edits, zero new
  root dependencies.
- Bodies of `plans/001-feature-completion.md` and
  `plans/002-capacitor-native-wrap.md`.
- No `@capacitor/*`, no `react-native-maps`, no Mapbox, no Ionic, no
  state-management libraries (React state + hooks only, matching the web
  app), no test runner.
- No custom app icon / splash artwork, no store signing.
- Native iOS/Android **builds** are out of scope on this machine (no Xcode,
  no JDK): do not run `expo prebuild`, `expo run:ios`, `expo run:android`,
  `pod install`, or `gradlew` — report them as deferred.

## Git workflow

- Branch: `advisor/003-react-native-expo`
- Commit per logical unit: (1) scaffold + deps + utils port; (2) config,
  fonts, RTL, theme; (3) app state + GPS hook; (4) map canvas; (5) search;
  (6) panel + overlays; (7) final verification fixes.
- Descriptive imperative messages. Do NOT push or open a PR.
- Verify `mobile/.gitignore` covers `node_modules` and `dist`
  (create-expo-app generates one; add `mobile/dist` if missing).

## Steps

### Step 1: Scaffold, dependencies, utils port

From the **repo root**:

```bash
npx create-expo-app@latest mobile --template blank-typescript
cd mobile
npx expo install expo-location expo-font expo-dev-client react-native-safe-area-context
npx expo install @maplibre/maplibre-react-native @expo-google-fonts/vazirmatn @turf/distance @turf/helpers @expo/vector-icons
npx expo install --dev eslint eslint-config-expo
npx expo lint   # one-time setup: generates eslint.config.js from eslint-config-expo
```

Why these extra packages (all verified against the web sources being
copied): `src/utils/routing.ts:1-2` imports `@turf/distance` and
`@turf/helpers` — without them `npx tsc --noEmit` fails on the first
verify; `@expo/vector-icons` provides the FAB icons (Ionicons) and is NOT
in the blank template's dependencies; the blank template ships no ESLint
setup, so it is installed here so the later `npx expo lint` gates are
pure checks.

Record the installed versions. `@maplibre/maplibre-react-native` must be
**11.x** (the v11 line requires the new architecture and
`react-native>=0.80` / `expo>=54`, which the SDK 57 template satisfies;
v10 and older must not be installed alongside SDK 57). If install fails
with EACCES on the npm cache, retry with
`npm install --cache /tmp/npm-cache-003 <packages>`.

Create `mobile/src/types.ts`, `mobile/src/utils/persian.ts`,
`mobile/src/utils/geocoding.ts`, `mobile/src/utils/distance.ts` as verbatim
copies of the web versions (their relative imports already resolve inside
`mobile/src/`). Create `mobile/src/utils/routing.ts` as a copy with the
single AbortController edit specified above.

**Verify**: `npx tsc --noEmit` exits 0;
`grep -n "AbortSignal.timeout" src/utils/routing.ts` → no matches;
`grep -c "controller.abort" src/utils/routing.ts` → 1;
`test -f eslint.config.js && echo ok` → ok.

### Step 2: Config, RTL, fonts, theme

1. **`mobile/app.json`** — merge into the generated config (keep `slug`,
   `version`, `orientation`):

```json
{
  "expo": {
    "name": "Iran Map",
    "slug": "iran-map",
    "scheme": "iranmap",
    "userInterfaceStyle": "light",
    "plugins": ["@maplibre/maplibre-react-native"],
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "برای نمایش موقعیت شما روی نقشه و محاسبه فاصله‌ها به دسترسی مکان نیاز است."
      }
    },
    "android": {
      "permissions": ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"]
    }
  }
}
```

No `ACCESS_BACKGROUND_LOCATION`, no `UIBackgroundModes: location` — GPS is
one-shot when-in-use, matching the web app. The `plugins` entry is part of
the official MapLibre Expo setup (it adds the iOS Podfile
`$MLRN.post_install` hook during prebuild); keep it even though the
`expo export` gates on this machine don't exercise it.

2. **`mobile/src/theme.ts`** (create):

```ts
export const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  red: '#ef4444',
  gray: '#9ca3af',
  grayLight: '#f1f5f9',
  bg: '#e8e4e0',
  white: '#ffffff',
  textDark: '#1f2937',
  textMid: '#4b5563',
} as const;

/** MapLibre wants [lng, lat]. Tehran. */
export const TEHRAN: [number, number] = [51.3890, 35.6892];
```

3. **RTL + fonts** — the blank template's `index.ts` registers `App.tsx` as
the root component; leave `index.ts` untouched and put the RTL calls and
font loading in `mobile/App.tsx` before the app UI renders:

```ts
import { I18nManager } from 'react-native';
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);
```

Load Vazirmatn in the root component (`App.tsx`) with `useFonts` from
`@expo-google-fonts/vazirmatn` — the package exports one hook per weight
plus a combined map: `useFonts({ ...Vazirmatn_400Regular, ...Vazirmatn_500Medium, ...Vazirmatn_700Bold })`
(the font packages export spreadable `{ [fontName]: font }` maps, not
component-style values). Render nothing (splash stays up) until fonts are
loaded. Note: `I18nManager.forceRTL(true)` (called at the top of `App.tsx`,
module scope, before render) fully applies after an app restart — first
Metro launch may show some LTR layout; that is known RN behavior, not a
bug. Do not scatter `row-reverse` hacks; fix real cases individually.

**Verify**: `npx tsc --noEmit` exits 0; `grep -n 'NSLocationWhenInUse' app.json`
hits; `grep -n 'ACCESS_BACKGROUND_LOCATION' app.json` → no matches.

### Step 3: App state + GPS hook

**`mobile/src/hooks/useUserLocation.ts`** (create) — the only module that
talks to `expo-location`:

```ts
import * as Location from 'expo-location';
import { useCallback, useState } from 'react';

export type UserPosition = { lat: number; lng: number; accuracy: number };

export const LOCATION_DENIED_MESSAGE =
  'دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات دستگاه اجازه دهید.';
export const LOCATION_UNAVAILABLE_MESSAGE =
  'خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.';

export function useUserLocation() {
  const [position, setPosition] = useState<UserPosition | null>(null);

  const request = useCallback(async (): Promise<UserPosition> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error(LOCATION_DENIED_MESSAGE);
    const { coords } = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const pos = {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: coords.accuracy ?? 0,
    };
    setPosition(pos);
    return pos;
  }, []);

  return { position, request };
}
```

One-shot on demand, no `watchPosition` — matching the web app's
`watch: false`.

**App state** — port `src/App.tsx`'s logic into `mobile/App.tsx` (the file
the template's `index.ts` registers — keep that export intact) inside a
root component `AppRoot` (wrapped by font loading from Step 2):

- State: `waypoints`, `segments`, `mode` (`'explore' | 'measure'`),
  `panelOpen`, `locationError: string | null` — same shapes as web.
- Module-level `let waypointCounter = 0;` shared by map taps and search
  selections; labels are `toPersianNumber(waypointCounter)`.
- `addWaypoint` appends and calls `recalcSegments(next)` — async
  `useCallback`: `setSegments([])` for <2 waypoints, else
  `await computeSegments(wps)` then `setSegments`. Fire-and-forget from
  callers, exactly like the web app (the UI never awaits it).
- `removeWaypoint(id)` filters + recalcs; `clearWaypoints()` empties both.
- Toast auto-dismiss: `useEffect` on `locationError` with a 4000ms timeout
  + cleanup — identical to web.
- GPS FAB handler: if `position` exists, fly to it; else
  `try { const loc = await request(); flyTo(loc); } catch (e) { setLocationError(e instanceof Error ? e.message : LOCATION_UNAVAILABLE_MESSAGE); }`.
  The GPS result must **not** enter `waypoints`.
- `flyTo` reaches the map via a ref-based imperative handle (Step 4).

**Verify**: `npx tsc --noEmit` exits 0; `grep -rn "watchPosition" src/` → no
matches; `grep -c "toPersianNumber(waypointCounter)" App.tsx` → ≥1.

### Step 4: Map canvas (MapLibre v11)

Create `mobile/src/components/MapCanvas.tsx`. Render order inside the v11
`Map` component matters: raster basemap first, then lines, then
annotations on top. v11 exposes style-spec-aligned components — import
`{ Map, Camera, GeoJSONSource, Layer, ViewAnnotation }` from
`@maplibre/maplibre-react-native` (v11 renames vs v10: `MapView`→`Map`,
`ShapeSource`→`GeoJSONSource`, `PointAnnotation`→`ViewAnnotation`,
`coordinates`→`lngLat`; there is no `setAccessToken` — the v11 default
MapLibre style needs no token). Verify names against
`node_modules/@maplibre/maplibre-react-native/lib/typescript/module/index.d.ts`
if anything fails to typecheck — do not guess.

1. **Basemap** — v11 `Map` takes a REQUIRED `mapStyle` prop (style URL or
   StyleSpecification). Build the OSM raster style inline (the web app's
   exact tiles) and pass `onPress={handleMapPress}` on `Map`; `Camera` uses
   `initialViewState={{ center: TEHRAN, zoom: 12 }}` (`TEHRAN` is
   `[lng, lat]` — MapLibre order):

```tsx
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

<Map mapStyle={OSM_STYLE} onPress={handleMapPress} style={{ flex: 1 }}>
  <Camera initialViewState={{ center: TEHRAN, zoom: 12 }} />
```

(Alternatively pass a `RasterSource` + raster `Layer` as `Map` children —
both forms are documented; the inline style is used here because it is one
self-contained object.)

2. **Road routes** — two `GeoJSONSource`s with a child `Layer`
   `type="line"` using style-spec paint keys (NOT camelCase: the official
   v11 examples use `paint={{ 'line-color': ..., 'line-width': ... }}`),
   GeoJSON built in `useMemo`:

- `shortestRoutes`: features from segments where
  `seg.routed === minRouted && segments.length >= 2`; coordinates are
  `seg.routeGeometry` — already `[lng, lat]`, MapLibre order, **no
  swapping** (unlike the web code which swaps for Leaflet).
- `otherRoutes`: the remaining segments. Paint — shortest:
  `{ 'line-color': COLORS.green, 'line-width': 5, 'line-opacity': 0.85 }`;
  others: `{ 'line-color': COLORS.blue, 'line-width': 3, 'line-opacity': 0.85 }`.
- **Straight dashed lines**: one `GeoJSONSource` of two-point LineStrings
  `[prev, wp]` per consecutive pair (≥2 waypoints), line Layer paint
  `{ 'line-color': COLORS.gray, 'line-width': 2, 'line-opacity': 0.7, 'line-dasharray': [2, 3] }`.

3. **Waypoint markers** — one `ViewAnnotation` per waypoint (`id={wp.id}`,
   `lngLat={[wp.lng, wp.lat]}` — v11 renames the `coordinates` prop to
   `lngLat` and requires `LngLat` = `[longitude, latitude]`). Children: a
   32×32 `View`, borderRadius 16, 3px white border, background
   `COLORS.red`, centered white bold `wp.label` (Vazirmatn_700Bold,
   fontSize 14). Removal stays in the panel — no annotation delete button.

4. **User location** — when `position` exists: a `ViewAnnotation` with a
   pulse (14px blue dot with white border + an outer `Animated.View` ring
   scaling 0.8→2.2 while fading 1→0, 1.5s loop, `useNativeDriver: true`),
   plus the accuracy circle as a `CircleLayer` (or `Layer type="circle"`)
   over a point `GeoJSONSource`. `circle-radius` is in **screen pixels**
   (style-spec units), while GPS accuracy is in meters — drive the
   meters→pixels conversion from the real zoom via `Map`'s
   `onRegionDidChange` event (verify the event's viewState/zoom field
   against the installed typings) or the map ref's `getZoom()` — use
   `radiusPx = accuracy / (156543.03392 * Math.cos(lat * Math.PI / 180) / 2 ** zoom)`,
   clamped to 10–300. If the installed version's zoom reporting makes this
   unreliable, STOP — do not fake a fixed radius.

5. **Imperative camera** — expose `flyTo([lng, lat], zoom = 15)` from this
   component via `useImperativeHandle` wrapping
   `cameraRef.current?.flyTo({ center: [lng, lat], zoom, duration: 1500 })`
   (v11 `Camera.flyTo` takes a single options object, not positional
   args).

`handleMapPress(e)`: v11 press events carry `{ lngLat, point }` — read
`e.nativeEvent.lngLat` (fall back to `(e as any).lngLat` only if the
typings put it directly on the event; confirm against the installed
`.d.ts`). If `mode === 'measure'`, call
`onMapClick(lngLat[1], lngLat[0])` (lat, lng order for the app-level
callback, matching the web `handleMapClick(lat, lng)`).

**Verify**: `npx tsc --noEmit` exits 0; `npx expo export --platform ios`
exits 0 (first bundle gate — catches Metro/native-import problems early).

### Step 5: SearchBar

Create `mobile/src/components/SearchBar.tsx` — absolute overlay at the top
(below the status bar; `useSafeAreaInsets().top + 8`):

- `TextInput` with the Persian placeholder, `textAlign: 'right'`, Vazirmatn
  font, white card with `borderRadius: 12` and a subtle shadow — visually
  matching the web card (Tailwind `rounded-xl shadow-lg border`).
- 300ms debounce via `useRef<ReturnType<typeof setTimeout>>(undefined)` —
  the exact pattern from the web `SearchBar.tsx`; clear on each change and
  on unmount; blank input clears results and closes the list.
- Results in a `FlatList` (max height ~300) inside the same card; each row:
  `display_name` (dark, medium) + a Persian-formatted coordinates line via
  `toPersianDigits(parseFloat(r.lat).toFixed(4))` etc.
- Select handler: parse lat/lon, call `onSelect(lat, lng)`, set query to
  `display_name`, close the list, then `inputRef.current?.blur()` and
  `Keyboard.dismiss()`.
- `keyboardShouldPersistTaps="handled"` so result taps aren't eaten by
  keyboard dismissal.

**Verify**: `npx tsc --noEmit` exits 0;
`grep -n "}, 300)" src/components/SearchBar.tsx` hits;
`grep -n "Keyboard.dismiss" src/components/SearchBar.tsx` hits.

### Step 6: Control panel, overlays, summary card

All overlays live in `mobile/App.tsx` (or one `MapScreen` it renders),
positioned with `useSafeAreaInsets` — never hardcoded offsets:

- **Mode toggle** — centered pill at top: 'کاوش نقشه' / 'اندازه‌گیری مسیر';
  active = blue bg + white text, inactive = gray text on white.
- **FABs** — bottom-left circular white buttons (`Ionicons` from
  `@expo/vector-icons`, installed in Step 1: `navigate` in blue, `trash`
  in red),
  `bottom: insets.bottom + 24`; clear-all only when waypoints exist.
- **Control panel** — `Animated.View` sliding from the left edge, ~300px
  wide, full height, white; header 'پنل کنترل'; `FlatList` of waypoints
  (`` `نقطه ${wp.label}` ``, `formatCoordinate`, X button →
  `removeWaypoint`); totals footer from the distance helpers; 'پاک کردن
  همه' → `clearWaypoints`. Chevron toggle on the panel edge (starts
  closed).
- **Summary card** — ≥2 waypoints: centered card above the FAB row,
  blue square + 'مجموع مسافت' +
  `formatDistance(totalRoutedDistance(segments))`, divider, 'خط مستقیم' +
  `formatDistance(totalStraightDistance(segments))`. Helpers only — no
  inline `reduce`.
- **GPS toast** — near the top (below SearchBar), red translucent card with
  the `locationError` message; one toast only (Step-3 effect dismisses it).
- **Measure hint** — 'روی نقشه کلیک کنید تا نقطه اضافه شود', dark
  translucent, bottom-center, only when measure mode + zero waypoints.

**Verify**: `npx tsc --noEmit` exits 0; `npx expo lint` exits 0.

### Step 7: Final verification

From `mobile/`:

1. `npx tsc --noEmit` → exit 0
2. `npx expo lint` → exit 0
3. `npx expo export --platform ios` → exit 0
4. `npx expo export --platform android` → exit 0
5. Scope diff (from repo root): `git diff --stat 31d47ef..HEAD -- src/ package.json package-lock.json vite.config.ts index.html tsconfig.json tsconfig.app.json tsconfig.node.json` must be **empty**; `git status` shows new files only under `mobile/` (plus `plans/README.md` if you maintain the index).
6. Greps (in `mobile/`): no `AbortSignal.timeout` in `src/`; no
   `ACCESS_BACKGROUND_LOCATION` in `app.json`; no `@capacitor`,
   `react-native-maps`, or `mapbox` in `package.json`; `node -e "const
   p=require('./package.json'); for (const s of ['@turf/distance','@turf/helpers','@expo/vector-icons','@maplibre/maplibre-react-native']) process.stdout.write(s+':'+(p.dependencies[s]||p.devDependencies[s]||'MISSING')+'\n')"`
   — every listed package present, none MISSING.
7. Optional manual pass (device/simulator; requires the dev client from
   Step 1 — Expo Go cannot load MapLibre): `npx expo start` → tiles load,
   search flies, measure mode adds numbered markers, FAB gets GPS. If no
   display is available, report the manual pass as skipped after 1–6 pass.

## Test plan

No test runner — do not add Vitest/Jest. Gates: typecheck, expo lint, both
`expo export` bundle builds, greps, and the scope diff. The export bundle is
the real regression gate: Metro resolves every import and fails loudly on a
broken dependency or a web-only import leaking into `mobile/src`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npx tsc --noEmit` (in `mobile/`) exits 0
- [ ] `npx expo lint` (in `mobile/`) exits 0 (ESLint set up in Step 1)
- [ ] `npx expo export --platform ios` and `--platform android` exit 0
- [ ] `mobile/src/utils/routing.ts` uses the AbortController pattern; no `AbortSignal.timeout` anywhere in `mobile/src`
- [ ] `mobile/src/utils/persian.ts`, `distance.ts`, `geocoding.ts`, `types.ts` are unmodified copies of the web versions
- [ ] `mobile/package.json` has `@turf/distance`, `@turf/helpers`, `@expo/vector-icons`, and `@maplibre/maplibre-react-native@^11` (v11 line)
- [ ] `mobile/app.json`: Persian `NSLocationWhenInUseUsageDescription` present; `ACCESS_FINE_LOCATION` + `ACCESS_COARSE_LOCATION` present; no background-location permission anywhere; `@maplibre/maplibre-react-native` listed under `plugins`
- [ ] `grep -rn "watchPosition" mobile/src/` is empty
- [ ] `grep -n "toPersianNumber(waypointCounter)" mobile/App.tsx` hits
- [ ] Search debounce is 300ms; select blurs the input and dismisses the keyboard
- [ ] Summary card uses `totalRoutedDistance` / `totalStraightDistance` (no inline reduce)
- [ ] Root web app untouched (Step 7.5 scope diff empty); root `tsconfig.app.json`/`tsconfig.node.json` unmodified (they are web-app configs, not shared)
- [ ] No native builds attempted (no `mobile/ios/`, no `mobile/android/`)
- [ ] `plans/README.md` row for 003 updated (if you maintain the index)

## STOP conditions

Stop and report back (do not improvise) if:

- `@maplibre/maplibre-react-native` resolves to a major other than 11, or
  its docs for the installed major contradict this plan's API usage
  (re-check https://maplibre.org/maplibre-react-native/ — v11 component
  docs are the reference for every name used in Step 4).
- `create-expo-app` fails (network/registry) twice.
- `npx expo export` fails twice after a reasonable fix — a Metro resolution
  error usually means a web-only import leaked into `mobile/src`; report the
  module chain instead of shimming anything.
- The `ViewAnnotation` `lngLat` order or the zoom-level callback API
  cannot be confirmed from the installed typings — report, do not guess.
- The accuracy-circle pixel conversion cannot be driven by a real zoom value
  from the installed version's callbacks — report rather than faking a
  fixed radius.
- You are tempted to edit the root web app, add a state library,
  parallelize OSRM fetches, or run native builds on this machine — all
  rejected.
- You are tempted to add `@capacitor/*` or resurrect plan 002's artifacts —
  that direction was explicitly reverted.

## Maintenance notes

- **Two apps, one repo**: web (root) and mobile (`mobile/`) share logic by
  copy, not import. Any fix to `src/utils/*` must be mirrored into
  `mobile/src/utils/*` — check both in review until a workspace setup is
  introduced. The mobile app is registered by the template's `mobile/index.ts`
  (which points at `./App`); don't delete it.
- **`mobile/tsconfig.json`** is the template's own config (it does NOT
  extend the root web configs; the root's `tsconfig.app.json` /
  `tsconfig.node.json` are Vite-specific and unrelated to Metro).
- **OSRM/Nominatim etiquette**: sequential OSRM calls and the 5s timeout are
  load-bearing. Nominatim's public server requires a meaningful User-Agent —
  the copied `geocoding.ts` provides it; do not strip it.
- **RTL**: `forceRTL` fully applies only after an app restart; test RTL after
  a restart, not on first launch.
- **MapLibre v11**: the components in Step 4 are the v11 API (`Map`,
  `GeoJSONSource`, `ViewAnnotation`, style-spec paint keys). v10 names
  (`MapView`, `ShapeSource`, `PointAnnotation`, camelCase layer props) do
  not exist in v11 — don't reintroduce them from older tutorials.
- **Native builds** (first real device build, on a machine with Xcode + CocoaPods / JDK 17 + Android Studio): `npx expo prebuild`, then
  `npx expo run:ios` / `npx expo run:android`. MapLibre fetches its native
  SDK then — first build is slow. Expo Go cannot load this app (MapLibre
  is a native module); always use the dev client.
- **Reviewer should check**: no web-only imports in `mobile/src` (export
  gate covers this); utils unmodified except the `routing.ts` AbortController
  edit; one shared waypoint counter for map + search; GPS result never
  enters `waypoints`; panel removal is the only delete path; no
  background-location permission anywhere.
- **Follow-ups deferred**: custom splash/icon, offline tile caching, Neshan
  migration, store signing, e2e tests, shared-logic workspace.







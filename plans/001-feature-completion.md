# Plan 001: Complete Iran Map Feature Set — GPS Error Handling, Accuracy Radius, Numbered Markers, Straight-Line Polylines, Floating Summary Card

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 8807695..HEAD -- src/App.tsx src/components/MapView.tsx src/components/SearchBar.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `8807695`, 2026-09-01

## Why this matters

The app already has Leaflet, OSRM road routing, Nominatim search, Persian copy, and waypoint management, but five UX gaps block spec compliance. Geolocation failures are silent, so a denied/unavailable GPS looks like a dead button. The pulse-marker helper exists but is never mounted, and there is no accuracy circle, so "my location" does not actually show on the map. Waypoint pins use Persian letters (ب, ت, ث) instead of numbered "نقطه ۱" labels. Only the road polyline is drawn, so users cannot compare direct vs road distance. The distance total lives only in the sidebar, which is easy to miss when closed.

This plan closes those five gaps, plus a 300ms search debounce and input blur on select. It does **not** parallelize OSRM: the public demo server rate-limits concurrent requests.

## Current state

Vite 8 + React 19 + Leaflet web app (not React Native). Commands from `package.json`: `npm run lint` (oxlint), `npm run build` (`tsc -b && vite build`), `npm run dev` (Vite on :5173). No test runner.

Relevant files:

- `src/App.tsx` — root state (waypoints, segments, mode, sidebar, userLocation), FABs, mode toggle, sidebar
- `src/components/MapView.tsx` — MapContainer, tiles, MapEvents, GeocodedMarker, road polylines
- `src/components/SearchBar.tsx` — Nominatim search overlay, 400ms debounce
- `src/components/ControlPanel.tsx` — sidebar; already shows `نقطه ${wp.label}` and `toPersianNumber(idx + 1)` badges — **do not edit**
- `src/utils/routing.ts` — sequential `fetchAllRoutes` (intentional; OSRM public server) — **do not edit**
- `src/utils/distance.ts` — already exports `totalRoutedDistance` and `totalStraightDistance` — **do not edit**; import them from App
- `src/utils/persian.ts` — already exports `toPersianNumber` and `formatDistance` — **do not edit**; import them from App

Repo conventions to match:

- Tailwind utility classes on JSX, lucide-react icons, Persian UI strings, `dir="rtl"`.
- React 19: `useRef` always gets an argument (`null` or `undefined`), never `useRef<T>()`.
- Distance totals: use the helpers in `src/utils/distance.ts`, do not re-inline `reduce`.
- Visual language for a distance card already exists in `src/components/ControlPanel.tsx:107-120` (Ruler in a blue rounded square, tiny gray label, bold value). Reuse that structure on the floating card.

### App.tsx imports and location FAB (today)

```ts
import { useState, useCallback, useRef } from 'react';
// ...
import { computeSegments } from './utils/distance';
import { Crosshair, Route, Compass, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
```

`useEffect` is **not** imported. `Ruler` is **not** imported here (only in ControlPanel). `formatDistance` / `toPersianNumber` / `totalRoutedDistance` / `totalStraightDistance` are **not** imported here.

`userLocation` is `{ lat: number; lng: number } | null`. MapView is called **without** `userLocation` and **without** `onLocationError`:

```tsx
<MapView
  mapRef={mapRef}
  waypoints={waypoints}
  segments={segments}
  mode={mode}
  onMapClick={handleMapClick}
  onUserLocation={setUserLocation}
/>
```

Location FAB (`src/App.tsx:129-135`) — no error path:

```ts
onClick={() => {
  if (userLocation) {
    flyTo(userLocation.lat, userLocation.lng, 15);
  } else {
    mapRef.current?.locate({ enableHighAccuracy: true, watch: false });
  }
}}
```

Leave this click behavior as-is (re-locate only when location is unknown). Do **not** push user location into the `waypoints` array — that would add a phantom measure point and pollute segment math.

### Waypoint labels (`src/App.tsx:65` and `:97`)

Both `handleMapClick` and the SearchBar `onSelect` path use:

```ts
label: String.fromCharCode(1576 + waypointCounter - 1), // Persian letter labels: ب, ت, ث...
```

### MapView cannot show user location today

`MapViewProps` (`src/components/MapView.tsx:19-26`) has no `userLocation` and no `onLocationError`:

```ts
interface MapViewProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  mode: MapMode;
  onMapClick: (lat: number, lng: number) => void;
  onUserLocation: (loc: { lat: number; lng: number }) => void;
}
```

`MapEvents` (`src/components/MapView.tsx:49-72`) listens to `click` + `locationfound` only. It **returns `null`** — overlays cannot be rendered from inside it.

`createUserLocationIcon()` exists at `src/components/MapView.tsx:39-46` but nothing mounts a Marker with it. `waypoints` never have `isUserLocation: true`. The pulse CSS in `src/index.css` is unused on the map.

Road polylines only (`src/components/MapView.tsx:145-164`). No geodesic/straight dashed lines.

`GeocodedMarker` is mounted with `onRemove={() => {}}` (`src/components/MapView.tsx:142`). **Leave that no-op alone** — removal already works from ControlPanel. Wiring popup-delete is out of scope.

`Circle` **is** exported from `react-leaflet` v5 (`node_modules/react-leaflet/lib/index.d.ts` exports `Circle`). Import it from the same `'react-leaflet'` barrel that already provides `MapContainer`, `TileLayer`, `Marker`, `Polyline`.

### Search debounce (`src/components/SearchBar.tsx:49`)

```ts
debounceRef.current = setTimeout(async () => { ... }, 400);
```

`handleSelect` (`src/components/SearchBar.tsx:52-58`) does not blur the input.

### ControlPanel label line (already correct — do not touch)

```ts
{wp.isUserLocation ? 'موقعیت شما' : `نقطه ${wp.label}`}
```

Once `wp.label` is a Persian digit, this already renders "نقطه ۱". The index badge is a separate `toPersianNumber(idx + 1)` and should stay.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Lint | `npm run lint` | exit 0, 0 errors |
| Typecheck + build | `npm run build` | exit 0, `tsc -b` and vite succeed |
| Dev (manual only, last step) | `npm run dev` | Vite on http://localhost:5173 |

Run lint and build from the **repo root**. Do not `cd` into `src/`.

## Suggested executor toolkit

- If the `web-mapping` skill is available, load it before Step 1. Honor its OSRM rule: consecutive segment fetches stay sequential on `router.project-osrm.org`. This plan does not change `src/utils/routing.ts`.
- Leaflet `locationfound` event: `e.latlng`, `e.accuracy` (meters). `locationerror` event: browser geolocation failure; a single Persian string is enough — do not switch on `code` unless the excerpts have drifted.

## Scope

**In scope** (the only files you should modify):

- `src/App.tsx`
- `src/components/MapView.tsx`
- `src/components/SearchBar.tsx`

**Out of scope** (do NOT touch, even though they look related):

- `src/index.css` — pulse-marker CSS already exists; react-leaflet `Circle` needs no custom CSS; toast uses Tailwind
- `src/components/ControlPanel.tsx` — label format already `نقطه ${wp.label}`
- `src/utils/routing.ts` — sequential `fetchAllRoutes` is required (OSRM public rate limit)
- `src/utils/distance.ts` — `totalStraightDistance` already exists; import it, do not copy it
- `src/utils/persian.ts` — `toPersianNumber` / `formatDistance` already exist
- `src/utils/geocoding.ts` — no Neshan migration
- `src/types.ts` — extend the location object inline in App/MapView; do not add a new exported type
- `src/main.tsx`, `index.html`, `vite.config.ts`, `package.json` — no new dependencies
- `src/components/MapView.tsx` GeocodedMarker `onRemove={() => {}}` — leave the no-op
- Any file under `dist/` or `plans/` except the status row in `plans/README.md` at the end

## Git workflow

- Branch: `advisor/001-feature-completion`
- Commit per logical unit (GPS + user-location marker + accuracy + toast; numbered labels; straight polylines; floating summary; search debounce + blur)
- Message style: descriptive imperative. The repo's only commit is `v` — do not invent conventional-commit prefixes
- Do NOT push or open a PR unless the operator instructed it

## Steps

### Step 1: GPS error toast, mount user-location marker, accuracy Circle

**What**: Thread `userLocation` (with accuracy) into MapView. On `locationfound`, store lat/lng/accuracy and clear any error. On `locationerror`, show a Persian toast. Render the existing pulse `Marker` plus a `Circle` whose radius is `accuracy` meters. MapEvents still returns `null` — Marker and Circle are siblings inside `MapContainer`.

**Files**: `src/App.tsx`, `src/components/MapView.tsx`

**Changes to `src/App.tsx`**:

1. Extend the react import: `import { useState, useCallback, useRef, useEffect } from 'react';`
2. Add `AlertCircle` to the lucide-react import (keep the existing six icons).
3. Change userLocation state to include accuracy:

```ts
const [userLocation, setUserLocation] = useState<{
  lat: number;
  lng: number;
  accuracy: number;
} | null>(null);
const [locationError, setLocationError] = useState<string | null>(null);
```

ControlPanel's prop type is `{ lat: number; lng: number } | null`. Extra `accuracy` is structurally compatible — do not edit ControlPanel.

4. Replace `onUserLocation={setUserLocation}` with a callback that also clears the toast:

```ts
const handleUserLocation = useCallback(
  (loc: { lat: number; lng: number; accuracy: number }) => {
    setUserLocation(loc);
    setLocationError(null);
  },
  []
);
```

5. Pass new props into MapView:

```tsx
<MapView
  mapRef={mapRef}
  waypoints={waypoints}
  segments={segments}
  mode={mode}
  onMapClick={handleMapClick}
  onUserLocation={handleUserLocation}
  onLocationError={setLocationError}
  userLocation={userLocation}
/>
```

6. Auto-dismiss the toast:

```ts
useEffect(() => {
  if (!locationError) return;
  const t = setTimeout(() => setLocationError(null), 4000);
  return () => clearTimeout(t);
}, [locationError]);
```

7. Render the toast **below the mode toggle**, not at the bottom (bottom-center collides with the measure hint at `bottom-20` and the later floating card at `bottom-6`):

```tsx
{locationError && (
  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/90 text-white px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-sm flex items-center gap-2">
    <AlertCircle size={16} />
    {locationError}
  </div>
)}
```

Place this in the App tree near the other overlays (e.g. after the mode toggle, before the location FAB). Copy the Persian string from MapEvents below — App only displays `locationError`, it does not invent a second message.

**Changes to `src/components/MapView.tsx`**:

1. Import `Circle` from `'react-leaflet'` on the existing import line:

```ts
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup, Polyline, Circle } from 'react-leaflet';
```

2. Extend `MapViewProps`:

```ts
interface MapViewProps {
  mapRef: React.MutableRefObject<L.Map | null>;
  waypoints: Waypoint[];
  segments: SegmentDistance[];
  mode: MapMode;
  onMapClick: (lat: number, lng: number) => void;
  onUserLocation: (loc: { lat: number; lng: number; accuracy: number }) => void;
  onLocationError: (message: string) => void;
  userLocation: { lat: number; lng: number; accuracy: number } | null;
}
```

3. Thread `onLocationError` into `MapEvents`. Keep `useMapEvents` in MapEvents. Update `locationfound` to pass `e.accuracy`. Add `locationerror`. Exact handler shape:

```ts
function MapEvents({
  onMapClick,
  onUserLocation,
  onLocationError,
  mode,
}: {
  onMapClick: (lat: number, lng: number) => void;
  onUserLocation: (loc: { lat: number; lng: number; accuracy: number }) => void;
  onLocationError: (message: string) => void;
  mode: MapMode;
}) {
  const map = useMap();

  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    locationfound(e) {
      onUserLocation({
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        accuracy: e.accuracy,
      });
      map.flyTo(e.latlng, 15, { duration: 1.5 });
    },
    locationerror() {
      onLocationError('خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.');
    },
  });

  // existing cursor useEffect stays
  return null;
}
```

4. Destructure the new props in `export default function MapView(...)`. Pass `onLocationError` into `<MapEvents ... />`.

5. **Inside `MapContainer`**, after `<MapEvents ... />` and **not** inside MapEvents, render marker + circle from props (single source of truth is App state):

```tsx
{userLocation && (
  <Marker
    position={[userLocation.lat, userLocation.lng]}
    icon={createUserLocationIcon()}
  />
)}
{userLocation && userLocation.accuracy > 0 && (
  <Circle
    center={[userLocation.lat, userLocation.lng]}
    radius={userLocation.accuracy}
    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
  />
)}
```

Do not clamp accuracy in this plan. Do not add a Popup on the user marker. Do not also push this point into `waypoints`.

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0.

---

### Step 2: Numbered waypoint labels

**What**: Replace Persian-letter labels with Persian digits so markers and "نقطه X" copy show ۱, ۲, ۳.

**File**: `src/App.tsx` only.

1. Import `toPersianNumber` from `./utils/persian` (already exported at `src/utils/persian.ts:21-23`).
2. In **both** label sites (`handleMapClick` ~line 65 and SearchBar `onSelect` ~line 97), replace:

```ts
label: String.fromCharCode(1576 + waypointCounter - 1),
```

with:

```ts
label: toPersianNumber(waypointCounter),
```

3. Do **not** edit ControlPanel or GeocodedMarker popup copy — both already render `` `نقطه ${waypoint.label}` `` / `` `نقطه ${wp.label}` ``.
4. Grep to confirm the old pattern is gone: `rg -n "fromCharCode\\(1576" src/` → no matches.

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0; the grep above is empty.

---

### Step 3: Straight-line dashed polylines

**What**: Draw a gray dashed geodesic between consecutive waypoints, in addition to the existing OSRM road polyline.

**File**: `src/components/MapView.tsx`

After the existing road-route block (`src/components/MapView.tsx:145-164`), still inside `MapContainer`, add:

```tsx
{waypoints.length >= 2 &&
  waypoints.map((wp, i) => {
    if (i === 0) return null;
    const prev = waypoints[i - 1];
    return (
      <Polyline
        key={`straight-${i}`}
        positions={[
          [prev.lat, prev.lng],
          [wp.lat, wp.lng],
        ]}
        color="#9ca3af"
        weight={2}
        dashArray="8 6"
        opacity={0.7}
      />
    );
  })}
```

`Polyline` is already imported. Keys must not collide with `route-${i}`. Do not replace or restyle the road polylines.

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0.

---

### Step 4: Floating summary card

**What**: When 2+ waypoints exist, show road total and straight total at the bottom-center of the map so distance is visible with the sidebar closed.

**File**: `src/App.tsx`

1. `Ruler` is **not** currently imported in App.tsx. Add it to the lucide-react import.
2. Change the distance import to:

```ts
import { computeSegments, totalRoutedDistance, totalStraightDistance } from './utils/distance';
```

(`formatDistance` comes from `./utils/persian` — add it to the same import as `toPersianNumber` if Step 2 already added that module, otherwise import both from `./utils/persian` in one statement.)

3. Insert the card **after** the clear-all FAB block (`src/App.tsx:143-152`) and **before** the sidebar toggle (`src/App.tsx:154`). Use the helpers — do not `segments.reduce` for the straight total:

```tsx
{waypoints.length >= 2 && (
  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 px-5 py-3 flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
      <Ruler size={18} className="text-white" />
    </div>
    <div>
      <div className="text-[10px] text-gray-400 leading-tight">مجموع مسافت</div>
      <div className="text-sm font-bold text-gray-800 leading-tight">
        {formatDistance(totalRoutedDistance(segments))}
      </div>
    </div>
    <div className="w-px h-8 bg-gray-200 mx-1" />
    <div>
      <div className="text-[10px] text-gray-400 leading-tight">خط مستقیم</div>
      <div className="text-sm font-bold text-gray-600 leading-tight">
        {formatDistance(totalStraightDistance(segments))}
      </div>
    </div>
  </div>
)}
```

Do not add a mobile breakpoint in this plan. FABs stay `bottom-6 left-6` / `left-[68px]`; the card is centered. On very narrow screens they may crowd — accepted, noted under Maintenance.

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0.

---

### Step 5: Search debounce 300ms + blur on select

**What**: Spec debounce is 300ms. Blur the search input after a result is chosen so mobile keyboards dismiss.

**File**: `src/components/SearchBar.tsx`

1. Change the timeout at `src/components/SearchBar.tsx:49` from `400` to `300`.
2. Add an input ref next to the existing refs (`useRef<HTMLInputElement>(null)` — React 19 requires the argument):

```ts
const inputRef = useRef<HTMLInputElement>(null);
```

3. Put `ref={inputRef}` on the existing `<input>`.
4. In `handleSelect`, blur after closing the dropdown:

```ts
const handleSelect = (result: SearchResult) => {
  const lat = parseFloat(result.lat);
  const lng = parseFloat(result.lon);
  onSelect(lat, lng);
  setQuery(result.display_name);
  setOpen(false);
  inputRef.current?.blur();
};
```

Do not use `document.activeElement`. Do not change Nominatim call args.

**Verify**: `npm run lint` → exit 0; `npm run build` → exit 0; `rg -n "400" src/components/SearchBar.tsx` → the debounce timeout is not `400` (other 400s in class names, if any, are fine; the `setTimeout` delay must be `300`).

---

### Step 6: Final verification

From repo root:

1. `npm run lint` → exit 0
2. `npm run build` → exit 0
3. `git status` → only the three in-scope source files (plus `plans/README.md` after you flip the status row). No `src/index.css`, no `src/utils/routing.ts`, no `src/components/ControlPanel.tsx`.
4. Optional manual pass with `npm run dev` at http://localhost:5173:

- Map loads on Tehran
- Search, pick a result: dropdown closes, keyboard dismisses, map flies
- Mode "اندازه‌گیری مسیر", click 2+ points: markers show ۱ / ۲ / ۳; gray dashed straight lines; blue/green road lines; bottom-center card shows both distances
- Sidebar still shows "نقطه ۱" etc. without having been edited
- "موقعیت من": pulse marker + blue accuracy circle, **or** red toast under the mode toggle that disappears after ~4s
- User location is **not** a numbered waypoint and does not create a segment by itself
- "پاک کردن همه" clears waypoints/lines/card; user-location marker may remain

## Test plan

This repo has no test runner (`package.json` scripts are `dev` / `build` / `lint` / `preview` only). Do not add Vitest/Jest in this plan.

Gates:

- `npm run lint` — oxlint
- `npm run build` — `tsc -b && vite build`
- grep done-criteria below
- Manual browser checklist in Step 6 if a display is available; if not, report that the manual pass was skipped after lint+build+grep succeeded

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] `src/App.tsx` imports `useEffect` and `AlertCircle`; has `locationError` state and a 4000ms clear `useEffect`
- [ ] `src/App.tsx` passes `userLocation` and `onLocationError` into `MapView`
- [ ] `src/components/MapView.tsx` imports `Circle` from `react-leaflet`; `locationerror` is registered in `useMapEvents`; a `Marker` uses `createUserLocationIcon()`; a `Circle` uses `userLocation.accuracy` as `radius`
- [ ] `rg -n "fromCharCode\\(1576" src/` returns no matches
- [ ] `src/App.tsx` sets waypoint `label` via `toPersianNumber(waypointCounter)`
- [ ] `src/components/MapView.tsx` renders a dashed `Polyline` with `key={\`straight-${i}\`}`
- [ ] `src/App.tsx` renders the floating card using `totalRoutedDistance` and `totalStraightDistance` (no inline `segments.reduce` for those totals)
- [ ] `src/components/SearchBar.tsx` `setTimeout` delay is `300`; `handleSelect` calls `inputRef.current?.blur()`
- [ ] `src/utils/routing.ts` is unmodified (`git diff 8807695 -- src/utils/routing.ts` empty)
- [ ] `src/components/ControlPanel.tsx` and `src/index.css` are unmodified
- [ ] No files outside the in-scope list are modified except `plans/README.md` status
- [ ] `plans/README.md` status row for 001 is DONE (or IN PROGRESS while you work)

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" does not match the excerpts (drift since `8807695`).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file (`routing.ts`, `ControlPanel.tsx`, `index.css`, `types.ts`, `package.json`, …).
- `Circle` cannot be imported from `'react-leaflet'` (it is exported in v5.0.0 as of this plan; if the lockfile changed, stop).
- You are tempted to `Promise.all` OSRM segment fetches — that is rejected, not a stretch goal.
- You are tempted to `addWaypoint` the GPS point — that pollutes measure segments; user location is a separate overlay.
- `e.accuracy` is missing on Leaflet's `locationfound` event in this version — stop rather than guessing a default radius.
- `handleUserLocation` / `onUserLocation` type change appears to force a ControlPanel or `src/types.ts` edit — it should not; extra fields are assignable. If tsc disagrees, stop and report the error.

## Maintenance notes

- **Accuracy circle size**: mobile `e.accuracy` is often 50–200m+. Clamping (e.g. max 200m) is a follow-up if users complain; not in this plan.
- **OSRM rate limits**: keep `fetchAllRoutes` sequential on `router.project-osrm.org`. Parallelism is a 429 vector. A later authenticated OSRM/Neshan backend could revisit this.
- **Floating card vs FABs**: below ~400px width the centered card can crowd the left FABs. A responsive hide-on-mobile variant belongs in a later plan.
- **Popup delete no-op**: `GeocodedMarker` is still mounted with `onRemove={() => {}}`. Wiring `removeWaypoint` through MapView is a separate small fix; do not mix it in here.
- **Neshan**: Nominatim + OSRM are the current stack. A Neshan migration would touch `src/utils/geocoding.ts` and `src/utils/routing.ts` only, and needs an API key — out of scope.
- **Reviewer should check**: user location is not inserted into `waypoints`; toast is `top-20` not `bottom-*`; App imports `useEffect` and `Ruler` (neither was present at plan time); straight total uses `totalStraightDistance`, not a copied reduce.

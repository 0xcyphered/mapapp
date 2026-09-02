# Plan 007: Add Compass / Reset-North Button to Map

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 87ef91c..HEAD -- mobile/App.tsx mobile/src/components/MapCanvas.native.tsx mobile/src/components/MapCanvas.web.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (but ideally after 004 for consistent FAB placement)
- **Category**: ux
- **Planned at**: commit `87ef91c`, 2026-09-02

## Why this matters

Every mobile map app (Google Maps, Apple Maps, Mapbox, OsmAnd) has a compass button that resets the map orientation to north. When users rotate the map with a two-finger gesture (natural on MapLibre), they have no way to reorient to north except manually rotating back. This is a universal mobile map UX convention. Adding a compass button makes the app feel like a real native map app.

## Current state

- `mobile/src/components/MapCanvas.native.tsx` — uses `@maplibre/maplibre-react-native` `<Camera>` component with `ref` at line 59.
- The `Camera` component (line 183-186):
  ```tsx
  <Camera
    ref={cameraRef}
    initialViewState={{ center: TEHRAN, zoom: 12 }}
  />
  ```
- The `MapCanvasHandle` type (line 24-26):
  ```tsx
  export type MapCanvasHandle = {
    flyTo: (lngLat: [number, number], zoom?: number) => void;
  };
  ```
  Currently only exposes `flyTo`.
- The camera ref (line 59): `const cameraRef = useRef<CameraRef | null>(null);`
- MapLibre React Native Camera supports `setCamera` method to reset bearing to 0.

**MapLibre React Native Camera API** (v11):
- `cameraRef.current?.setCamera({ bearing: 0, duration: 300 })` — animates bearing to north.

**Web canvas** (`MapCanvas.web.tsx`) uses `maplibre-gl` `MlMap` with `map.getBearing()` and `map.easeTo({ bearing: 0 })`.

## Commands you will need

| Purpose    | Command                    | Expected on success          |
|------------|----------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint` | 0 errors (warnings OK)     |
| Typecheck  | `cd mobile && npx tsc --noEmit` | 0 errors               |

## Scope

**In scope**:
- `mobile/src/components/MapCanvas.native.tsx`
- `mobile/src/components/MapCanvas.web.tsx`
- `mobile/App.tsx` (add compass FAB)

**Out of scope**:
- `mobile/src/components/MapCanvas.tsx` — re-export only.

## Steps

### Step 1: Add `resetNorth` to MapCanvasHandle and expose it

1. In `MapCanvas.native.tsx`, update the `MapCanvasHandle` type (line 24-26):
   ```tsx
   export type MapCanvasHandle = {
     flyTo: (lngLat: [number, number], zoom?: number) => void;
     resetNorth: () => void;
   };
   ```

2. Update `useImperativeHandle` (lines 75-83) to add `resetNorth`:
   ```tsx
   useImperativeHandle(ref, () => ({
     flyTo: (lngLat: [number, number], zoomLevel = 15) => {
       cameraRef.current?.flyTo({
         center: lngLat,
         zoom: zoomLevel,
         duration: 1500,
       });
     },
     resetNorth: () => {
       cameraRef.current?.setCamera({
         bearing: 0,
         duration: 300,
       });
     },
   }));
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 2: Update MapCanvas.web.tsx to match

1. In `MapCanvas.web.tsx`, update the `MapCanvasHandle` type (line 16-18):
   ```tsx
   export type MapCanvasHandle = {
     flyTo: (lngLat: [number, number], zoom?: number) => void;
     resetNorth: () => void;
   };
   ```

2. Update `useImperativeHandle` (lines 104-108):
   ```tsx
   useImperativeHandle(ref, () => ({
     flyTo: (lngLat: [number, number], zoomLevel = 15) => {
       mapRef.current?.flyTo({ center: lngLat, zoom: zoomLevel, duration: 1500 });
     },
     resetNorth: () => {
       mapRef.current?.easeTo({ bearing: 0, duration: 300 });
     },
   }));
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 3: Add compass FAB in App.tsx

1. In `App.tsx`, add a `handleCompassPress` callback in `AppRoot()`, after `handleGpsPress` (around line 139):

```tsx
const handleCompassPress = useCallback(() => {
  mapRef.current?.resetNorth();
}, []);
```

2. Add the compass FAB in the FABs section. The compass button should sit above the GPS button (at the top of the FAB column). Update the FABs JSX:

```tsx
{/* FABs */}
<View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
  {waypoints.length > 0 ? (
    <Pressable style={styles.fab} onPress={clearWaypoints}>
      <Ionicons name="trash" size={22} color={COLORS.red} />
    </Pressable>
  ) : null}
  <Pressable style={styles.fab} onPress={handleCompassPress}>
    <Ionicons name="compass" size={22} color={COLORS.textDark} />
  </Pressable>
  <Pressable style={styles.fab} onPress={handleGpsPress}>
    <Ionicons name="navigate" size={22} color={COLORS.blue} />
  </Pressable>
</View>
```

The compass button is placed between trash and GPS, using the `compass` icon from Ionicons in dark gray. When the user rotates the map and wants to reset to north, they tap this button.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0. `cd mobile && npx expo lint` → 0 errors.

### Step 4: Verify the compass icon exists

The `compass` icon is available in Ionicons. If there's any doubt, check:
```
cd mobile && node -e "const { Ionicons } = require('@expo/vector-icons'); console.log(typeof Ionicons)"
```
The icon name `compass` has been in Ionicons since v4.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

## Test plan

Manual verification:
1. Open map, rotate with two-finger gesture.
2. Tap compass FAB → map smoothly rotates back to north (bearing=0).
3. When map is already north-aligned, compass tap is a no-op (no error).
4. Compass FAB is visible in both explore and measure modes.
5. Compass FAB doesn't conflict with GPS FAB (different icons, clear visual separation).

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] `resetNorth` method exists on `MapCanvasHandle` in both `.native.tsx` and `.web.tsx`
- [ ] Compass FAB with `compass` icon renders in `App.tsx`
- [ ] Tapping compass calls `resetNorth()` → map bearing resets to 0
- [ ] `plans/README.md` status row updated

## STOP conditions

- `cameraRef.current?.setCamera({ bearing: 0 })` doesn't work (MapLibre RN v11 API may differ — check docs).
- The compass icon `compass` is not found in Ionicons (use `locate` or `navigate` as fallback).
- A step's verification fails twice.

## Maintenance notes

- If the project later adds map rotation gestures with a visible compass needle indicator (not just a reset button), this FAB can be replaced with a rotating compass image.
- The `duration: 300` for the bearing reset is fast enough to feel responsive but slow enough to be perceptible. Adjust if needed.
- This plan does NOT track the current bearing and only offers a "reset to north" action. A more advanced implementation would show the compass needle's current rotation and animate it. That's a future enhancement.

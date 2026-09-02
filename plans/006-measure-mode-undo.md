# Plan 006: Add Undo Waypoint and Tap-to-Remove in Measure Mode

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 87ef91c..HEAD -- mobile/App.tsx mobile/src/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: 004
- **Category**: ux
- **Planned at**: commit `87ef91c`, 2026-09-02

## Why this matters

In measure mode, tapping the map adds a waypoint. But there is no way to undo the last accidental tap without clearing ALL waypoints. The only removal options are:
1. Open the control panel and tap the X on each waypoint (slow, requires navigation).
2. Press the trash FAB to clear everything (destructive).

This is extremely frustrating for a map measurement tool where precision matters. Common mobile map UX:
- **Tap a marker → option to remove it** (long-press or secondary action).
- **Undo button** that removes the last added waypoint.
- **Tap on a marker in measure mode → confirm removal**.

This plan adds both an undo button (for quick last-waypoint removal) and the ability to tap a waypoint marker to remove it.

## Current state

- `mobile/App.tsx` — contains all waypoint state and rendering logic.
- `addWaypoint` at lines 80-96 — appends to `waypoints` array with auto-incrementing counter.
- `removeWaypoint` at lines 98-105 — filters out by ID, recalculates segments.
- `clearWaypoints` at lines 107-110 — empties entire array.
- FABs at lines 226-235 — trash + GPS buttons. Trash only appears when `waypoints.length > 0`.
- `MapCanvas.native.tsx` lines 247-253 — waypoint markers rendered as `ViewAnnotation` with no `onPress` handler.
- The `MapCanvasProps` type (MapCanvas.native.tsx:28-34) defines the component interface:
  ```tsx
  type MapCanvasProps = {
    waypoints: Waypoint[];
    segments: SegmentDistance[];
    mode: MapMode;
    position: UserPosition | null;
    onMapClick: (lat: number, lng: number) => void;
  };
  ```
  There is no `onWaypointPress` callback.

**Exemplar FAB pattern** (App.tsx:228-234):
```tsx
<Pressable style={styles.fab} onPress={handleGpsPress}>
  <Ionicons name="navigate" size={22} color={COLORS.blue} />
</Pressable>
```

## Commands you will need

| Purpose    | Command                    | Expected on success          |
|------------|----------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint` | 0 errors (warnings OK)     |
| Typecheck  | `cd mobile && npx tsc --noEmit` | 0 errors               |

## Scope

**In scope**:
- `mobile/App.tsx`
- `mobile/src/components/MapCanvas.native.tsx`
- `mobile/src/components/MapCanvas.web.tsx` (keep in sync for web runner)

**Out of scope**:
- `mobile/src/components/MapCanvas.tsx` — just a re-export, no changes needed.
- `mobile/src/components/SearchBar.tsx` — search interaction unchanged.

## Steps

### Step 1: Add `onWaypointPress` prop to MapCanvas

1. In `mobile/src/components/MapCanvas.native.tsx`, update the `MapCanvasProps` type (line 28-34) to add:
   ```tsx
   type MapCanvasProps = {
     waypoints: Waypoint[];
     segments: SegmentDistance[];
     mode: MapMode;
     position: UserPosition | null;
     onMapClick: (lat: number, lng: number) => void;
     onWaypointPress?: (id: string) => void;
   };
   ```

2. Update the forwardRef destructuring (line 58) to include the new prop:
   ```tsx
   const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(
     ({ waypoints, segments, mode, position, onMapClick, onWaypointPress }, ref) => {
   ```

3. Update the ViewAnnotation for waypoints (lines 247-253) to add an `onPress` callback. Replace:
   ```tsx
   {waypoints.map((wp) => (
     <ViewAnnotation key={wp.id} id={wp.id} lngLat={[wp.lng, wp.lat]}>
       <View style={styles.marker}>
         <Text style={styles.markerText}>{wp.label}</Text>
       </View>
     </ViewAnnotation>
   ))}
   ```
   with:
   ```tsx
   {waypoints.map((wp) => (
     <ViewAnnotation
       key={wp.id}
       id={wp.id}
       lngLat={[wp.lng, wp.lat]}
       allowOverlap={true}
     >
       <Pressable
         style={styles.marker}
         onPress={() => onWaypointPress?.(wp.id)}
       >
         <Text style={styles.markerText}>{wp.label}</Text>
       </Pressable>
     </ViewAnnotation>
   ))}
   ```

4. Import `Pressable` from `react-native` in `MapCanvas.native.tsx` (it's already imported for the pulse animation, just verify).

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 2: Update MapCanvas.web.tsx to match the new props

1. In `mobile/src/components/MapCanvas.web.tsx`, update the `MapCanvasProps` type (line 20-26) to include:
   ```tsx
   type MapCanvasProps = {
     waypoints: Waypoint[];
     segments: SegmentDistance[];
     mode: MapMode;
     position: UserPosition | null;
     onMapClick: (lat: number, lng: number) => void;
     onWaypointPress?: (id: string) => void;
   };
   ```

2. Update the forwardRef destructuring (line 93) to include:
   ```tsx
   ({ waypoints, segments, mode, position, onMapClick, onWaypointPress }, ref) => {
   ```

3. The web canvas creates markers via DOM manipulation (lines 249-273). Update the marker creation to add a click handler for `onWaypointPress`. Change the marker creation in the waypoint useEffect (around line 249) to add a click listener:
   ```tsx
   // Inside the existing useEffect for waypoints, after creating the marker:
   marker.getElement().addEventListener('click', (e) => {
     e.stopPropagation(); // prevent map click
     onWaypointPress?.(wp.id);
   });
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 3: Add undo function and waypoint-press handler in App.tsx

1. In `AppRoot()`, after `removeWaypoint` (line 98-105), add an `undoWaypoint` function:

```tsx
const undoWaypoint = useCallback(() => {
  if (waypoints.length === 0) return;
  const lastId = waypoints[waypoints.length - 1].id;
  removeWaypoint(lastId);
}, [waypoints, removeWaypoint]);
```

2. Add a `handleWaypointPress` callback:

```tsx
const handleWaypointPress = useCallback(
  (id: string) => {
    removeWaypoint(id);
  },
  [removeWaypoint]
);
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 4: Pass `onWaypointPress` to MapCanvas

1. In the JSX, update the MapCanvas component (line 143-150) to include the new prop:

```tsx
<MapCanvas
  ref={mapRef}
  waypoints={waypoints}
  segments={segments}
  mode={mode}
  position={position}
  onMapClick={handleMapClick}
  onWaypointPress={handleWaypointPress}
/>
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 5: Add undo FAB next to the trash and GPS FABs

1. In the FABs section (lines 226-235), add an undo button that appears when in measure mode and there are waypoints. Replace the FABs section:

```tsx
{/* FABs */}
<View style={[styles.fabs, { bottom: CARD_BOTTOM - 56 }]}>
  {waypoints.length > 0 ? (
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
```

The undo button uses `arrow-undo` icon from Ionicons and appears above the trash button. It only shows when waypoints exist. The `CARD_BOTTOM - 56` positions the FABs slightly above where the summary card will be (plan 004 computes `CARD_BOTTOM`).

Note: If plan 004 has already been executed, use the `CARD_BOTTOM` constant. If executing this plan independently, use `insets.bottom + 24` for the FAB bottom offset and let plan 004 reconcile the stacking.

2. Also update the bottom positioning. The FABs section is now:
```tsx
<View style={[styles.fabs, { bottom: insets.bottom + 24 }]}>
```
(Keep the original bottom offset for now; plan 004 will harmonize the stacking.)

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 6: Update the measure hint to mention tap-to-remove

1. Update the measure hint text (line 220) from:
   ```tsx
   روی نقشه کلیک کنید تا نقطه اضافه شود
   ```
   to:
   ```tsx
   روی نقشه کلیک کنید • روی نقطه بزنید تا حذف شود
   ```

This tells the user they can also tap a marker to remove it.

**Verify**: `cd mobile && npx expo lint` → 0 errors.

### Step 7: Verify the marker style allows touch

In `MapCanvas.native.tsx`, the marker style (line 278-287) uses fixed 32×32 dimensions. This is adequate for touch targets on mobile (Apple HIG says 44pt, but 32px in map context is acceptable since markers are contextually distinct from regular buttons). The `Pressable` component wrapping the marker will handle touch events.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0. `cd mobile && npx expo lint` → 0 errors.

## Test plan

- No test infrastructure. Manual verification.
- Test cases:
  1. Enter measure mode, tap map 3 times → 3 waypoints appear.
  2. Tap undo FAB → last waypoint removed, routes recalculated.
  3. Tap a marker directly on the map → that marker removed.
  4. Tap trash FAB → all waypoints cleared.
  5. Waypoint markers show Pressable feedback (opacity change on press).
  6. Measure hint text shows the updated instruction.
  7. In explore mode, tapping waypoints does nothing (onWaypointPress still fires but removeWaypoint is called — this is acceptable since explore mode doesn't add waypoints, so there shouldn't be any to remove).

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] `onWaypointPress` prop exists in `MapCanvasProps` in both `.native.tsx` and `.web.tsx`
- [ ] `undoWaypoint` function exists in `AppRoot()`
- [ ] Undo FAB (arrow-undo icon) appears when waypoints exist
- [ ] Tapping a marker on the map calls `onWaypointPress` and removes that marker
- [ ] Measure hint text includes tap-to-remove instruction
- [ ] `plans/README.md` status row updated

## STOP conditions

- `ViewAnnotation` in MapLibre React Native doesn't support `onPress` on its children (check the docs — if `Pressable` inside `ViewAnnotation` doesn't receive taps, use a different approach: add an `onPress` handler on the `Map` and use the annotation's `id` to identify which marker was tapped).
- The web canvas marker click handler conflicts with the map's own click handler (use `stopPropagation`).
- A step's verification fails twice.

## Maintenance notes

- If `ViewAnnotation` press handling proves unreliable on native, the fallback is to use MapLibre's built-in annotation press event (`onAnnotationPress`) on the `<Map>` component, which provides the annotation ID.
- The undo button icon `arrow-undo` is available in Ionicons 5+. If using an older version, use `arrow-back` or `undo` instead.
- The `allowOverlap={true}` on ViewAnnotation ensures markers are always tappable even when overlapping. This is intentional for measure mode where dense waypoints are expected.

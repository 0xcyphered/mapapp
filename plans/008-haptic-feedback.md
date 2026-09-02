# Plan 008: Add Haptic Feedback to All Touch Interactions

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 87ef91c..HEAD -- mobile/App.tsx mobile/src/ mobile/package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: ux
- **Planned at**: commit `87ef91c`, 2026-09-02

## Why this matters

Every touch interaction in the app — adding waypoints, selecting search results, pressing mode toggle, pressing FABs — produces no haptic feedback. On iOS and Android, users expect tactile confirmation for important actions. Without it, the app feels "dead" and non-native. The Expo `Haptics` API is zero-install (already bundled with Expo SDK 57) and provides three feedback types:
- `Light` — for taps, selections, toggles.
- `Medium` — for destructive actions (clear all, undo).
- `Success` — for completing an action (GPS lock acquired, route calculated).

This plan creates a thin haptic utility and calls it from every interactive Pressable in the app.

## Current state

- `mobile/App.tsx` — contains all Pressable handlers:
  - Mode toggle press (line 159, 171)
  - GPS FAB press (line 233)
  - Trash FAB press (line 229)
  - Panel toggle press (line 305)
  - Panel remove waypoint press (line 270)
  - Panel clear all press (line 295)
- `mobile/src/components/SearchBar.tsx` — search result row press (line 104).
- `mobile/package.json` — `expo: ~57.0.18`. `expo-haptics` is NOT currently installed and must be added.

**Exemplar haptic call** (from Expo docs):
```tsx
import * as Haptics from 'expo-haptics';

// In a Pressable onPress:
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

## Commands you will need

| Purpose    | Command                    | Expected on success          |
|------------|----------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint` | 0 errors (warnings OK)     |
| Typecheck  | `cd mobile && npx tsc --noEmit` | 0 errors               |
| Verify dep | `cd mobile && node -e "require('expo-haptics')" ` | no error |

## Scope

**In scope**:
- `mobile/src/utils/haptics.ts` (new file — thin wrapper)
- `mobile/App.tsx`
- `mobile/src/components/SearchBar.tsx`

**Out of scope**:
- `MapCanvas.native.tsx` — map touches are handled by MapLibre, not our code.
- Installing any new packages (expo-haptics is bundled with Expo SDK 57).

## Steps

### Step 1: Install expo-haptics

1. Run: `cd mobile && npx expo install expo-haptics`
   Expected: package added to `package.json` dependencies, no errors.
2. Verify: `cd mobile && node -e "require('expo-haptics'); console.log('ok')"`
   Expected: `ok`

**Verify**: Command outputs `ok`.

### Step 2: Create haptic utility

Create `mobile/src/utils/haptics.ts`:

```tsx
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Thin wrapper around Expo Haptics with web-safe no-ops.
 * Call hapticLight() for selections, hapticMedium() for destructive actions,
 * hapticSuccess() for completed actions. On web, these are no-ops.
 */
export function hapticLight(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function hapticMedium(): void {
  if (Platform.OS === 'web') return;
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
}

export function hapticSuccess(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

export function hapticWarning(): void {
  if (Platform.OS === 'web') return;
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
}
```

The `void` prefix suppresses the unhandled promise warning (haptics are fire-and-forget). The Platform.OS check ensures web builds don't crash.

**Verify**: `cd mobile && node -e "require('./src/utils/haptics'); console.log('ok')"` → `ok` (or the TypeScript version of this check).

### Step 3: Add haptics to App.tsx

1. Import the utility at the top of `App.tsx`:
   ```tsx
   import { hapticLight, hapticMedium, hapticWarning } from './src/utils/haptics';
   ```

2. Add haptic calls to each Pressable `onPress`:

   **Mode toggle** (lines 159, 171):
   ```tsx
   onPress={() => { hapticLight(); setMode('explore'); }}
   onPress={() => { hapticLight(); setMode('measure'); }}
   ```

   **GPS FAB** (line 232-234):
   ```tsx
   <Pressable style={styles.fab} onPress={() => { hapticLight(); void handleGpsPress(); }}>
   ```
   Note: `handleGpsPress` is async, so wrap in arrow function.

   **Trash FAB** (line 228-230):
   ```tsx
   <Pressable style={styles.fab} onPress={() => { hapticMedium(); clearWaypoints(); }}>
   ```

   **Panel toggle** (line 305):
   ```tsx
   onPress={() => { hapticLight(); setPanelOpen((v) => !v); }}
   ```

   **Panel remove waypoint** (line 270):
   ```tsx
   onPress={() => { hapticLight(); removeWaypoint(item.id); }}
   ```

   **Panel clear all** (line 295):
   ```tsx
   onPress={() => { hapticWarning(); clearWaypoints(); }}
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 4: Add haptics to SearchBar.tsx

1. Import the utility at the top of `SearchBar.tsx`:
   ```tsx
   import { hapticLight } from '../utils/haptics';
   ```

2. Add haptic call to `handleSelect` (line 62):
   ```tsx
   const handleSelect = (result: SearchResult) => {
     hapticLight();
     const lat = parseFloat(result.lat);
     const lng = parseFloat(result.lon);
     onSelect(lat, lng);
     setQuery(result.display_name);
     setOpen(false);
     inputRef.current?.blur();
     Keyboard.dismiss();
   };
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 5: Verify all haptics

1. Run typecheck: `cd mobile && npx tsc --noEmit` → exit 0.
2. Run lint: `cd mobile && npx expo lint` → 0 errors.
3. Verify the haptic utility file exists: `ls mobile/src/utils/haptics.ts`.

## Test plan

No test infrastructure. Manual verification:
1. Run on iOS Simulator (requires a physical device for actual haptic feedback, but the calls should not crash).
2. Run on a physical Android device — feel the haptic buzz on:
   - Mode toggle tap (light).
   - GPS FAB tap (light).
   - Trash FAB tap (medium — stronger buzz).
   - Search result tap (light).
   - Panel clear all (warning — distinct pattern).
3. Run on web — no haptics, no crashes (the Platform.OS guard ensures this).
4. On iOS, haptics may not fire in the simulator — this is expected. The important thing is no crashes.

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] `mobile/src/utils/haptics.ts` exists with `hapticLight`, `hapticMedium`, `hapticSuccess`, `hapticWarning`
- [ ] `App.tsx` imports and calls haptics in all Pressable handlers
- [ ] `SearchBar.tsx` imports and calls `hapticLight` in `handleSelect`
- [ ] `grep -rn "hapticLight\|hapticMedium\|hapticWarning\|hapticSuccess" mobile/src/ mobile/App.tsx` returns matches in all target files
- [ ] No haptic calls exist in `MapCanvas.native.tsx` or `MapCanvas.web.tsx` (map touches are MapLibre's responsibility)
- [ ] `plans/README.md` status row updated

## STOP conditions

- `expo-haptics` is not available (not bundled with this Expo version — install it).
- Haptic calls cause crashes on web (missing Platform import or guard).
- A step's verification fails twice.

## Maintenance notes

- If the app adds new interactive elements in the future, import `hapticLight` and call it in `onPress`. The convention is: light for selections, medium for destructive, success for completion.
- The `void` prefix on async haptic calls is intentional — haptics are fire-and-forget and should never block the UI thread.
- On physical iOS devices, heavy haptic usage (rapid successive calls) can cause the haptic engine to "warm up" and delay. This is not an issue for our usage pattern (discrete taps, not rapid-fire).
- If the app later adds a settings screen, consider a "Haptics enabled" toggle that disables all haptic calls.

# Plan 005: Add Gesture Dismissal and Backdrop to Control Panel

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 87ef91c..HEAD -- mobile/App.tsx mobile/package.json mobile/src/`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 004 (uses the same inset-based layout values)
- **Category**: ux
- **Planned at**: commit `87ef91c`, 2026-09-02

## Why this matters

The control panel is a 300px-wide full-height sidebar that slides in from the left edge. The only way to close it is a tiny 28×44px chevron button at a fixed position on the left edge of the screen. On mobile, this is extremely difficult to hit and violates standard mobile UX patterns. Users expect:
1. **Swipe-left to dismiss** — the standard gesture for closing a side drawer.
2. **Tap the backdrop to dismiss** — when the panel is open, the dark area behind it should be tappable to close.
3. The existing chevron toggle should still work as a secondary affordance.

## Current state

- `mobile/App.tsx` lines 237-312 — the control panel (Animated.View) and panel toggle (Pressable).
- The panel uses `Animated.Value(0)` with `translateX` from -320 to 0 (lines 54, 63-69, 242-248).
- The panel toggle is at lines 303-312, using the same `panelOpen` state.
- `react-native`'s `PanResponder` is available for swipe gestures (no new deps needed).
- `Animated.timing` with `useNativeDriver: true` is the current animation pattern.

**Exemplar panel pattern** (current code):
```tsx
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
  {/* Panel content... */}
</Animated.View>
```

**Panel style** (line 468-477):
```tsx
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
```

## Commands you will need

| Purpose    | Command                    | Expected on success          |
|------------|----------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint` | 0 errors (warnings OK)     |
| Typecheck  | `cd mobile && npx tsc --noEmit` | 0 errors               |

## Scope

**In scope**:
- `mobile/App.tsx`

**Out of scope**:
- `mobile/src/components/*` — no changes to child components.
- Converting the panel to a bottom sheet — that's a larger refactor (see Direction observation in findings table). This plan adds gestures to the existing sidebar pattern.

## Steps

### Step 1: Add a backdrop overlay behind the panel

When the panel is open, render a semi-transparent overlay behind it. Tapping it closes the panel.

1. In `App.tsx`, add a backdrop component between the map and the panel in the JSX (after the summary card / measure hint, before the panel Animated.View). Insert at approximately line 237:

```tsx
{/* Panel backdrop — tap to dismiss */}
{panelOpen ? (
  <Pressable
    style={styles.panelBackdrop}
    onPress={() => setPanelOpen(false)}
  />
) : null}
```

2. Add the `panelBackdrop` style to the StyleSheet at the bottom of the file:

```tsx
panelBackdrop: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  zIndex: 1199, // just below the panel (1200)
},
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 2: Add PanResponder for swipe-to-dismiss

The swipe gesture detects a horizontal drag from right-to-left (or left-to-right depending on RTL) to dismiss the panel. On an RTL layout, the user swipes left to dismiss a right-side panel, or swipes from the left edge to dismiss a left-side panel.

Since RTL is forced (`I18nManager.forceRTL(true)`), but the panel is on the left side of the screen (`left: 0`), the user needs to **swipe left** (from center toward left edge) to dismiss. This is the natural gesture for closing a left-edge panel.

1. Import `PanResponder` from `react-native`:
   ```tsx
   import {
     Animated,
     FlatList,
     I18nManager,
     PanResponder,
     Pressable,
     StyleSheet,
     Text,
     View,
   } from 'react-native';
   ```

2. After the `panelAnim` declaration (line 54), add the PanResponder:

```tsx
const panelWidth = 300;
const panelResponder = useRef(
  PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      // Only capture horizontal drags, not vertical scrolls
      return (
        Math.abs(gestureState.dx) > 10 &&
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy)
      );
    },
    onPanResponderMove: (_, gestureState) => {
      // Panel starts at 0 when open, should slide to -300 when closed.
      // Swipe left (negative dx) means close, swipe right (positive dx) means open more (clamp).
      const dx = gestureState.dx;
      // On RTL with left-side panel: left swipe (negative dx) = dismiss
      const newTranslate = Math.max(-panelWidth, Math.min(0, dx));
      panelAnim.setValue(newTranslate / panelWidth + 1); // map [-300, 0] to [0, 1]
    },
    onPanResponderRelease: (_, gestureState) => {
      // If dragged more than 40% of panel width, close; otherwise snap back open
      if (gestureState.dx < -panelWidth * 0.4) {
        setPanelOpen(false);
      } else {
        setPanelOpen(true);
      }
    },
  })
).current;
```

3. Apply the `panelResponder` to the panel view by spreading it onto the Animated.View. Change the panel wrapper from:

```tsx
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
```

to:

```tsx
<Animated.View
  {...panelResponder.panHandlers}
  style={[
    styles.panel,
    {
      transform: [
        {
          translateX: panelAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-panelWidth, 0],
          }),
        },
      ],
    },
  ]}
>
```

Note: use `-panelWidth` instead of the hardcoded `-320`.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 3: Update the panel open/close animation to use Gesturemj

The existing `Animated.timing` animation should still work for programmatic open/close (via the toggle button). The PanResponder only directly manipulates `panelAnim` during the gesture; the `setPanelOpen(true/false)` at the end triggers the Animated.timing. This is the correct pattern — no changes needed to the existing timing animation.

**Verify**: Confirm the `useEffect` at lines 63-69 still triggers when `panelOpen` changes:
```tsx
useEffect(() => {
  Animated.timing(panelAnim, {
    toValue: panelOpen ? 1 : 0,
    duration: 200,
    useNativeDriver: true,
  }).start();
}, [panelOpen, panelAnim]);
```
This should remain as-is.

### Step 4: Verify gesture interaction with FlatList scroll

The panel contains a `FlatList` with vertical scrolling. The PanResponder must not interfere with vertical scrolling inside the panel. The `onMoveShouldSetPanResponder` already filters for horizontal-only drags (`Math.abs(dx) > Math.abs(dy)`). However, the FlatList's scroll may conflict.

1. The existing `FlatList` inside the panel (line 256) needs `scrollEnabled` to work alongside the PanResponder. No change should be needed since `onMoveShouldSetPanResponder` returns `false` for vertical gestures.

2. **Potential issue**: if vertical scrolling inside the FlatList is broken after this change, add `onStartShouldSetPanResponderCapture` that returns `false` to let the FlatList handle vertical drags. Test this manually.

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0.

### Step 5: Verify all panel interactions

1. Run typecheck: `cd mobile && npx tsc --noEmit` → exit 0.
2. Run lint: `cd mobile && npx expo lint` → 0 errors.
3. Manual verification:
   - Swipe left on the open panel → panel dismisses.
   - Tap the backdrop (dark area) → panel dismisses.
   - Tap the chevron toggle → panel opens/closes (existing behavior preserved).
   - Scroll the waypoint list inside the panel → vertical scroll works, doesn't trigger dismissal.
   - On Android back button → should dismiss panel (use `BackHandler` — see Step 6 if needed).

### Step 6 (optional, recommended): Dismiss panel on Android back button

On Android, pressing the hardware back button while the panel is open should close it rather than exit the app.

1. Import `BackHandler` from `react-native`:
   ```tsx
   import {
     Animated,
     BackHandler,
     FlatList,
     I18nManager,
     PanResponder,
     Pressable,
     StyleSheet,
     Text,
     View,
   } from 'react-native';
   ```

2. Add an effect after the panel animation effect (after line 69):

```tsx
useEffect(() => {
  if (!panelOpen) return;
  const handler = BackHandler.addEventListener('hardwareBackPress', () => {
    setPanelOpen(false);
    return true; // consumed
  });
  return () => handler.remove();
}, [panelOpen]);
```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0. On Android emulator, open panel → press back button → panel closes.

## Test plan

- No test infrastructure. Verification is manual.
- Test cases:
  1. Swipe left on open panel → closes smoothly.
  2. Swipe right on open panel → stays open (clamped).
  3. Partial swipe left (< 40% width) → snaps back open.
  4. Tap dark backdrop → closes panel.
  5. Chevron toggle still works for open/close.
  6. Vertical scrolling in panel waypoint list works.
  7. Android back button closes panel.
  8. Panel animation (200ms ease) is smooth, no jitter.

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] Backdrop overlay renders when panel is open (`panelBackdrop` style exists)
- [ ] PanResponder is attached to the panel view (`panelResponder.panHandlers` spread)
- [ ] Swipe-to-dismiss works (tested manually or verified by reading gesture thresholds)
- [ ] Android back button handler is registered when panel is open
- [ ] `plans/README.md` status row updated

## STOP conditions

- The panel's `Animated.Value` / timing animation breaks after adding PanResponder.
- Vertical scrolling inside the FlatList stops working.
- Swipe gesture conflicts with map pan/zoom gestures.
- A step's verification fails twice after a reasonable fix attempt.

## Maintenance notes

- If the panel width changes from 300, update `panelWidth` constant and the `panelBackdrop` and panel styles remain correct (backdrop is full-screen).
- The `panelWidth` constant is local to `AppRoot()`. If it's needed in child components, extract it to `theme.ts`.
- The PanResponder is created once via `useRef` — this is intentional. Do not recreate it on every render.
- If the project later adopts `react-native-gesture-handler` (recommended for production), the PanResponder should be replaced with `Gesture.Pan()` from RNGH for better gesture conflict resolution with MapLibre's built-in gestures.

# Plan 004: Safe-Area-Aware Layout for Control Panel, Toast, Mode Toggle, and Summary Card

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
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `87ef91c`, 2026-09-02

## Why this matters

The control panel header uses `paddingTop: 56` (a hardcoded guess) instead of the actual safe area inset. On iPhone 14 Pro (59pt inset), the panel title sits under the Dynamic Island. On short-statusbar phones, it wastes 10+ pixels. The toast notification is positioned at a fixed offset that collides with the search results dropdown — when a user triggers a GPS error while the search bar is open, the toast is completely hidden. The mode toggle, summary card, and FABs all use hardcoded bottom offsets that don't account for each other, causing visual overlap on smaller screens. This plan makes every overlay position dynamic and non-colliding.

## Current state

- `mobile/App.tsx` — the single 580-line file containing all UI overlay logic.
- Control panel header at line 479: `paddingTop: 56` — hardcoded, not using `insets.top`.
- Toast at line 187: `{ top: insets.top + 128 }` — fixed offset from safe area top.
- Mode toggle at line 156: `{ top: insets.top + 76 }` — fixed offset from safe area top.
- Summary card at line 195: `{ bottom: insets.bottom + 96 }` — fixed offset from safe area bottom.
- Measure hint at line 218: `{ bottom: insets.bottom + 96 }` — same as summary card.
- FABs at line 226: `{ bottom: insets.bottom + 24 }` — fixed offset from safe area bottom.
- Panel toggle at line 304: `{ top: insets.top + 200 }` — fixed offset.

**Relevant existing convention**: The `useSafeAreaInsets()` hook is already imported and used (`insets` variable at App.tsx:52). The pattern is established — use `insets.top + N` for top positioning and `insets.bottom + N` for bottom positioning. This plan extends the existing pattern consistently to all overlays.

**Exemplar overlay** (from SearchBar.tsx:73-74):
```tsx
<View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
```
This is the correct pattern: position with `insets.top + offset`.

## Commands you will need

| Purpose    | Command                    | Expected on success          |
|------------|----------------------------|------------------------------|
| Lint       | `cd mobile && npx expo lint` | 0 errors (warnings OK)     |
| Typecheck  | `cd mobile && npx tsc --noEmit` | 0 errors               |

## Scope

**In scope** (the only files you should modify):
- `mobile/App.tsx`

**Out of scope** (do NOT touch):
- `mobile/src/components/MapCanvas.native.tsx` — map rendering, no layout changes needed.
- `mobile/src/components/SearchBar.tsx` — already uses safe area insets correctly.
- `mobile/app.json` — no config changes needed.
- `mobile/webapp/` — separate project, frozen as reference.

## Steps

### Step 1: Lift panel header paddingTop to use safe area insets

The `panelHeader` style currently uses `paddingTop: 56`. The panel is a full-height view, so it can receive `insets.top` as padding. Since `StyleSheet.create` styles are static and can't reference runtime insets, the padding must be applied inline in the JSX.

1. In `App.tsx`, find the `panelHeader` style definition at line 479 and note the current value (`paddingTop: 56`).
2. In the JSX at line 253-255, change:
   ```tsx
   <View style={styles.panelHeader}>
     <Text style={styles.panelTitle}>پنل کنترل</Text>
   </View>
   ```
   to:
   ```tsx
   <View style={[styles.panelHeader, { paddingTop: insets.top + 16 }]}>
     <Text style={styles.panelTitle}>پنل کنترل</Text>
   </View>
   ```
3. Update the `panelHeader` style definition to remove the hardcoded `paddingTop: 56`:
   ```tsx
   panelHeader: {
     paddingBottom: 12,
     paddingHorizontal: 16,
     borderBottomWidth: 1,
     borderBottomColor: '#e5e7eb',
   },
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 2: Compute a vertical stacking offset for top overlays

The search bar, mode toggle, and toast all stack from the top. Instead of hardcoded gaps between them, compute cumulative offsets from the search bar's bottom edge.

1. Add a computed offset constant near the top of `AppRoot()`, after the `insets` declaration (around line 52):
   ```tsx
   // Vertical stacking: search bar is ~56px tall (padding 12+12 + input ~32) plus
   // top: insets.top + 8. Mode toggle sits just below it.
   const SEARCH_BOTTOM = insets.top + 68; // 8 (top offset) + ~60 (card height with border)
   const TOGGLE_TOP = SEARCH_BOTTOM + 8;
   const TOAST_TOP = TOGGLE_TOP + 48; // below the mode toggle pills
   ```
2. In the JSX, update the mode toggle position (line 156) from:
   ```tsx
   <View style={[styles.modeToggle, { top: insets.top + 76 }]}>
   ```
   to:
   ```tsx
   <View style={[styles.modeToggle, { top: TOGGLE_TOP }]}>
   ```
3. Update the toast position (line 187) from:
   ```tsx
   <View style={[styles.toast, { top: insets.top + 128 }]}>
   ```
   to:
   ```tsx
   <View style={[styles.toast, { top: TOAST_TOP }]}>
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 3: Make panel toggle position relative to mode toggle

The panel toggle is at `top: insets.top + 200` — a hardcoded guess. Move it relative to the mode toggle.

1. Add a computed constant:
   ```tsx
   const TOGGLE_TOGGLE_TOP = TOGGLE_TOP + 48; // below mode toggle pills
   ```
2. Update the panel toggle position (line 304) from:
   ```tsx
   <Pressable style={[styles.panelToggle, { top: insets.top + 200 }]}>
   ```
   to:
   ```tsx
   <Pressable style={[styles.panelToggle, { top: TOGGLE_TOGGLE_TOP }]}>
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 4: Fix summary card / FAB overlap using a single bottom anchor

The summary card and measure hint both use `bottom: insets.bottom + 96`, and the FABs use `bottom: insets.bottom + 24`. On small screens the summary card (which sits at y=120 from bottom) sits right next to the FABs (which sit at y=72 from bottom on a phone with 34px inset). The fix is to position the summary card/measurement hint above the FABs with a gap.

1. Add computed bottom offsets:
   ```tsx
   // Bottom stacking: FABs are the anchor at insets.bottom + 24.
   // Summary card and measure hint float above them with a gap.
   const FABS_BOTTOM = insets.bottom + 24;
   const CARD_BOTTOM = FABS_BOTTOM + 72; // 48 (FAB height) + 24 (gap)
   ```
2. Update the summary card position (line 195) from:
   ```tsx
   <View style={[styles.summaryCard, { bottom: insets.bottom + 96 }]}>
   ```
   to:
   ```tsx
   <View style={[styles.summaryCard, { bottom: CARD_BOTTOM }]}>
   ```
3. Update the measure hint position (line 218) from:
   ```tsx
   <View style={[styles.measureHint, { bottom: insets.bottom + 96 }]}>
   ```
   to:
   ```tsx
   <View style={[styles.measureHint, { bottom: CARD_BOTTOM }]}>
   ```

**Verify**: `cd mobile && npx tsc --noEmit` → exit 0, no errors.

### Step 5: Enlarge mode toggle touch targets for mobile accessibility

The mode toggle buttons are small text pills at 13px. Increase the font size and add minimum touch targets per Apple HIG (44pt minimum).

1. Update the `modeText` style (line 363-366):
   ```tsx
   modeText: {
     color: COLORS.textMid,
     fontSize: 14,
     fontFamily: 'Vazirmatn_500Medium',
   },
   ```
2. Update the `modeButton` style (line 350-357) to ensure adequate touch height:
   ```tsx
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
   ```

**Verify**: `cd mobile && npx expo lint` → 0 errors (warnings OK).

### Step 6: Verify final layout

1. Run typecheck: `cd mobile && npx tsc --noEmit` → exit 0, no errors.
2. Run lint: `cd mobile && npx expo lint` → 0 errors.
3. Visually verify by reading the final `App.tsx` and confirming:
   - All top-positioned overlays use computed offsets from `insets.top`.
   - All bottom-positioned overlays use computed offsets from `insets.bottom + FABs`.
   - Panel header uses `{ paddingTop: insets.top + 16 }` inline style.
   - No hardcoded magic numbers remain in positioning styles (except gaps between elements, which are fine as constants).

## Test plan

- No test infrastructure exists in this project. Verification is manual:
  1. `npx expo start` → open on iOS Simulator (iPhone 15 Pro and iPhone SE) and Android emulator.
  2. Verify: control panel title is clearly visible below the notch.
  3. Verify: toast notification appears below the mode toggle, never behind search results.
  4. Verify: summary card and FABs don't overlap on iPhone SE screen (375×667).
  5. Verify: mode toggle buttons are easily tappable (no fat-finger frustration).

## Done criteria

ALL must hold:
- [ ] `cd mobile && npx tsc --noEmit` exits 0
- [ ] `cd mobile && npx expo lint` exits 0 errors
- [ ] Control panel header paddingTop is `insets.top + 16` (inline), not `56` (hardcoded)
- [ ] Toast top is computed from mode toggle position, not `insets.top + 128`
- [ ] Summary card bottom is computed from FAB position, not `insets.bottom + 96`
- [ ] Mode toggle font size >= 14px, minHeight >= 40
- [ ] `grep -n "paddingTop: 56" mobile/App.tsx` returns no matches
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back if:
- The code at the locations in "Current state" doesn't match the excerpts (codebase drifted).
- A step's verification fails twice after a reasonable fix attempt.
- The fix appears to require touching an out-of-scope file.

## Maintenance notes

- If the search bar card height changes (different font size, extra button), `SEARCH_BOTTOM` in Step 2 must be updated to match.
- If the FAB size changes from 48px, `CARD_BOTTOM` in Step 4 must be updated.
- The computed offset constants should be grouped together in the component body for easy maintenance.
- Future panels (e.g., bottom sheets) should follow the same safe-area-aware pattern.

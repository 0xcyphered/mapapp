# Plan 002: Wrap the Vite React Map App in Capacitor iOS/Android Shells

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat e9fa90b..HEAD -- package.json package-lock.json vite.config.ts tsconfig.node.json index.html src/main.tsx src/App.tsx src/components/MapView.tsx src/components/SearchBar.tsx src/components/ControlPanel.tsx src/index.css src/utils/location.ts capacitor.config.ts .gitignore`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition **unless** the mismatch is exactly
> plan 001's GPS toast / `userLocation.accuracy` work (see "Coordination
> with plan 001" below). In that case, follow the 001-already-landed branch
> instead of duplicating the toast.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: MED
- **Depends on**: none (soft overlap with `plans/001-feature-completion.md` — see coordination section)
- **Category**: migration
- **Planned at**: commit `e9fa90b`, 2026-09-01

## Why this matters

The app is a Vite + React 19 + Leaflet web map. GPS today is Leaflet's
browser `map.locate()`, which on a Capacitor WebView is a second-class
geolocation path: iOS CoreLocation / Android LocationManager never see a
proper permission prompt, `Info.plist` usage strings are missing, and the
notch / gesture bar overlap the search bar and FABs. Wrapping with Capacitor
keeps 100% of the existing React/Leaflet/OSRM/Nominatim logic and adds a
native shell (iOS + Android packages), native GPS, status-bar overlay, splash
hide, and safe-area padding.

This is a shell + adapter plan, not a rewrite. Do **not** introduce Ionic
UI components, a second router, or a React Native rewrite.

## Coordination with plan 001

`plans/001-feature-completion.md` is **TODO** at plan-write time and also
edits `src/App.tsx` and `src/components/MapView.tsx` (Leaflet
`locationfound` / `locationerror` toast, `userLocation.accuracy`, pulse
marker + Circle).

- **If 001 is still TODO** (current HEAD matches the excerpts below): this
  plan adds a small Persian error toast in `App.tsx` because native
  permission-denied must surface somehow. Leave MapView's `locationfound`
  handler in place; just stop calling `map.locate()` from the FAB.
- **If 001 has already landed** (`locationError` state, `handleUserLocation`,
  toast at `top-20`, `userLocation.accuracy`): do **not** add a second toast.
  Plug `getUserPosition()` into the existing `handleUserLocation` /
  `setLocationError` state. Do **not** restore `map.locate()`.
- After this plan, 001 **must not** reintroduce `map.locate()` on the FAB.
  001's numbered markers, straight polylines, floating summary card, and
  search debounce remain 001's job.

## Current state

Vite 8 + React 19 + Leaflet web app. No Capacitor. No test runner.
Commands from `package.json`: `npm run lint` (oxlint), `npm run build`
(`tsc -b && vite build`), `npm run dev` (Vite on :5173).

Relevant files:

- `package.json` — scripts `dev` / `build` / `lint` / `preview`; no cap scripts; no `@capacitor/*` deps
- `vite.config.ts` — no `base` (defaults to `/`, which **breaks** Capacitor `file://` asset loads)
- `tsconfig.node.json` — `include` is only `["vite.config.ts"]`
- `tsconfig.app.json` — `include` is only `["src"]`; `verbatimModuleSyntax: true`; `erasableSyntaxOnly: true`
- `index.html` — viewport is `width=device-width, initial-scale=1.0` (no `viewport-fit=cover`)
- `src/main.tsx` — StrictMode mount only; no native chrome init
- `src/App.tsx` — location FAB calls `mapRef.current?.locate(...)`; no `locationError` toast
- `src/components/MapView.tsx` — `MapEvents` listens to `locationfound` only; `createUserLocationIcon()` exists but is never mounted from App state
- `src/components/SearchBar.tsx` — `absolute top-4 right-4` (notch overlap)
- `src/components/ControlPanel.tsx` — full-height sidebar, header `pt-5` (notch overlap)
- `src/index.css` — `html, body, #root` are `overflow: hidden` but no `overscroll-behavior-y: none` and no tap-highlight disable
- `.gitignore` — ignores `dist` and `node_modules`; nothing Capacitor-specific
- No `capacitor.config.ts`, no `ios/`, no `android/`, no `src/utils/location.ts`

Repo conventions to match:

- Tailwind utility classes on JSX, lucide-react icons, Persian UI strings, `dir="rtl"`.
- React 19: `useRef` always gets an argument (`null` or `undefined`), never `useRef<T>()`.
- `verbatimModuleSyntax`: type-only imports must be `import type { X }`.
- No enums (`erasableSyntaxOnly`).
- Error UI copy is Persian. Distance/GPS helpers live under `src/utils/` as named exports (see `src/utils/geocoding.ts` and `src/utils/persian.ts`).
- Commit messages in this repo are short imperative (`v` is the only historical style). Use a descriptive imperative sentence; do **not** invent `feat:` conventional-commit prefixes.

### package.json scripts and deps (today)

```json
"scripts": {
  "dev": "vite",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview"
}
```

No `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`,
`@capacitor/geolocation`, `@capacitor/status-bar`, or `@capacitor/splash-screen`.

### vite.config.ts (today)

```ts
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
```

No `base: './'`. Without it, the native WebView requests `/assets/...` from
the device origin and the map JS never loads.

### index.html viewport (today)

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

### src/main.tsx (today)

```ts
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

### Location FAB — the only GPS trigger (`src/App.tsx:129-141`)

```tsx
<button
  onClick={() => {
    if (userLocation) {
      flyTo(userLocation.lat, userLocation.lng, 15);
    } else {
      mapRef.current?.locate({ enableHighAccuracy: true, watch: false });
    }
  }}
  className="absolute bottom-6 left-6 z-[1000] bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-shadow border border-gray-200"
  title="موقعیت من"
>
```

`userLocation` is `{ lat: number; lng: number } | null`. There is **no**
`locationError` state and **no** toast.

Clear-all FAB is `absolute bottom-6 left-[68px]`. Measure hint is
`absolute bottom-20 left-1/2`. Mode toggle is `absolute top-4 left-1/2`.
SearchBar is `absolute top-4 right-4`.

### MapEvents GPS (`src/components/MapView.tsx:49-72`)

```ts
useMapEvents({
  click(e) {
    onMapClick(e.latlng.lat, e.latlng.lng);
  },
  locationfound(e) {
    onUserLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
    map.flyTo(e.latlng, 15, { duration: 1.5 });
  },
});
```

No `locationerror`. After this plan the FAB will not call `map.locate()`,
so `locationfound` becomes a dormant fallback. **Leave it in MapView** —
do not delete MapEvents or `onUserLocation`. Do not mount a second GPS
stack inside MapView.

### src/index.css html/body (today)

```css
html, body, #root {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Vazirmatn', 'Tahoma', sans-serif;
  direction: rtl;
}
```

No `overscroll-behavior-y`, no `-webkit-tap-highlight-color`, no
`env(safe-area-inset-*)` on `.leaflet-top`.

### tsconfig.node.json include (today)

```json
"include": ["vite.config.ts"]
```

`capacitor.config.ts` will not typecheck until this include grows.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Lint | `npm run lint` | exit 0, 0 errors |
| Typecheck + web build | `npm run build` | exit 0; writes `dist/` |
| Install npm deps | `npm install <packages>` | exit 0; packages in `package.json` |
| Capacitor copy | `npx cap copy` | copies `dist/` into `ios/` and `android/` www |
| Capacitor sync | `npx cap sync` | copy + update native plugin/gradle/pod files |
| Open Xcode (optional, last) | `npx cap open ios` | Xcode launches |
| Open Android Studio (optional, last) | `npx cap open android` | Android Studio launches |

Run every command from the **repo root**. Do not `cd` into `src/`.

If `npm install` fails with EACCES on `~/.npm/_cacache` (root-owned cache),
retry with `npm install --cache /tmp/npm-cache <packages>` (web-mapping
skill workaround).

Pinned versions at plan-write time (install these ranges, do not invent
Capacitor 5/6 APIs):

| Package | Latest at plan time |
|---------|---------------------|
| `@capacitor/core` / `@capacitor/cli` / `@capacitor/ios` / `@capacitor/android` | 8.5.1 |
| `@capacitor/geolocation` | 8.2.2 |
| `@capacitor/status-bar` | 8.0.3 |
| `@capacitor/splash-screen` | 8.0.2 |

A 8.x patch bump is fine. A major (9+) is a STOP condition.

## Suggested executor toolkit

- If the `web-mapping` skill is available, load it. Honor its OSRM rule:
  do **not** change `src/utils/routing.ts`. After native splash hide, call
  `map.invalidateSize()` once so Leaflet fills the WebView.
- Capacitor 8 docs (read before Step 1 if unsure):
  - https://capacitorjs.com/docs/getting-started
  - https://capacitorjs.com/docs/v8/apis/geolocation
  - https://capacitorjs.com/docs/v8/apis/status-bar
  - https://capacitorjs.com/docs/v8/apis/splash-screen

## Scope

**In scope** (the only files you should modify or create):

- `package.json` (and lockfile via npm install)
- `vite.config.ts`
- `tsconfig.node.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx`
- `src/components/SearchBar.tsx`
- `src/components/ControlPanel.tsx`
- `src/index.css`
- `.gitignore`
- `capacitor.config.ts` (create)
- `src/utils/location.ts` (create)
- `ios/` (created by `npx cap add ios`; then edit `ios/App/App/Info.plist`)
- `android/` (created by `npx cap add android`; then edit `android/app/src/main/AndroidManifest.xml`)
- `plans/README.md` status row at the end

**Out of scope** (do NOT touch, even though they look related):

- `src/components/MapView.tsx` — leave `locationfound` in place; do not
  delete `createUserLocationIcon`; do not add Capacitor imports here.
  Pulse-marker mount + accuracy `Circle` belong to plan 001.
- `src/utils/routing.ts`, `src/utils/distance.ts`, `src/utils/geocoding.ts`,
  `src/utils/persian.ts` — web map logic stays 100% as-is
- `src/types.ts` — do not add a new exported type; `UserPosition` lives in
  `src/utils/location.ts`
- Ionic Framework (`@ionic/react`, ion-header, ion-content, etc.)
- React Native / Expo rewrite
- Background location (`UIBackgroundModes: location`, Android
  `ACCESS_BACKGROUND_LOCATION`)
- Custom splash artwork / app icon redesign
- Nominatim / OSRM / OSM tile URL changes
- `plans/001-feature-completion.md` body (only the index status row for 002)
- Anything under `dist/` (build artifact; already gitignored)
- `npx cap open` as a required done-criterion (GUI; optional last step)

## Git workflow

- Branch: `advisor/002-capacitor-native-wrap`
- Commit per logical unit:
  1. Capacitor deps + `capacitor.config.ts` + vite `base` + scripts + gitignore
  2. `src/utils/location.ts` + App FAB wiring + toast (or 001 reuse)
  3. safe-area CSS + viewport + status-bar/splash init
  4. `npx cap add ios` / `android` + Info.plist + AndroidManifest
- Message style: descriptive imperative. Example: `Add Capacitor iOS and Android shells with native GPS`
- Do NOT push or open a PR unless the operator instructed it
- `ios/` and `android/` **are committed** (standard Capacitor). Do not
  gitignore the whole native trees.

## Steps

### Step 1: Install Capacitor packages and write `capacitor.config.ts`

Install (core + plugins as runtime deps; CLI as devDependency):

```bash
npm install @capacitor/core @capacitor/geolocation @capacitor/status-bar @capacitor/splash-screen
npm install -D @capacitor/cli
```

Do **not** run interactive `npx cap init`. Write the config file yourself
so the appId/appName/webDir cannot be prompted wrong.

Create `capacitor.config.ts` at the repo root:

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.iranmap',
  appName: 'Iran Map App',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#e8e4e0',
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    },
  },
};

export default config;
```

Notes the executor must not "fix":

- Use `import type { CapacitorConfig }` — `verbatimModuleSyntax` will fail
  on `import { CapacitorConfig }`.
- `appId` is `com.example.iranmap` (not `com.example.iranimap`).
- `webDir` is `"dist"` to match Vite's default `outDir`.
- `style: 'DARK'` means **dark status-bar icons** on a light map. Do not
  switch to `LIGHT` (white icons on OSM tiles).

Add `capacitor.config.ts` to `tsconfig.node.json` include:

```json
"include": ["vite.config.ts", "capacitor.config.ts"]
```

**Verify**: `npx cap --version` prints a 8.x version. `test -f capacitor.config.ts` succeeds. `node -e "import('./capacitor.config.ts').then(() => console.log('ok'))"` is optional; `npm run build` in Step 2 is the real typecheck.

### Step 2: Vite `base: './'` and npm scripts

In `vite.config.ts`, add `base: './'` next to the existing `plugins` /
`server` keys (do not remove `host: '0.0.0.0'`):

```ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
```

In `package.json` `scripts`, **keep** existing `dev` / `build` / `lint` /
`preview` and **append**:

```json
"cap:build": "npm run build && npx cap copy",
"cap:sync": "npm run build && npx cap sync",
"cap:ios": "npm run cap:sync && npx cap open ios",
"cap:android": "npm run cap:sync && npx cap open android"
```

Deviation from the operator sketch (`"vite build && npx cap copy"`): use
`npm run build` so `tsc -b` still runs. Do not drop the typecheck.

**Verify**: `npm run build` exits 0. Then:

```bash
grep -n "base: './'" vite.config.ts
node -e "const p=require('./package.json'); ['cap:build','cap:sync','cap:ios','cap:android'].forEach(k => { if (!p.scripts[k]) { console.error('missing', k); process.exit(1); } }); console.log('scripts ok')"
```

Expected: `vite.config.ts` contains `base: './'`; stdout `scripts ok`.

### Step 3: Gitignore native junk, not the native projects

Append to `.gitignore` (do **not** add `ios/` or `android/` as directory
ignores):

```
# Capacitor / native local
*.local
android/local.properties
android/.gradle
android/app/build
android/build
android/captures
ios/App/Pods
ios/App/App.xcworkspace/xcuserdata
ios/DerivedData
```

`*.local` is already present — do not duplicate it. `dist` is already
ignored; Capacitor copies from `dist/` at build time, which is correct.

**Verify**: `grep -n '^ios/$' .gitignore` is empty. `grep -n 'local.properties' .gitignore` prints a hit.

### Step 4: Native GPS helper `src/utils/location.ts`

Create `src/utils/location.ts`. This is the **only** module that imports
`@capacitor/geolocation`. Match the named-export style of
`src/utils/geocoding.ts`.

```ts
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type UserPosition = {
  lat: number;
  lng: number;
  accuracy: number;
};

export const LOCATION_DENIED_MESSAGE =
  'دسترسی به موقعیت مکانی رد شد. لطفاً از تنظیمات دستگاه اجازه دهید.';

export const LOCATION_UNAVAILABLE_MESSAGE =
  'خدمات موقعیت‌یابی در دسترس نیست. لطفاً دسترسی GPS را بررسی کنید.';

export async function getUserPosition(): Promise<UserPosition> {
  if (Capacitor.isNativePlatform()) {
    const current = await Geolocation.checkPermissions();
    if (current.location !== 'granted') {
      const requested = await Geolocation.requestPermissions();
      if (requested.location !== 'granted') {
        throw new Error(LOCATION_DENIED_MESSAGE);
      }
    }
  }

  try {
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (/denied|permission/i.test(msg)) {
      throw new Error(LOCATION_DENIED_MESSAGE);
    }
    throw new Error(LOCATION_UNAVAILABLE_MESSAGE);
  }
}
```

On the **web** (`Capacitor.isNativePlatform() === false`) skip the
Capacitor permission calls and let `getCurrentPosition` use the browser
Geolocation plugin fallback — that preserves the current web path without
`navigator.geolocation` scattered in components.

Do **not** call `watchPosition`. One-shot on FAB tap matches today's
`watch: false`.

**Verify**:

```bash
grep -n "getUserPosition" src/utils/location.ts
grep -n "navigator.geolocation" src/utils/location.ts || true
```

Expected: `getUserPosition` is defined; `navigator.geolocation` has no hits
in that file.

### Step 5: Wire the location FAB in `src/App.tsx`

Replace **only** the FAB `onClick` that calls `map.locate`. Keep the
"if we already have a location, just flyTo" branch.

Import:

```ts
import { getUserPosition, LOCATION_UNAVAILABLE_MESSAGE } from './utils/location';
```

If `useEffect` is not already imported (001 not landed), extend the react
import to `import { useState, useCallback, useRef, useEffect } from 'react';`
and add `AlertCircle` to the lucide-react import.

**Branch A — 001 not landed (current HEAD):**

1. Keep `userLocation` as `{ lat: number; lng: number } | null` **or**
   widen it inline to include `accuracy: number`. Extra `accuracy` is
   structurally compatible with ControlPanel's `{ lat: number; lng: number }`.
   Prefer widening so the helper's return type assigns cleanly:

```ts
const [userLocation, setUserLocation] = useState<{
  lat: number;
  lng: number;
  accuracy: number;
} | null>(null);
const [locationError, setLocationError] = useState<string | null>(null);
```

2. Auto-dismiss:

```ts
useEffect(() => {
  if (!locationError) return;
  const t = setTimeout(() => setLocationError(null), 4000);
  return () => clearTimeout(t);
}, [locationError]);
```

3. Toast **below the mode toggle**, same classes plan 001 specified so the
   two plans do not diverge if 001 lands later:

```tsx
{locationError && (
  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-red-500/90 text-white px-5 py-3 rounded-xl text-sm font-medium backdrop-blur-sm flex items-center gap-2">
    <AlertCircle size={16} />
    {locationError}
  </div>
)}
```

Place it after the mode toggle, before the location FAB. Do **not** put it
at `bottom-*` (collides with FABs and the measure hint).

**Branch B — 001 already landed:** reuse `locationError` / `handleUserLocation`
/ existing toast. Do not render a second toast. Do not add a second
`useEffect` timer.

**Both branches — FAB onClick** (replace the `map.locate` call):

```ts
onClick={() => {
  if (userLocation) {
    flyTo(userLocation.lat, userLocation.lng, 15);
    return;
  }
  void (async () => {
    try {
      const loc = await getUserPosition();
      setUserLocation(loc);
      setLocationError(null); // no-op-safe if 001's handleUserLocation already clears
      flyTo(loc.lat, loc.lng, 15);
    } catch (e) {
      setLocationError(
        e instanceof Error ? e.message : LOCATION_UNAVAILABLE_MESSAGE
      );
    }
  })();
}}
```

If 001 already has `handleUserLocation`, call `handleUserLocation(loc)`
instead of `setUserLocation(loc)`.

Do **not** push the result into `waypoints`. User location stays a separate
overlay (plan 001 mounts the pulse marker from `userLocation` props; this
plan does not mount it).

After splash hide we need Leaflet to recapture the WebView size. Add this
`useEffect` in App (imports `Capacitor` from `@capacitor/core`):

```ts
useEffect(() => {
  const id = window.setTimeout(() => {
    mapRef.current?.invalidateSize();
  }, 300);
  return () => window.clearTimeout(id);
}, []);
```

This is safe on web (no-op-ish resize) and required on native after the
splash overlay drops.

**Verify**:

```bash
grep -n "mapRef.current?.locate" src/App.tsx || true
grep -n "getUserPosition" src/App.tsx
grep -n "locationError" src/App.tsx
```

Expected: `mapRef.current?.locate` has **no** hits in `src/App.tsx`;
`getUserPosition` and `locationError` each have at least one hit.

### Step 6: Viewport, overscroll, tap highlight, safe-area padding

**`index.html`** — replace the viewport meta (keep every other tag):

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**`src/index.css`** — extend the existing `html, body, #root` block; add
leaflet-top offset. Do not delete pulse-marker / waypoint-marker rules.

```css
html, body, #root {
  width: 100%;
  height: 100vh;
  overflow: hidden;
  font-family: 'Vazirmatn', 'Tahoma', sans-serif;
  direction: rtl;
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
}

.leaflet-top {
  margin-top: env(safe-area-inset-top);
}
```

**`src/components/SearchBar.tsx`** — the outer wrapper is currently
`absolute top-4 right-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)]`.
Change `top-4` to a safe-area calc. Keep `right-4` and the max-width:

```tsx
<div
  ref={containerRef}
  className="absolute right-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)]"
  style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}
>
```

**`src/App.tsx` overlays** — same inset, do not switch them to Ionic FABs:

| Overlay | Current class | New positioning |
|---------|---------------|-----------------|
| Mode toggle | `absolute top-4 left-1/2 -translate-x-1/2 ...` | drop `top-4`; add `style={{ top: 'calc(1rem + env(safe-area-inset-top, 0px))' }}` |
| Location FAB | `absolute bottom-6 left-6 ...` | drop `bottom-6`; add `style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}` |
| Clear-all FAB | `absolute bottom-6 left-[68px] ...` | same bottom calc, keep `left-[68px]` |
| Measure hint | `absolute bottom-20 left-1/2 ...` | drop `bottom-20`; add `style={{ bottom: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }}` |

Keep every other class (`z-[1000]`, colors, rounded-full, etc.).

If 001 added a floating summary card at `bottom-6`, give it the same
`calc(1.5rem + env(safe-area-inset-bottom, 0px))` bottom. If that card is
absent, do not create it.

**`src/components/ControlPanel.tsx`** — the header is
`px-5 pt-5 pb-3 border-b border-gray-100`. Change `pt-5` so the title
clears the status bar / Dynamic Island. Minimal change:

```tsx
<div
  className="px-5 pb-3 border-b border-gray-100"
  style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top, 0px))' }}
>
```

Do not restyle the rest of the sidebar. Do not change waypoint label copy.

**Verify**:

```bash
grep -n "viewport-fit=cover" index.html
grep -n "overscroll-behavior-y: none" src/index.css
grep -n "safe-area-inset-top" src/components/SearchBar.tsx src/App.tsx src/components/ControlPanel.tsx src/index.css
grep -n "safe-area-inset-bottom" src/App.tsx
```

Expected: each grep prints at least one hit.

### Step 7: Native status bar + splash on launch (`src/main.tsx`)

Keep StrictMode / `createRoot`. Add a native chrome init that is a no-op
on web:

```ts
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App'

async function initNativeChrome() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await StatusBar.setOverlaysWebView({ overlay: true })
    await StatusBar.setStyle({ style: Style.Dark })
    await SplashScreen.hide()
  } catch {
    // Plugin absent in some web previews — never crash boot
  }
}

void initNativeChrome()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

Do not `await` init before `createRoot` — the map should mount immediately;
status bar overlay catching up a tick later is fine.

**Verify**: `grep -n "setOverlaysWebView" src/main.tsx` prints a hit.
`npm run lint` exits 0. `npm run build` exits 0.

### Step 8: Add iOS and Android platforms

`npx cap add` requires `webDir` (`dist/`) to exist.

```bash
npm run build
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
```

STOP and report (do not invent a Cordova project, do not skip committing
the JS-side work) if:

- `cap add ios` fails because Xcode / `xcodebuild` / CocoaPods (`pod`) is missing
- `cap add android` fails because JDK is missing

In that case: leave a note in the plan status (`BLOCKED: cap add <platform>
failed: <stderr line>`), but still finish Steps 1–7 and the gitignore.
Do **not** hand-write a fake `ios/` or `android/` tree.

After a successful add:

**iOS** — open `ios/App/App/Info.plist`. If the path is not that
(Capacitor 8 layout drift), STOP and report the actual path. Add these
keys if missing (do not remove existing Capacitor keys like
`CFBundleDisplayName` / `UIMainStoryboardFile`):

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>برای نمایش موقعیت شما روی نقشه و محاسبه فاصله‌ها به دسترسی مکان نیاز است.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>برای مسیریابی و سنجش فاصله به دسترسی مکان نیاز است.</string>
```

Do **not** add `UIBackgroundModes` → `location`. Always-and-when-in-use
is a usage **string** only; JS still requests when-in-use.

**Android** — open `android/app/src/main/AndroidManifest.xml`. Inside
`<manifest>`, before `<application>`, ensure:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

The Geolocation plugin may already have merged these. If they exist, do
not duplicate. Do **not** add `ACCESS_BACKGROUND_LOCATION`.

Then:

```bash
npx cap sync
```

**Verify**:

```bash
test -d ios && test -d android && echo 'platforms ok'
grep -n "NSLocationWhenInUseUsageDescription" ios/App/App/Info.plist
grep -n "ACCESS_FINE_LOCATION" android/app/src/main/AndroidManifest.xml
grep -n "ACCESS_BACKGROUND_LOCATION" android/app/src/main/AndroidManifest.xml || true
```

Expected: `platforms ok`; both permission greps hit; background location
grep is empty.

Optional GUI (not a done criterion): `npx cap open ios` / `npx cap open android`.

### Step 9: Final web verification

From repo root:

```bash
npm run lint
npm run build
```

Both must exit 0.

```bash
grep -R "mapRef.current?.locate" src/ || true
grep -R "@ionic/" src package.json || true
grep -n "from '@capacitor/geolocation'" src/utils/location.ts
```

Expected: no `map.locate` in `src/`; no `@ionic/` in src/package.json;
geolocation import lives only in `src/utils/location.ts`.

```bash
git status --short
```

Expected: only in-scope paths (plus lockfile, `ios/`, `android/`). No
edits to `src/components/MapView.tsx`, `src/utils/routing.ts`,
`src/utils/geocoding.ts`.

## Test plan

There is no test runner (`package.json` has no `test` script, no Vitest /
Jest). Do **not** add one.

Characterization without a runner:

1. `npm run lint` — exit 0
2. `npm run build` — `tsc -b` + vite succeed; `dist/index.html` contains
   `viewport-fit=cover` (Vite copies `index.html`)
3. Greps in Done criteria
4. Optional manual:
   - `npm run dev` — web map still loads at http://localhost:5173; location
     FAB still works in the browser (Chrome geolocation prompt)
   - If Xcode is available: `npm run cap:ios`, grant location, confirm the
     system dialog shows the Persian When-In-Use string, then the map flies
     to the user. Deny once and confirm the red toast under the mode toggle.
   - Rotate the simulator: map still fills the WebView (`invalidateSize`)
   - Search bar / mode toggle sit below the Dynamic Island; FABs sit above
     the home indicator

No new `*.test.ts` files.

## Done criteria

Machine-checkable. ALL must hold (skip the native-tree bullets only if
Step 8 STOPped on missing Xcode/JDK and the index row is `BLOCKED`):

- [ ] `npm run lint` exits 0
- [ ] `npm run build` exits 0
- [ ] `capacitor.config.ts` exists with `appId: 'com.example.iranmap'`,
      `webDir: 'dist'`, `server.androidScheme: 'https'`
- [ ] `vite.config.ts` has `base: './'`
- [ ] `package.json` scripts include `cap:build`, `cap:sync`, `cap:ios`,
      `cap:android`; `cap:build` / `cap:sync` go through `npm run build`
      (not bare `vite build`)
- [ ] `src/utils/location.ts` exports `getUserPosition`,
      `LOCATION_DENIED_MESSAGE`, `LOCATION_UNAVAILABLE_MESSAGE`
- [ ] `grep -R "mapRef.current?.locate" src/` is empty
- [ ] `grep -R "navigator.geolocation" src/` is empty
- [ ] `grep -R "@ionic/" src package.json` is empty
- [ ] `index.html` viewport includes `viewport-fit=cover`
- [ ] `src/index.css` has `overscroll-behavior-y: none` and
      `-webkit-tap-highlight-color: transparent`
- [ ] SearchBar, mode toggle, FABs, ControlPanel header use
      `env(safe-area-inset-*)`
- [ ] `src/main.tsx` calls `StatusBar.setOverlaysWebView({ overlay: true })`
      gated on `Capacitor.isNativePlatform()`
- [ ] `ios/App/App/Info.plist` has `NSLocationWhenInUseUsageDescription`
      with the Persian string from Step 8
- [ ] `android/app/src/main/AndroidManifest.xml` has `ACCESS_FINE_LOCATION`
      and `ACCESS_COARSE_LOCATION`, and does **not** have
      `ACCESS_BACKGROUND_LOCATION`
- [ ] `src/components/MapView.tsx` and `src/utils/routing.ts` are unmodified
      vs the drift-check baseline (unless 001 changed MapView — then only
      001's diff, not yours)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row for 002 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The code at the locations in "Current state" doesn't match the excerpts
  **and** the mismatch is not the documented plan-001 GPS toast / accuracy
  shape.
- A Capacitor package resolves to major version 9+ (APIs in this plan are
  8.x).
- `npx cap add ios` or `npx cap add android` fails twice (missing Xcode,
  CocoaPods, JDK). Leave Steps 1–7 in place; mark 002 BLOCKED with the
  stderr line; do not fabricate native folders.
- `ios/App/App/Info.plist` does not exist after a successful `cap add ios`
  (layout changed) — report the real path, do not guess.
- The fix appears to require editing `src/components/MapView.tsx`,
  `src/utils/routing.ts`, or adding `@ionic/*`.
- You are tempted to set `server.url` to a LAN Vite URL in
  `capacitor.config.ts` (live-reload). That is a local-dev-only follow-up,
  not this plan — shipping a `server.url` in committed config points the
  production app at the executor's machine.
- `verbatimModuleSyntax` errors on `import { CapacitorConfig }` — the
  correct fix is `import type`, not turning the flag off.
- Plan 001 is in progress on the same branch and you would clobber an
  uncommitted MapView/App.tsx edit. Rebase/sequence; do not merge the GPS
  stacks.

## Maintenance notes

- **Future 001 execution**: do not restore `map.locate()` on the FAB. Mount
  the pulse marker + accuracy `Circle` from `userLocation` (now includes
  `accuracy` from Capacitor). Reuse the toast already in App.
- **Leaflet + WebView**: any new full-screen overlay (modal, keyboard)
  should call `mapRef.current?.invalidateSize()` when it closes.
- **OSM / Nominatim / Google Fonts / unpkg Leaflet CSS** still load over
  the network inside the WebView. Offline tiles are a separate plan.
- **Reviewer should check**: `base: './'` is present (native white-screen
  if missing); no committed `server.url`; no background-location
  permission; GPS is only imported from `src/utils/location.ts`; Persian
  plist strings are the ones in Step 8, not English placeholders; ControlPanel
  / SearchBar visual language is unchanged aside from inset padding.
- **Follow-up deferred**: custom splash/icon, live-reload `server.url` for
  local native debug, vendor Vazirmatn + Leaflet CSS for true offline,
  App Store / Play signing.
- After adding a new Capacitor plugin, run `npx cap sync` (not just
  `cap copy`) so iOS pods and Android gradle register it.

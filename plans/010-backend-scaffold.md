# Plan 010: Scaffold the AminTajeran Express + MongoDB API

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 74e575f..HEAD -- plans/README.md mobile/ webapp/ amin-tajeran-features-roadmap-v5.md`
> This plan creates a **new** `backend/` tree. If `backend/` already exists
> at HEAD, STOP. If `mobile/` or `webapp/` changed in ways that affect CORS
> origins or ports named in this plan, re-read those files before proceeding.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none (plans 001–009 are the map prototype; this starts the AminTajeran platform)
- **Category**: direction
- **Planned at**: commit `74e575f`, 2026-09-02

## Why this matters

`amin-tajeran-features-roadmap-v5.md` is the product: a cargo logistics
platform (users, cargo owners, drivers, tracking, admin). The repo today is
only a map prototype:

- `webapp/` — Vite + React 19 + Leaflet (Persian RTL, Nominatim, OSRM)
- `mobile/` — Expo 57 + MapLibre v11 (same logic, Google Maps-style UI)
- **No `backend/` directory. No database. No auth. No API.**

Phase 1 of the roadmap cannot start until there is a place for data to live.
This plan is the **first sequential slice**: a thin Express + MongoDB process
with a health check and a Jest baseline. It does **not** implement login,
users, cargo, or any mobile/webapp wiring. Those are later plans that hang
off this scaffold.

## Current state

Repo layout at `74e575f`:

```
iran-map/
  amin-tajeran-features-roadmap-v5.md   ← product RFP (Phase 1 + Phase 2)
  webapp/                               ← Vite map (port 5173)
  mobile/                               ← Expo map (no API client)
  plans/                                ← 001–009 DONE (map work)
```

There is no `backend/` path. Confirm before starting:

```bash
ls backend 2>/dev/null || echo 'no backend dir'
```

Expected: `no backend dir`.

**Webapp port** (`webapp/vite.config.ts`):

```ts
server: {
  host: '0.0.0.0',
  port: 5173,
},
```

**Mobile** (`mobile/package.json`) has no HTTP client, no API base URL, no
auth. GPS is one-shot via `expo-location` (`mobile/src/hooks/useUserLocation.ts`).
Search hits Nominatim directly (`mobile/src/utils/geocoding.ts`). Routing hits
OSRM directly (`mobile/src/utils/routing.ts`). Leave all of that alone.

**Root `.gitignore`** currently ignores `node_modules` and `*.local` but **does
not ignore `.env`**. This plan adds `.env` so a future `backend/.env` cannot
be committed.

**Roadmap items this plan does NOT implement** (do not start them):

- User registration / login / profile (Phase 1 §1)
- Cargo registry, origin/destination, dimensions (Phase 1 §2)
- Driver registration / vehicles / documents (Phase 1 §3)
- Admin panel (Phase 1 §5)
- Push / SMS / payments (Phase 2)
- Map API proxy for Nominatim/OSRM

**Verification baseline today**: webapp `npm run build` / `npm run lint`;
mobile `npx tsc --noEmit` / `npx expo lint`. No Jest anywhere in this repo.
This plan introduces the first test runner, in `backend/` only.

## Commands you will need

Run from the **repo root** unless a step says `cd backend`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm no backend yet | `ls backend 2>/dev/null \|\| echo 'no backend dir'` | `no backend dir` |
| Install | `cd backend && npm install` | exit 0 |
| Unit tests | `cd backend && npm test` | exit 0, health tests pass |
| Load app module | `cd backend && node -e "require('./src/app'); console.log('ok')"` | prints `ok` |
| Typecheck/lint mobile (must stay green, untouched) | `cd mobile && npx tsc --noEmit` | 0 errors |
| Lint webapp (must stay green, untouched) | `cd webapp && npm run lint` | exit 0 |

Do **not** run `npm install` at the repo root. There is no root `package.json`.

If `mongodb-memory-server` hangs on startup (common on this machine), export
and retry:

```bash
export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod
```

If `/opt/homebrew/bin/mongod` is missing, STOP and report — do not download a
system MongoDB as part of this plan. Tests can wait; do not skip the test
step by deleting it.

## Scope

**In scope** (the only files you should create or modify):

- `backend/package.json`
- `backend/.env.example`
- `backend/.gitignore` (optional; root `.gitignore` is enough if `.env` is ignored globally)
- `backend/README.md`
- `backend/src/index.js`
- `backend/src/app.js`
- `backend/src/config/db.js`
- `backend/test/setup.js`
- `backend/test/globalSetup.js`
- `backend/test/globalTeardown.js`
- `backend/test/__tests__/health.test.js`
- `.gitignore` (add `.env` only)
- `plans/README.md` (status row for 010)

**Out of scope** (do NOT touch, even though they look related):

- `mobile/**` — map app stays as-is. No API client, no env, no fetch to localhost.
- `webapp/**` — same.
- `amin-tajeran-features-roadmap-v5.md` — product spec, not code.
- Any User / Cargo / Driver / Shipment Mongoose model.
- Auth (JWT, sessions, OTP, Firebase, cookies).
- `cookie-parser`, Redis, BullMQ, Firebase Admin, Stripe, rate-limit, OpenAPI export.
- Docker / docker-compose.
- TypeScript for the backend (this scaffold is CommonJS JS, matching the
  operator's production Express apps).
- Proxying Nominatim or OSRM.
- Changing the map UI, RTL, or Expo config.

## Git workflow

- Branch: `advisor/010-backend-scaffold`
- Commit style (from this repo): `feat(010): scaffold Express Mongo API with health check`
  Earlier examples: `feat(009): redesign mobile UI to Google Maps layout`,
  `chore(009): mark plan DONE in index`
- One or two commits is enough (scaffold + tests, then index).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Confirm the tree and branch

```bash
git checkout -b advisor/010-backend-scaffold
ls backend 2>/dev/null || echo 'no backend dir'
git diff --stat 74e575f..HEAD -- plans/README.md mobile/ webapp/
```

**Verify**: `no backend dir`. If `backend/` exists, STOP.

### Step 2: Ignore secrets

Patch the repo-root `.gitignore`. Current file ends with editor junk and does
**not** list `.env`. Add these lines at the top of a new "Secrets" section
(keep the existing contents):

```
# Secrets
.env
```

**Verify**: `grep -n '^\.env$' .gitignore` prints a line number. Do not add
`backend/node_modules` separately — root already has `node_modules`.

### Step 3: Create `backend/package.json`

Create `backend/package.json` with this exact shape (pin majors; let npm
resolve patch versions):

```json
{
  "name": "amintajeran-api",
  "version": "0.1.0",
  "private": true,
  "description": "AminTajeran transportation platform API",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest --runInBand --forceExit"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "helmet": "^8.0.0",
    "mongoose": "^8.5.0"
  },
  "devDependencies": {
    "jest": "^29.7.0",
    "mongodb-memory-server": "^10.0.0",
    "nodemon": "^3.1.7",
    "supertest": "^6.3.4"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/test/__tests__/**/*.test.js"],
    "globalSetup": "./test/globalSetup.js",
    "globalTeardown": "./test/globalTeardown.js",
    "testTimeout": 30000
  }
}
```

Notes for the executor:

- **Port default is 4000**, not 5000, so it does not collide with a local
  XScheduler API on 5000.
- Jest uses `--runInBand --forceExit` because mongoose + memory Mongo otherwise
  hang the process (operator convention).
- Use **`MongoMemoryServer`**, not `MongoMemoryReplSet`. This scaffold has no
  multi-document transactions. Replica-set startup is slower and, on this
  machine, hangs unless `MONGOMS_SYSTEM_BINARY` is set.

**Verify**: file exists and `node -e "JSON.parse(require('fs').readFileSync('backend/package.json','utf8')); console.log('ok')"` prints `ok`.

### Step 4: Env example and README

Create `backend/.env.example` (no real credentials):

```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/amintajeran
NODE_ENV=development
```

Create `backend/README.md`:

```markdown
# amintajeran-api

Express + MongoDB API for the AminTajeran transportation platform.

## Run

cp .env.example .env
# start local mongod, then:
npm install
npm run dev
```

curl http://localhost:4000/health

## Test

npm test

If mongodb-memory-server hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod`

This package is the platform backend. The map UIs in `../webapp` and
`../mobile` are not wired to it yet.
```

Do **not** create `backend/.env` in git. The executor may copy `.env.example`
to `.env` locally for a manual smoke; leave `.env` untracked.

**Verify**: `git check-ignore -v backend/.env` after creating a throwaway
`backend/.env` should match the root `.env` rule. Delete the throwaway
`.env` if you created one so it never gets committed (`git status` must not
show it).

### Step 5: Database helper


```js
const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  try {
    await mongoose.connect(uri);
    // eslint-disable-next-line no-console
    console.log('MongoDB connected');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('MongoDB connection error', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
```

`process.exit(1)` on connect failure is intentional for `npm start` / `npm run
dev`. Tests never call `connectDB()` — they use `mongoose.connect` in
`test/setup.js`.

**Verify**: `cd backend && node -e "require('./src/config/db'); console.log('ok')"` → `ok`.

### Step 6: Express app (no listen)

Create `backend/src/app.js`. The app is a factory so tests can
`request(createApp())` without binding a port.

```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const pkg = require('../package.json');

function createApp() {
  const app = express();

  app.use(helmet());
  // Permissive CORS for local Expo + Vite. A later plan will lock origins
  // to an allowlist once auth cookies exist.
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', async (req, res) => {
    let mongo = 'disconnected';
    let healthy = false;
    try {
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.db.admin().ping();
        mongo = 'ok';
        healthy = true;
      }
    } catch {
      mongo = 'error';
    }

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'amintajeran-api',
      version: pkg.version,
      checks: { mongo },
    });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  return app;
}

module.exports = { createApp };
```

Hard requirements:

- Health lives at **`GET /health`**, not `/api/health`, so it stays off any
  future `/api` rate limiter (same split as XScheduler).
- JSON body cap is **100kb**. Do not raise it "just in case".
- `GET /api/*` currently 404s with `{ error: 'not_found' }`. That is the
  placeholder for later route mounts. Do not invent `/api/users` here.
- Do not add `app.listen` in this file.

**Verify**: `cd backend && node -e "const { createApp } = require('./src/app'); const a = createApp(); console.log(typeof a.listen === 'function' ? 'ok' : 'fail')"` → `ok`.

### Step 7: Process entrypoint

Create `backend/src/index.js`:

```js
require('dotenv').config();
const { createApp } = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

async function main() {
  await connectDB();
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`amintajeran-api listening on ${PORT}`);
  });
}

if (require.main === module) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
}

module.exports = { main };
```

`if (require.main === module)` keeps `jest` / `require('./src/index')` from
listening and from calling `process.exit` via `connectDB`.

**Verify**: `cd backend && node -e "require('./src/index'); console.log('ok')"` prints `ok` and **does not** hang or bind a port. If it hangs, you
dropped the `require.main` guard — fix before continuing.

### Step 8: Jest harness

Create `backend/test/globalSetup.js`:

```js
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  process.env.NODE_ENV = 'test';
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  global.__MONGOD__ = mongod;
};
```

Create `backend/test/globalTeardown.js`:

```js
module.exports = async function globalTeardown() {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
  }
};
```

Create `backend/test/setup.js`:

```js
const mongoose = require('mongoose');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});
```

**Every new test file in this package MUST start with** `require('../setup');`
as its first statement. Without it, mongoose buffers and times out. This is
the same rule as XScheduler's `backend/test/setup.js`.

Create `backend/test/__tests__/health.test.js`:

```js
require('../setup');
const request = require('supertest');
const { createApp } = require('../../src/app');

describe('GET /health', () => {
  const app = createApp();

  it('returns 200 and mongo ok when connected', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('amintajeran-api');
    expect(res.body.checks.mongo).toBe('ok');
  });

  it('returns 404 JSON for unknown /api routes', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not_found' });
  });
});
```

**Verify (install + test)**:

```bash
cd backend && npm install && npm test
```

Expected: Jest runs 2 tests, both pass, exit 0.

If memory-server hangs more than ~60s, set `MONGOMS_SYSTEM_BINARY` as in
Commands and retry **once**. Second failure → STOP.

### Step 9: Do not wire clients; confirm they are untouched

```bash
git status --short
```

**Verify**:

- New files are only under `backend/`, plus `.gitignore` and `plans/README.md`.
- `mobile/` and `webapp/` are absent from `git status`.
- `cd mobile && npx tsc --noEmit` still exits 0.
- `cd webapp && npm run lint` still exits 0.

Optional local smoke (not required if mongod is not running):

```bash
cd backend && cp .env.example .env
# only if mongod is already listening on 27017:
npm start
# in another shell:
curl -sS http://localhost:4000/health
```

Expected JSON includes `"status":"ok"` and `"checks":{"mongo":"ok"}`. If mongod
is not running, skip this smoke — unit tests already cover the handler. Do not
install MongoDB as part of this plan.

### Step 10: Commit and mark the plan done

```bash
git add backend .gitignore plans/README.md
git status
git commit -m "feat(010): scaffold Express Mongo API with health check"
```

Then set this plan's row in `plans/README.md` to `DONE`.

**Verify**: `git log -1 --oneline` mentions `010`. `git status` is clean on
the branch aside from any local `backend/.env` (which must stay untracked).

## Test plan

- New file: `backend/test/__tests__/health.test.js`
- Cases:
  1. `GET /health` → 200, `status=ok`, `checks.mongo=ok` when mongoose is connected.
  2. `GET /api/does-not-exist` → 404 `{ error: 'not_found' }`.
- Structural pattern: XScheduler `require('../setup')` + supertest against an
  exported app (do **not** import XScheduler tests into this repo).
- Verification: `cd backend && npm test` → 2 passed.

A disconnected-mongo 503 case is **not** required in this plan. Forcing
`mongoose.disconnect()` mid-file races the shared setup `afterAll`. Leave it.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `backend/` exists with the files listed in Scope
- [ ] `cd backend && npm test` exits 0 (2 health tests)
- [ ] `cd backend && node -e "require('./src/app'); require('./src/index'); console.log('ok')"` prints `ok` and returns
- [ ] `GET /health` is registered in `backend/src/app.js` (grep `app.get('/health'`)
- [ ] No User/Cargo/Driver/Shipment model files exist (`ls backend/src/models 2>/dev/null` is empty or the dir does not exist)
- [ ] `grep -R "firebase\\|bullmq\\|ioredis\\|stripe" backend/src backend/package.json` has no matches
- [ ] `.gitignore` contains a `.env` rule; `git check-ignore -q backend/.env` would succeed if that file existed
- [ ] `git status` shows no modifications under `mobile/` or `webapp/`
- [ ] `plans/README.md` status row for 010 is `DONE`

## STOP conditions

Stop and report back (do not improvise) if:

- `backend/` already exists at HEAD with an app in it.
- `mongodb-memory-server` cannot start after one `MONGOMS_SYSTEM_BINARY` retry.
- You believe the backend should be TypeScript, use Firebase, or live inside
  `mobile/` — those are rejected for this plan; do not switch stacks.
- A step seems to require editing `mobile/` or `webapp/` to "finish" the API.
- You are about to add a User model, JWT, OTP, or cargo schema "while you're here".
- `npm install` in `backend/` fails with a permissions error on `~/.npm` —
  retry once with `npm install --cache /tmp/npm-cache`; if that fails, STOP.

## Maintenance notes

- Later plans mount routers at `/api/...` in `src/app.js` (or `src/index.js`
  after `createApp()`). Keep `/health` outside `/api`.
- CORS is permissive (`origin: true`) **only** because there are no cookies
  yet. The auth plan must replace this with an explicit allowlist
  (`http://localhost:5173`, Expo dev origins) and `credentials: true`.
- `express.json({ limit: '100kb' })` will be too small for document-upload
  plans; those should use multer on specific routes, not a raised global cap.
- Do not introduce Redis/BullMQ until a job actually needs a queue
  (notifications, GPS stream). Health should stay Mongo-only until then.
- Default port 4000 is part of the public local-dev contract. If a later plan
  changes it, update `backend/.env.example` and `backend/README.md` together.
- Follow-ups explicitly deferred: phone OTP auth, cargo draft model, admin
  panel, Docker Compose, map-API proxy, wiring Expo/Vite to this server.

# Plan 014: Add phone OTP register/login against the 011 User model

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 3bda2c7..HEAD -- backend/src/app.js backend/src/index.js backend/src/models/User.js backend/package.json backend/.env.example backend/test/__tests__/health.test.js resources/features-roadmap.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
> Planned-at SHA is a hint, not a hard STOP. Real gates: `backend/src/models/User.js` exists with `phone` + `phoneVerifiedAt` (011 present), `backend/src/app.js` still has the `/api` 404 placeholder (no auth routes yet), and `Cargo.schema.path('transportMode')` is defined (013 present). Do not STOP just because the advisor branch was merged.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: plans/011-phase1-mongo-models.md (DONE — User exists), plans/013-cargo-transport-mode.md (DONE — not a code dep; just the previous sequential slice)
- **Category**: direction
- **Planned at**: commit `3bda2c7`, 2026-09-03

## Why this matters

V6 Phase 1 §1 still has no HTTP surface:

- **User registration** — register on the platform
- **User login** — secure sign-in for registered users

The 011 `User` already has Iran-first identity (`phone` unique, `phoneVerifiedAt` nullable). There is still **no `/api` route except a 404 placeholder**, no session, no JWT, no OTP. The next cargo-CRUD and driver slices cannot attach an owner without a current user.

V6 parked the **SMS gateway + "User login authentication via SMS Phone OTP"** in Phase 2 §9. That means this plan must **not** integrate Kavenegar / Twilio / any SMS provider. The product still needs a working register/login loop for Phase 1 booking, so the OTP **channel is a pluggable sender**:

- default in `test` / `development`: log the code (never return it in the HTTP body)
- `OTP_FIXED_CODE` env (dev/test only) so Jest and local curl can verify without reading logs
- production-shaped hook (`sendOtp({ phone, code })`) that logs phone-only in production (no SMS SDK). A later Phase 2 SMS plan replaces this function body.

This plan is **auth HTTP + OTP store + JWT bearer middleware only**. It does not add cargo CRUD, driver onboarding, cookies, CORS lock-down, or mobile wiring.

## Current state

Repo layout at plan time (`3bda2c7` on `main`):

```
iran-map/
  resources/features-roadmap.md   ← V6 canonical checklist
  resources/RFP.pdf
  backend/src/app.js              ← health + /api 404 placeholder
  backend/src/models/User.js      ← phone + phoneVerifiedAt, no otpHash
  backend/src/models/Cargo.js     ← transportMode from 013
  mobile/                         ← Expo map; not wired to the API
  plans/                          ← 001–013 DONE
```

`backend/src/app.js` today (full file — 44 lines). There is **no** auth router:

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
      service: 'baryar-api',
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

`backend/src/models/User.js` today (identity only — do **not** add `otpHash` / `password` / `firebaseUid` here):

```js
const mongoose = require('mongoose');

const ROLES = ['cargo_owner', 'driver', 'admin'];
const STATUSES = ['active', 'blocked', 'deleted'];

const userSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, trim: true, minlength: 10, maxlength: 16 },
    name: { type: String, default: '', trim: true },
    email: { type: String, default: '', trim: true, lowercase: true },
    nationalId: { type: String, default: '', trim: true },
    roles: {
      type: [String],
      enum: ROLES,
      default: () => ['cargo_owner'],
      validate: {
        validator(v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: 'roles must contain at least one role',
      },
    },
    status: { type: String, enum: STATUSES, default: 'active' },
    phoneVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.index({ phone: 1 }, { unique: true });
userSchema.index({ roles: 1, status: 1 });

userSchema.statics.ROLES = ROLES;
userSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('User', userSchema);
```

`backend/.env.example` today:

```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/baryar
NODE_ENV=development
```

`backend/package.json` dependencies today: `cors`, `dotenv`, `express`, `helmet`, `mongoose`. **No** `jsonwebtoken`, `bcryptjs`, `express-rate-limit`, `cookie-parser`. Tests: Jest + `supertest` + `mongodb-memory-server` (`MongoMemoryServer`, **not** ReplSet). Script: `npm test` = `jest --runInBand --forceExit`. Every test file **first line** `require('../setup');`.

Health test (`backend/test/__tests__/health.test.js`) still asserts the `/api` 404 placeholder:

```js
it('returns 404 JSON for unknown /api routes', async () => {
  const res = await request(app).get('/api/does-not-exist');
  expect(res.status).toBe(404);
  expect(res.body).toEqual({ error: 'not_found' });
});
```

That test must **keep passing** after this plan — unknown `/api/*` still 404s. Known `/api/auth/*` and `/api/me` become real.

V6 bullets this plan covers (`resources/features-roadmap.md`):

```
Phase 1 §1
*   **User registration**
*   **User login**

Phase 2 §9 (do NOT implement the gateway)
*   **SMS Gateway API integration**
*   **User login authentication via SMS Phone OTP**
```

Phase 1 §1 also lists "User information management" / "Profile management". This plan only returns the current user from `GET /api/me` (read). Profile PATCH is a later slice.

Roadmap items this plan does **not** implement:

- Cargo registry / origin-destination / dimensions (Phase 1 §2)
- Driver / vehicle / documents (Phase 1 §3)
- Admin panel (Phase 1 §5)
- CORS origin allowlist (010 deferred until cookies exist; this plan uses Bearer JWT, not cookies)
- Push / SMS provider / payments / KYC (Phase 2)
- Mobile Expo screens, SecureStore, API client

## Commands you will need

Run from the **repo root** unless a step says `cd backend`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Drift check | `git diff --stat 3bda2c7..HEAD -- backend/src/app.js backend/src/index.js backend/src/models/User.js backend/package.json backend/.env.example backend/test/__tests__/health.test.js resources/features-roadmap.md` | empty, or only unrelated later commits — re-read excerpts if not empty |
| Confirm User exists | `cd backend && node -e "const U=require('./src/models/User'); console.log(!!U.schema.path('phone'), !!U.schema.path('phoneVerifiedAt'), !!U.schema.path('otpHash'))"` | `true true false` |
| Confirm no auth routes | `cd backend && node -e "const {createApp}=require('./src/app'); const a=createApp(); console.log('ok')"` | prints `ok` |
| Install | `cd backend && npm install` | exit 0 |
| Syntax | `cd backend && node -c src/app.js && node -c src/middleware/auth.js && node -c src/routes/auth.js && node -c src/services/otpService.js && node -c src/models/OtpChallenge.js` | exit 0 |
| Unit tests | `cd backend && npm test` | exit 0, health + identity + cargo + new auth tests pass |
| Unknown /api still 404 | covered by existing `health.test.js` | 404 `{ error: 'not_found' }` |

Do **not** run `npm install` at the repo root. There is no root `package.json`.

If `mongodb-memory-server` hangs on startup (common on this machine), export and retry:

```bash
export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod
```

If `/opt/homebrew/bin/mongod` is missing, STOP and report — do not download a system MongoDB as part of this plan.

## Suggested executor toolkit

- Skills (if available): `amintajeran-project` (repo conventions), `node-backend-patterns` (rate-limit keyGenerator, error leakage), `mongoose-patterns` (no schema field named `id`; do not put `otpHash` on User).
- Product checklist: `resources/features-roadmap.md` Phase 1 §1 (registration/login) and Phase 2 §9 (SMS parked).
- Match Express bootstrap already in `backend/src/app.js`. Copy **patterns only** from `$HOME/projects/v5/backend` if you need a JWT `auth` middleware shape. Do **not** copy Firebase, cookies named `xs_auth_token`, billing, Redis, or BullMQ.

## Scope

**In scope** (the only files you should create or modify):

- `backend/package.json` (add `jsonwebtoken`, `bcryptjs`, `express-rate-limit`)
- `backend/package-lock.json` (from `npm install`)
- `backend/.env.example`
- `backend/src/app.js` (mount `/api/auth` **before** the `/api` 404 placeholder; add a small JSON error helper if needed)
- `backend/src/models/OtpChallenge.js` (new collection — **not** fields on User)
- `backend/src/utils/phone.js` (normalize Iranian numbers)
- `backend/src/services/otpService.js` (create / verify / send)
- `backend/src/middleware/auth.js` (Bearer JWT → `req.user`)
- `backend/src/routes/auth.js` (`POST /request-otp`, `POST /verify-otp`, `GET /me`)
- `backend/test/__tests__/auth.test.js` (new)
- `backend/test/__tests__/phone.test.js` (new, no Mongo needed but still `require('../setup')` as first line for consistency — or a pure unit file is fine **if** it still lives under `test/__tests__/` and starts with `require('../setup');`)
- `plans/README.md` (status row for 014)

**Out of scope** (do NOT touch, even though they look related):

- `backend/src/models/User.js` — do not add `otpHash`, `otpCode`, `password`, `firebaseUid`, `refreshToken`. `phone` + `phoneVerifiedAt` already exist.
- `backend/src/models/Cargo.js` / Vehicle / DriverProfile / Document / Offer / Shipment / ShipmentEvent / geoPoint.
- `mobile/**` — no Expo auth screen, no SecureStore, no API client.
- Recreating `webapp/`.
- Cookies / `cookie-parser` / CORS origin allowlist. 010 left CORS `origin: true` until cookies exist. This plan uses `Authorization: Bearer`. A later plan may add cookies and then lock CORS.
- SMS provider SDKs (Kavenegar, Twilio, Ghasedak, Melipayamak). Phase 2 §9.
- Refresh tokens, logout denylist, Redis, BullMQ.
- Profile PATCH, role upgrade to `driver` / `admin`, blocking users.
- Cargo CRUD, matching, admin shell.
- Firebase, Stripe, ioredis.
- Switching tests to `MongoMemoryReplSet`.
- Raising the 100kb JSON cap.
- Changing `/health`.

## Git workflow

- Branch: `advisor/014-phone-otp-auth`
- Commit style (from this repo): `feat(014): add phone OTP register and login`
  Earlier examples: `feat(013): add Cargo.transportMode enum`, `chore(013): mark plan DONE in index`
- Two commits is enough (implementation + tests, then index).
- Do NOT push or open a PR unless the operator instructed it.

## Product / design decisions (locked for this plan)

These are not open questions for the executor. Implement them as written.

1. **Phone is the identity.** Canonical stored form: E.164-ish `+98` + 10-digit national number, e.g. `09121234567` / `9121234567` / `+989121234567` / `00989121234567` all become `+989121234567`. Reject anything that does not normalize to `+98` + exactly 10 digits starting with `9` (Iran mobile). Length after normalize: 13 (`+98` + 10). User.phone minlength/maxlength is 10–16, so `+989121234567` (13) fits.
2. **Register and login are the same two endpoints.** `POST /api/auth/request-otp` always issues a challenge. `POST /api/auth/verify-otp` upserts the User (create with `roles: ['cargo_owner']` if missing) and sets `phoneVerifiedAt`. There is no separate `/register`. A blocked or deleted user must not get a token (`403` `{ error: 'account_blocked' }`).
3. **OTP lives in `OtpChallenge`, not on User.** Fields: `phone` (normalized), `codeHash`, `expiresAt`, `consumedAt` (null until used), `attemptCount`, `createdAt` via `{ timestamps: true }` (no extra `createdAt` field). Never store the plaintext code.
4. **Code format:** 6 digits, `crypto.randomInt(0, 1_000_000)` zero-padded. Hash with `bcryptjs` cost 8 (fast enough for tests; do not use 12 — Jest will time out).
5. **TTL:** 5 minutes. **Resend cooldown:** 60 seconds — if a non-consumed, non-expired challenge exists and was created < 60s ago, return `429` `{ error: 'otp_cooldown' }` without rotating the code. After 60s, invalidate previous unused challenges for that phone (`consumedAt = now`) and issue a new one.
6. **Verify lockout:** after 5 failed attempts on the current challenge, consume it and return `429` `{ error: 'otp_locked' }`. Wrong code on a live challenge: `401` `{ error: 'otp_invalid' }` and increment `attemptCount`. Expired / missing / already consumed: `401` `{ error: 'otp_invalid' }` (same message — do not leak which).
7. **Sender:** `otpService.sendOtp({ phone, code })`.
   - If `NODE_ENV === 'production'` and `OTP_FIXED_CODE` is set, **refuse to start the verify path with a fixed code** — treat `OTP_FIXED_CODE` as ignored in production (still generate random). Do not log the code in production.
   - If `OTP_FIXED_CODE` is a 6-digit string and `NODE_ENV !== 'production'`, use that string as the plaintext code (still hash it into the document). Tests set `OTP_FIXED_CODE=123456`.
   - Else generate random. In `development` or `test`, `console.log` a single line `otp sent { phone, code }` so local curl works. In production, if no SMS adapter is configured, still persist the challenge but `console.log` only `otp sent { phone }` **without** the code (Phase 2 will swap the body of `sendOtp`).
8. **JWT:** `jsonwebtoken` HS256. Payload `{ sub: userIdString, phone }`. Expiry `7d`. Secret from `JWT_SECRET`. If missing, `auth` middleware and `verify-otp` must fail closed (`500` `{ error: 'server_misconfigured' }` — do not fall back to `'secret'`). Tests set `JWT_SECRET=test-secret-do-not-use`.
9. **Bearer only.** `Authorization: Bearer <token>`. No cookies in this plan.
10. **`GET /api/me`** requires auth. Response shape (do not add extras):

```js
{
  user: {
    id: '<ObjectId string>',  // user._id.toString() — never a schema field named id
    phone: '+989121234567',
    name: '',
    email: '',
    roles: ['cargo_owner'],
    status: 'active',
    phoneVerifiedAt: '<ISO date>',
  }
}
```

11. **Error JSON** is `{ error: '<snake_case>' }` plus optional `message` only for 400 validation (`invalid_phone`). Do not send `err.message` from Mongo. Match the existing 404 `{ error: 'not_found' }`.
12. **Rate limit** `POST /api/auth/request-otp` and `POST /api/auth/verify-otp` with `express-rate-limit` v7: 10 requests / 15 minutes / IP. Key generator **must** use the library's `ipKeyGenerator` helper if you write a custom `keyGenerator`; a raw `req.ip` fallback throws `ERR_ERL_KEY_GEN_IPV6` at construction time. Simplest: do not pass a custom `keyGenerator` — the library default is fine. Skip limiter when `NODE_ENV === 'test'` so Jest is not flaky (check `process.env.NODE_ENV` at request time, not module load, because tests set it in `globalSetup`).
13. **Indexes:** unique is **not** wanted on `OtpChallenge.phone` (history of challenges). Index `{ phone: 1, createdAt: -1 }` and `{ expiresAt: 1 }` (plain index is enough; do not add Atlas TTL in this plan — expired rows can sit until a later cleanup job).
14. **2-space indent, CommonJS**, match `backend/src/app.js`. No TypeScript.

## Steps

### Step 1: Confirm the tree and branch

```bash
git checkout -b advisor/014-phone-otp-auth
git diff --stat 3bda2c7..HEAD -- backend/src/app.js backend/src/models/User.js backend/src/app.js
ls backend/src/models/User.js backend/src/app.js
```

**Verify**: `User.js` and `app.js` exist. `grep -n "otpHash\|jsonwebtoken\|/api/auth" backend/src -r` returns nothing (or only the CORS comment in `app.js`).

If `backend/src/models/User.js` is missing, STOP — execute 011 first.
If `backend/src/routes/` already exists with auth files, STOP and report.

### Step 2: Add dependencies and env example

```bash
cd backend
npm install jsonwebtoken bcryptjs express-rate-limit
```

Pin whatever current semver npm resolves (like 010 did). Do not add `cookie-parser`, `firebase-admin`, `twilio`, `ioredis`.

Append to `backend/.env.example` (keep existing three lines):

```
PORT=4000
MONGO_URI=mongodb://127.0.0.1:27017/baryar
NODE_ENV=development
JWT_SECRET=change-me
OTP_FIXED_CODE=123456
```

Comment in the file (one line each): `JWT_SECRET` is required to issue/verify tokens; `OTP_FIXED_CODE` is ignored when `NODE_ENV=production`.

**Verify**: `cd backend && node -e "require('jsonwebtoken'); require('bcryptjs'); require('express-rate-limit'); console.log('ok')"` → `ok`.

### Step 3: Phone normalizer (pure)

Create `backend/src/utils/phone.js`:

```js
function normalizeIranPhone(input) {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/[^\d]/g, '');
  let national = digits;
  if (digits.startsWith('0098')) national = digits.slice(4);
  else if (digits.startsWith('98')) national = digits.slice(2);
  if (national.startsWith('0')) national = national.slice(1);
  if (!/^9\d{9}$/.test(national)) return null;
  return `+98${national}`;
}

module.exports = { normalizeIranPhone };
```

**Verify**: `cd backend && node -e "const {normalizeIranPhone}=require('./src/utils/phone'); const c=[['09121234567','+989121234567'],['9121234567','+989121234567'],['+98 912 123 4567','+989121234567'],['00989121234567','+989121234567'],['02122001000',null],['+1-202-555-0100',null],['',null]]; for (const [i,e] of c) { const g=normalizeIranPhone(i); if (g!==e) { console.error(i,g,e); process.exit(1);} } console.log('ok')"` → `ok`.

### Step 4: OtpChallenge model

Create `backend/src/models/OtpChallenge.js`. Match 011 style (2-space, `{ timestamps: true }`, no field named `id`, no explicit `createdAt`).

Required fields:

- `phone` String required (store **already-normalized** `+98…`; the service normalizes before write)
- `codeHash` String required
- `expiresAt` Date required
- `consumedAt` Date default `null`
- `attemptCount` Number default `0` min `0`

Indexes:

```js
otpChallengeSchema.index({ phone: 1, createdAt: -1 });
otpChallengeSchema.index({ expiresAt: 1 });
```

Export: `module.exports = mongoose.model('OtpChallenge', otpChallengeSchema);` (default collection `otpchallenges` is fine — do not bikeshed a custom name).

**Verify**: `cd backend && node -c src/models/OtpChallenge.js` exits 0, and:

```bash
cd backend && node -e "const M=require('./src/models/OtpChallenge'); if (M.schema.path('id')) process.exit(1); if (!M.schema.path('codeHash')) process.exit(1); console.log('ok')"
```

→ `ok`.

### Step 5: OTP service

Create `backend/src/services/otpService.js`. Export:

```js
module.exports = {
  requestOtp,   // ({ phone }) → { ok: true }  (never returns the code)
  verifyOtp,    // ({ phone, code }) → { user, token } or throws named errors
};
```

Use a small error class or tagged Error so the route can map:

| thrown `code` / `err.code` | HTTP | body |
|----------------------------|------|------|
| `invalid_phone` | 400 | `{ error: 'invalid_phone' }` |
| `otp_cooldown` | 429 | `{ error: 'otp_cooldown' }` |
| `otp_invalid` | 401 | `{ error: 'otp_invalid' }` |
| `otp_locked` | 429 | `{ error: 'otp_locked' }` |
| `account_blocked` | 403 | `{ error: 'account_blocked' }` |
| `server_misconfigured` | 500 | `{ error: 'server_misconfigured' }` |

`requestOtp` algorithm:

1. `phone = normalizeIranPhone(input)`; if null, throw `invalid_phone`.
2. Find the latest `OtpChallenge` for that phone with `consumedAt: null` and `expiresAt: { $gt: new Date() }`, sort `createdAt: -1`.
3. If found and `createdAt` is within 60s, throw `otp_cooldown`.
4. If found (older than 60s), set `consumedAt = new Date()` and save (invalidate).
5. Pick plaintext code: if `process.env.NODE_ENV !== 'production' && /^\d{6}$/.test(process.env.OTP_FIXED_CODE || '')` then use `OTP_FIXED_CODE`; else `String(crypto.randomInt(0, 1_000_000)).padStart(6, '0')`.
6. `codeHash = await bcrypt.hash(code, 8)`.
7. `OtpChallenge.create({ phone, codeHash, expiresAt: new Date(Date.now() + 5 * 60 * 1000) })`.
8. Call internal `sendOtp({ phone, code })` as specified in decision 7.
9. Return `{ ok: true }`.

`verifyOtp` algorithm:

1. Normalize phone; throw `invalid_phone` if null. If `code` is not a 6-digit string, throw `otp_invalid` (do not leak format too kindly).
2. Load latest non-consumed challenge for that phone, sort `createdAt: -1`. If none, throw `otp_invalid`.
3. If `expiresAt <= now`, set `consumedAt` and throw `otp_invalid`.
4. If `attemptCount >= 5`, set `consumedAt` and throw `otp_locked`.
5. `bcrypt.compare(code, challenge.codeHash)`. If false: `attemptCount += 1`; if now `>= 5`, consume and throw `otp_locked`; else save and throw `otp_invalid`.
6. On match: set `consumedAt = now`, save.
7. `User.findOne({ phone })`. If exists and `status` is `blocked` or `deleted`, throw `account_blocked` (do **not** issue a token; the OTP is already consumed — attacker should not keep retrying into a live session).
8. If no user: `User.create({ phone, phoneVerifiedAt: new Date(), roles: ['cargo_owner'] })`. If user exists: set `phoneVerifiedAt = new Date()` if it was null (login of an already-created-but-unverified seed is fine; do not reset roles).
9. If `!process.env.JWT_SECRET`, throw `server_misconfigured`.
10. `jwt.sign({ sub: user._id.toString(), phone: user.phone }, process.env.JWT_SECRET, { expiresIn: '7d' })`.
11. Return `{ user, token }`.

Do **not** put the code on User. Do **not** use `findOneAndUpdate` without `{ runValidators: true }` for User create — use `User.create` for the insert path.

**Verify**: `cd backend && node -c src/services/otpService.js` exits 0.

### Step 6: Auth middleware

Create `backend/src/middleware/auth.js`:

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'server_misconfigured' });
  }
  let payload;
  try {
    payload = jwt.verify(m[1], process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') {
    return res.status(401).json({ error: 'unauthorized' });
  }
  req.user = user;
  return next();
}

module.exports = { auth };
```

Blocked users: `401 unauthorized` on `/me` (token may still be unexpired). `verify-otp` already refuses to mint a new token.

**Verify**: `cd backend && node -c src/middleware/auth.js` exits 0.

### Step 7: Auth routes

Create `backend/src/routes/auth.js`. Express Router. Wrap async handlers in try/catch; map `err.code` as in the table; unknown errors → `500` `{ error: 'server_error' }` **without** `err.message`.

```js
const express = require('express');
const rateLimit = require('express-rate-limit');
const { requestOtp, verifyOtp } = require('../services/otpService');
const { auth } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  handler: (req, res) => {
    res.status(429).json({ error: 'rate_limited' });
  },
});

function publicUser(user) {
  return {
    id: user._id.toString(),
    phone: user.phone,
    name: user.name || '',
    email: user.email || '',
    roles: user.roles,
    status: user.status,
    phoneVerifiedAt: user.phoneVerifiedAt,
  };
}

router.post('/request-otp', authLimiter, async (req, res) => {
  try {
    await requestOtp({ phone: req.body && req.body.phone });
    return res.status(200).json({ ok: true });
  } catch (err) {
    return sendAuthError(res, err);
  }
});

router.post('/verify-otp', authLimiter, async (req, res) => {
  try {
    const { user, token } = await verifyOtp({
      phone: req.body && req.body.phone,
      code: req.body && req.body.code,
    });
    return res.status(200).json({ token, user: publicUser(user) });
  } catch (err) {
    return sendAuthError(res, err);
  }
});

router.get('/me', auth, async (req, res) => {
  return res.status(200).json({ user: publicUser(req.user) });
});

function sendAuthError(res, err) {
  const code = err && err.code;
  const map = {
    invalid_phone: 400,
    otp_cooldown: 429,
    otp_invalid: 401,
    otp_locked: 429,
    account_blocked: 403,
    server_misconfigured: 500,
  };
  const status = map[code] || 500;
  const error = map[code] ? code : 'server_error';
  return res.status(status).json({ error });
}

module.exports = router;
```

Throw in the service with `const e = new Error(code); e.code = code; throw e;`.

**Verify**: `cd backend && node -c src/routes/auth.js` exits 0.

### Step 8: Mount routes in `createApp`

Edit `backend/src/app.js`. Keep helmet / cors / json / health **unchanged**. Replace the bare `/api` 404 placeholder with: mount the auth router, then the 404 fallback.

Target shape (only the `/api` section changes):

```js
  const authRoutes = require('./routes/auth');

  app.use('/api/auth', authRoutes);

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
```

Put `require('./routes/auth')` at the top of the file with the other requires (match existing style — 010 put all requires at top). Health stays at `GET /health` outside `/api`.

Do **not** lock CORS. Do **not** add cookie-parser. Do **not** change the JSON 100kb cap. Do **not** change `service: 'baryar-api'`.

**Verify**:

```bash
cd backend && node -e "const {createApp}=require('./src/app'); const a=createApp(); console.log(typeof a.listen==='function'?'ok':'fail')"
```

→ `ok`.

Existing health test must still pass: `GET /api/does-not-exist` → 404 `{ error: 'not_found' }`.

### Step 9: Tests — write them first if you are mid-implementation, but they must exist before you call the plan done

Create `backend/test/__tests__/phone.test.js`. **First line:** `require('../setup');`

Cases:

- `09121234567` → `+989121234567`
- `9121234567` → `+989121234567`
- `+98 912 123 4567` → `+989121234567`
- `00989121234567` → `+989121234567`
- landline `02122001000` → `null`
- US `+12025550100` → `null`
- empty / non-string → `null`

Create `backend/test/__tests__/auth.test.js`. **First line:** `require('../setup');`

Pattern: copy `health.test.js` (supertest + `createApp()`). Set secrets in `beforeAll`:

```js
require('../setup');
const request = require('supertest');
const { createApp } = require('../../src/app');
const User = require('../../src/models/User');
const OtpChallenge = require('../../src/models/OtpChallenge');

const PHONE = '09121234567';
const CANON = '+989121234567';

describe('auth OTP', () => {
  const app = createApp();

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-do-not-use';
    process.env.OTP_FIXED_CODE = '123456';
    process.env.NODE_ENV = 'test';
  });
  // ...
});
```

Cases (all via HTTP, not by reaching into the service, except where noted):

1. `POST /api/auth/request-otp` `{ phone: PHONE }` → 200 `{ ok: true }`. Body must **not** contain `123456` or `code`. DB has one `OtpChallenge` with `phone: CANON` and a `codeHash` that is not `123456`.
2. Immediate second `request-otp` → 429 `{ error: 'otp_cooldown' }`. Still one live (unconsumed) challenge.
3. `POST /api/auth/verify-otp` `{ phone: PHONE, code: '000000' }` → 401 `{ error: 'otp_invalid' }`.
4. `POST /api/auth/verify-otp` `{ phone: PHONE, code: '123456' }` → 200. `token` is a non-empty string. `user.phone === CANON`. `user.roles === ['cargo_owner']`. `user.id` is a 24-char hex string. `User.findOne({ phone: CANON }).phoneVerifiedAt` is a Date. Challenge `consumedAt` is set.
5. Same verify again (replay) → 401 `{ error: 'otp_invalid' }`.
6. `GET /api/me` without header → 401 `{ error: 'unauthorized' }`.
7. `GET /api/me` with `Authorization: Bearer <token>` → 200 and same `user.phone`.
8. `GET /api/me` with garbage bearer → 401.
9. `POST /api/auth/request-otp` `{ phone: '02122001000' }` → 400 `{ error: 'invalid_phone' }`.
10. Blocked user: create `User` with `phone: CANON` (use a **different** phone for isolation, e.g. `+989121234568`), `status: 'blocked'`. Request+verify OTP with fixed code → 403 `{ error: 'account_blocked' }`. No usable token (body has no `token` or token is absent).
11. Five wrong codes lock: request-otp on a fresh phone, then verify `000000` five times. Fifth (or the one that crosses 5) returns `429` `{ error: 'otp_locked' }`. A sixth with the **correct** `123456` still `401` `{ error: 'otp_invalid' }` (challenge consumed).
12. Unknown `/api/auth/nope` → 404 `{ error: 'not_found' }` (falls through to the placeholder — **if** Express matches `/api/auth` only for defined routes; if the router 404s without `error: 'not_found'`, mount so unmatched `/api/auth/*` still hits the `/api` 404 handler. Easiest: do not add a catch-all on the auth router. Unmatched methods/paths under `/api/auth` fall through because `app.use('/api/auth', authRoutes)` only handles defined routes, then `app.use('/api', …)` still runs. Confirm with this test.)
13. `GET /health` still 200 (sanity; optional if health.test.js already covers it).

Do **not** assert wall-clock 5-minute expiry with `jest.useFakeTimers()` — fake timers break mongoose. If you add an expiry test, set `expiresAt` in the past directly on the document, then call verify.

**Verify**: `cd backend && npm test` → exit 0. Count: previous suite was health (2) + identity (6) + cargo (existing, including 013 transportMode cases). New files add phone cases + ~12 auth cases. All previous tests still pass.

If memory Mongo hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod` once, then `npm test` again. Do not switch to `MongoMemoryReplSet`.

### Step 10: Mark the plan done in the index

Update `plans/README.md`:

- Status row 014 → `DONE`
- In "Recommended next slices", item 1 (Phone OTP) is done; the next unwritten slice is cargo-owner origin/destination on the existing map (still not written).

Commit:

```bash
git add backend/package.json backend/package-lock.json backend/.env.example \
  backend/src/app.js backend/src/utils/phone.js backend/src/models/OtpChallenge.js \
  backend/src/services/otpService.js backend/src/middleware/auth.js \
  backend/src/routes/auth.js backend/test/__tests__/auth.test.js \
  backend/test/__tests__/phone.test.js plans/README.md
git commit -m "feat(014): add phone OTP register and login"
# then after index-only tweak if split:
git commit -m "chore(014): mark plan DONE in index"
```

Do not `git add` `.env`. Do not push.

## Test plan

- New: `backend/test/__tests__/phone.test.js` — normalizer cases listed in Step 9.
- New: `backend/test/__tests__/auth.test.js` — HTTP cases 1–12 listed in Step 9.
- Structural pattern: `backend/test/__tests__/health.test.js` (`require('../setup');` + `supertest` + `createApp()`).
- Existing `models.identity.test.js` / `models.cargo.test.js` / `health.test.js` must stay green; do not rewrite them.
- Verification: `cd backend && npm test` → all pass, including N new tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `cd backend && npm test` exits 0
- [ ] `backend/src/routes/auth.js` exists and is mounted at `/api/auth` in `app.js`
- [ ] `POST /api/auth/request-otp` and `POST /api/auth/verify-otp` and `GET /api/me` behave as in Step 9
- [ ] `grep -n "otpHash\|otpCode\|password:" backend/src/models/User.js` returns no matches
- [ ] `grep -n "firebase\|twilio\|kavenegar\|ioredis\|bullmq\|cookie-parser" backend/package.json backend/src -r` returns no matches
- [ ] `request-otp` HTTP body never includes the OTP (`grep` the test that asserts `res.body.code` is undefined)
- [ ] `User.schema.path('id')` still undefined; public JSON uses `user._id.toString()` as `id`
- [ ] `GET /health` unchanged; `GET /api/does-not-exist` still 404 `{ error: 'not_found' }`
- [ ] `git status` shows no files outside the in-scope list (plus `package-lock.json`)
- [ ] `plans/README.md` status row for 014 is DONE
- [ ] `mobile/` untouched

## STOP conditions

Stop and report back (do not improvise) if:

- `backend/src/models/User.js` is missing, or already has `otpHash` / `password` (do not silently overwrite).
- `backend/src/routes/` already contains an auth implementation with a different contract (cookies, Firebase, email).
- A step seems to require editing `mobile/`, `Cargo.js`, or adding an SMS SDK.
- You believe CORS must be locked, cookies added, or refresh tokens added "while you're here" — they must not.
- `express-rate-limit` throws `ERR_ERL_KEY_GEN_IPV6` — you added a custom `keyGenerator` using raw `req.ip`. Remove the custom generator (library default) rather than inventing a wrapper, unless you import `ipKeyGenerator` from `express-rate-limit`.
- `npm test` fails twice after a reasonable fix. If someone suggests `MongoMemoryReplSet` to "fix" anything, STOP.
- `mongodb-memory-server` hangs a second time after setting `MONGOMS_SYSTEM_BINARY`.
- `JWT_SECRET` fallback to a hardcoded string looks tempting — forbidden. Fail closed.
- You are about to return the OTP in the JSON body "just for tests" — tests use `OTP_FIXED_CODE` instead.

## Maintenance notes

- Next **profile** plan may add `PATCH /api/me` for `name` / `email` / `nationalId`. Keep the allowlist tiny; do not let clients set `roles` or `status`.
- Next **cargo CRUD** plan must use `req.user._id` as `ownerUserId`. Do not accept `ownerUserId` from the body.
- Next **driver** plan may add a role without a new User collection: `POST /api/me/roles` or a dedicated register-driver route that `$addToSet: { roles: 'driver' }` and creates `DriverProfile`. Not this plan.
- Phase 2 SMS: replace the body of `sendOtp` in `otpService.js` only. Keep `OtpChallenge` and the HTTP contract. Production must stop logging codes.
- When cookies land, lock CORS origins (010 comment in `app.js`) and decide whether Bearer stays for mobile. Do not delete Bearer without a mobile client using cookies.
- Reviewers: confirm OTP is hashed, not on User; confirm blocked users cannot mint tokens; confirm `/api/does-not-exist` still 404s; confirm no Firebase.
- TTL index / periodic delete of old `OtpChallenge` rows is a later ops slice. Expired-but-unconsumed rows are already rejected by `verifyOtp`.

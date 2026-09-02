# Plan 013: Add `Cargo.transportMode` for V6 land/sea/air/rail/multimodal cargo

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat c6e7e3b..HEAD -- backend/src/models backend/test/__tests__/models.cargo.test.js backend/test/__tests__/models.identity.test.js resources/features-roadmap-main.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.
> Planned-at SHA is a hint, not a hard STOP. Real gates: `backend/src/models/Cargo.js` exists (011 present) and `Cargo.schema.path('transportMode')` is undefined (013 not yet applied). Do not STOP just because the advisor branch was merged.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/011-phase1-mongo-models.md (DONE — models exist)
- **Category**: direction
- **Planned at**: commit `c6e7e3b`, 2026-09-03

## Why this matters

`resources/features-roadmap-main.md` is now the V6 product checklist. Phase 1
§1 lists five distinct cargo-registration surfaces, each one feature:

- land / زمینی
- maritime / دریایی
- air / هوایی
- rail / ریلی
- multimodal / ترکیبی

Plan 011's `Cargo` schema has no mode field. Every cargo is implicitly a
road load (`dimensions.weightKg` / `volumeM3` / cm sizes, `specialCharacteristics`
like `livestock`). The next cargo-CRUD slice will invent a truck-only API
unless the discriminator exists first.

This plan is **schema + indexes + model tests only**. It does not add
per-mode extra attributes (container number, IMO, AWB, wagon id — those
wait for SRS / a later CRUD plan), routes, auth, or mobile wiring.

V6 also moved **SMS Phone OTP** to Phase 2 §9. Do **not** add `otpHash` /
`otpCode` / password columns here. `User.phone` + `phoneVerifiedAt` from
011 stay as-is.

## Current state

Repo layout at plan time (`c6e7e3b` on `advisor/012-rfp-feature-roadmap-coverage`):

```
iran-map/
  resources/features-roadmap-main.md   ← V6 canonical checklist
  resources/features-roadmap-old.md    ← V5 (012 output); reference only
  amin-tajeran-features-roadmap-v5.md  ← stale pointer at features-roadmap.md
  backend/src/models/                  ← 011 DONE (8 documents + geoPoint)
  backend/test/__tests__/              ← health + models.identity + models.cargo
  mobile/                              ← Expo map; not wired to the API
```

`Cargo.js` today (full file — 41 lines). There is **no** `transportMode`:

```js
const mongoose = require('mongoose');
const { placeSchema } = require('./geoPoint');

const STATUSES = ['draft', 'open', 'matched', 'cancelled', 'completed'];
const SPECIAL = ['hazardous', 'fragile', 'refrigerated', 'livestock', 'oversized', 'other'];

const cargoSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    origin: { type: placeSchema, required: true },
    destination: { type: placeSchema, required: true },
    dimensions: {
      weightKg: { type: Number, default: 0, min: 0 },
      volumeM3: { type: Number, default: 0, min: 0 },
      lengthCm: { type: Number, default: 0, min: 0 },
      widthCm: { type: Number, default: 0, min: 0 },
      heightCm: { type: Number, default: 0, min: 0 },
    },
    specialCharacteristics: { type: [String], enum: SPECIAL, default: [] },
    pickupAt: { type: Date, default: null },
    deliverBy: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'draft' },
  },
  { timestamps: true }
);

cargoSchema.index({ ownerUserId: 1, status: 1 });
cargoSchema.index({ status: 1, pickupAt: 1 });
cargoSchema.index({ 'origin.location': '2dsphere' });
cargoSchema.index({ 'destination.location': '2dsphere' });

cargoSchema.statics.STATUSES = STATUSES;
cargoSchema.statics.SPECIAL = SPECIAL;

module.exports = mongoose.model('Cargo', cargoSchema, 'cargos');
```

V6 bullets this field must cover (`resources/features-roadmap-main.md` lines 22–31):

```
*   **Registering cargo for land transport (زمینی)**
*   **Registering cargo for maritime/sea transport (دریایی)**
*   **Registering cargo for air transport (هوایی)**
*   **Registering cargo for rail transport (ریلی)**
*   **Registering cargo for multimodal/combined transport (ترکیبی)**
*   **Managing cargo specifications for land|maritime|air|rail|multimodal transport**
```

Existing cargo tests (`backend/test/__tests__/models.cargo.test.js`) create
cargo **without** a mode and assert `status === 'draft'`. After this plan,
those creates must still pass because the default is `'land'`.

Existing identity tests do not touch Cargo. Do not rewrite them.

Health test (`backend/test/__tests__/health.test.js`) must stay green.
`createApp()` does not load models; do not mount them in `app.js`.

### Conventions to match

- CommonJS, **2-space indent** (`backend/src/app.js`, `Cargo.js`). Do not
  copy XScheduler's 4-space models.
- Closed string enums on the schema, also exported as `Model.statics.X`.
- Field must **not** be named `type` (Mongoose reserved). Use `transportMode`.
- Collection stays `'cargos'` (third `mongoose.model` arg). Do not rename.
- `{ timestamps: true }` already on Cargo — do not add an explicit `createdAt`.
- No schema field named `id`.
- Jest: every test file **first line** `require('../setup');`.
  `npm test` = `jest --runInBand --forceExit` from `backend/`.
- In-memory Mongo is `MongoMemoryServer`, **not** `MongoMemoryReplSet`.
  If memory Mongo hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod`
  once. Do not download mongod as part of this plan.
- Iran-first vocabulary: صاحب کالا / راننده / بار. Do not rename to
  shipper / trucker.
- Money stays `priceRial` on Offer. Untouched.

### What V6 changed that is NOT a model change

Do not "complete" these in this plan:

| V6 item | Why not here |
|---------|--------------|
| Per-mode cargo *specification* bullets (container, AWB, wagon, IMO) | Spec names the surfaces; SRS locks the extra columns. Discriminator first. |
| SMS Phone OTP (now Phase 2 §9) | Auth slice. 011 already reserved `phone` + `phoneVerifiedAt`. |
| Push provider, map routing, delivery surfaces | Integrations / clients, not documents. |
| Admin companies / RBAC / system settings | Phase 1 admin *UI* later; still no Company collection (Phase 2). |
| NFR bullets (latency, OWASP, object-store files) | Already honored: `Document.storageKey` stub, no Buffer. |
| Company, Fleet, Rating, Payment, VehiclePosition, Notification, AuditLog | Phase 2. Same rejection as 011. |

## Commands you will need

Run from the **repo root** unless a step says `cd backend`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm 011 Cargo exists | `test -f backend/src/models/Cargo.js && echo ok` | `ok` |
| Confirm mode missing | `cd backend && node -e "const C=require('./src/models/Cargo'); console.log(C.schema.path('transportMode') ? 'HAS' : 'MISSING')"` | `MISSING` |
| Syntax | `cd backend && node -c src/models/Cargo.js` | exit 0, no output |
| Unit tests | `cd backend && npm test` | exit 0; health + identity + cargo (new mode cases included) |
| Health still registered | `grep -n "app.get('/health'" backend/src/app.js` | one match |
| No new deps | `grep -E "firebase\|bullmq\|ioredis\|stripe" backend/package.json \|\| true` | empty |
| No `type` field on Cargo | `grep -n "transportMode" backend/src/models/Cargo.js` | hits; no top-level `type:` besides mongoose `{ type: String }` |

Do **not** run `npm install` at the repo root. There is no root `package.json`.

If `mongodb-memory-server` hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod` and retry **once**. Second hang → STOP.

## Suggested executor toolkit

- Skill `amintajeran-project` if present — Phase 1 vs Phase 2 boundary,
  GeoJSON `[lng, lat]`, no `type` field, no Phase 2 collections.
- Skill `mongoose-patterns` if present — reserved `type`, no
  `timestamps: true` + explicit `createdAt`, no schema field named `id`.
- Product source: `resources/features-roadmap-main.md` Phase 1 §1 (the five
  register/manage mode bullets). Do **not** follow
  `resources/features-roadmap-old.md` or the stale pointer
  `amin-tajeran-features-roadmap-v5.md` for new field names.

## Scope

**In scope** (the only files you should modify):

- `backend/src/models/Cargo.js`
- `backend/test/__tests__/models.cargo.test.js`
- `plans/README.md` (status row for 013 + product-source path)

**Out of scope** (do NOT touch, even though they look related):

- `backend/src/models/User.js`, `DriverProfile.js`, `Vehicle.js`,
  `Document.js`, `Offer.js`, `Shipment.js`, `ShipmentEvent.js`, `geoPoint.js`
  — 011 shape is still correct under V6.
- `backend/src/app.js`, `backend/src/index.js`, `backend/src/config/db.js`
  — do not mount routes, do not require models from the process.
- `backend/test/__tests__/models.identity.test.js`, `health.test.js`.
- Auth: JWT, sessions, cookies, OTP codes, SMS, Firebase.
- HTTP CRUD. No `src/routes/`.
- Per-mode extra columns (`containerNumber`, `imoNumber`, `awbNumber`,
  `wagonId`, `vesselName`, `flightNumber`, mixed `legs[]`). Discriminator
  only. A later cargo-CRUD / SRS plan adds those.
- `mobile/**`. Map UIs stay unwired.
- Recreating `webapp/`.
- Phase 2 collections: Company, Fleet, Staff, Rating, Review, Payment,
  VehiclePosition, Notification, AuditLog, SystemSettings, Role matrix.
- Rewriting `resources/features-roadmap-main.md` or the old V5 file.
- Changing `User.roles` (still `cargo_owner` / `driver` / `admin`).
- Changing `Vehicle.vehicleType` (still road-vehicle classes). A rail wagon
  or vessel is **not** a Vehicle in Phase 1 — cargo mode is on Cargo, not
  Vehicle.
- Redis, BullMQ, TypeScript, Docker, migrations, `ensureIndexes` on boot.

## Git workflow

- Branch: `advisor/013-cargo-transport-mode` from the commit that contains
  011 models + V6 `resources/features-roadmap-main.md` (currently
  `c6e7e3b` on `advisor/012-rfp-feature-roadmap-coverage`, or `main` once
  012 is merged).
- Commit style from this repo: `feat(013): add Cargo.transportMode enum`
  then `chore(013): mark plan DONE in index`.
  Earlier examples: `feat(011): add Phase 1 Mongoose domain models`,
  `feat(012): close RFP gaps in features-roadmap`.
- Do NOT push or open a PR unless the operator instructed it.

## Domain map (unchanged except one Cargo field)

Eight documents. Graph is the same as 011:

```
User 1-1 DriverProfile 1-n Vehicle
User 1-n Document, Cargo, Offer
Cargo 1-n Offer
Cargo 1-1 Shipment (unique cargoId)
Shipment 1-n ShipmentEvent
```

New on Cargo only:

| Model | Field | Values | Default |
|-------|-------|--------|---------|
| Cargo | `transportMode` | `land`, `sea`, `air`, `rail`, `multimodal` | `land` |

English enum tokens (not Persian, not RFP citation numbers):

| Token | V6 label |
|-------|----------|
| `land` | land / زمینی |
| `sea` | maritime/sea / دریایی |
| `air` | air / هوایی |
| `rail` | rail / ریلی |
| `multimodal` | multimodal/combined / ترکیبی |

Do **not** use `road`, `maritime`, `combined`, `زمینی`, or `type`.
`land` matches the V6 English heading ("land transport") and stays a
valid JS identifier. Matching later uses `{ status: 'open', transportMode }`.

Existing Cargo indexes stay. Add `{ transportMode: 1, status: 1 }` so
driver matching can filter open land vs sea vs air loads without a
collection scan.

## Steps

### Step 1: Confirm 011 models and that the mode is missing

From repo root:

```bash
git checkout -b advisor/013-cargo-transport-mode
test -f backend/src/models/Cargo.js && echo cargo_ok
test -f resources/features-roadmap-main.md && echo v6_ok
cd backend && node -e "const C=require('./src/models/Cargo'); console.log(C.schema.path('transportMode') ? 'HAS' : 'MISSING')"
```

**Verify**: `cargo_ok`, `v6_ok`, `MISSING`.

If `HAS`, STOP — 013 already applied. If `Cargo.js` is missing, STOP —
execute 011 first. If `resources/features-roadmap-main.md` is missing,
STOP — V6 checklist is the source of the five modes.

### Step 2: Add `transportMode` to Cargo

Edit `backend/src/models/Cargo.js` only. Keep every existing field.
Insert the enum constant next to `STATUSES` / `SPECIAL`, the field on
the schema (after `description`, before `origin` — mode is a classifier,
not a place), the compound index, and the static.

Target shape of the **changed** bits (not a full rewrite — patch in place):

```js
const STATUSES = ['draft', 'open', 'matched', 'cancelled', 'completed'];
const SPECIAL = ['hazardous', 'fragile', 'refrigerated', 'livestock', 'oversized', 'other'];
const TRANSPORT_MODES = ['land', 'sea', 'air', 'rail', 'multimodal'];
```

Inside the schema object, after `description` and before `origin`:

```js
    transportMode: {
      type: String,
      enum: TRANSPORT_MODES,
      default: 'land',
    },
```

After the existing indexes:

```js
cargoSchema.index({ transportMode: 1, status: 1 });
```

Statics:

```js
cargoSchema.statics.STATUSES = STATUSES;
cargoSchema.statics.SPECIAL = SPECIAL;
cargoSchema.statics.TRANSPORT_MODES = TRANSPORT_MODES;
```

Do **not** make `transportMode` required-without-default. Existing tests
and any in-memory cargo created without the field must default to `'land'`.

Do **not** add a Mixed `modeDetails` bag. Unknown keys would be silently
stripped under `strict: true` later, or freeze a junk drawer before SRS.

**Verify**:

```bash
cd backend && node -c src/models/Cargo.js
cd backend && node -e "
const C = require('./src/models/Cargo');
const p = C.schema.path('transportMode');
if (!p) { console.error('missing path'); process.exit(1); }
console.log(p.instance, p.enumValues.join(','), p.defaultValue, C.TRANSPORT_MODES.join(','));
"
```

Expected: `String land,sea,air,rail,multimodal land land,sea,air,rail,multimodal`
(instance, enum, default, static — order as printed).

Also confirm the compound index is registered:

```bash
cd backend && node -e "
const C = require('./src/models/Cargo');
const idx = C.schema.indexes().map(i => JSON.stringify(i[0]));
if (!idx.some(s => s.includes('transportMode'))) { console.error(idx); process.exit(1); }
console.log('index_ok');
"
```

Expected: `index_ok`.

### Step 3: Extend cargo model tests

Edit `backend/test/__tests__/models.cargo.test.js`. Keep the first line
`require('../setup');`. Keep every existing test. Add cases **after** the
GeoJSON default-draft test (the first `it`) so default `'land'` is
asserted next to default `'draft'`.

1. In the existing first test (`persists origin/destination…`), add one
   assertion — do not change the create payload:

```js
    expect(cargo.status).toBe('draft');
    expect(cargo.transportMode).toBe('land');
```

2. Add three new tests at the end of the `describe` (before the closing
   `});` of the describe, after the `'Started'` rejection test):

```js
  it('defaults transportMode to land and accepts the five V6 modes', async () => {
    const { owner } = await seedParties();
    const defaults = await Cargo.create({
      ownerUserId: owner._id,
      origin: tehran,
      destination: esfahan,
    });
    expect(defaults.transportMode).toBe('land');
    expect(Cargo.TRANSPORT_MODES).toEqual(['land', 'sea', 'air', 'rail', 'multimodal']);

    const sea = await Cargo.create({
      ownerUserId: owner._id,
      origin: tehran,
      destination: esfahan,
      transportMode: 'sea',
    });
    expect(sea.transportMode).toBe('sea');
  });

  it('rejects an unknown transportMode', async () => {
    const { owner } = await seedParties();
    await expect(
      Cargo.create({
        ownerUserId: owner._id,
        origin: tehran,
        destination: esfahan,
        transportMode: 'road',
      })
    ).rejects.toThrow();
  });

  it('rejects Persian or combined aliases as transportMode', async () => {
    const { owner } = await seedParties();
    await expect(
      Cargo.create({
        ownerUserId: owner._id,
        origin: tehran,
        destination: esfahan,
        transportMode: 'زمینی',
      })
    ).rejects.toThrow();
    await expect(
      Cargo.create({
        ownerUserId: owner._id,
        origin: tehran,
        destination: esfahan,
        transportMode: 'combined',
      })
    ).rejects.toThrow();
  });
```

`road` and `combined` are the aliases a weaker model will be tempted to
use after reading V5 (`Road / land`, `Combined / multimodal`). Rejecting
them locks the V6 tokens.

Do **not** add a `$near` + `transportMode` query in this plan. `$near`
already has its own test; combining filters is a matching-slice concern.

**Verify**: `cd backend && npm test`

Expected: exit 0. Count goes from 14 tests (2 health + 6 identity + 6 cargo)
to **17** (same health + identity, cargo 6→9). If the runner prints a
different prior total, keep health + identity counts unchanged and add
exactly 3 cargo tests plus the extra `expect` in the first cargo test.

Phone strings in `seedParties` already use `+989****5555` style. Do not
"fix" them.

### Step 4: Confirm no scope leak

```bash
git diff --stat
grep -n "transportMode" backend/src/models/Cargo.js
grep -n "TRANSPORT_MODES\\|transportMode: 'road'\\|type:" backend/src/models/Cargo.js
grep -E "firebase|bullmq|ioredis|stripe" backend/package.json || true
grep -n "app.get('/health'" backend/src/app.js
```

**Verify**:

- `git diff --stat` only lists `backend/src/models/Cargo.js`,
  `backend/test/__tests__/models.cargo.test.js`, and (after step 5)
  `plans/README.md`.
- `transportMode` hits in `Cargo.js`.
- No `transportMode: 'road'`. `type:` hits are only mongoose `{ type: String }`
  / `{ type: Number }` / `{ type: placeSchema }` / `{ type: mongoose.Schema.Types.ObjectId }`.
- No firebase/bullmq/ioredis/stripe.
- Health route still present.

### Step 5: Mark the plan done in the index

In `plans/README.md`:

- Set plan 013 status to **DONE**.
- In the intro paragraph, mention 013 after 012.
- Point "Recommended next slices" at `resources/features-roadmap-main.md`
  (V6), not `resources/features-roadmap.md` (that path was renamed to
  `features-roadmap-old.md` at `c6e7e3b`).
- Keep the sequential next-slice list (OTP, map origin/destination, cargo
  CRUD, driver docs, admin shell). Cargo CRUD must now persist
  `transportMode` from the 013 enum; do not invent a second mode field.

Commit:

```bash
git add backend/src/models/Cargo.js backend/test/__tests__/models.cargo.test.js plans/README.md
git commit -m "feat(013): add Cargo.transportMode enum"
# then, if the index update is a second commit:
git add plans/README.md
git commit -m "chore(013): mark plan DONE in index"
```

One commit that includes both the code and the index row is also fine.

## Test plan

- File: `backend/test/__tests__/models.cargo.test.js` (existing; extend).
- Pattern: first line `require('../setup');`, `seedParties()` helper,
  Tehran/Esfahan GeoJSON points, `rejects.toThrow()` for enum violations
  (same style as `'Started'` shipment status).
- Cases:
  - default `'land'` when omitted (existing create payloads stay valid)
  - static `TRANSPORT_MODES` is exactly the five V6 tokens
  - `'sea'` persists
  - `'road'` rejected
  - `'زمینی'` and `'combined'` rejected
- Existing GeoJSON / `$near` / unique shipment / `'Started'` tests still pass.
- Identity + health files untouched and still pass.
- Verification: `cd backend && npm test` → exit 0, 3 new cargo tests.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `backend/src/models/Cargo.js` exports `TRANSPORT_MODES` =
      `['land', 'sea', 'air', 'rail', 'multimodal']`
- [ ] `Cargo.schema.path('transportMode').defaultValue === 'land'`
- [ ] `Cargo.schema.indexes()` includes `{ transportMode: 1, status: 1 }`
- [ ] `cd backend && node -c src/models/Cargo.js` exits 0
- [ ] `cd backend && npm test` exits 0; cargo tests include the three new
      cases and the extra default-land assertion
- [ ] `grep -n "transportMode" backend/src/models/User.js backend/src/models/Vehicle.js`
      returns no matches (mode lives on Cargo only)
- [ ] `grep -n "otpHash\\|otpCode\\|password:" backend/src/models/*.js` returns
      no matches
- [ ] `grep -n "containerNumber\\|imoNumber\\|awbNumber\\|wagonId" backend/src/models/Cargo.js`
      returns no matches
- [ ] `git diff --stat` (or `git status`) shows no files outside the in-scope
      list
- [ ] `plans/README.md` status row for 013 is DONE
- [ ] Health route still registered; `/api` placeholder untouched

## STOP conditions

Stop and report back (do not improvise) if:

- `backend/src/models/Cargo.js` is missing (011 not applied).
- `Cargo.schema.path('transportMode')` already exists with a different
  enum (e.g. `road`/`maritime`/`combined`) — do not silently overwrite;
  report the live tokens.
- `resources/features-roadmap-main.md` no longer lists the five modes
  (زمینی / دریایی / هوایی / ریلی / ترکیبی).
- A step seems to require editing `User`, `Vehicle`, `app.js`, or `mobile/`
  (e.g. adding vessel fields to Vehicle, or wiring a mode picker).
- You believe Company / OTP / GPS collections must land "while you're here"
  — they must not.
- `npm test` fails twice after a reasonable fix. If the only failure is
  `$near` and someone suggests switching to `MongoMemoryReplSet`, STOP —
  call `await Cargo.init()` (already in the existing geo test); do not
  change 010's memory Mongo.
- `mongodb-memory-server` hangs a second time after setting
  `MONGOMS_SYSTEM_BINARY`.
- You are about to add a Mixed `modeDetails` / `specs` bag to "leave room"
  for per-mode fields.

## Maintenance notes

- Next **cargo CRUD** plan must accept `transportMode` on create/update,
  default `'land'`, reject unknown tokens with the same enum. Do not add a
  parallel `mode` / `type` query param.
- Next **driver matching** plan filters open cargo by `transportMode` (and
  later by vehicle class for `land` only). A sea cargo is not matched by
  `Vehicle.vehicleType: 'truck'`.
- Per-mode extra attributes (container, IMO, AWB, wagon, legs) stay out
  until SRS names them. When they land, prefer a discriminated subdocument
  (`landSpecs` / `seaSpecs` / …) over one Mixed blob so `strict: true`
  still drops junk.
- `Vehicle` remains a road asset (plate + `vehicleType`). Do not stretch it
  into ships/aircraft/wagons in Phase 1 — those would be new collections
  in a later slice if the product actually books non-road capacity.
- V6 parked OTP in Phase 2. An OTP auth plan may still use `User.phone` +
  `phoneVerifiedAt`; it must not treat this 013 plan as the auth slice.
- Reviewers: confirm enum tokens are `land|sea|air|rail|multimodal` (not
  `road` / `maritime` / `combined` / Persian), default is `'land'`, and
  no new collection appeared.
- Pointer `amin-tajeran-features-roadmap-v5.md` still names
  `resources/features-roadmap.md`, which was renamed to
  `features-roadmap-old.md`. Fixing that pointer is a docs follow-up, not
  this schema plan.

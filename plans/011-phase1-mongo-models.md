# Plan 011: Add Phase 1 AminTajeran Mongoose models

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 39a89b4..HEAD -- backend/src backend/test backend/package.json amin-tajeran-features-roadmap-v5.md plans/010-backend-scaffold.md`
> This plan assumes plan 010's Express + Mongo scaffold already exists under
> `backend/` (it was staged on `advisor/010-backend-scaffold` at `39a89b4`).
> If `backend/src/app.js` is missing, STOP — execute 010 first.
> If `backend/src/models/` already exists with User/Cargo/Driver files, STOP.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: LOW
- **Depends on**: plans/010-backend-scaffold.md
- **Category**: direction
- **Planned at**: commit `39a89b4`, 2026-09-03 (010 scaffold present in the working tree on `advisor/010-backend-scaffold`)
- **Executed at**: branch `advisor/011-phase1-mongo-models`, 2026-09-03

## Why this matters

`amin-tajeran-features-roadmap-v5.md` is the product spec. Phase 1 needs
users, cargo owners, drivers, vehicles, documents, bids, shipments, and a
timestamped event log. Plan 010 only created the process: `createApp()`,
`GET /health`, and Jest + in-memory Mongo. There is still **no
`backend/src/models/` directory**.

Later slices (phone OTP, cargo draft CRUD, driver onboarding, admin) will
invent incompatible field names if the domain documents do not exist first.
This plan is **schema + indexes + model tests only**. It does not add
routes, auth, OTP, file upload, or any mobile/webapp wiring.

Product source (do not "improve" these names):

- Phase 1 §1 User application — registration, profile, request status, history
- Phase 1 §2 Cargo owners — origin/destination, dimensions, special
  characteristics, pickup/delivery timing, incoming carrier offers
- Phase 1 §3 Drivers — vehicle specs, licenses / documents, accept/reject,
  trip status, checkpoints
- Phase 1 §4 Tracking — status display, event log, timestamped history
- Phase 1 §5 Admin — user/driver/cargo oversight and document verification
  (RBAC and companies wait; `User.roles` may include `admin`)

Phase 2 stays out of the database until Phase 1 booking works: live GPS
stream, transport companies / fleet, ratings, payments, KYC APIs, Telegram,
SMS gateway, BI dashboards.

## Current state

Repo layout at plan time:

```
iran-map/
  amin-tajeran-features-roadmap-v5.md
  backend/                 ← 010 scaffold (CommonJS Express + Mongoose 8 + Jest)
  mobile/                  ← Expo map; not wired to the API
  plans/                   ← 001–010; 010 DONE
```

`backend/src/app.js` (excerpt — health + `/api` 404 placeholder):

```js
app.get('/health', async (req, res) => { /* mongo ping */ });

app.use('/api', (req, res) => {
  res.status(404).json({ error: 'not_found' });
});

module.exports = { createApp };
```

`backend/src/index.js` listens on `PORT || 4000` only when
`require.main === module`. Tests never call `connectDB()`.

`backend/test/setup.js` connects mongoose to `process.env.MONGO_URI` from
`MongoMemoryServer` (NOT a replica set). **Every test file must start with**
`require('../setup');`.

`backend/package.json` scripts: `"test": "jest --runInBand --forceExit"`.
No model files exist:

```bash
ls backend/src/models 2>/dev/null || echo 'no models dir'
```

Expected today: `no models dir`.

**Coordinate convention** (mobile already uses GeoJSON `[lng, lat]`):

```ts
// mobile/src/types.ts
/** GeoJSON LineString coordinates [lng, lat] for the road route */
routeGeometry: [number, number][];
```

Store every point as GeoJSON `Point` with `coordinates: [lng, lat]`. Tehran
smoke values in tests: `[51.389, 35.689]`.

- CommonJS `require('mongoose')`
- `new mongoose.Schema({ ... }, { timestamps: true })` when there is no
  domain field named `createdAt` / `updatedAt`
- `ref: 'User'` as `mongoose.Schema.Types.ObjectId`
- `module.exports = mongoose.model('Name', schema)`
- **2-space indent** to match `backend/src/app.js` (XScheduler models use
  4-space — do not copy that indent)
- Do **not** copy XScheduler User/Firebase/billing models into this repo

**Reserved-word pitfall** (must follow): a subdocument field literally
named `type` (GeoJSON Point, event type) MUST be double-nested
`type: { type: String, ... }`. Otherwise Mongoose casts the subdocument to
a string. Same for top-level `ShipmentEvent.type`.

**Do not** combine `{ timestamps: true }` with an explicit `createdAt`
field. Use `occurredAt` for domain event time.

**Do not** add a schema field named `id` — it shadows Mongoose's virtual.

Iran-first: identity is a **phone string**, not email, not Firebase uid.
OTP hash / SMS provider fields belong in the auth plan, not here. This
plan only reserves `phone` (unique) and `phoneVerifiedAt` (nullable Date).

## Commands you will need

Run from the **repo root** unless a step says `cd backend`.

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Confirm 010 exists | `test -f backend/src/app.js && echo ok` | `ok` |
| Confirm no models yet | `ls backend/src/models 2>/dev/null \|\| echo 'no models dir'` | `no models dir` |
| Load a model | `cd backend && node -e "require('./src/models/User'); console.log('ok')"` | `ok` |
| Unit tests | `cd backend && npm test` | exit 0, health + new model tests |
| Health still registered | `grep -n "app.get('/health'" backend/src/app.js` | one match |
| No new deps | `grep mongoose backend/package.json` | already present; no firebase/bullmq |

If `mongodb-memory-server` hangs: `export MONGOMS_SYSTEM_BINARY=/opt/homebrew/bin/mongod` and retry **once**. Second hang → STOP.

Do **not** run `npm install` at the repo root. There is no root `package.json`.

## Suggested executor toolkit

- Use skill `mongoose-patterns` if available: `type` reserved word, no
  `timestamps: true` + explicit `createdAt`, no schema field named `id`.
- GeoJSON 2dsphere: https://mongoosejs.com/docs/geojson.html
- Product vocabulary: `amin-tajeran-features-roadmap-v5.md` Phase 1 only.

## Scope

**In scope** (the only files you should create or modify):

- `backend/src/models/geoPoint.js` (shared GeoJSON Point sub-schema)
- `backend/src/models/User.js`
- `backend/src/models/DriverProfile.js`
- `backend/src/models/Vehicle.js`
- `backend/src/models/Document.js`
- `backend/src/models/Cargo.js`
- `backend/src/models/Offer.js`
- `backend/src/models/Shipment.js`
- `backend/src/models/ShipmentEvent.js`
- `backend/test/__tests__/models.identity.test.js`
- `backend/test/__tests__/models.cargo.test.js`
- `plans/README.md` (status row for 011)

**Out of scope** (do NOT touch, even though they look related):

- `backend/src/app.js`, `backend/src/index.js`, `backend/src/config/db.js`
  — do not mount routes, do not change health.
- Auth: JWT, sessions, cookies, OTP codes, SMS, Firebase.
- HTTP CRUD for any model. No `src/routes/`.
- File storage / multer / GridFS. `Document.storageKey` is a string stub.
- `mobile/**`, `webapp/**`, `amin-tajeran-features-roadmap-v5.md`.
- Phase 2 collections: Company, Fleet, Staff, Rating, Review, Payment,
  VehiclePosition / GPS points, Notification, AuditLog, SystemSettings,
  Role/Permission matrix.
- Redis, BullMQ, TypeScript, Docker.
- Copying files out of `$HOME/projects/v5`.
- Raising `express.json` limit. Changing default port 4000.
- Migrations / `ensureIndexes` on server boot (Jest + first query is enough).

## Git workflow

- Branch: `advisor/011-phase1-mongo-models` (from the branch/commit that
  contains the 010 `backend/` tree)
- Commit style: `feat(011): add Phase 1 Mongoose domain models`
  Earlier examples: `feat(010): scaffold Express Mongo API with health check`,
  `feat(009): redesign mobile UI to Google Maps layout`
- One or two commits (models + tests, then index).
- Do NOT push or open a PR unless the operator instructed it.

## Domain map (implement exactly this)

Eight documents. One user account can hold both `cargo_owner` and `driver`
roles (the RFP has two sections on one platform). Admin is a role on User,
not a separate collection.

```
User
  1-1  DriverProfile          (only if roles includes driver)
  1-n  Vehicle                via DriverProfile
  1-n  Document               licenses / IDs (verification stub)
  1-n  Cargo                  as owner
  1-n  Offer                  as driver
  1-n  Shipment               as owner or driver

Cargo  1-n  Offer
Cargo  1-1  Shipment          (unique cargoId on Shipment)
Shipment  1-n  ShipmentEvent
```

Status machines (closed enums — do not invent extra states):

| Model | Enum | Default |
|-------|------|---------|
| User.status | `active`, `blocked`, `deleted` | `active` |
| User.roles[] | `cargo_owner`, `driver`, `admin` | `['cargo_owner']` |
| DriverProfile.verificationStatus | `pending`, `approved`, `rejected` | `pending` |
| Vehicle.status | `active`, `inactive` | `active` |
| Vehicle.vehicleType | `truck`, `trailer`, `van`, `reefer`, `tanker`, `other` | `truck` |
| Document.kind | `driving_license`, `vehicle_registration`, `safety_card`, `national_id`, `professional_card`, `other` | required |
| Document.verificationStatus | `pending`, `approved`, `rejected` | `pending` |
| Cargo.status | `draft`, `open`, `matched`, `cancelled`, `completed` | `draft` |
| Cargo.specialCharacteristics[] | `hazardous`, `fragile`, `refrigerated`, `livestock`, `oversized`, `other` | `[]` |
| Offer.status | `pending`, `accepted`, `rejected`, `withdrawn` | `pending` |
| Shipment.status | `assigned`, `loading`, `in_transit`, `at_customs`, `delivered`, `completed`, `cancelled` | `assigned` |
| ShipmentEvent.eventType | `status_change`, `cargo_loaded`, `driver_departed`, `checkpoint`, `customs_stop`, `note` | required |

Money: `Offer.priceRial` is an integer number of Iranian rials. Do not use
floats, USD, or Stripe fields.

Collection names: pass the third argument to `mongoose.model` where English
pluralization is ugly:

- `mongoose.model('Cargo', cargoSchema, 'cargos')`
- `mongoose.model('DriverProfile', driverProfileSchema, 'driver_profiles')`

Others can use Mongoose defaults (`users`, `vehicles`, `documents`,
`offers`, `shipments`, `shipmentevents`).

## Steps

### Step 1: Confirm scaffold and branch

```bash
git checkout -b advisor/011-phase1-mongo-models
test -f backend/src/app.js && echo app_ok
ls backend/src/models 2>/dev/null || echo 'no models dir'
git diff --stat 39a89b4..HEAD -- backend/src
```

**Verify**: `app_ok` and `no models dir`. If models already exist, STOP.

### Step 2: Shared GeoJSON Point schema

Create `backend/src/models/geoPoint.js` exactly:

```js
const mongoose = require('mongoose');

const geoPointSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(v) {
          return (
            Array.isArray(v) &&
            v.length === 2 &&
            v.every((n) => typeof n === 'number' && Number.isFinite(n))
          );
        },
        message: 'coordinates must be [lng, lat]',
      },
    },
  },
  { _id: false }
);

const placeSchema = new mongoose.Schema(
  {
    address: { type: String, default: '' },
    location: { type: geoPointSchema, required: true },
  },
  { _id: false }
);

module.exports = { geoPointSchema, placeSchema };
```

The double-nested `type: { type: String }` is load-bearing. Do not flatten it.

**Verify**:

```bash
cd backend && node -e "const { geoPointSchema, placeSchema } = require('./src/models/geoPoint'); console.log(geoPointSchema.path('type').instance, typeof placeSchema.path('location') !== 'undefined' ? 'ok' : 'fail')"
```

Expected: prints `String ok`.

### Step 3: User

Create `backend/src/models/User.js`:

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

Do **not** add `password`, `otpCode`, `otpHash`, `firebaseUid`, or
`stripeCustomerId`.

**Verify**: `cd backend && node -e "require('./src/models/User'); console.log('ok')"` → `ok`.

### Step 4: DriverProfile, Vehicle, Document

Create `backend/src/models/DriverProfile.js`:

```js
const mongoose = require('mongoose');

const VERIFICATION = ['pending', 'approved', 'rejected'];

const driverProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    licenseNumber: { type: String, default: '', trim: true },
    professionalCardNumber: { type: String, default: '', trim: true },
    verificationStatus: { type: String, enum: VERIFICATION, default: 'pending' },
    verifiedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

driverProfileSchema.index({ userId: 1 }, { unique: true });
driverProfileSchema.index({ verificationStatus: 1 });

driverProfileSchema.statics.VERIFICATION = VERIFICATION;

module.exports = mongoose.model('DriverProfile', driverProfileSchema, 'driver_profiles');
```

Create `backend/src/models/Vehicle.js`:

```js
const mongoose = require('mongoose');

const VEHICLE_TYPES = ['truck', 'trailer', 'van', 'reefer', 'tanker', 'other'];
const STATUSES = ['active', 'inactive'];

const vehicleSchema = new mongoose.Schema(
  {
    driverProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DriverProfile',
      required: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleType: { type: String, enum: VEHICLE_TYPES, default: 'truck' },
    plate: { type: String, required: true, trim: true, uppercase: true },
    capacityWeightKg: { type: Number, default: 0, min: 0 },
    capacityVolumeM3: { type: Number, default: 0, min: 0 },
    year: { type: Number, default: null },
    status: { type: String, enum: STATUSES, default: 'active' },
  },
  { timestamps: true }
);

vehicleSchema.index({ plate: 1 }, { unique: true });
vehicleSchema.index({ driverProfileId: 1 });
vehicleSchema.index({ ownerUserId: 1 });

vehicleSchema.statics.VEHICLE_TYPES = VEHICLE_TYPES;
vehicleSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Vehicle', vehicleSchema);
```

Field is `vehicleType`, **not** `type`.

Create `backend/src/models/Document.js`:

```js
const mongoose = require('mongoose');

const KINDS = [
  'driving_license',
  'vehicle_registration',
  'safety_card',
  'national_id',
  'professional_card',
  'other',
];
const VERIFICATION = ['pending', 'approved', 'rejected'];

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    kind: { type: String, enum: KINDS, required: true },
    storageKey: { type: String, default: '' },
    originalName: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    verificationStatus: { type: String, enum: VERIFICATION, default: 'pending' },
    reviewedAt: { type: Date, default: null },
    reviewerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: { type: String, default: '' },
  },
  { timestamps: true }
);

documentSchema.index({ userId: 1, kind: 1 });
documentSchema.index({ verificationStatus: 1 });

documentSchema.statics.KINDS = KINDS;
documentSchema.statics.VERIFICATION = VERIFICATION;

module.exports = mongoose.model('Document', documentSchema);
```

No `Buffer` fields. `kind` not `type`.

**Verify**:

```bash
cd backend && node -e "['DriverProfile','Vehicle','Document'].forEach((n) => require('./src/models/' + n)); console.log('ok')"
```

Expected: `ok`.

### Step 5: Cargo, Offer, Shipment, ShipmentEvent

Create `backend/src/models/Cargo.js`:

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

`origin` and `destination` are required so a persisted cargo always has
map pins. Drafts in a later CRUD plan may keep incomplete state **in the
client** until both places exist, or that plan can relax `required` — do
not relax it here.

Create `backend/src/models/Offer.js`:

```js
const mongoose = require('mongoose');

const STATUSES = ['pending', 'accepted', 'rejected', 'withdrawn'];

const offerSchema = new mongoose.Schema(
  {
    cargoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cargo',
      required: true,
    },
    driverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    priceRial: { type: Number, required: true, min: 0 },
    note: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'pending' },
  },
  { timestamps: true }
);

offerSchema.index({ cargoId: 1, status: 1 });
offerSchema.index({ driverUserId: 1, status: 1 });
offerSchema.index({ cargoId: 1, driverUserId: 1 });

offerSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Offer', offerSchema);
```

Do **not** add a unique index on `(cargoId, driverUserId)` yet — a driver
may submit a new offer after withdrawing. Matching/accept logic is a later
plan.

Create `backend/src/models/Shipment.js`:

```js
const mongoose = require('mongoose');

const STATUSES = [
  'assigned',
  'loading',
  'in_transit',
  'at_customs',
  'delivered',
  'completed',
  'cancelled',
];

const shipmentSchema = new mongoose.Schema(
  {
    cargoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cargo',
      required: true,
    },
    offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Offer',
      required: true,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    driverUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    status: { type: String, enum: STATUSES, default: 'assigned' },
    pickupAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

shipmentSchema.index({ cargoId: 1 }, { unique: true });
shipmentSchema.index({ driverUserId: 1, status: 1 });
shipmentSchema.index({ ownerUserId: 1, status: 1 });

shipmentSchema.statics.STATUSES = STATUSES;

module.exports = mongoose.model('Shipment', shipmentSchema);
```

Create `backend/src/models/ShipmentEvent.js`. The domain field is
`eventType` so we do not fight Mongoose `type`. Store optional GeoJSON
via the shared point schema:

```js
const mongoose = require('mongoose');
const { geoPointSchema } = require('./geoPoint');

const EVENT_TYPES = [
  'status_change',
  'cargo_loaded',
  'driver_departed',
  'checkpoint',
  'customs_stop',
  'note',
];

const shipmentEventSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shipment',
      required: true,
    },
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    fromStatus: { type: String, default: null },
    toStatus: { type: String, default: null },
    note: { type: String, default: '' },
    location: { type: geoPointSchema, default: null },
    occurredAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

shipmentEventSchema.index({ shipmentId: 1, occurredAt: 1 });

shipmentEventSchema.statics.EVENT_TYPES = EVENT_TYPES;

module.exports = mongoose.model('ShipmentEvent', shipmentEventSchema);
```

`occurredAt` is the domain timestamp from the RFP ("Recording key events
timestamp"). `createdAt` from `{ timestamps: true }` is insert time — do
not collapse them.

**Verify**:

```bash
cd backend && node -e "['Cargo','Offer','Shipment','ShipmentEvent'].forEach((n) => require('./src/models/' + n)); console.log('ok')"
```

Expected: `ok`.

### Step 6: Identity model tests

Create `backend/test/__tests__/models.identity.test.js`. First line MUST
be `require('../setup');`.

```js
require('../setup');
const mongoose = require('mongoose');
const User = require('../../src/models/User');
const DriverProfile = require('../../src/models/DriverProfile');
const Vehicle = require('../../src/models/Vehicle');
const Document = require('../../src/models/Document');

async function makeUser(overrides = {}) {
  return User.create({
    phone: overrides.phone || '+989121111111',
    name: 'آزمون',
    ...overrides,
  });
}

describe('identity models', () => {
  it('creates a user with default cargo_owner role and unique phone', async () => {
    const user = await makeUser();
    expect(user.roles).toEqual(['cargo_owner']);
    expect(user.status).toBe('active');
    expect(user.phoneVerifiedAt).toBeNull();
    await expect(makeUser({ phone: user.phone })).rejects.toThrow();
  });

  it('rejects a user without phone', async () => {
    await expect(User.create({ name: 'x' })).rejects.toThrow();
  });

  it('rejects an unknown role', async () => {
    await expect(makeUser({ phone: '+989122222222', roles: ['company'] })).rejects.toThrow();
  });

  it('creates a driver profile 1-1 with user and a vehicle with unique plate', async () => {
    const user = await makeUser({
      phone: '+989123333333',
      roles: ['driver'],
    });
    const profile = await DriverProfile.create({ userId: user._id, licenseNumber: 'L-1' });
    expect(profile.verificationStatus).toBe('pending');
    await expect(DriverProfile.create({ userId: user._id })).rejects.toThrow();

    const vehicle = await Vehicle.create({
      driverProfileId: profile._id,
      ownerUserId: user._id,
      plate: '12ایران345',
      vehicleType: 'reefer',
      capacityWeightKg: 18000,
    });
    expect(vehicle.status).toBe('active');
    await expect(
      Vehicle.create({
        driverProfileId: profile._id,
        ownerUserId: user._id,
        plate: '12ایران345',
      })
    ).rejects.toThrow();
  });

  it('stores a document metadata stub without a file buffer', async () => {
    const user = await makeUser({ phone: '+989124444444', roles: ['driver'] });
    const doc = await Document.create({
      userId: user._id,
      kind: 'driving_license',
      storageKey: 'uploads/dev/license-1',
      originalName: 'license.jpg',
      mimeType: 'image/jpeg',
    });
    expect(doc.verificationStatus).toBe('pending');
    expect(doc.toObject().data).toBeUndefined();
  });

  it('User has no schema path named id', () => {
    expect(User.schema.path('id')).toBeUndefined();
    expect(User.schema.path('phone')).toBeDefined();
  });
});
```

Do not `require` `mongoose` only to unused-lint — `mongoose` is imported so
future assertions can use `mongoose.Types.ObjectId` if you add one; if the
linter is unused-var only, drop the mongoose import. There is no ESLint in
`backend/` today — keep the import if you use ObjectId, otherwise omit it.

Prefer the file **without** an unused `mongoose` import if you do not use it.

**Verify later in Step 8** with `npm test`.

### Step 7: Cargo / shipment model tests

Create `backend/test/__tests__/models.cargo.test.js`:

```js
require('../setup');
const User = require('../../src/models/User');
const DriverProfile = require('../../src/models/DriverProfile');
const Vehicle = require('../../src/models/Vehicle');
const Cargo = require('../../src/models/Cargo');
const Offer = require('../../src/models/Offer');
const Shipment = require('../../src/models/Shipment');
const ShipmentEvent = require('../../src/models/ShipmentEvent');

const tehran = { address: 'تهران', location: { type: 'Point', coordinates: [51.389, 35.689] } };
const esfahan = { address: 'اصفهان', location: { type: 'Point', coordinates: [51.677, 32.654] } };

async function seedParties() {
  const owner = await User.create({ phone: '+989125555555', name: 'صاحب کالا' });
  const driver = await User.create({
    phone: '+989126666666',
    name: 'راننده',
    roles: ['driver'],
  });
  const profile = await DriverProfile.create({ userId: driver._id });
  const vehicle = await Vehicle.create({
    driverProfileId: profile._id,
    ownerUserId: driver._id,
    plate: '21ب34567',
  });
  return { owner, driver, vehicle };
}

describe('cargo shipment models', () => {
  it('persists origin/destination as GeoJSON Point [lng, lat] and defaults draft', async () => {
    const { owner } = await seedParties();
    const cargo = await Cargo.create({
      ownerUserId: owner._id,
      title: 'بار یخچالی',
      origin: tehran,
      destination: esfahan,
      dimensions: { weightKg: 12000, volumeM3: 40 },
      specialCharacteristics: ['refrigerated'],
    });
    expect(cargo.status).toBe('draft');
    expect(cargo.origin.location.type).toBe('Point');
    expect(cargo.origin.location.coordinates[0]).toBe(51.389);
    expect(cargo.origin.location.coordinates[1]).toBe(35.689);
  });

  it('rejects cargo without origin.location', async () => {
    const { owner } = await seedParties();
    await expect(
      Cargo.create({
        ownerUserId: owner._id,
        destination: esfahan,
      })
    ).rejects.toThrow();
  });

  it('rejects coordinates that are not a 2-number pair', async () => {
    const { owner } = await seedParties();
    await expect(
      Cargo.create({
        ownerUserId: owner._id,
        origin: { address: 'x', location: { type: 'Point', coordinates: [51.389] } },
        destination: esfahan,
      })
    ).rejects.toThrow();
  });

  it('queries cargo near a point via 2dsphere', async () => {
    const { owner } = await seedParties();
    await Cargo.create({
      ownerUserId: owner._id,
      origin: tehran,
      destination: esfahan,
    });
    const found = await Cargo.find({
      'origin.location': {
        $near: {
          $geometry: { type: 'Point', coordinates: [51.39, 35.69] },
          $maxDistance: 5000,
        },
      },
    });
    expect(found.length).toBe(1);
  });

  it('creates an offer in rials and a unique shipment per cargo with an event log', async () => {
    const { owner, driver, vehicle } = await seedParties();
    const cargo = await Cargo.create({
      ownerUserId: owner._id,
      origin: tehran,
      destination: esfahan,
      status: 'open',
    });
    const offer = await Offer.create({
      cargoId: cargo._id,
      driverUserId: driver._id,
      vehicleId: vehicle._id,
      priceRial: 85_000_000,
    });
    expect(offer.status).toBe('pending');

    const shipment = await Shipment.create({
      cargoId: cargo._id,
      offerId: offer._id,
      ownerUserId: owner._id,
      driverUserId: driver._id,
      vehicleId: vehicle._id,
    });
    expect(shipment.status).toBe('assigned');

    await expect(
      Shipment.create({
        cargoId: cargo._id,
        offerId: offer._id,
        ownerUserId: owner._id,
        driverUserId: driver._id,
        vehicleId: vehicle._id,
      })
    ).rejects.toThrow();

    const event = await ShipmentEvent.create({
      shipmentId: shipment._id,
      eventType: 'status_change',
      fromStatus: 'assigned',
      toStatus: 'loading',
      location: { type: 'Point', coordinates: [51.389, 35.689] },
    });
    expect(event.occurredAt).toBeInstanceOf(Date);
    expect(event.location.type).toBe('Point');
  });

  it('rejects an unknown shipment status', async () => {
    const { owner, driver, vehicle } = await seedParties();
    const cargo = await Cargo.create({
      ownerUserId: owner._id,
      origin: tehran,
      destination: esfahan,
    });
    const offer = await Offer.create({
      cargoId: cargo._id,
      driverUserId: driver._id,
      vehicleId: vehicle._id,
      priceRial: 1,
    });
    await expect(
      Shipment.create({
        cargoId: cargo._id,
        offerId: offer._id,
        ownerUserId: owner._id,
        driverUserId: driver._id,
        vehicleId: vehicle._id,
        status: 'Started',
      })
    ).rejects.toThrow();
  });
});
```

Numeric separator `85_000_000` is valid in the Node version Jest 29 runs
(Node 16+). If it ever throws SyntaxError, write `85000000`.

**Verify later in Step 8.**

### Step 8: Run the suite and confirm the API surface did not grow

```bash
cd backend && npm test
```

Expected: Jest exit 0. Previous 2 health tests still pass. New identity +
cargo tests pass. Count is 2 health + the cases listed above (identity 6,
cargo 6 → **14 total** if you kept every `it` as written).

Then:

```bash
cd backend && node -e "require('./src/app'); require('./src/index'); console.log('ok')"
grep -n "app.get('/health'" backend/src/app.js
ls backend/src/routes 2>/dev/null || echo 'no routes dir'
git status --short
```

**Verify**:

- prints `ok` and does **not** bind a port
- health route still present
- `no routes dir`
- changed files are only under `backend/src/models/`, `backend/test/__tests__/models.*.test.js`, and `plans/README.md`
- `mobile/` and `webapp/` absent from `git status`

### Step 9: Commit and mark the plan done

```bash
git add backend/src/models backend/test/__tests__/models.identity.test.js backend/test/__tests__/models.cargo.test.js plans/README.md
git status
git commit -m "feat(011): add Phase 1 Mongoose domain models"
```

Set this plan's row in `plans/README.md` to `DONE`.

**Verify**: `git log -1 --oneline` mentions `011`.

## Test plan

- `backend/test/__tests__/health.test.js` — unchanged, still 2 cases.
- `backend/test/__tests__/models.identity.test.js` — User unique phone,
  required phone, rejected unknown role, DriverProfile 1-1, Vehicle unique
  plate, Document metadata-only, no `id` path on User.
- `backend/test/__tests__/models.cargo.test.js` — GeoJSON round-trip,
  missing origin, bad coordinates, `$near` 2dsphere, offer + unique
  shipment + event with Point, rejected free-text status `"Started"`.
- Structural pattern: existing `health.test.js` (`require('../setup')` first).
- Verification: `cd backend && npm test` → all pass, including new tests.

Do **not** add a disconnected-mongo 503 case (races `afterAll`).

Do **not** start a real `mongod` for this plan. Memory server is enough;
`$near` works on `MongoMemoryServer`.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `ls backend/src/models` lists `geoPoint.js User.js DriverProfile.js Vehicle.js Document.js Cargo.js Offer.js Shipment.js ShipmentEvent.js`
- [ ] `cd backend && npm test` exits 0; health tests still pass
- [ ] `cd backend && node -e "require('./src/models/User'); require('./src/models/Cargo'); require('./src/index'); console.log('ok')"` prints `ok` and returns
- [ ] `grep -n "app.get('/health'" backend/src/app.js` still matches
- [ ] `ls backend/src/routes 2>/dev/null` is empty / missing
- [ ] `grep -R "firebase\\|bullmq\\|ioredis\\|stripe\\|otpHash\\|password" backend/src/models` has no matches
- [ ] `grep -n "2dsphere" backend/src/models/Cargo.js` matches origin and destination
- [ ] GeoJSON `type` is double-nested in `backend/src/models/geoPoint.js` (`type: { type: String`)
- [ ] No schema field named `id` (`grep -n "id:" backend/src/models/*.js` only hits `userId` / `cargoId` / `ownerUserId` / `driverUserId` / `vehicleId` / `offerId` / `shipmentId` / `reviewerUserId` / `nationalId` / `_id: false`)
- [ ] `git status` shows no modifications under `mobile/`
- [ ] `plans/README.md` status row for 011 is `DONE`

## STOP conditions

Stop and report back (do not improvise) if:

- `backend/src/app.js` is missing (010 not present).
- `backend/src/models/` already exists with domain files.
- The code at the locations in "Current state" does not match (app.js grew
  routes, or Jest no longer uses `require('../setup')`).
- `mongodb-memory-server` cannot start after one `MONGOMS_SYSTEM_BINARY` retry.
- `$near` fails because memory Mongo has no geo indexes — do **not** switch
  to `MongoMemoryReplSet` to "fix" it; report the error. (`MongoMemoryServer`
  supports 2dsphere. If createIndexes did not run, call `await Cargo.init()`
  in the `$near` test before querying, then retry once.)
- You believe models should live in TypeScript, Prisma, or inside `mobile/`.
- You are about to add `/api/users`, JWT, OTP, or multer "while you're here".
- A step seems to require editing `mobile/` or `app.js`.
- Unique indexes fail on `null` phone duplicates — phone is required, so
  that should not happen; if it does, STOP rather than adding a sparse index.

## Maintenance notes

- Phone OTP auth (next slice) should reuse `User.phone` + `phoneVerifiedAt`.
  Normalize to a single canonical form (likely `+98…`) in that plan, then
  backfill. Do not add a second `mobile` field.
- Cargo draft CRUD should not rename `ownerUserId` / `origin` /
  `destination` / `dimensions` / `specialCharacteristics`. If drafts must
  save without pins, that plan relaxes `placeSchema` required — not this one.
- Accept-offer flow (later): one transaction is **not** available on
  `MongoMemoryServer` (no replica set, by 010 design). Use sequential writes
  + unique `Shipment.cargoId` as the guard, or a later plan switches tests
  to `MongoMemoryReplSet` when it actually needs multi-doc transactions.
- Document upload later uses `storageKey` + multer on a **specific** route.
  Do not raise the global 100kb JSON cap; do not put bytes in Mongo.
- Phase 2 Company/Fleet: add `companyId` nullable on Vehicle/DriverProfile
  then — do not add it now.
- Phase 2 GPS: new `VehiclePosition` capped collection or time-series.
  Do not write GPS points into `ShipmentEvent`.
- Matching "vehicles near pickup" will query `Cargo.origin.location` and a
  later live-location collection — not Vehicle (Vehicle has no point today
  on purpose).
- Reviewers: confirm no `type:` field except the GeoJSON double-nest; confirm
  collection name `cargos` (not `cargoes`); confirm rials are integers.
- Follow-ups explicitly deferred: OTP auth, cargo HTTP CRUD, driver
  verification UI, admin web shell, notifications, payments, companies.

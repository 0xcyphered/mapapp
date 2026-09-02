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
    expect(cargo.transportMode).toBe('land');
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
    await Cargo.init();
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
      priceRial: 85000000,
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
});

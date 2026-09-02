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

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

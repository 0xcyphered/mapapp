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

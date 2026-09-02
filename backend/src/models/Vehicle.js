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

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

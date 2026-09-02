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

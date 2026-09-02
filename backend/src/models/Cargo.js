const mongoose = require('mongoose');
const { placeSchema } = require('./geoPoint');

const STATUSES = ['draft', 'open', 'matched', 'cancelled', 'completed'];
const SPECIAL = ['hazardous', 'fragile', 'refrigerated', 'livestock', 'oversized', 'other'];
const TRANSPORT_MODES = ['land', 'sea', 'air', 'rail', 'multimodal'];

const cargoSchema = new mongoose.Schema(
  {
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    title: { type: String, default: '', trim: true },
    description: { type: String, default: '' },
    transportMode: {
      type: String,
      enum: TRANSPORT_MODES,
      default: 'land',
    },
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
cargoSchema.index({ transportMode: 1, status: 1 });

cargoSchema.statics.STATUSES = STATUSES;
cargoSchema.statics.SPECIAL = SPECIAL;
cargoSchema.statics.TRANSPORT_MODES = TRANSPORT_MODES;

module.exports = mongoose.model('Cargo', cargoSchema, 'cargos');

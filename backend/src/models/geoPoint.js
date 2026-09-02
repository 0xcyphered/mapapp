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

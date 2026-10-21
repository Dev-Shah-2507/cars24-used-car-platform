const mongoose = require('mongoose');
const { STATUSES } = require('../utils/statusRules');

const CONDITION_LEVELS = ['poor', 'fair', 'good', 'excellent'];
const FUEL_TYPES = ['Petrol', 'Diesel', 'CNG', 'Electric'];
const TRANSMISSIONS = ['Manual', 'Automatic'];
const REFURB_STATUSES = ['Not Started', 'In Progress', 'Completed'];

/*
 * Single source of truth for a car's lifecycle.
 * The former Listing model is merged in here: a vehicle is "listed" when
 * status === 'Available for Sale' (sellingPrice + refurbishmentStatus live on the vehicle).
 */
const vehicleSchema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, required: true, min: 1990 },
    mileage: { type: Number, required: true, min: 0 },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    transmission: { type: String, enum: TRANSMISSIONS, required: true },
    condition: {
      exterior: { type: String, enum: CONDITION_LEVELS, required: true },
      interior: { type: String, enum: CONDITION_LEVELS, required: true },
      mechanical: { type: String, enum: CONDITION_LEVELS, required: true },
    },
    // Set by the evaluator when the inspection report is submitted (there is no automatic estimate).
    finalOffer: { type: Number, default: null },
    status: { type: String, enum: STATUSES, default: 'Submitted', index: true },
    imageUrl: { type: String, default: '/images/car.svg' },
    // Set by admin during refurbishment / listing
    refurbishmentStatus: { type: String, enum: REFURB_STATUSES, default: 'Not Started' },
    sellingPrice: { type: Number, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
module.exports.CONDITION_LEVELS = CONDITION_LEVELS;
module.exports.FUEL_TYPES = FUEL_TYPES;
module.exports.TRANSMISSIONS = TRANSMISSIONS;
module.exports.REFURB_STATUSES = REFURB_STATUSES;

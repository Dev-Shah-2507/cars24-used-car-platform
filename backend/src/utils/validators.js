const { CONDITION_LEVELS, FUEL_TYPES, TRANSMISSIONS } = require('../models/Vehicle');

const str = (v) => (typeof v === 'string' ? v.trim() : '');

// Validates seller input and returns ONLY the whitelisted fields (client can never set status, quote, seller, etc.).
function validateVehicleInput(body = {}) {
  const errors = [];
  const thisYear = new Date().getFullYear();

  const make = str(body.make);
  const model = str(body.model);
  if (!make || make.length > 50) errors.push('Make is required (max 50 characters).');
  if (!model || model.length > 50) errors.push('Model is required (max 50 characters).');

  const year = Number(body.year);
  if (!Number.isInteger(year) || year < 1990 || year > thisYear) {
    errors.push(`Manufacturing year must be between 1990 and ${thisYear}.`);
  }

  const mileage = Number(body.mileage);
  if (body.mileage === '' || body.mileage == null || !Number.isFinite(mileage) || mileage < 0 || mileage > 1000000) {
    errors.push('Mileage must be a number between 0 and 1,000,000 km.');
  }

  if (!FUEL_TYPES.includes(body.fuelType)) errors.push(`Fuel type must be one of: ${FUEL_TYPES.join(', ')}.`);
  if (!TRANSMISSIONS.includes(body.transmission)) errors.push(`Transmission must be one of: ${TRANSMISSIONS.join(', ')}.`);

  const c = body.condition || {};
  for (const part of ['exterior', 'interior', 'mechanical']) {
    if (!CONDITION_LEVELS.includes(c[part])) {
      errors.push(`Condition of ${part} must be one of: ${CONDITION_LEVELS.join(', ')}.`);
    }
  }

  const data = {
    make, model, year, mileage: Math.round(mileage),
    fuelType: body.fuelType, transmission: body.transmission,
    condition: { exterior: c.exterior, interior: c.interior, mechanical: c.mechanical },
  };
  return { errors, data };
}

// Returns an error string, or null if the date is acceptable (today or later; 1 day tolerance for time zones).
function validateAppointmentDate(value) {
  if (!value) return 'Inspection date is required.';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Inspection date is not a valid date.';
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  if (date.getTime() < todayUtc.getTime() - 24 * 60 * 60 * 1000) return 'Inspection date cannot be in the past.';
  return null;
}

module.exports = { validateVehicleInput, validateAppointmentDate };

// Evaluator report input. Ratings are whole numbers 1-10, notes and the offer price are required.
function validateInspectionInput(body = {}) {
  const errors = [];
  const r = body.ratings || {};
  const ratings = {};
  for (const part of ['exterior', 'interior', 'mechanical']) {
    const n = Number(r[part]);
    if (r[part] === '' || r[part] == null || !Number.isInteger(n) || n < 1 || n > 10) {
      errors.push(`Rating for ${part} must be a whole number from 1 to 10.`);
    }
    ratings[part] = n;
  }
  const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (!notes) errors.push('Inspection notes are required.');
  if (notes.length > 1000) errors.push('Inspection notes are too long (max 1000 characters).');

  // The evaluator decides the price offered to the seller (no automatic valuation).
  const offerPrice = Number(body.offerPrice);
  if (body.offerPrice === '' || body.offerPrice == null || !Number.isFinite(offerPrice) || offerPrice <= 0 || offerPrice > 100000000) {
    errors.push('Offer price must be a positive amount (up to 10,00,00,000).');
  }
  return { errors, data: { ratings, notes, offerPrice: Math.round(offerPrice) } };
}

module.exports.validateInspectionInput = validateInspectionInput;

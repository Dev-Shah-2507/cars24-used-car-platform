const Vehicle = require('../models/Vehicle');
const Inspection = require('../models/Inspection');

// Buyers only ever see vehicles that are Available for Sale, and never internal values
// (seller identity and the offer price paid to the seller).
const PUBLIC_FIELDS = 'make model year mileage fuelType transmission sellingPrice imageUrl status';

const num = (v) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

exports.listVehicles = async (req, res, next) => {
  try {
    const filter = { status: 'Available for Sale' };

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    if (search) {
      // every word must match the make or the model, so "honda city" works
      filter.$and = search.split(/\s+/).slice(0, 5).map((term) => {
        const re = new RegExp(escapeRegex(term), 'i');
        return { $or: [{ make: re }, { model: re }] };
      });
    }
    const range = (min, max) => {
      const r = {};
      if (min !== null) r.$gte = min;
      if (max !== null) r.$lte = max;
      return Object.keys(r).length ? r : null;
    };
    const price = range(num(req.query.minPrice), num(req.query.maxPrice));
    const year = range(num(req.query.minYear), num(req.query.maxYear));
    if (price) filter.sellingPrice = price;
    if (year) filter.year = year;

    const vehicles = await Vehicle.find(filter).select(PUBLIC_FIELDS).sort({ updatedAt: -1 });
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
};

exports.getVehicle = async (req, res, next) => {
  try {
    const vehicle = await Vehicle.findOne({ _id: req.params.id, status: 'Available for Sale' }).select(PUBLIC_FIELDS);
    if (!vehicle) return res.status(404).json({ message: 'This vehicle is no longer available.' });
    const inspection = await Inspection.findOne({ vehicle: vehicle._id, status: 'Completed' })
      .select('ratings notes completedAt');
    res.json({ vehicle, inspection });
  } catch (err) {
    next(err);
  }
};

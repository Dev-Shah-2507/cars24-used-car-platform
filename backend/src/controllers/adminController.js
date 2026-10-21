const Vehicle = require('../models/Vehicle');
const Inspection = require('../models/Inspection');
const { REFURB_STATUSES } = require('../models/Vehicle');
const { STATUSES, assertTransition } = require('../utils/statusRules');

// Statuses an admin may set. Earlier steps belong to the seller / evaluator workflow.
const ADMIN_TARGETS = ['Purchased', 'Under Refurbishment', 'Available for Sale', 'Sold'];

exports.stats = async (req, res, next) => {
  try {
    const rows = await Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    rows.forEach((r) => { counts[r._id] = r.count; });
    res.json({ total: Object.values(counts).reduce((a, b) => a + b, 0), counts });
  } catch (err) {
    next(err);
  }
};

exports.listVehicles = async (req, res, next) => {
  try {
    const filter = STATUSES.includes(req.query.status) ? { status: req.query.status } : {};
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 }).populate('seller', 'name email').lean();
    const inspections = await Inspection.find({ vehicle: { $in: vehicles.map((v) => v._id) } })
      .select('vehicle status appointmentDate completedAt').lean();
    const byVehicle = new Map(inspections.map((i) => [String(i.vehicle), i]));
    res.json({ vehicles: vehicles.map((v) => ({ ...v, inspection: byVehicle.get(String(v._id)) || null })) });
  } catch (err) {
    next(err);
  }
};

exports.listListings = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ status: 'Available for Sale' }).sort({ updatedAt: -1 });
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { status, sellingPrice } = req.body;
    if (!ADMIN_TARGETS.includes(status)) {
      return res.status(400).json({ message: `Admin can only set: ${ADMIN_TARGETS.join(', ')}.` });
    }
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    assertTransition(vehicle.status, status);

    const update = { status };
    if (status === 'Under Refurbishment') update.refurbishmentStatus = 'In Progress';
    if (status === 'Available for Sale') {
      if (vehicle.refurbishmentStatus !== 'Completed') {
        return res.status(400).json({ message: 'Refurbishment must be marked Completed before listing the vehicle for sale.' });
      }
      const raw = sellingPrice ?? vehicle.sellingPrice;
      const price = Number(raw);
      if (raw == null || raw === '' || !Number.isFinite(price) || price <= 0 || price > 100000000) {
        return res.status(400).json({ message: 'A valid selling price is required to list the vehicle.' });
      }
      update.sellingPrice = Math.round(price);
    }

    // Atomic: only applies if the vehicle is still in the status we validated against.
    const updated = await Vehicle.findOneAndUpdate({ _id: vehicle._id, status: vehicle.status }, update, { new: true });
    if (!updated) return res.status(400).json({ message: 'Vehicle status changed meanwhile. Please refresh.' });
    res.json({ vehicle: updated });
  } catch (err) {
    next(err);
  }
};

exports.updateRefurbishment = async (req, res, next) => {
  try {
    const { refurbishmentStatus } = req.body;
    if (!REFURB_STATUSES.includes(refurbishmentStatus)) {
      return res.status(400).json({ message: `Refurbishment status must be one of: ${REFURB_STATUSES.join(', ')}.` });
    }
    const updated = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, status: 'Under Refurbishment' },
      { refurbishmentStatus },
      { new: true }
    );
    if (!updated) {
      const exists = await Vehicle.exists({ _id: req.params.id });
      return res.status(exists ? 400 : 404).json({
        message: exists ? 'Refurbishment can only be updated while the vehicle is Under Refurbishment.' : 'Vehicle not found.',
      });
    }
    res.json({ vehicle: updated });
  } catch (err) {
    next(err);
  }
};

const Inspection = require('../models/Inspection');
const Vehicle = require('../models/Vehicle');
const { assertTransition } = require('../utils/statusRules');
const { validateInspectionInput } = require('../utils/validators');

// Shared queue: every evaluator sees all inspections; the one who submits the report is recorded.
const VEHICLE_FIELDS = '-__v';

exports.listInspections = async (req, res, next) => {
  try {
    const filter = {};
    if (['Scheduled', 'Completed'].includes(req.query.status)) filter.status = req.query.status;
    const sort = filter.status === 'Completed' ? { completedAt: -1 } : { appointmentDate: 1 };
    const inspections = await Inspection.find(filter).sort(sort).populate('vehicle', VEHICLE_FIELDS);
    res.json({ inspections });
  } catch (err) {
    next(err);
  }
};

exports.getInspection = async (req, res, next) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('evaluator', 'name')
      .populate({ path: 'vehicle', select: VEHICLE_FIELDS, populate: { path: 'seller', select: 'name' } });
    if (!inspection) return res.status(404).json({ message: 'Inspection not found.' });
    res.json({ inspection });
  } catch (err) {
    next(err);
  }
};

exports.submitInspection = async (req, res, next) => {
  try {
    const { errors, data } = validateInspectionInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const existing = await Inspection.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Inspection not found.' });
    if (existing.status !== 'Scheduled') {
      return res.status(400).json({ message: 'This inspection has already been completed.' });
    }
    const vehicle = await Vehicle.findById(existing.vehicle);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    // Both steps of the lifecycle are validated: Inspection Pending -> Inspection Completed -> Offer Generated
    assertTransition(vehicle.status, 'Inspection Completed');
    assertTransition('Inspection Completed', 'Offer Generated');

    // Atomic claim so two submissions cannot both complete the same inspection.
    const inspection = await Inspection.findOneAndUpdate(
      { _id: existing._id, status: 'Scheduled' },
      { status: 'Completed', evaluator: req.user._id, ratings: data.ratings, notes: data.notes, completedAt: new Date() },
      { new: true }
    );
    if (!inspection) return res.status(400).json({ message: 'This inspection has already been completed.' });

    const finalOffer = data.offerPrice; // entered by the evaluator
    const updated = await Vehicle.findOneAndUpdate(
      { _id: vehicle._id, status: 'Inspection Pending' },
      { status: 'Offer Generated', finalOffer },
      { new: true }
    );
    if (!updated) {
      // roll back the inspection so data never ends up half-updated
      await Inspection.updateOne(
        { _id: existing._id },
        { status: 'Scheduled', evaluator: null, completedAt: null, $unset: { ratings: '' }, notes: '' }
      );
      return res.status(400).json({ message: 'Vehicle is no longer awaiting inspection.' });
    }
    res.json({ inspection, vehicle: updated });
  } catch (err) {
    next(err);
  }
};

const Vehicle = require('../models/Vehicle');
const Inspection = require('../models/Inspection');
const { assertTransition } = require('../utils/statusRules');
const { validateVehicleInput, validateAppointmentDate } = require('../utils/validators');

// Every query is scoped by seller: a seller can never read or change another seller's vehicle.
const ownVehicle = (req) => Vehicle.findOne({ _id: req.params.id, seller: req.user._id });

exports.createVehicle = async (req, res, next) => {
  try {
    const { errors, data } = validateVehicleInput(req.body);
    if (errors.length) return res.status(400).json({ message: errors.join(' ') });

    const vehicle = await Vehicle.create({
      ...data,
      seller: req.user._id,
      status: 'Submitted',
    });
    res.status(201).json({ vehicle });
  } catch (err) {
    next(err);
  }
};

exports.listVehicles = async (req, res, next) => {
  try {
    const vehicles = await Vehicle.find({ seller: req.user._id }).sort({ createdAt: -1 });
    res.json({ vehicles });
  } catch (err) {
    next(err);
  }
};

exports.getVehicle = async (req, res, next) => {
  try {
    const vehicle = await ownVehicle(req);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    const inspection = await Inspection.findOne({ vehicle: vehicle._id }).populate('evaluator', 'name');
    res.json({ vehicle, inspection });
  } catch (err) {
    next(err);
  }
};

exports.bookInspection = async (req, res, next) => {
  try {
    const dateError = validateAppointmentDate(req.body.appointmentDate);
    if (dateError) return res.status(400).json({ message: dateError });

    const vehicle = await ownVehicle(req);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });
    assertTransition(vehicle.status, 'Inspection Pending'); // only valid from "Submitted"

    // Atomic claim: if two requests race, only one can move the vehicle out of "Submitted".
    const claimed = await Vehicle.findOneAndUpdate(
      { _id: vehicle._id, status: 'Submitted' },
      { status: 'Inspection Pending' },
      { new: true }
    );
    if (!claimed) return res.status(400).json({ message: 'An inspection has already been booked for this vehicle.' });

    try {
      const inspection = await Inspection.create({
        vehicle: vehicle._id,
        appointmentDate: new Date(req.body.appointmentDate),
        status: 'Scheduled',
      });
      res.status(201).json({ vehicle: claimed, inspection });
    } catch (err) {
      await Vehicle.updateOne({ _id: vehicle._id }, { status: 'Submitted' }); // roll back
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

exports.respondToOffer = async (req, res, next) => {
  try {
    const { decision } = req.body;
    if (!['accept', 'reject'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be "accept" or "reject".' });
    }
    const vehicle = await ownVehicle(req);
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found.' });

    const target = decision === 'accept' ? 'Offer Accepted' : 'Offer Rejected';
    assertTransition(vehicle.status, target); // only valid from "Offer Generated"

    const updated = await Vehicle.findOneAndUpdate(
      { _id: vehicle._id, status: 'Offer Generated' }, // atomic: cannot be answered twice
      { status: target },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: 'This offer has already been answered.' });
    res.json({ vehicle: updated });
  } catch (err) {
    next(err);
  }
};

const mongoose = require('mongoose');

const rating = { type: Number, min: 1, max: 10 };

const inspectionSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true, unique: true },
    evaluator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // set on submission
    appointmentDate: { type: Date, required: true },
    ratings: { exterior: rating, interior: rating, mechanical: rating },
    notes: { type: String, default: '', trim: true },
    status: { type: String, enum: ['Scheduled', 'Completed'], default: 'Scheduled' },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inspection', inspectionSchema);

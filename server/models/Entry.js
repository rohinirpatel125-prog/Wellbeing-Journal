const mongoose = require('mongoose');

const ROUTINES = [
  'exercise', 'meditation', 'outdoors', 'reading',
  'social time', 'screen-free evening', 'healthy meals', 'caffeine after 3pm',
];

const rating = (label) => ({
  type: Number,
  required: [true, `${label} is required`],
  min: [1, `${label} must be between 1 and 5`],
  max: [5, `${label} must be between 1 and 5`],
  validate: { validator: Number.isInteger, message: `${label} must be a whole number` },
});

const entrySchema = new mongoose.Schema(
  {
    // stored as "YYYY-MM-DD" so there are no timezone surprises; one entry per day
    date: {
      type: String,
      required: [true, 'Date is required'],
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must look like YYYY-MM-DD'],
    },
    sleepHours: {
      type: Number,
      required: [true, 'Sleep hours is required'],
      min: [0, 'Sleep hours cannot be negative'],
      max: [24, 'Sleep hours cannot exceed 24'],
    },
    mood: rating('Mood'),
    energy: rating('Energy'),
    stress: rating('Stress'),
    routines: [{ type: String, enum: ROUTINES }],
    notes: { type: String, trim: true, maxlength: [1000, 'Notes can be at most 1000 characters'], default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Entry', entrySchema);
module.exports.ROUTINES = ROUTINES;

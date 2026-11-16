const { body, param, query, validationResult } = require('express-validator');
const { ROUTINES } = require('../models/Entry');

const rating = (f) => body(f).isInt({ min: 1, max: 5 }).withMessage(`${f} must be a whole number from 1 to 5`).toInt();

const entryRules = [
  body('date')
    .isISO8601({ strict: true, strictSeparator: true }).withMessage('date must be a valid date (YYYY-MM-DD)')
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must look like YYYY-MM-DD')
    .custom((v) => {
      const tomorrow = new Date(Date.now() + 36 * 3600 * 1000).toISOString().slice(0, 10); // tolerance for timezones
      if (v > tomorrow) throw new Error('date cannot be in the future');
      return true;
    }),
  body('sleepHours').isFloat({ min: 0, max: 24 }).withMessage('sleepHours must be a number between 0 and 24').toFloat(),
  rating('mood'),
  rating('energy'),
  rating('stress'),
  body('routines').optional().isArray({ max: ROUTINES.length }).withMessage('routines must be a list'),
  body('routines.*').isIn(ROUTINES).withMessage('unknown routine'),
  body('notes').optional().isString().withMessage('notes must be text').trim().isLength({ max: 1000 }).withMessage('notes can be at most 1000 characters'),
];

const idRule = [param('id').isMongoId().withMessage('invalid entry id')];
const statsRule = [query('days').optional().isInt({ min: 7, max: 365 }).withMessage('days must be between 7 and 365').toInt()];

function handleValidation(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const details = result.array().map((e) => ({ field: e.path, message: e.msg }));
  res.status(400).json({ error: 'ValidationError', message: 'Please fix the highlighted fields', details });
}

module.exports = { entryRules, idRule, statsRule, handleValidation };

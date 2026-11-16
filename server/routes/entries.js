const express = require('express');
const Entry = require('../models/Entry');
const { entryRules, idRule, statsRule, handleValidation } = require('../middleware/validate');
const { buildStats } = require('../stats');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const pick = (b) => ({
  date: b.date, sleepHours: b.sleepHours, mood: b.mood, energy: b.energy, stress: b.stress,
  routines: [...new Set(b.routines || [])], notes: b.notes || '',
});

// GET /api/entries  -> all entries, newest first
router.get('/', wrap(async (req, res) => {
  res.json(await Entry.find().sort({ date: -1 }).limit(1000).lean());
}));

// GET /api/entries/stats?days=30 -> averages, comparison and gentle pattern observations
router.get('/stats', statsRule, handleValidation, wrap(async (req, res) => {
  const days = req.query.days || 30;
  const dayStr = (offset) => new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
  const entries = await Entry.find({ date: { $gte: dayStr(days * 2 - 1) } }).sort({ date: 1 }).lean();
  res.json(buildStats(entries, days, dayStr(days - 1)));
}));

// POST /api/entries
router.post('/', entryRules, handleValidation, wrap(async (req, res) => {
  res.status(201).json(await Entry.create(pick(req.body)));
}));

// PUT /api/entries/:id
router.put('/:id', idRule, entryRules, handleValidation, wrap(async (req, res) => {
  const doc = await Entry.findByIdAndUpdate(req.params.id, pick(req.body), { new: true, runValidators: true });
  if (!doc) return res.status(404).json({ error: 'NotFound', message: 'Entry not found' });
  res.json(doc);
}));

// DELETE /api/entries/:id
router.delete('/:id', idRule, handleValidation, wrap(async (req, res) => {
  const doc = await Entry.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ error: 'NotFound', message: 'Entry not found' });
  res.status(204).end();
}));

module.exports = router;

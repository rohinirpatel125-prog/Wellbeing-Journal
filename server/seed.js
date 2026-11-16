// Fills the database with 45 days of sample entries so charts have something to show.
// Run: npm run seed        (this REPLACES existing entries)
require('./loadEnv');
const mongoose = require('mongoose');
const Entry = require('./models/Entry');

const clamp = (n, a, b) => Math.min(b, Math.max(a, Math.round(n)));
let s = 7; const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280); // deterministic

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Entry.deleteMany({});
  const docs = [];
  for (let i = 44; i >= 0; i--) {
    const date = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const sleep = Math.round((5 + rnd() * 4) * 2) / 2;
    const routines = [];
    if (rnd() > 0.55) routines.push('exercise');
    if (rnd() > 0.7) routines.push('meditation');
    if (rnd() > 0.6) routines.push('outdoors');
    if (rnd() > 0.75) routines.push('caffeine after 3pm');
    const base = 2.2 + (sleep - 5) * 0.35 + (routines.includes('exercise') ? 0.6 : 0);
    docs.push({
      date, sleepHours: sleep,
      mood: clamp(base + rnd(), 1, 5),
      energy: clamp(base + rnd() - 0.2, 1, 5),
      stress: clamp(4 - (sleep - 5) * 0.3 - (routines.includes('meditation') ? 0.8 : 0) + rnd() - 0.4, 1, 5),
      routines,
      notes: i % 9 === 0 ? 'Busy day, but managed a short walk.' : '',
    });
  }
  await Entry.insertMany(docs);
  console.log(`Seeded ${docs.length} entries`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });

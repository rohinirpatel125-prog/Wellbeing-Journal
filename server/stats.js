// Pure functions: no database access, easy to test.
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

function summarize(list) {
  return {
    count: list.length,
    sleepHours: avg(list.map((e) => e.sleepHours)),
    mood: avg(list.map((e) => e.mood)),
    energy: avg(list.map((e) => e.energy)),
    stress: avg(list.map((e) => e.stress)),
  };
}

const MIN_DAYS = 3; // need at least this many days in each group before comparing

function buildStats(entries, days, currentStart) {
  const current = entries.filter((e) => e.date >= currentStart);
  const previous = entries.filter((e) => e.date < currentStart);
  const insights = [];

  // Sleep vs mood
  const longSleep = current.filter((e) => e.sleepHours >= 7);
  const shortSleep = current.filter((e) => e.sleepHours < 7);
  if (longSleep.length >= MIN_DAYS && shortSleep.length >= MIN_DAYS) {
    insights.push({
      title: 'Sleep and mood',
      text: `On days after 7+ hours of sleep your mood averaged ${avg(longSleep.map((e) => e.mood))}, compared with ${avg(shortSleep.map((e) => e.mood))} after less than 7 hours.`,
    });
  }

  // Routines vs mood and stress
  const routines = [...new Set(current.flatMap((e) => e.routines || []))];
  for (const r of routines) {
    const withR = current.filter((e) => (e.routines || []).includes(r));
    const without = current.filter((e) => !(e.routines || []).includes(r));
    if (withR.length < MIN_DAYS || without.length < MIN_DAYS) continue;
    const m1 = avg(withR.map((e) => e.mood)), m0 = avg(without.map((e) => e.mood));
    const s1 = avg(withR.map((e) => e.stress)), s0 = avg(without.map((e) => e.stress));
    if (Math.abs(m1 - m0) >= 0.3 || Math.abs(s1 - s0) >= 0.3) {
      insights.push({
        title: r.charAt(0).toUpperCase() + r.slice(1),
        text: `On ${withR.length} days you logged "${r}": mood averaged ${m1} (vs ${m0} otherwise) and stress ${s1} (vs ${s0}).`,
      });
    }
  }

  return {
    days,
    current: summarize(current),
    previous: summarize(previous),
    series: current.map(({ date, sleepHours, mood, energy, stress }) => ({ date, sleepHours, mood, energy, stress })),
    insights,
    note: 'These are simple comparisons of your own entries. They show patterns, not causes, and are not a diagnosis.',
  };
}

module.exports = { buildStats, summarize };

const DAY = 86400000;

const toDate = (s) => new Date(s + "T00:00:00");
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function focusFor(daysLeft, difficulty) {
  if (daysLeft <= 1) return "Final revision";
  if (daysLeft <= 3) return "Practice papers";
  return difficulty >= 4 ? "Learn new topics" : "Learn & practise";
}

function generatePlan({ subjects, hoursPerDay, weekendHours, startDate }) {
  const start = toDate(startDate);
  const exams = subjects.map((s) => ({ ...s, date: toDate(s.examDate) }));
  const last = new Date(Math.max(...exams.map((e) => e.date)));
  const plan = [];

  for (let d = new Date(start); d < last; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const isWeekend = [0, 6].includes(day.getDay());
    const hours = isWeekend ? weekendHours : hoursPerDay;
    const active = exams.filter((e) => e.date > day);
    if (!active.length || hours <= 0) continue;

    // Closer exam + harder subject = more time
    const daysLeft = active.map((e) => Math.round((e.date - day) / DAY));
    const weights = active.map((e, i) => e.difficulty * (1 + 5 / daysLeft[i]));
    const total = weights.reduce((a, b) => a + b, 0);

    // Split the day into 30-minute blocks
    const blocks = Math.round(hours * 2);
    const alloc = weights.map((w) => Math.floor((w / total) * blocks));
    let left = blocks - alloc.reduce((a, b) => a + b, 0);
    const order = weights.map((_, i) => i).sort((a, b) => weights[b] - weights[a]);
    for (let i = 0; left > 0; i = (i + 1) % order.length, left--) alloc[order[i]]++;

    const sessions = active
      .map((e, i) => ({
        subject: e.name,
        hours: alloc[i] / 2,
        focus: focusFor(daysLeft[i], e.difficulty),
      }))
      .filter((s) => s.hours > 0);

    plan.push({ date: iso(day), weekday: day.toLocaleDateString("en-US", { weekday: "long" }), sessions });
  }
  return plan;
}

module.exports = { generatePlan };
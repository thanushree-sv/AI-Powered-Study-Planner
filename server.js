const express = require("express");
const path = require("path");
const { generatePlan } = require("./planner");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/api/plan", (req, res) => {
  const { subjects, hoursPerDay, weekendHours, startDate } = req.body;
  const valid =
    Array.isArray(subjects) &&
    subjects.length > 0 &&
    subjects.every((s) => s.name && s.examDate && s.examDate > startDate);
  if (!valid) return res.status(400).json({ error: "Add subjects with exam dates in the future." });
  res.json({ plan: generatePlan({ subjects, hoursPerDay, weekendHours, startDate }) });
});

app.post("/api/tips", async (req, res) => {
  const fallback =
    "Study the hardest subject first while your mind is fresh, take a 10-minute break every 50 minutes, and end each day by reviewing what you learned.";
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.json({ tips: fallback });

  try {
    const { subjects, hoursPerDay } = req.body;
    const summary = subjects
      .map((s) => `${s.name} (exam ${s.examDate}, difficulty ${s.difficulty}/5)`)
      .join("; ");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `A student studies ${hoursPerDay} hours a day for these exams: ${summary}. Give 3 short, specific, encouraging study-strategy tips tailored to this mix. Plain text, no markdown, under 90 words.`,
          },
        ],
      }),
    });
    const data = await r.json();
    res.json({ tips: data.content?.[0]?.text || fallback });
  } catch {
    res.json({ tips: fallback });
  }
});

app.listen(process.env.PORT || 3000, () => console.log("Running on http://localhost:3000"));
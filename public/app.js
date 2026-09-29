const COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#db2777", "#7c3aed", "#dc2626"];
const $ = (id) => document.getElementById(id);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Subject form ---------- */

function addSubject(name = "", date = "", diff = 3) {
  const row = document.createElement("div");
  row.className = "subject-row";
  row.innerHTML = `
    <input type="text" placeholder="Subject (e.g. Physics)" value="${esc(name)}" />
    <input type="date" value="${date}" min="${today()}" />
    <select>${[1, 2, 3, 4, 5].map((n) => `<option value="${n}" ${n == diff ? "selected" : ""}>Level ${n}</option>`).join("")}</select>
    <button class="remove" title="Remove">×</button>`;
  row.querySelector(".remove").onclick = () => row.remove();
  $("subjects").appendChild(row);
}

function readSubjects() {
  return [...document.querySelectorAll(".subject-row")]
    .map((r) => {
      const [n, d] = r.querySelectorAll("input");
      return { name: n.value.trim(), examDate: d.value, difficulty: +r.querySelector("select").value };
    })
    .filter((s) => s.name && s.examDate);
}

/* ---------- Calendar ---------- */

let calState = { plan: [], subjects: [], color: {}, month: new Date() };

function render(plan, subjects) {
  const color = Object.fromEntries(subjects.map((s, i) => [s.name, COLORS[i % COLORS.length]]));
  const first = new Date((plan.length ? plan[0].date : today()) + "T00:00:00");
  first.setDate(1);
  calState = { plan, subjects, color, month: first };

  $("legend").innerHTML = subjects
    .map((s) => `<span><i class="dot" style="background:${color[s.name]}"></i>${esc(s.name)} · exam ${s.examDate}</span>`)
    .join("");
  $("detail").hidden = true;
  drawCalendar();
}

function drawCalendar() {
  const { plan, subjects, color, month } = calState;
  const y = month.getFullYear();
  const m = month.getMonth();
  $("monthLabel").textContent = month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDate = Object.fromEntries(plan.map((d) => [d.date, d]));
  const exams = {};
  subjects.forEach((s) => (exams[s.examDate] = exams[s.examDate] || []).push(s.name));

  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // week starts on Monday
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  let html = "";

  for (let i = 0; i < offset; i++) html += `<div class="cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const day = byDate[key];
    const chips = day
      ? day.sessions
          .map((s) => `<div class="chip" style="--c:${color[s.subject]}" title="${esc(s.subject)} · ${s.focus}">${esc(s.subject)} <b>${s.hours}h</b></div>`)
          .join("")
      : "";
    const examTags = (exams[key] || []).map((n) => `<div class="exam" title="Exam: ${esc(n)}">Exam · ${esc(n)}</div>`).join("");
    html += `<div class="cell ${key === today() ? "today" : ""} ${day ? "has" : ""}" data-date="${key}">
      <span class="num">${d}</span>${examTags}${chips}</div>`;
  }

  $("calGrid").innerHTML = html;
  document.querySelectorAll(".cell.has").forEach((c) => (c.onclick = () => showDetail(c.dataset.date)));
}

function showDetail(date) {
  const day = calState.plan.find((d) => d.date === date);
  if (!day) return;
  $("detail").hidden = false;
  $("detail").innerHTML =
    `<h2>${day.weekday}, ${date}</h2>` +
    day.sessions
      .map(
        (s) => `<div class="session">
          <i class="dot" style="background:${calState.color[s.subject]}"></i>
          <span class="name">${esc(s.subject)}</span>
          <span class="focus">${s.focus}</span>
          <span class="hrs">${s.hours}h</span></div>`
      )
      .join("");
  $("detail").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

$("prev").onclick = () => {
  calState.month.setMonth(calState.month.getMonth() - 1);
  drawCalendar();
};
$("next").onclick = () => {
  calState.month.setMonth(calState.month.getMonth() + 1);
  drawCalendar();
};

/* ---------- Generate ---------- */

$("generate").onclick = async () => {
  $("error").textContent = "";
  const subjects = readSubjects();
  const body = {
    subjects,
    hoursPerDay: +$("weekday").value,
    weekendHours: +$("weekend").value,
    startDate: today(),
  };
  $("generate").disabled = true;
  $("generate").textContent = "Planning…";
  try {
    const res = await fetch("/api/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    render(data.plan, subjects);
    $("results").hidden = false;
    $("results").scrollIntoView({ behavior: "smooth" });
    $("tips").textContent = "Thinking…";
    fetch("/api/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then((r) => r.json())
      .then((t) => ($("tips").textContent = t.tips));
  } catch (e) {
    $("error").textContent = e.message || "Something went wrong.";
  } finally {
    $("generate").disabled = false;
    $("generate").textContent = "Generate my plan";
  }
};

$("addSubject").onclick = () => addSubject();
addSubject();
addSubject();
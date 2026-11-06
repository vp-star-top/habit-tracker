
const STORAGE_KEY = "monthlyHabitTracker_v1";
const TIMER_KEY = "habitQuestTimer_v1";

const defaultHabits = [
  "Wake up early",
  "Exercise",
  "Study Maths",
  "Study Physics",
  "Study Chemistry",
  "Read English",
  "Practice English",
  "Drink enough water",
  "Avoid distractions",
  "Sleep on time"
];

let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

let habits = saved?.habits || defaultHabits.map((name, i) => ({
  id: "habit_" + i,
  name
}));

let records = saved?.records || {};

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    habits,
    records
  }));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// ---------------- HABIT TRACKER ----------------

const monthPicker = document.getElementById("monthPicker");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const chart = document.getElementById("progressChart");

const today = new Date();
const currentMonth = localDateKey().slice(0, 7);
monthPicker.value = currentMonth;

function getMonth() {
  return monthPicker.value || currentMonth;
}

function getDays() {
  const [year, month] = getMonth().split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function getMonthRecords() {
  if (!records[getMonth()]) records[getMonth()] = {};
  return records[getMonth()];
}

function isCompleted(habitId, day) {
  return !!getMonthRecords()[habitId + "_" + day];
}

function renderTable() {
  const days = getDays();

  tableHead.innerHTML = `
    <tr>
      <th>Habit</th>
      ${Array.from({ length: days }, (_, i) =>
        `<th>${i + 1}</th>`
      ).join("")}
      <th>Done</th>
      <th>Action</th>
    </tr>
  `;

  tableBody.innerHTML = habits.map(habit => {
    let completed = 0;

    const checkboxes = Array.from({ length: days }, (_, i) => {
      const day = i + 1;
      const checked = isCompleted(habit.id, day);

      if (checked) completed++;

      return `
        <td>
          <input
            class="habit-check"
            type="checkbox"
            data-id="${escapeHTML(habit.id)}"
            data-day="${day}"
            aria-label="${escapeHTML(habit.name)} day ${day}"
            ${checked ? "checked" : ""}
          >
        </td>
      `;
    }).join("");

    return `
      <tr>
        <td class="habit-name">${escapeHTML(habit.name)}</td>
        ${checkboxes}
        <td class="progress-cell">${completed}/${days}</td>
        <td>
          <button class="edit-btn" data-action="edit"
            data-id="${escapeHTML(habit.id)}" title="Edit">✏️</button>
          <button class="delete-btn" data-action="delete"
            data-id="${escapeHTML(habit.id)}" title="Delete">🗑️</button>
        </td>
      </tr>
    `;
  }).join("");

  if (habits.length === 0) {
    tableBody.innerHTML =
      `<tr><td colspan="${days + 3}">Add your first habit!</td></tr>`;
  }
}

function getDailyData() {
  const days = getDays();

  return Array.from({ length: days }, (_, i) => {
    const completed = habits.filter(habit =>
      isCompleted(habit.id, i + 1)
    ).length;

    return habits.length ? completed / habits.length * 100 : 0;
  });
}

function drawChart() {
  const ctx = chart.getContext("2d");
  const width = chart.clientWidth;
  const height = chart.clientHeight;
  const ratio = window.devicePixelRatio || 1;

  chart.width = width * ratio;
  chart.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const values = getDailyData();
  const left = 38, right = 15, top = 20, bottom = 35;
  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#9992ad";
  ctx.strokeStyle = "#393248";

  [0, 25, 50, 75, 100].forEach(value => {
    const y = top + graphHeight - value / 100 * graphHeight;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
    ctx.fillText(value + "%", left - 8, y + 4);
  });

  const x = i => left +
    (values.length <= 1 ? 0 : i * graphWidth / (values.length - 1));

  const y = value => top + graphHeight - value / 100 * graphHeight;

  if (values.length) {
    const gradient = ctx.createLinearGradient(0, top, 0, height);
    gradient.addColorStop(0, "rgba(155,117,255,0.35)");
    gradient.addColorStop(1, "rgba(155,117,255,0)");

    ctx.beginPath();
    values.forEach((value, i) => {
      if (i === 0) ctx.moveTo(x(i), y(value));
      else ctx.lineTo(x(i), y(value));
    });
    ctx.lineTo(x(values.length - 1), top + graphHeight);
    ctx.lineTo(x(0), top + graphHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, i) => {
      if (i === 0) ctx.moveTo(x(i), y(value));
      else ctx.lineTo(x(i), y(value));
    });
    ctx.strokeStyle = "#a987ff";
    ctx.lineWidth = 3;
    ctx.stroke();

    values.forEach((value, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(value), 3, 0, Math.PI * 2);
      ctx.fillStyle = "#c5adff";
      ctx.fill();
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#9992ad";
  const step = Math.max(1, Math.ceil(values.length / 10));

  values.forEach((_, i) => {
    if (i % step === 0 || i === values.length - 1) {
      ctx.fillText(String(i + 1), x(i), height - 10);
    }
  });
}

function updateStats() {
  const days = getDays();
  const total = habits.length * days;
  let completed = 0;
  let bestHabit = "-";
  let bestCount = 0;

  habits.forEach(habit => {
    let count = 0;

    for (let day = 1; day <= days; day++) {
      if (isCompleted(habit.id, day)) {
        count++;
        completed++;
      }
    }

    if (count > bestCount) {
      bestCount = count;
      bestHabit = habit.name;
    }
  });

  const rate = total ? Math.round(completed / total * 100) : 0;

  document.getElementById("successRate").textContent = rate + "%";
  document.getElementById("completedCount").textContent = completed;
  document.getElementById("totalCount").textContent = total;
  document.getElementById("bestHabit").textContent = bestHabit;
  document.getElementById("monthlyProgress").textContent = rate + "%";

  const start = Math.max(1, days - 6);
  let weekDone = 0;
  const weekTotal = habits.length * (days - start + 1);

  for (let day = start; day <= days; day++) {
    habits.forEach(habit => {
      if (isCompleted(habit.id, day)) weekDone++;
    });
  }

  const weeklyRate = weekTotal
    ? Math.round(weekDone / weekTotal * 100) : 0;

  document.getElementById("weeklyProgress").textContent =
    weeklyRate + "%";

  const activeDays = Array.from(
    { length: days }, (_, i) => i + 1
  ).filter(day =>
    habits.some(habit => isCompleted(habit.id, day))
  ).length;

  document.getElementById("consistency").textContent =
    Math.round(activeDays / days * 100) + "%";

  drawChart();
}

function render() {
  renderTable();
  updateStats();
}

document.getElementById("addHabitBtn").addEventListener("click", () => {
  if (habits.length >= 12) {
    alert("Maximum 12 habits allowed.");
    return;
  }

  const name = prompt("Enter your new habit:");

  if (!name || !name.trim()) return;

  habits.push({
    id: "habit_" + Date.now(),
    name: name.trim()
  });

  saveData();
  render();
});

tableBody.addEventListener("change", event => {
  const checkbox = event.target;

  if (!checkbox.classList.contains("habit-check")) return;

  const key = checkbox.dataset.id + "_" + checkbox.dataset.day;
  const monthRecords = getMonthRecords();

  if (checkbox.checked) monthRecords[key] = true;
  else delete monthRecords[key];

  saveData();
  render();
});

tableBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const habit = habits.find(h => h.id === button.dataset.id);
  if (!habit) return;

  if (button.dataset.action === "edit") {
    const name = prompt("Edit habit name:", habit.name);

    if (name && name.trim()) {
      habit.name = name.trim();
      saveData();
      render();
    }
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${habit.name}"?`)) return;

    const id = habit.id;
    habits = habits.filter(h => h.id !== id);

    Object.values(records).forEach(month => {
      Object.keys(month).forEach(key => {
        if (key.startsWith(id + "_")) delete month[key];
      });
    });

    saveData();
    render();
  }
});

monthPicker.addEventListener("change", render);

// ---------------- FOCUS TIMER ----------------

const defaultSettings = {
  focus: 25,
  short: 5,
  long: 15
};

let timerData = JSON.parse(localStorage.getItem(TIMER_KEY) || "null");

if (!timerData) {
  timerData = {
    settings: { ...defaultSettings },
    sessions: [],
    mode: "focus",
    running: false,
    remaining: 25 * 60,
    endTime: null
  };
}

timerData.settings = {
  ...defaultSettings,
  ...(timerData.settings || {})
};
timerData.sessions = timerData.sessions || [];

let timerInterval = null;

const timerDisplay = document.getElementById("timerDisplay");
const timerStatus = document.getElementById("timerStatus");
const timerMessage = document.getElementById("timerMessage");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const modeNames = {
  focus: "FOCUS SESSION",
  short: "SHORT BREAK",
  long: "LONG BREAK"
};

function durationFor(mode) {
  return timerData.settings[mode] * 60;
}

function saveTimer() {
  localStorage.setItem(TIMER_KEY, JSON.stringify(timerData));
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return String(mins).padStart(2, "0") + ":" +
    String(secs).padStart(2, "0");
}

function renderTimer() {
  timerDisplay.textContent = formatTime(timerData.remaining);
  timerStatus.textContent = timerData.running
    ? modeNames[timerData.mode]
    : timerData.remaining === 0
      ? "SESSION COMPLETE"
      : modeNames[timerData.mode] + " · READY";

  document.querySelectorAll(".mode-btn").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.mode === timerData.mode
    );
  });

  startBtn.textContent = timerData.running
    ? "Running..." : timerData.remaining === 0
      ? "Start Again" : "Start " +
        (timerData.mode === "focus" ? "Focus" : "Break");

  startBtn.disabled = timerData.running;
  pauseBtn.disabled = !timerData.running;
}

function setMode(mode) {
  if (timerData.running) return;

  timerData.mode = mode;
  timerData.remaining = durationFor(mode);
  timerData.endTime = null;

  timerMessage.textContent =
    mode === "focus"
      ? "One task at a time. You've got this."
      : "Take a proper break and recharge.";

  saveTimer();
  renderTimer();
}

function finishSession() {
  clearInterval(timerInterval);
  timerInterval = null;

  const completedMode = timerData.mode;
  timerData.running = false;
  timerData.remaining = 0;
  timerData.endTime = null;

  if (completedMode === "focus") {
    timerData.sessions.push({
      date: localDateKey(),
      minutes: timerData.settings.focus
    });

    timerMessage.textContent =
      "Focus session completed! Time for a break.";

    const focusCount = timerData.sessions.filter(
      session => session.date === localDateKey()
    ).length;

    if (focusCount % 4 === 0) {
      setMode("long");
      timerMessage.textContent =
        "Four focus sessions completed! Enjoy a long break.";
    } else {
      setMode("short");
      timerMessage.textContent =
        "Great work! Take a short break.";
    }
  } else {
    timerMessage.textContent =
      "Break completed. Ready for another focus session?";
    setMode("focus");
  }

  saveTimer();
  renderTimer();
  updateFocusStats();
  notifyCompletion(completedMode);
}

function tick() {
  if (!timerData.running) return;

  timerData.remaining = Math.max(
    0,
    Math.ceil((timerData.endTime - Date.now()) / 1000)
  );

  if (timerData.remaining <= 0) {
    finishSession();
    return;
  }

  renderTimer();
  saveTimer();
}

function startTimer() {
  if (timerData.running) return;

  if (timerData.remaining <= 0) {
    timerData.remaining = durationFor(timerData.mode);
  }

  timerData.running = true;
  timerData.endTime = Date.now() +
    timerData.remaining * 1000;

  saveTimer();
  renderTimer();

  timerInterval = setInterval(tick, 250);
}

function pauseTimer() {
  if (!timerData.running) return;

  timerData.remaining = Math.max(
    0,
    Math.ceil((timerData.endTime - Date.now()) / 1000)
  );

  timerData.running = false;
  timerData.endTime = null;

  clearInterval(timerInterval);
  timerInterval = null;

  saveTimer();
  renderTimer();
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;

  timerData.running = false;
  timerData.endTime = null;
  timerData.remaining = durationFor(timerData.mode);

  saveTimer();
  renderTimer();
  timerMessage.textContent = "Timer reset. Ready when you are.";
}

function notifyCompletion(mode) {
  if ("Notification" in window &&
      Notification.permission === "granted") {
    new Notification(
      mode === "focus" ? "Focus session completed!" : "Break completed!",
      {
        body: mode === "focus"
          ? "Great work. Time to take a break."
          : "Your break is over. Ready to focus?"
      }
    );
  }
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

document.querySelectorAll(".mode-btn").forEach(button => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

// Custom timer settings

const focusInput = document.getElementById("focusDuration");
const shortInput = document.getElementById("shortDuration");
const longInput = document.getElementById("longDuration");

function loadSettings() {
  focusInput.value = timerData.settings.focus;
  shortInput.value = timerData.settings.short;
  longInput.value = timerData.settings.long;
}

function validNumber(input, min, max) {
  const value = Number(input.value);
  return Number.isInteger(value) && value >= min && value <= max;
}

document.getElementById("saveSettingsBtn")
  .addEventListener("click", () => {
    if (timerData.running) {
      alert("Pause the timer before changing settings.");
      return;
    }

    if (
      !validNumber(focusInput, 5, 120) ||
      !validNumber(shortInput, 1, 30) ||
      !validNumber(longInput, 5, 60)
    ) {
      alert("Enter valid whole numbers within the allowed ranges.");
      return;
    }

    timerData.settings = {
      focus: Number(focusInput.value),
      short: Number(shortInput.value),
      long: Number(longInput.value)
    };

    timerData.remaining = durationFor(timerData.mode);

    saveTimer();
    renderTimer();

    document.getElementById("settingsMessage").textContent =
      "Settings saved successfully!";
  });

function updateFocusStats() {
  const todayKey = localDateKey();

  const todaySessions = timerData.sessions.filter(
    session => session.date === todayKey
  );

  const totalToday = todaySessions.reduce(
    (sum, session) => sum + session.minutes, 0
  );

  const totalAll = timerData.sessions.reduce(
    (sum, session) => sum + session.minutes, 0
  );

  document.getElementById("focusTimeToday").textContent =
    totalToday + " min";

  document.getElementById("sessionsToday").textContent =
    todaySessions.length;

  document.getElementById("totalFocusTime").textContent =
    totalAll >= 60
      ? Math.floor(totalAll / 60) + "h " + totalAll % 60 + "m"
      : totalAll + " min";
}

// ---------------- STARTUP ----------------

// Restore a running timer after a page refresh.
if (timerData.running && timerData.endTime) {
  if (timerData.endTime <= Date.now()) {
    finishSession();
  } else {
    timerData.remaining = Math.ceil(
      (timerData.endTime - Date.now()) / 1000
    );

    timerInterval = setInterval(tick, 250);
  }
} else {
  timerData.running = false;
}

loadSettings();
renderTimer();
updateFocusStats();
render();
saveData();
saveTimer();

window.addEventListener("resize", drawChart);

// Request notification permission only after user starts the timer.
startBtn.addEventListener("click", () => {
  if ("Notification" in window &&
      Notification.permission === "default") {
    Notification.requestPermission();
  }
});

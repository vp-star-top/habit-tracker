
const STORAGE_KEY = "monthlyHabitTracker_v1";

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

const monthPicker = document.getElementById("monthPicker");
const tableHead = document.getElementById("tableHead");
const tableBody = document.getElementById("tableBody");
const chart = document.getElementById("progressChart");

const today = new Date();
const currentMonth =
  today.getFullYear() + "-" +
  String(today.getMonth() + 1).padStart(2, "0");

monthPicker.value = currentMonth;

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    habits,
    records
  }));
}

function getMonth() {
  return monthPicker.value || currentMonth;
}

function getDays() {
  const [year, month] = getMonth().split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function getMonthRecords() {
  const month = getMonth();
  if (!records[month]) records[month] = {};
  return records[month];
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
    tableBody.innerHTML = `
      <tr><td colspan="${days + 3}">No habits yet. Add your first habit!</td></tr>
    `;
  }
}

function getDailyData() {
  const days = getDays();

  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const completed = habits.filter(habit =>
      isCompleted(habit.id, day)
    ).length;

    return habits.length
      ? (completed / habits.length) * 100
      : 0;
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
  const left = 38;
  const right = 15;
  const top = 20;
  const bottom = 35;

  const graphWidth = width - left - right;
  const graphHeight = height - top - bottom;

  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillStyle = "#9992ad";
  ctx.strokeStyle = "#393248";
  ctx.lineWidth = 1;

  [0, 25, 50, 75, 100].forEach(value => {
    const y = top + graphHeight - (value / 100) * graphHeight;

    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();

    ctx.fillText(value + "%", left - 8, y + 4);
  });

  const x = index => left +
    (values.length <= 1 ? 0 :
      index * graphWidth / (values.length - 1));

  const y = value => top + graphHeight -
    (value / 100) * graphHeight;

  if (values.length > 0) {
    const gradient = ctx.createLinearGradient(0, top, 0, height);
    gradient.addColorStop(0, "rgba(155,117,255,0.35)");
    gradient.addColorStop(1, "rgba(155,117,255,0)");

    ctx.beginPath();
    ctx.moveTo(x(0), y(values[0]));

    values.forEach((value, index) => {
      ctx.lineTo(x(index), y(value));
    });

    ctx.lineTo(x(values.length - 1), top + graphHeight);
    ctx.lineTo(x(0), top + graphHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    values.forEach((value, index) => {
      if (index === 0) ctx.moveTo(x(index), y(value));
      else ctx.lineTo(x(index), y(value));
    });

    ctx.strokeStyle = "#a987ff";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.stroke();

    values.forEach((value, index) => {
      ctx.beginPath();
      ctx.arc(x(index), y(value), 3, 0, Math.PI * 2);
      ctx.fillStyle = "#c5adff";
      ctx.fill();
    });
  }

  ctx.textAlign = "center";
  ctx.fillStyle = "#9992ad";

  const step = Math.max(1, Math.ceil(values.length / 10));

  values.forEach((_, index) => {
    if (index % step === 0 || index === values.length - 1) {
      ctx.fillText(String(index + 1), x(index), height - 10);
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

  const lastSevenStart = Math.max(1, days - 6);
  let weekDone = 0;
  const weekTotal = habits.length * (days - lastSevenStart + 1);

  for (let day = lastSevenStart; day <= days; day++) {
    habits.forEach(habit => {
      if (isCompleted(habit.id, day)) weekDone++;
    });
  }

  const weeklyRate = weekTotal
    ? Math.round(weekDone / weekTotal * 100)
    : 0;

  document.getElementById("weeklyProgress").textContent =
    weeklyRate + "%";

  const activeDays = Array.from(
    { length: days }, (_, i) => i + 1
  ).filter(day =>
    habits.some(habit => isCompleted(habit.id, day))
  ).length;

  const consistency = days
    ? Math.round(activeDays / days * 100)
    : 0;

  document.getElementById("consistency").textContent =
    consistency + "%";

  drawChart();
}

function render() {
  renderTable();
  updateStats();
}

document.getElementById("addHabitBtn").addEventListener("click", () => {
  if (habits.length >= 12) {
    alert("You can add a maximum of 12 habits.");
    return;
  }

  const name = prompt("Enter your new habit name:");

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

  if (checkbox.checked) {
    monthRecords[key] = true;
  } else {
    delete monthRecords[key];
  }

  saveData();
  render();
});

tableBody.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const id = button.dataset.id;
  const habit = habits.find(item => item.id === id);
  if (!habit) return;

  if (button.dataset.action === "edit") {
    const newName = prompt("Edit habit name:", habit.name);

    if (newName && newName.trim()) {
      habit.name = newName.trim();
      saveData();
      render();
    }
  }

  if (button.dataset.action === "delete") {
    if (!confirm(`Delete "${habit.name}"?`)) return;

    habits = habits.filter(item => item.id !== id);

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

document.getElementById("themeBtn").addEventListener("click", () => {
  const light = document.body.classList.toggle("light-mode");
  document.getElementById("themeBtn").textContent =
    light ? "🌙" : "☀️";
});

window.addEventListener("resize", drawChart);

saveData();
render();

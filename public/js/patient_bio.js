const MOOD_VALUE = {
  happy: 3,
  excited: 2.5,
  neutral: 2,
  tired: 1.5,
  other: 1.2,
  sad: 1,
  angry: 0.5,
  anxious: 0
};
const MOOD_EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  anxious: "😰",
  neutral: "😐",
  excited: "🤩",
  tired: "😴",
  other: "🤔"
};

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function fetchPatientInfo(id) {
  const res = await fetch(`/api/user/${id}`);
  return await res.json();
}
async function fetchSleep(id) {
  const res = await fetch(`/api/sleep/${id}`);
  return await res.json();
}
async function fetchFood(id) {
  const res = await fetch(`/api/food/${id}`);
  return await res.json();
}
async function fetchMood(id) {
  const res = await fetch(`/api/mood/${id}`);
  return await res.json();
}
async function fetchActivity(id) {
  const res = await fetch(`/api/activity/${id}`);
  return await res.json();
}

function getLast7Dates() {
  const today = new Date();
  let arr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(d.toISOString().slice(0, 10));
  }
  return arr;
}

function weekdayLabels(dates) {
  return dates.map(dateStr => {
    const date = new Date(dateStr);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  });
}

function renderSleepTrend(data) {
  const last7 = getLast7Dates();
  const available = data.filter(d => last7.includes(d.date));
  const mean = available.length
    ? Math.round((available.reduce((a, b) => a + Number(b.duration || 0), 0) / available.length) * 10) / 10
    : 0;
  const chartData = last7.map(dateStr => {
    const entry = data.find(d => d.date === dateStr);
    return entry ? Number(entry.duration || 0) : mean;
  });
  const ctx = document.getElementById("sleepTrendChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: weekdayLabels(last7),
      datasets: [{
        label: "Sleep Duration (hr)",
        data: chartData,
        fill: false,
        borderColor: "#1976d2",
        backgroundColor: "#1976d2",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#1976d2"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Hours" }
        }
      }
    }
  });
}

function renderFoodTrend(data) {
  const last7 = getLast7Dates();
  const available = data.filter(d => last7.includes(d.date));
  const mean = available.length
    ? Math.round((available.reduce((a, b) =>
        a + Number(b.breakfast || 0) + Number(b.lunch || 0) + Number(b.dinner || 0), 0) / available.length))
    : 0;
  const chartData = last7.map(dateStr => {
    const entry = data.find(d => d.date === dateStr);
    if (entry) {
      return Number(entry.breakfast || 0) + Number(entry.lunch || 0) + Number(entry.dinner || 0);
    } else {
      return mean;
    }
  });
  const ctx = document.getElementById("foodTrendChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: weekdayLabels(last7),
      datasets: [{
        label: "Total Calories (kcal)",
        data: chartData,
        fill: false,
        borderColor: "#ff7043",
        backgroundColor: "#ff7043",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#ff7043"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Calories" }
        }
      }
    }
  });
}

function renderMoodTrend(data) {
  const last7 = getLast7Dates();
  const available = data.filter(d => last7.includes(d.date));
  const mean = available.length
    ? (available.reduce((a, b) => a + (MOOD_VALUE[b.mood] ?? 1.5), 0) / available.length)
    : 1.5;
  const chartData = last7.map(dateStr => {
    const entry = data.find(d => d.date === dateStr);
    return entry ? (MOOD_VALUE[entry.mood] ?? mean) : mean;
  });
  const moodTicks = [
    { value: 0, emoji: "😰" }, // anxious
    { value: 0.5, emoji: "😠" }, // angry
    { value: 1, emoji: "😢" }, // sad
    { value: 1.2, emoji: "🤔" }, // other
    { value: 1.5, emoji: "😴" }, // tired
    { value: 2, emoji: "😐" }, // neutral
    { value: 2.5, emoji: "🤩" }, // excited
    { value: 3, emoji: "😊" } // happy
  ];
  const ctx = document.getElementById("moodTrendChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: weekdayLabels(last7),
      datasets: [{
        label: "Mood Level",
        data: chartData,
        fill: false,
        borderColor: "#ffb300",
        backgroundColor: "#ffb300",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#ffb300"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 0.5,
            callback: function(value) {
              const found = moodTicks.find(t => t.value === value);
              return found ? found.emoji : value;
            }
          },
          title: { display: true, text: "Mood" }
        }
      }
    }
  });
}

function renderActivityTrend(data) {
  const last7 = getLast7Dates();
  const totals = last7.map(dateStr => {
    const record = data.find(r => r.date === dateStr);
    if (record && record.activities && record.activities.length) {
      let total = 0;
      record.activities.forEach(a => {
        let s = a.start.split(":").map(Number);
        let e = a.end.split(":").map(Number);
        let dur = (e[0] + e[1] / 60) - (s[0] + s[1] / 60);
        if (dur <= 0) dur += 24;
        total += Math.round(dur * 10) / 10;
      });
      return total;
    }
    return null;
  });
  const availableTotals = totals.filter(v => v !== null);
  const mean = availableTotals.length
    ? Math.round((availableTotals.reduce((a, b) => a + b, 0) / availableTotals.length) * 10) / 10
    : 0;
  const chartData = totals.map(v => v !== null ? v : mean);
  const ctx = document.getElementById("activityTrendChart").getContext("2d");
  new Chart(ctx, {
    type: "line",
    data: {
      labels: weekdayLabels(last7),
      datasets: [{
        label: "Total Activity Hours",
        data: chartData,
        fill: false,
        borderColor: "#43a047",
        backgroundColor: "#43a047",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#43a047"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: "Hours" }
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const userId = getQueryParam("user");
  if (!userId) {
    alert("No patient selected.");
    window.history.back();
    return;
  }
  // Optionally show patient name in title
  try {
    const info = await fetchPatientInfo(userId);
    if (info && (info.fullName || info.name)) {
      document.getElementById("bioTitle").textContent = (info.fullName || info.name) + " - Overview";
    }
  } catch {}

  // Fetch and render all charts
  const [sleep, food, mood, activity] = await Promise.all([
    fetchSleep(userId),
    fetchFood(userId),
    fetchMood(userId),
    fetchActivity(userId)
  ]);
  renderSleepTrend(sleep);
  renderFoodTrend(food);
  renderMoodTrend(mood);
  renderActivityTrend(activity);
});
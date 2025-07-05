const motivationalMessages = [
  "Every good day starts with a good night's sleep.",
  "Rest is not idleness. Take care of yourself!",
  "Sleep is the best meditation. – Dalai Lama",
  "Recharge your mind and body tonight.",
  "Tomorrow needs you at your best. Sleep well!",
  "Dream big, sleep tight.",
  "A well-rested mind is a happy mind.",
  "Let your dreams be your wings tonight.",
  "Sleep is the golden chain that ties health and our bodies together.",
  "You deserve rest. Good night!"
];

function getRandomMessage(dateStr) {
  const dateNum = new Date(dateStr).getDate();
  return motivationalMessages[dateNum % motivationalMessages.length];
}

function formatTime(t) {
  if (!t) return "-";
  return t.length === 5 ? t : t.slice(0, 5);
}

function goBack() {
  window.history.back();
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  const sleepCalendar = document.getElementById("sleepCalendar");
  const sleepDetails = document.getElementById("sleepDetails");
  const addSleepBtn = document.getElementById("addSleepBtn");
  const sleepModal = document.getElementById("sleepModal");

  let sleepData = [];
  let selectedDate = getTodayStr();

  function getTodayStr() {
    // Use local time, not UTC
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  async function loadSleepData() {
    const res = await fetch(`/api/sleep/${user.id}`);
    sleepData = await res.json();
  }

  function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = "";
    // Use local date string for today
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      html += `<div class="calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isFuture ? " disabled" : ""}" data-date="${dateStr}" ${isFuture ? 'style="opacity:0.4;pointer-events:none;cursor:not-allowed;"' : ""}>${d}</div>`;
    }
    sleepCalendar.innerHTML = html;
    document.querySelectorAll(".calendar-day:not(.disabled)").forEach(day => {
      day.onclick = () => {
        selectedDate = day.getAttribute("data-date");
        renderCalendar();
        renderSleepDetails();
      };
    });
  }

  function renderSleepDetails() {
    const record = sleepData.find(r => r.date === selectedDate);
    sleepDetails.innerHTML = `
      <div class="sleep-details-card">
        <div class="sleep-details-row"><span class="icon">🗓️</span> <strong>Date:</strong> ${selectedDate}</div>
        <div class="sleep-details-row"><span class="icon">🛏️</span> <strong>Went to Bed:</strong> ${formatTime(record?.sleepTime)}</div>
        <div class="sleep-details-row"><span class="icon">⏰</span> <strong>Wake Up Time:</strong> ${formatTime(record?.wakeTime)}</div>
        <div class="sleep-details-row"><span class="icon">🕒</span> <strong>Duration:</strong> ${record?.duration ? record.duration + " hr" : "-"}</div>
        <div class="sleep-details-row"><span class="icon">💡</span> <strong>Suggested Sleep Time:</strong> 22:00</div>
        <div class="sleep-motivation">${getRandomMessage(selectedDate)}</div>
      </div>
    `;
  }

  function showSleepModal() {
    // Prevent adding for future days
    const todayStr = getTodayStr();
    if (selectedDate > todayStr) {
      alert("You cannot add sleep data for future days.");
      return;
    }
    const record = sleepData.find(r => r.date === selectedDate) || {};
    sleepModal.innerHTML = `
    <div class="modal-content">
      <h3>Input Sleep Data</h3>
      <form id="sleepForm">
        <label>Sleep Time</label>
        <input type="time" name="sleepTime" required value="${record.sleepTime || ""}">
        <label>Wake Up Time</label>
        <input type="time" name="wakeTime" required value="${record.wakeTime || ""}">
        <button type="submit" class="btn-main">Save</button>
        <button type="button" class="btn-main" style="background:#b2dfdb;color:#222;" id="closeModalBtn">Cancel</button>
      </form>
      <div id="sleepError" class="error"></div>
    </div>
  `;
    sleepModal.classList.add("active");
    document.getElementById("closeModalBtn").onclick = () => sleepModal.classList.remove("active");
    document.getElementById("sleepForm").onsubmit = async function (e) {
      e.preventDefault();
      const sleepTime = this.sleepTime.value;
      const wakeTime = this.wakeTime.value;
      if (!sleepTime || !wakeTime) {
        document.getElementById("sleepError").textContent = "Please fill in both times.";
        return;
      }
      let s = sleepTime.split(":").map(Number);
      let w = wakeTime.split(":").map(Number);
      let duration = (w[0] + w[1] / 60) - (s[0] + s[1] / 60);
      if (duration <= 0) duration += 24;
      duration = Math.round(duration * 10) / 10;
      const res = await fetch("/api/sleep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          sleepTime,
          wakeTime,
          duration
        })
      });
      const result = await res.json();
      if (result.success) {
        sleepModal.classList.remove("active");
        await loadSleepData();
        renderSleepDetails();
        renderCalendar();
      } else {
        document.getElementById("sleepError").textContent = result.error || "Failed to save.";
      }
    };
  }

  // --- Sleep Trend Chart ---
  let sleepTrendData = { daily: [], weekly: [] };
  let sleepTrendChart = null;

  async function loadSleepTrend() {
    const res = await fetch(`/api/sleep_trend/${user.id}`);
    sleepTrendData = await res.json();
  }

  function renderSleepTrend() {
    const ctx = document.getElementById("sleepTrendChart").getContext("2d");
    // Always show last 7 days (including missing days)
    const today = new Date();
    let last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Calculate mean of available days
    const availableDurations = sleepTrendData.daily
      .filter(d => last7Dates.includes(d.date))
      .map(d => Number(d.duration) || 0);
    const mean = availableDurations.length
      ? (availableDurations.reduce((a, b) => a + b, 0) / availableDurations.length)
      : 0;

    // Count missing values
    const missingCount = last7Dates.filter(dateStr => !sleepTrendData.daily.find(d => d.date === dateStr)).length;

    const labels = last7Dates.map(dateStr => {
      const date = new Date(dateStr);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    });

    const data = last7Dates.map(dateStr => {
      const entry = sleepTrendData.daily.find(d => d.date === dateStr);
      if (entry) {
        return Number(entry.duration) || 0;
      } else {
        return mean; // Use mean if no data for this day
      }
    });

    if (sleepTrendChart) sleepTrendChart.destroy();
    sleepTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Sleep Duration (hr)",
          data,
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
        plugins: {
          legend: { display: false },
          title: {
            display: true,

          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Hours" }
          }
        }
      }
    });
  }

  addSleepBtn.onclick = function () {
    selectedDate = getTodayStr();
    renderCalendar();
    renderSleepDetails();
    showSleepModal();
  };

  sleepModal.onclick = function (e) {
    if (e.target === sleepModal) sleepModal.classList.remove("active");
  };

  await loadSleepData();
  renderCalendar();
  renderSleepDetails();
  // Load and render sleep trend chart
  await loadSleepTrend();
  renderSleepTrend();
});
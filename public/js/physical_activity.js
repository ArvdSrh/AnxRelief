const EXERCISE_TYPES = [
  "Walking", "Running", "Cycling", "Swimming", "Yoga", "Gym", "Dancing", "Sports", "Other"
];

function goBack() {
  window.history.back();
}

function heartRateInputHtml(current = "") {
  return `
    <label>Heart Rate (bpm) <span style="font-size:0.9em;color:#888;">(optional)</span></label>
    <input type="number" name="heartRate" min="30" max="220" placeholder="e.g. 75" value="${current}">
  `;
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  const activityCalendar = document.getElementById("activityCalendar");
  const activityDetails = document.getElementById("activityDetails");
  const addActivityBtn = document.getElementById("addActivityBtn");
  const activityModal = document.getElementById("activityModal");

  let activityData = [];
  let selectedDate = getTodayStr();

  let activityTrendChart = null;

  function getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  // Fetch activity data
  async function loadActivityData() {
    const res = await fetch(`/api/activity/${user.id}`);
    activityData = await res.json();
  }

  // Render calendar for current month
  function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = getTodayStr();
    let html = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isSelected = selectedDate === dateStr;
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      html += `<div class="calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isFuture ? " disabled" : ""}" data-date="${dateStr}" ${isFuture ? 'style="opacity:0.4;pointer-events:none;cursor:not-allowed;"' : ""}>${d}</div>`;
    }
    activityCalendar.innerHTML = html;
    document.querySelectorAll(".calendar-day:not(.disabled)").forEach(day => {
      day.onclick = () => {
        selectedDate = day.getAttribute("data-date");
        renderCalendar();
        renderActivityDetails();
      };
    });
  }

  // Render activity details for selected date (card style)
  function renderActivityDetails() {
    const record = activityData.find(r => r.date === selectedDate);
    const today = getTodayStr();
    let canInput = selectedDate <= today;
    let totalDuration = 0;
    let logHtml = "";

    if (record && record.activities && record.activities.length) {
      logHtml = `<div class="activity-log-list">` +
        record.activities.map((a, idx) => {
          let s = a.start.split(":").map(Number);
          let e = a.end.split(":").map(Number);
          let dur = (e[0] + e[1] / 60) - (s[0] + s[1] / 60);
          if (dur <= 0) dur += 24;
          dur = Math.round(dur * 10) / 10;
          totalDuration += dur;
          return `<div class="activity-log-item">
            <span class="activity-log-type">${a.type}</span>
            <span class="activity-log-time">${a.start} - ${a.end} <span style="color:#2e6e6e;">(${dur} hr)</span></span>
          </div>`;
        }).join("") +
        `</div>`;
    } else {
      logHtml = `<div class="activity-details-empty">No activity logged for this day.</div>`;
    }

    let heartRateHtml = record && record.heartRate
      ? `<div class="activity-details-row"><span class="activity-details-label">Heart Rate:</span><span class="activity-details-value">${record.heartRate} bpm</span></div>`
      : "";

    activityDetails.innerHTML = `
      <div class="activity-details-card">
        <div class="activity-details-date">${selectedDate}</div>
        <div class="activity-details-total">Total Exercise: ${totalDuration ? totalDuration + " hr" : "-"}</div>
        ${heartRateHtml}
        <div class="activity-details-row" style="margin-bottom:2px;">
          <span class="activity-details-label">Activity Log:</span>
        </div>
        ${logHtml}
      </div>
    `;
  }

  // Show modal for inputting activity data
  function showActivityModal() {
    // Prevent adding for future days
    const todayStr = getTodayStr();
    if (selectedDate > todayStr) {
      alert("You cannot add activity data for future days.");
      return;
    }
    const record = activityData.find(r => r.date === selectedDate) || { activities: [] };
    let activities = record.activities || [];
    let heartRate = record.heartRate || "";

    // Render existing activities
    let activityRows = activities.map((a, idx) => `
    <div class="activity-row" data-idx="${idx}">
      <select name="type${idx}" class="activity-type">
        ${EXERCISE_TYPES.map(t => `<option value="${t}"${a.type === t ? " selected" : ""}>${t}</option>`).join("")}
      </select>
      <input type="text" name="customType${idx}" placeholder="Custom" value="${a.type && !EXERCISE_TYPES.includes(a.type) ? a.type : ""}">
      <input type="time" name="start${idx}" required value="${a.start}">
      <input type="time" name="end${idx}" required value="${a.end}">
      <button type="button" class="action-btn remove-activity-btn" data-idx="${idx}">Remove</button>
    </div>
  `).join("");

    // Add scrollable style to modal content
    activityModal.innerHTML = `
    <div class="modal-content" style="max-height:80vh;overflow-y:auto;">
      <h3>Input Activity Data</h3>
      <form id="activityForm">
        <div id="activityRows">${activityRows}</div>
        <button type="button" class="action-btn" id="addRowBtn">Add Activity</button>
        ${heartRateInputHtml(heartRate)}
        <button type="submit" class="btn-main">Save</button>
        <button type="button" class="btn-main" style="background:#b2dfdb;color:#222;" id="closeModalBtn">Cancel</button>
      </form>
      <div id="activityError" class="error"></div>
    </div>
  `;
    activityModal.classList.add("active");

    // Add new activity row
    document.getElementById("addRowBtn").onclick = function () {
      const idx = document.querySelectorAll(".activity-row").length;
      const row = document.createElement("div");
      row.className = "activity-row";
      row.setAttribute("data-idx", idx);
      row.innerHTML = `
      <select name="type${idx}" class="activity-type">
        ${EXERCISE_TYPES.map(t => `<option value="${t}">${t}</option>`).join("")}
      </select>
      <input type="text" name="customType${idx}" placeholder="Custom">
      <input type="time" name="start${idx}" required>
      <input type="time" name="end${idx}" required>
      <button type="button" class="action-btn remove-activity-btn" data-idx="${idx}">Remove</button>
    `;
      document.getElementById("activityRows").appendChild(row);
      addRemoveListeners();
      // Scroll to bottom when new row is added
      const modalContent = activityModal.querySelector('.modal-content');
      modalContent.scrollTop = modalContent.scrollHeight;
    };

    // Remove activity row
    function addRemoveListeners() {
      document.querySelectorAll(".remove-activity-btn").forEach(btn => {
        btn.onclick = function () {
          btn.parentElement.remove();
        };
      });
    }
    addRemoveListeners();

    document.getElementById("closeModalBtn").onclick = () => activityModal.classList.remove("active");

    document.getElementById("activityForm").onsubmit = async function (e) {
      e.preventDefault();
      const rows = document.querySelectorAll(".activity-row");
      let activities = [];
      for (let row of rows) {
        const idx = row.getAttribute("data-idx");
        let type = row.querySelector(`select[name="type${idx}"]`).value;
        const customType = row.querySelector(`input[name="customType${idx}"]`).value.trim();
        if (customType) type = customType;
        const start = row.querySelector(`input[name="start${idx}"]`).value;
        const end = row.querySelector(`input[name="end${idx}"]`).value;
        if (!type || !start || !end) {
          document.getElementById("activityError").textContent = "Please fill all activity fields.";
          return;
        }
        activities.push({ type, start, end });
      }
      const heartRate = this.heartRate.value;
      // Save to server
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          activities,
          heartRate
        })
      });
      const result = await res.json();
      if (result.success) {
        activityModal.classList.remove("active");
        await loadActivityData();
        renderActivityDetails();
      } else {
        document.getElementById("activityError").textContent = result.error || "Failed to save.";
      }
    };
  }

  function renderActivityTrend() {
    // Prepare last 7 days' dates (YYYY-MM-DD)
    const today = new Date();
    let last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Calculate total hours for each of the last 7 days
    const totals = last7Dates.map(dateStr => {
      const record = activityData.find(r => r.date === dateStr);
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
      return null; // Mark as missing for now
    });

    // Calculate mean (exclude nulls)
    const availableTotals = totals.filter(v => v !== null);
    const mean = availableTotals.length
      ? Math.round((availableTotals.reduce((a, b) => a + b, 0) / availableTotals.length) * 10) / 10
      : 0;

    // Replace missing days with mean
    const data = totals.map(v => v !== null ? v : mean);

    // Count missing values
    const missingCount = totals.filter(v => v === null).length;

    const labels = last7Dates.map(dateStr => {
      const date = new Date(dateStr);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    });

    const ctx = document.getElementById("activityTrendChart").getContext("2d");
    if (activityTrendChart) activityTrendChart.destroy();
    activityTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Total Activity Hours",
          data,
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

  // FAB button to add activity for today
  addActivityBtn.onclick = function () {
    selectedDate = getTodayStr();
    renderCalendar();
    renderActivityDetails();
    showActivityModal();
  };

  // Modal close on background click
  activityModal.onclick = function (e) {
    if (e.target === activityModal) activityModal.classList.remove("active");
  };

  // Initial load
  await loadActivityData();
  renderCalendar();
  renderActivityDetails();
  renderActivityTrend();
});
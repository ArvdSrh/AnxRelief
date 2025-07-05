const MOOD_OPTIONS = [
  { value: "happy", label: "Happy 😊" },
  { value: "sad", label: "Sad 😢" },
  { value: "angry", label: "Angry 😠" },
  { value: "anxious", label: "Anxious 😰" },
  { value: "neutral", label: "Neutral 😐" },
  { value: "excited", label: "Excited 🤩" },
  { value: "tired", label: "Tired 😴" },
  { value: "other", label: "Other 🤔" }
];

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

const REASON_OPTIONS = [
  "Work", "Friends", "Partner", "Family", "Education", "Health", "Finance", "Other"
];

function goBack() {
  window.history.back();
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  const moodCalendar = document.getElementById("moodCalendar");
  const moodSummary = document.getElementById("moodSummary");
  const addMoodBtn = document.getElementById("addMoodBtn");
  const moodModal = document.getElementById("moodModal");

  let moodData = [];
  let selectedDate = getTodayStr();

  let moodTrendChart = null;

  function getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  // Fetch mood data
  async function loadMoodData() {
    const res = await fetch(`/api/mood/${user.id}`);
    moodData = await res.json();
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
      const record = moodData.find(r => r.date === dateStr);
      const isToday = dateStr === todayStr;
      const isFuture = dateStr > todayStr;
      html += `<div class="calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isFuture ? " disabled" : ""}" data-date="${dateStr}" title="${record ? record.mood : ''}" ${isFuture ? 'style="opacity:0.4;pointer-events:none;cursor:not-allowed;"' : ""}>
      ${record ? MOOD_EMOJI[record.mood] : d}
    </div>`;
    }
    moodCalendar.innerHTML = html;
    // Add click listeners only for non-future days
    document.querySelectorAll(".calendar-day:not(.disabled)").forEach(day => {
      day.onclick = () => {
        selectedDate = day.getAttribute("data-date");
        renderCalendar();
        renderMoodSummary();
      };
    });
  }

  // Render mood summary for selected date (card style)
  function renderMoodSummary() {
    const record = moodData.find(r => r.date === selectedDate);
    const today = getTodayStr();
    let canInput = selectedDate <= today;

    if (!record) {
      moodSummary.innerHTML = `<div class="mood-details-card mood-details-empty">No mood data for this day.</div>`;
      return;
    }

    moodSummary.innerHTML = `
      <div class="mood-details-card">
        <div class="mood-details-date">${selectedDate}</div>
        <div class="mood-details-emoji">${MOOD_EMOJI[record.mood]}</div>
        <div class="mood-details-mood">${record.mood.charAt(0).toUpperCase() + record.mood.slice(1)}</div>
        <div class="mood-details-row">
          <span class="mood-details-label">Reason:</span>
          <span class="mood-details-value">${record.reasons && record.reasons.length ? record.reasons.join(", ") : "-"}</span>
        </div>
        <div class="mood-details-row">
          <span class="mood-details-label">Notes:</span>
          <span class="mood-details-value">
            ${record.notes ? `<div class="mood-details-notes">${record.notes}</div>` : "-"}
          </span>
        </div>
      </div>
    `;
  }

  // Show modal for inputting mood data
  function showMoodModal() {
    // Prevent adding for future days
    const todayStr = getTodayStr();
    if (selectedDate > todayStr) {
      alert("You cannot add mood data for future days.");
      return;
    }
    const record = moodData.find(r => r.date === selectedDate) || {};
    moodModal.innerHTML = `
    <div class="modal-content">
      <h3>Input Mood</h3>
      <form id="moodForm">
        <label>Mood</label>
        <select name="mood" required>
          <option value="">Select mood</option>
          ${MOOD_OPTIONS.map(opt => `<option value="${opt.value}"${record.mood === opt.value ? " selected" : ""}>${opt.label}</option>`).join("")}
        </select>
        <label>Reason(s)</label>
        <select name="reasons" multiple required style="height:90px;">
          ${REASON_OPTIONS.map(opt => `<option value="${opt}"${record.reasons && record.reasons.includes(opt) ? " selected" : ""}>${opt}</option>`).join("")}
        </select>
        <label>Notes <span style="font-size:0.9em;color:#888;">(optional)</span></label>
        <input type="text" name="notes" maxlength="100" placeholder="Add a note..." value="${record.notes || ""}">
        <button type="submit" class="btn-main">Save</button>
        <button type="button" class="btn-main" style="background:#b2dfdb;color:#222;" id="closeModalBtn">Cancel</button>
      </form>
      <div id="moodError" class="error"></div>
    </div>
  `;
    moodModal.classList.add("active");
    document.getElementById("closeModalBtn").onclick = () => moodModal.classList.remove("active");
    document.getElementById("moodForm").onsubmit = async function (e) {
      e.preventDefault();
      const mood = this.mood.value;
      const reasons = Array.from(this.reasons.selectedOptions).map(opt => opt.value);
      const notes = this.notes.value.trim();
      if (!mood || reasons.length === 0) {
        document.getElementById("moodError").textContent = "Please select mood and at least one reason.";
        return;
      }
      // Save to server
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          mood,
          reasons,
          notes
        })
      });
      const result = await res.json();
      if (result.success) {
        moodModal.classList.remove("active");
        await loadMoodData();
        renderMoodSummary();
        renderCalendar();
      } else {
        document.getElementById("moodError").textContent = result.error || "Failed to save.";
      }
    };
  }

  function renderMoodTrend() {
    // Sort moodData by date ascending
    const sorted = [...moodData].sort((a, b) => new Date(a.date) - new Date(b.date));
    // Get last 7 days (including missing days)
    const today = new Date();
    let last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Calculate mean of available days
    const availableValues = sorted
      .filter(d => last7Dates.includes(d.date))
      .map(d => MOOD_VALUE[d.mood] ?? 1.5);
    const mean = availableValues.length
      ? (availableValues.reduce((a, b) => a + b, 0) / availableValues.length)
      : 1.5;

    // Count missing values
    const missingCount = last7Dates.filter(dateStr => !sorted.find(d => d.date === dateStr)).length;

    const labels = last7Dates.map(dateStr => {
      const date = new Date(dateStr);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    });

    const data = last7Dates.map(dateStr => {
      const entry = sorted.find(d => d.date === dateStr);
      if (entry) {
        return MOOD_VALUE[entry.mood] ?? mean;
      } else {
        return mean; // Use mean if no data for this day
      }
    });

    // Custom y-axis ticks with emojis
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
    if (moodTrendChart) moodTrendChart.destroy();
    moodTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Mood Level",
          data,
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
        plugins: {
          legend: { display: false },
          title: {
            display: true,
          }
        },
        scales: {
          y: {
            min: 0,
            max: 3,
            ticks: {
              stepSize: 0.5,
              callback: function (value) {
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

  // FAB button to add mood for today
  addMoodBtn.onclick = function () {
    selectedDate = getTodayStr();
    renderCalendar();
    renderMoodSummary();
    showMoodModal();
  };

  // Modal close on background click
  moodModal.onclick = function (e) {
    if (e.target === moodModal) moodModal.classList.remove("active");
  };

  // Initial load
  await loadMoodData();
  renderCalendar();
  renderMoodSummary();
  renderMoodTrend();
});
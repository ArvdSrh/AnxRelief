function goBack() {
  window.history.back();
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  const screenCalendar = document.getElementById("screenCalendar");
  const screenDetails = document.getElementById("screenDetails");
  const screenLog = document.getElementById("screenLog");

  let screenData = [];
  let selectedDate = new Date().toISOString().slice(0,10);

  // Fetch screen time data
  async function loadScreenData() {
    const res = await fetch(`/api/screen_time/${user.id}`);
    screenData = await res.json();
  }

  // Render calendar for current month
  function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let html = "";
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const isSelected = selectedDate === dateStr;
      const record = screenData.find(r => r.date === dateStr);
      const isToday = dateStr === new Date().toISOString().slice(0,10);
      html += `<div class="calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}" data-date="${dateStr}" title="${record ? record.total + ' hr' : ''}">
        ${record ? record.total + "h" : d}
      </div>`;
    }
    screenCalendar.innerHTML = html;
    // Add click listeners
    document.querySelectorAll(".calendar-day").forEach(day => {
      day.onclick = () => {
        selectedDate = day.getAttribute("data-date");
        renderCalendar();
        renderScreenDetails();
      };
    });
  }

  // Render screen details for selected date (card style)
  function renderScreenDetails() {
    const record = screenData.find(r => r.date === selectedDate);

    screenDetails.innerHTML = `
      <div class="screen-details-card">
        <div class="screen-details-date">${selectedDate}</div>
        <div class="screen-details-total">Total Screen Time: ${record ? record.total + " hr" : "-"}</div>
      </div>
    `;

    // Log of most used apps
    let logHtml = `<div class="screen-details-empty">No screen time log for this day.</div>`;
    if (record && record.apps && record.apps.length) {
      logHtml = `<div class="screen-log-list">` +
        record.apps
          .sort((a, b) => b.duration - a.duration)
          .map(app =>
            `<div class="screen-log-item">
              <span class="screen-log-app">${app.name}</span>
              <span class="screen-log-time">${app.duration} hr</span>
            </div>`
          ).join("") +
        `</div>`;
    }
    screenLog.innerHTML = logHtml;
  }

  // Initial load
  await loadScreenData();
  renderCalendar();
  renderScreenDetails();
});
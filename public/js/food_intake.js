document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const foodCalendar = document.getElementById("foodCalendar");
  const foodDetails = document.getElementById("foodDetails");
  const addFoodBtn = document.getElementById("addFoodBtn");
  const foodModal = document.getElementById("foodModal");

  let foodData = [];
  let selectedDate = getTodayStr();

  let foodTrendChart = null;

  function getTodayStr() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }

  function renderFoodTrend() {
    // Sort foodData by date ascending
    const sorted = [...foodData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get last 7 days (including missing days)
    const today = new Date();
    let last7Dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      last7Dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
    }

    // Calculate mean of available days
    const availableTotals = sorted
      .filter(d => last7Dates.includes(d.date))
      .map(d => Number(d.breakfast || 0) + Number(d.lunch || 0) + Number(d.dinner || 0));
    const mean = availableTotals.length
      ? Math.round(availableTotals.reduce((a, b) => a + b, 0) / availableTotals.length)
      : 0;

    // Count missing values
    const missingCount = last7Dates.filter(dateStr => !sorted.find(d => d.date === dateStr)).length;

    const labels = last7Dates.map(dateStr => {
      const date = new Date(dateStr);
      return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
    });

    const data = last7Dates.map(dateStr => {
      const entry = sorted.find(d => d.date === dateStr);
      if (entry) {
        return Number(entry.breakfast || 0) + Number(entry.lunch || 0) + Number(entry.dinner || 0);
      } else {
        return mean; // Use mean if no data for this day
      }
    });

    const ctx = document.getElementById("foodTrendChart").getContext("2d");
    if (foodTrendChart) foodTrendChart.destroy();
    foodTrendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Total Calories (kcal)",
          data,
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
        plugins: {
          legend: { display: false },
          title: {
            display: true,
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Calories" }
          }
        }
      }
    });
  }

  // Fetch food data
  fetch(`/api/food/${user.id}`)
    .then(res => res.json())
    .then(data => {
      foodData = data;
      renderCalendar();
      showDetails(selectedDate);
      renderFoodTrend();
    });

  function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    foodCalendar.innerHTML = days.map(day => {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      // Disable future days
      const isFuture = dateStr > todayStr;
      return `<div class="calendar-day${isSelected ? " selected" : ""}${isToday ? " today" : ""}${isFuture ? " disabled" : ""}" data-date="${dateStr}" ${isFuture ? 'style="opacity:0.4;pointer-events:none;cursor:not-allowed;"' : ""}>${day}</div>`;
    }).join("");
    document.querySelectorAll(".calendar-day:not(.disabled)").forEach(el => {
      el.onclick = () => {
        selectedDate = el.getAttribute("data-date");
        renderCalendar();
        showDetails(selectedDate);
      };
    });
  }

  function showDetails(date) {
    const entry = foodData.find(f => f.date === date);
    if (!entry) {
      foodDetails.innerHTML = `
        <div class="food-details-card">
          <div style="text-align:center;color:#aaa;">No data for this day.<br>Click + to add.</div>
        </div>
      `;
      return;
    }
    foodDetails.innerHTML = `
      <div class="food-details-card">
        <div class="food-details-row"><span class="icon">🍳</span>Breakfast: <b>${entry.breakfast || 0}</b> kcal</div>
        <div class="food-details-row"><span class="icon">🍛</span>Lunch: <b>${entry.lunch || 0}</b> kcal</div>
        <div class="food-details-row"><span class="icon">🍲</span>Dinner: <b>${entry.dinner || 0}</b> kcal</div>
        <div class="food-details-row" style="margin-top:10px;"><span class="icon">🔥</span>Total: <b>${(Number(entry.breakfast || 0) + Number(entry.lunch || 0) + Number(entry.dinner || 0))}</b> kcal</div>
      </div>
    `;
  }

  addFoodBtn.onclick = () => {
    // Prevent adding for future days
    const todayStr = getTodayStr();
    if (selectedDate > todayStr) {
      alert("You cannot add food intake for future days.");
      return;
    }
    const entry = foodData.find(f => f.date === selectedDate) || {};
    foodModal.innerHTML = `
      <div class="modal-content" style="background:#fff;padding:18px 16px;border-radius:12px;max-width:340px;margin:40px auto;box-shadow:0 2px 12px 0 rgba(76,175,80,0.10);">
        <h3>Food Intake (${selectedDate})</h3>
        <form id="foodForm">
          <label>Breakfast (kcal)</label>
          <input type="number" name="breakfast" min="0" value="${entry.breakfast || ""}" placeholder="e.g. 350" required>
          <label>Lunch (kcal)</label>
          <input type="number" name="lunch" min="0" value="${entry.lunch || ""}" placeholder="e.g. 600" required>
          <label>Dinner (kcal)</label>
          <input type="number" name="dinner" min="0" value="${entry.dinner || ""}" placeholder="e.g. 500" required>
          <button type="submit" style="width:100%;margin-top:10px;background:#4dd0e1;color:#fff;border:none;padding:10px 0;border-radius:8px;font-size:1.1em;cursor:pointer;">Save</button>
          <button type="button" id="closeModal" style="width:100%;margin-top:8px;background:#eee;color:#388e7c;border:none;padding:8px 0;border-radius:8px;font-size:1em;cursor:pointer;">Cancel</button>
        </form>
      </div>
    `;
    foodModal.style.display = "block";
    document.getElementById("closeModal").onclick = () => foodModal.style.display = "none";
    document.getElementById("foodForm").onsubmit = async function (e) {
      e.preventDefault();
      const form = e.target;
      const breakfast = form.breakfast.value;
      const lunch = form.lunch.value;
      const dinner = form.dinner.value;
      await fetch("/api/food", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          date: selectedDate,
          summary: `Breakfast: ${breakfast} kcal, Lunch: ${lunch} kcal, Dinner: ${dinner} kcal`,
          breakfast, lunch, dinner
        })
      });
      // Update local data and UI
      const idx = foodData.findIndex(f => f.date === selectedDate);
      if (idx !== -1) {
        foodData[idx] = { ...foodData[idx], breakfast, lunch, dinner, date: selectedDate };
      } else {
        foodData.push({ breakfast, lunch, dinner, date: selectedDate });
      }
      foodModal.style.display = "none";
      showDetails(selectedDate);
      renderCalendar();
    };
  };

  // Hide modal on outside click
  window.onclick = function (event) {
    if (event.target === foodModal) foodModal.style.display = "none";
  };
});

function goBack() {
  window.history.back();
}
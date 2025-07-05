function goBack() {
  window.history.back();
}

// Example time slots (customize as needed)
const TIMESLOTS = [
  "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"
];

let selectedDate = null;
let selectedTime = null;
let caregiver = null;
let bookedSlots = []; // [{date: "YYYY-MM-DD", time: "HH:mm"}]

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

async function fetchCaregiverById(caregiverId) {
  const res = await fetch("/api/caregivers");
  const caregivers = await res.json();
  // Find by id (backend uses id, not name)
  return caregivers.find(cg => cg.id === caregiverId);
}

async function fetchBookedSlots(caregiverId) {
  // Fetch all appointments for this caregiver
  const res = await fetch(`/api/appointments/caregiver/${caregiverId}`);
  return await res.json(); // [{date, time, ...}]
}

async function bookAppointment(userId, caregiverId, date, time) {
  const res = await fetch("/api/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      patientId: userId,
      caregiverId,
      date,
      time
    })
  });
  return await res.json(); // {success: true/false, ...}
}

function renderCaregiverProfile(cg) {
  document.getElementById("caregiverProfile").innerHTML = `
    <div class="caregiver-profile">
      <div class="caregiver-avatar">${cg.avatar ? cg.avatar : "🧑"}</div>
      <div class="caregiver-details">
        <div class="caregiver-name">${cg.fullName || cg.name || "Caregiver"}</div>
        <div class="caregiver-desc">${cg.desc || "A dedicated caregiver."}</div>
        ${cg.exp ? `<div class="caregiver-exp">${cg.exp} years experience</div>` : ""}
      </div>
    </div>
  `;
}

function renderCalendar() {
  const calendar = document.getElementById("calendar");
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let html = "";
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const isPast = new Date(dateStr) < new Date(today.toISOString().slice(0,10));
    html += `<button class="calendar-day-btn${selectedDate === dateStr ? " selected" : ""}" data-date="${dateStr}" ${isPast ? "disabled" : ""}>${d}</button>`;
  }
  calendar.innerHTML = html;
  document.querySelectorAll(".calendar-day-btn").forEach(btn => {
    btn.onclick = function() {
      selectedDate = btn.getAttribute("data-date");
      selectedTime = null;
      renderCalendar();
      renderTimeslots();
      document.getElementById("bookBtn").disabled = true;
      document.getElementById("bookingMsg").innerHTML = "";
    };
  });
}

function renderTimeslots() {
  const timeslotsDiv = document.getElementById("timeslots");
  if (!selectedDate) {
    timeslotsDiv.innerHTML = `<span style="color:#aaa;">Select a date first</span>`;
    return;
  }
  let html = "";
  for (let t of TIMESLOTS) {
    const isBooked = bookedSlots.some(b => b.date === selectedDate && b.time === t);
    html += `<button class="timeslot-btn${selectedTime === t ? " selected" : ""}" data-time="${t}" ${isBooked ? "disabled" : ""}>${t}</button>`;
  }
  timeslotsDiv.innerHTML = html;
  document.querySelectorAll(".timeslot-btn").forEach(btn => {
    btn.onclick = function() {
      if (btn.disabled) return;
      selectedTime = btn.getAttribute("data-time");
      renderTimeslots();
      document.getElementById("bookBtn").disabled = false;
      document.getElementById("bookingMsg").innerHTML = "";
    };
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }
  const caregiverId = getQueryParam("caregiver");
  caregiver = await fetchCaregiverById(caregiverId);
  if (!caregiver) {
    document.querySelector(".booking-container").innerHTML = `<div class="booking-error">Caregiver not found.</div>`;
    return;
  }
  renderCaregiverProfile(caregiver);

  bookedSlots = await fetchBookedSlots(caregiverId);

  renderCalendar();
  renderTimeslots();

  document.getElementById("bookBtn").onclick = async function () {
    if (!selectedDate || !selectedTime) return;
    this.disabled = true;
    document.getElementById("bookingMsg").innerHTML = "";
    // Check again if slot is still available
    bookedSlots = await fetchBookedSlots(caregiverId);
    if (bookedSlots.some(b => b.date === selectedDate && b.time === selectedTime)) {
      document.getElementById("bookingMsg").innerHTML = `<div class="booking-error">This slot has just been booked. Please choose another.</div>`;
      this.disabled = false;
      renderTimeslots();
      return;
    }
    const result = await bookAppointment(user.id, caregiverId, selectedDate, selectedTime);
    if (result.success) {
      document.getElementById("bookingMsg").innerHTML = `<div class="booking-success">Appointment booked for ${formatDateDisplay(selectedDate)} at ${selectedTime}!</div>`;
      bookedSlots.push({ date: selectedDate, time: selectedTime });
      renderTimeslots();
    } else {
      document.getElementById("bookingMsg").innerHTML = `<div class="booking-error">Booking failed. Please try again.</div>`;
      this.disabled = false;
    }
  };
});
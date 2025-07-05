function goBack() {
  window.history.back();
}

let caregiversMap = {};

// Random descriptions for caregivers
const randomDescriptions = [
  "A skilled and caring therapist.",
  "A dedicated and experienced therapist.",
  "An empathetic & skilled therapist.",
  "Specializes in anxiety and stress relief.",
  "Known for a warm and supportive approach.",
  "Expert in mindfulness and CBT.",
  "Passionate about helping others thrive."
];

// Helper to pick a random description
function getRandomDescription() {
  return randomDescriptions[Math.floor(Math.random() * randomDescriptions.length)];
}

// Fetch caregivers from backend
async function fetchCaregivers() {
  const res = await fetch("/api/caregivers");
  let data = await res.json();
  // Add a random description to each caregiver
  data = data.map(cg => ({
    ...cg,
    desc: getRandomDescription()
  }));
  return data;
}

// Fetch appointments for patient
async function fetchAppointments(userId) {
  const res = await fetch(`/api/appointments/patient/${userId}`);
  return await res.json();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
}

function isToday(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  return today.toISOString().slice(0,10) === dateStr;
}

function renderAppointments() {
  const myAppointments = document.getElementById("myAppointments");
  if (!appointments.length) {
    myAppointments.innerHTML = `<div style="color:#888;text-align:center;">No upcoming appointments.</div>`;
    return;
  }
  myAppointments.innerHTML = appointments.map(app => {
    const joinable = isToday(app.date);
    // Lookup caregiver by ID
    const caregiver = caregiversMap[app.caregiverId];
    const caregiverName = caregiver ? (caregiver.fullName || caregiver.name) : "Unknown Caregiver";
    return `
      <div class="appointment-card">
        <div class="appointment-date">
          ${formatDate(app.date)}
        </div>
        <div class="appointment-info">
          <div class="appointment-name">${caregiverName}</div>
          <div class="appointment-time">${app.time}</div>
        </div>
        <button class="appointment-join" ${joinable ? "" : "disabled"} onclick="joinChat('${app.id}', '${app.caregiverId}')">
          Join
        </button>
      </div>
    `;
  }).join("");
}

function renderCaregivers(caregivers) {
  const caregiverList = document.getElementById("caregiverList");
  if (!caregivers.length) {
    caregiverList.innerHTML = `<div style="color:#888;text-align:center;">No caregivers available at the moment.</div>`;
    return;
  }
  caregiverList.innerHTML = caregivers.map(cg => `
    <div class="caregiver-card">
      <div class="caregiver-avatar">${cg.avatar ? cg.avatar : "🧑"}</div>
      <div class="caregiver-info">
        <div class="caregiver-name">${cg.fullName || cg.name}</div>
        <div class="caregiver-desc">${cg.desc}</div>
      </div>
      <button class="caregiver-book" onclick="bookCaregiver('${cg.id}')">Book</button>
    </div>
  `).join("");
}

// Redirect to booking page with caregiver id
window.bookCaregiver = function(caregiverId) {
  window.location.href = `booking.html?caregiver=${encodeURIComponent(caregiverId)}`;
};

// Join chat for appointment
window.joinChat = function(appointmentId, caregiverId) {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user) return;
  const room = `${user.id}_${caregiverId}`;
  window.location.href = `live_chat.html?room=${encodeURIComponent(room)}`;
};

let appointments = [];

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  // Fetch caregivers and build a map for quick lookup
  const caregivers = await fetchCaregivers();
  caregiversMap = {};
  caregivers.forEach(cg => {
    caregiversMap[cg.id] = cg;
  });

  // Fetch and render appointments
  appointments = await fetchAppointments(user.id);
  renderAppointments();

  // Render caregivers for booking
  renderCaregivers(caregivers);
});
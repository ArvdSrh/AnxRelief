function goBack() {
  window.history.back();
}

function formatDateLabel(dateStr) {
  const today = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((d - new Date(today.toISOString().slice(0,10))) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function isPast(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr < today;
}

function isToday(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr === today;
}

function isFuture(dateStr) {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr > today;
}

function formatDateBox(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: 'short' });
  return `<div style="font-size:1.2em;">${day}</div><div style="font-size:1em;">${month}</div>`;
}

let appointments = [];
let patientsMap = {};

async function fetchAppointments(userId) {
  const res = await fetch(`/api/appointments/caregiver/${userId}`);
  return await res.json();
}

async function fetchPatients() {
  const res = await fetch("/api/admin/patients");
  return await res.json();
}

function groupAppointmentsByDate(appointments) {
  const groups = {};
  for (const app of appointments) {
    if (!groups[app.date]) groups[app.date] = [];
    groups[app.date].push(app);
  }
  // Sort by date ascending
  return Object.keys(groups)
    .sort((a, b) => new Date(a) - new Date(b))
    .map(date => ({ date, items: groups[date] }));
}

async function cancelAppointment(appointmentId) {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
        method: "DELETE"
    });
    if (res.ok) {
        // Remove from local list and re-render
        appointments = appointments.filter(app => app.id !== appointmentId);
        renderAppointments();
    } else {
        alert("Failed to cancel appointment.");
    }
}

function renderAppointments() {
    const container = document.getElementById("appointmentsList");
    // Filter out past appointments
    const upcomingAppointments = appointments.filter(app => !isPast(app.date));
    if (!upcomingAppointments.length) {
        container.innerHTML = `<div class="no-appointments">No upcoming appointments.</div>`;
        return;
    }
    const grouped = groupAppointmentsByDate(upcomingAppointments);
    container.innerHTML = grouped.map(group => `
        <div class="appointments-group">
            <div class="section-title">${formatDateLabel(group.date)}</div>
            ${group.items.map(app => {
                const patient = patientsMap[app.patientId];
                const patientName = patient ? (patient.fullName || patient.name) : "Unknown Patient";
                return `
                    <div class="appointment-card">
                        <div class="appointment-date">
                            ${formatDateBox(group.date)}
                        </div>
                        <div class="appointment-info">
                            <div class="appointment-patient">${patientName}</div>
                            <div class="appointment-time">${app.time}</div>
                        </div>
                        <div style="display:flex;gap:8px;">
                        ${
                            isToday(group.date)
                                ? `<button class="appointment-join" onclick="joinChat('${app.id}', '${app.patientId}')">Join</button>`
                                : isFuture(group.date)
                                    ? `<button class="appointment-cancel" onclick="cancelAppointment('${app.id}')">Cancel</button>`
                                    : ""
                        }
                        <button class="appointment-bio-btn" title="View Patient Bio" onclick="goToPatientBio('${app.patientId}')" style="
                            font-size:1.5em;
                            background: none;
                            border: none;
                            border-radius: 50%;
                            width: 34px;
                            height: 34px;
                            color: #388e7c;
                            cursor: pointer;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-left: 2px;
                            box-shadow: none;
                        ">&gt;</button>
                        </div>
                    </div>
                `;
            }).join("")}
        </div>
    `).join("");
}

// Join chat for appointment
window.joinChat = function(appointmentId, patientId) {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user) return;
  // Use both patientId and caregiverId to form a unique room
  const room = `${patientId}_${user.id}`;
  window.location.href = `live_chat.html?room=${encodeURIComponent(room)}`;
};

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "caregiver") {
    window.location.href = "login.html";
    return;
  }

  // Fetch all patients and build a map for quick lookup
  const patients = await fetchPatients();
  patientsMap = {};
  patients.forEach(p => {
    patientsMap[p.id] = p;
  });

  appointments = await fetchAppointments(user.id);
  renderAppointments();
});

window.goToPatientBio = function(patientId) {
    window.location.href = `patient_bio.html?user=${encodeURIComponent(patientId)}`;
};

window.cancelAppointment = cancelAppointment;
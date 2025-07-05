async function fetchAppointments() {
    const res = await fetch("/api/admin/appointments");
    return await res.json();
}

async function fetchPatientsMap() {
    const res = await fetch("/api/admin/patients");
    const patients = await res.json();
    const map = {};
    for (const p of patients) {
        map[p.id] = p;
    }
    return map;
}

function renderAppointments(appointments, patientsMap) {
    const container = document.getElementById("adminAppointments");
    if (!appointments.length) {
        container.innerHTML = `<div class="no-appointments">No upcoming appointments found.</div>`;
        return;
    }
    container.innerHTML = appointments.map(app => {
        const patient = patientsMap[app.patientId];
        const patientName = patient ? (patient.fullName || patient.name) : "Unknown Patient";
        return `
            <div class="appointment-card">
                <div class="appointment-info">
                    <div class="appointment-patient">${patientName}</div>
                    <div class="appointment-time">${app.date} &mdash; ${app.time}</div>
                </div>
                <button class="cancel-btn" onclick="cancelAppointment('${app.id}')">Cancel</button>
            </div>
        `;
    }).join("");
}

async function cancelAppointment(appointmentId) {
    const res = await fetch(`/api/appointments/${appointmentId}`, { method: "DELETE" });
    if (res.ok) {
        appointments = appointments.filter(a => a.id !== appointmentId);
        renderAppointments(appointments, patientsMap);
    } else {
        alert("Failed to cancel appointment.");
    }
}

let appointments = [];
let patientsMap = {};

document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("anxrelief_user"));
    if (!user || user.type !== "admin") {
        window.location.href = "login.html";
        return;
    }
    appointments = await fetchAppointments();
    patientsMap = await fetchPatientsMap();
    renderAppointments(appointments, patientsMap);
});

// Expose to global
window.cancelAppointment = cancelAppointment;
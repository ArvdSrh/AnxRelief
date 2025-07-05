async function fetchAppointments(caregiverId) {
    const res = await fetch(`/api/appointments/caregiver/${caregiverId}`);
    return await res.json();
}

async function fetchPatients() {
    const res = await fetch("/api/admin/patients");
    return await res.json();
}

function renderPatients(patients) {
    const container = document.getElementById("patientList");
    if (!patients.length) {
        container.innerHTML = `<div class="no-patients">No patients found.</div>`;
        return;
    }
    container.innerHTML = patients.map(p => `
        <div class="patient-card">
            <div class="patient-avatar">${p.avatar || "🧑"}</div>
            <div class="patient-info">
                <div class="patient-name">${p.fullName || p.name || "Unknown"}</div>
                <div class="patient-email">${p.email || ""}</div>
            </div>
            <button class="patient-view-btn" data-id="${p.id}" title="View Profile" style="margin-left:auto;font-size:1.5em;background:none;border:none;cursor:pointer;color:#388e7c;">&gt;</button>
        </div>
    `).join("");

    // Add click listeners for view buttons
    document.querySelectorAll(".patient-view-btn").forEach(btn => {
        btn.onclick = function () {
            const id = btn.getAttribute("data-id");
            window.location.href = `patient_bio.html?user=${encodeURIComponent(id)}`;
        };
    });
}

document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("anxrelief_user"));
    if (!user || user.type !== "caregiver") {
        window.location.href = "login.html";
        return;
    }

    // Fetch all appointments for this caregiver
    const appointments = await fetchAppointments(user.id);
    // Get unique patient IDs
    const patientIds = [...new Set(appointments.map(a => a.patientId))];
    if (!patientIds.length) {
        renderPatients([]);
        return;
    }

    // Fetch all patients and filter to only those with appointments
    const allPatients = await fetchPatients();
    const myPatients = allPatients.filter(p => patientIds.includes(p.id));
    renderPatients(myPatients);
});
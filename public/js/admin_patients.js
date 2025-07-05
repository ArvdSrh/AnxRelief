function goBack() {
  window.history.back();
}

async function fetchPatients() {
  const res = await fetch("/api/admin/patients");
  return await res.json();
}

function renderPatients(patients) {
  const container = document.getElementById("adminPatients");
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
      <button class="ban-btn" onclick="banPatient('${p.id}')">Ban</button>
    </div>
  `).join("");
}

async function banPatient(patientId) {
  if (!confirm("Are you sure you want to ban this patient? This will delete all their data.")) return;
  const res = await fetch(`/api/admin/ban_patient/${patientId}`, { method: "DELETE" });
  if (res.ok) {
    // Remove from UI
    patients = patients.filter(p => p.id !== patientId);
    renderPatients(patients);
  } else {
    alert("Failed to ban patient.");
  }
}

let patients = [];

function filterPatients(query) {
  const q = query.trim().toLowerCase();
  if (!q) return patients;
  return patients.filter(p =>
    (p.fullName || p.name || "").toLowerCase().includes(q) ||
    (p.email || "").toLowerCase().includes(q)
  );
}

document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "admin") {
    window.location.href = "login.html";
    return;
  }
  patients = await fetchPatients();
  renderPatients(patients);

  document.getElementById("searchPatient").addEventListener("input", function () {
    renderPatients(filterPatients(this.value));
  });
});

// Expose to global
window.banPatient = banPatient;
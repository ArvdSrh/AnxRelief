document.addEventListener("DOMContentLoaded", function () {
  // Get caregiver info from localStorage (or your auth system)
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "caregiver") {
    window.location.href = "login.html";
    return;
  }

  // Set welcome message
  document.getElementById("caregiverWelcome").textContent =
    `Welcome, ${user.fullName ? user.fullName : "Caregiver"}`;

  // Button navigation
  document.getElementById("appointmentsBtn").onclick = function () {
    window.location.href = "caregiver_appointments.html";
  };
  document.getElementById("patientsBtn").onclick = function () {
    window.location.href = "caregiver_patients.html";
  };
  document.getElementById("profileBtn").onclick = function () {
    window.location.href = "profile.html";
  };
  document.getElementById("logoutBtn").onclick = function () {
    localStorage.removeItem("anxrelief_user");
    window.location.href = "login.html";
  };
});
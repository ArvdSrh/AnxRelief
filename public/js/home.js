document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  const welcomeText = document.getElementById("welcomeText");
  const shortcuts = document.getElementById("shortcuts");

  if (!user) {
    window.location.href = "login.html";
    return;
  }

  // Personalized welcome
  welcomeText.textContent = `Welcome, ${user.fullName}!`;

  // Shortcuts based on user type
  let shortcutButtons = [];
  if (user.type === "patient") {
    shortcutButtons = [
      { label: "Anxiety Chatbot", page: "chatbot.html", icon: "🤖" },
      { label: "Anxiety Test", page: "anxiety_test.html", icon: "🧠" },
      { label: "Health Overview", page: "health_overview.html", icon: "🩺" },
      { label: "Sleep Tracker", page: "sleep_tracker.html", icon: "😴" },
      { label: "Physical Activity", page: "physical_activity.html", icon: "🏃‍♂️" },
      { label: "Food Intake", page: "food_intake.html", icon: "🍔" },
      { label: "Mood Tracker", page: "mood_tracker.html", icon: "😊" },
      { label: "Talk Space", page: "talk_space.html", icon: "💬" },
      { label: "Personalized Care", page: "personalized_care.html", icon: "🌱" },
      { label: "Profile", page: "profile.html", icon: "👤" }
    ];
  } else if (user.type === "caregiver") {
    shortcutButtons = [
      { label: "Appointments", page: "caregiver_appointments.html", icon: "📅" },
      { label: "List of Patients", page: "caregiver_patients.html", icon: "🧑‍🤝‍🧑" },
      { label: "Profile", page: "profile.html", icon: "👤" }
    ];
  } else if (user.type === "admin") {
    shortcutButtons = [
      { label: "List of Patients", page: "admin_patients.html", icon: "🧑‍🤝‍🧑" },
      { label: "List of Caregivers", page: "admin_caregivers.html", icon: "🩺" },
      { label: "List of Appointments", page: "admin_appointments.html", icon: "📅" },
      { label: "Registration Approval", page: "admin_registration.html", icon: "✅" }
    ];
  }

  shortcuts.innerHTML = shortcutButtons.map(btn =>
    `<button class="shortcut-btn" onclick="window.location='${btn.page}'">${btn.icon} ${btn.label}</button>`
  ).join("");

  // Logout function
  window.logout = function () {
    localStorage.removeItem("anxrelief_user");
    window.location.href = "login.html";
  };
});
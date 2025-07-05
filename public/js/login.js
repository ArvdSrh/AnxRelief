document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    loginError.textContent = "";

    const formData = new FormData(loginForm);
    const email = formData.get("email").trim();
    const password = formData.get("password");

    if (!email || !password) {
      loginError.textContent = "Please enter both email and password.";
      return;
    }

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json();
      if (result.success) {
        // Save user info to localStorage/sessionStorage
        localStorage.setItem("anxrelief_user", JSON.stringify(result.user));
        // Redirect based on user type
        if (result.user.type === "admin") {
          window.location.href = "admin_home.html";
        } else if (result.user.type === "caregiver") {
          window.location.href = "caregiver_home.html";
        } else {
          window.location.href = "index.html";
        }
      } else {
        loginError.textContent = result.error || "Login failed.";
      }
    } catch (err) {
      loginError.textContent = "Server error. Please try again.";
    }
  });
});
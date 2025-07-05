document.addEventListener("DOMContentLoaded", function () {
  const registerForm = document.getElementById("registerForm");
  const userType = document.getElementById("userType");
  const certUpload = document.getElementById("certUpload");
  const registerError = document.getElementById("registerError");

  // Show/hide certificate upload for caregiver
  userType.addEventListener("change", function () {
    if (userType.value === "caregiver") {
      certUpload.style.display = "block";
      certUpload.querySelector('input[type="file"]').required = true;
    } else {
      certUpload.style.display = "none";
      certUpload.querySelector('input[type="file"]').required = false;
    }
  });

  registerForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    registerError.textContent = "";

    // Client-side validation
    const formData = new FormData(registerForm);
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");
    if (password.length < 6) {
      registerError.textContent = "Password must be at least 6 characters.";
      return;
    }
    if (password !== confirmPassword) {
      registerError.textContent = "Passwords do not match.";
      return;
    }
    if (userType.value === "caregiver" && !formData.get("certificate").name) {
      registerError.textContent = "Caregivers must upload a certificate.";
      return;
    }

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        alert("Registration successful! Please login.");
        window.location.href = "login.html";
      } else {
        registerError.textContent = result.error || "Registration failed.";
      }
    } catch (err) {
      registerError.textContent = "Server error. Please try again.";
    }
  });
});
function goBack() {
  window.history.back();
}

function getAvatar(gender) {
  if (gender === "male") return "👨";
  if (gender === "female") return "👩";
  return "🧑";
}

function renderProfile(user) {
  document.getElementById("profileDetails").innerHTML = `
    <div class="profile-card">
      <div class="profile-avatar">${getAvatar(user.gender)}</div>
      <div class="profile-info-list">
        <div class="profile-info-row">
          <span class="profile-info-label">Name</span>
          <span class="profile-info-value">${user.fullName || "-"}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">Email</span>
          <span class="profile-info-value">${user.email || "-"}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">Phone</span>
          <span class="profile-info-value">${user.phone || "-"}</span>
        </div>
        <div class="profile-info-row">
          <span class="profile-info-label">Gender</span>
          <span class="profile-info-value">${user.gender ? user.gender.charAt(0).toUpperCase() + user.gender.slice(1) : "-"}</span>
        </div>
      </div>
    </div>
  `;
}

function showEditModal(user) {
  const modal = document.getElementById("editProfileModal");
  modal.innerHTML = `
    <div class="modal-content">
      <h3>Edit Profile</h3>
      <form id="editProfileForm">
        <label for="fullName">Name</label>
        <input type="text" id="fullName" name="fullName" required maxlength="40" value="${user.fullName || ""}">
        <label for="email">Email</label>
        <input type="email" id="email" name="email" required maxlength="40" value="${user.email || ""}" disabled>
        <label for="phone">Phone</label>
        <input type="text" id="phone" name="phone" maxlength="20" value="${user.phone || ""}">
        <label for="gender">Gender</label>
        <select id="gender" name="gender" required>
          <option value="">Select</option>
          <option value="male" ${user.gender === "male" ? "selected" : ""}>Male</option>
          <option value="female" ${user.gender === "female" ? "selected" : ""}>Female</option>
          <option value="other" ${user.gender === "other" ? "selected" : ""}>Other</option>
        </select>
        <button type="submit" class="btn-main">Save</button>
        <button type="button" class="btn-main btn-cancel" id="cancelEditBtn">Cancel</button>
      </form>
      <div id="profileError" class="profile-error" style="display:none"></div>
    </div>
  `;
  modal.classList.add("active");

  document.getElementById("cancelEditBtn").onclick = () => {
    modal.classList.remove("active");
  };

  document.getElementById("editProfileForm").onsubmit = async function (e) {
    e.preventDefault();
    const fullName = this.fullName.value.trim();
    const phone = this.phone.value.trim();
    const gender = this.gender.value;
    if (!fullName || !gender) {
      showError("Please fill in all required fields.");
      return;
    }
    // Save to backend
    const userObj = JSON.parse(localStorage.getItem("anxrelief_user"));
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: userObj.id,
        fullName,
        phone,
        gender
      })
    });
    const result = await res.json();
    if (result.success) {
      // Update localStorage and UI
      userObj.fullName = fullName;
      userObj.phone = phone;
      userObj.gender = gender;
      localStorage.setItem("anxrelief_user", JSON.stringify(userObj));
      renderProfile(userObj);
      modal.classList.remove("active");
    } else {
      showError(result.error || "Failed to update profile.");
    }
    function showError(msg) {
      const err = document.getElementById("profileError");
      err.textContent = msg;
      err.style.display = "block";
    }
  };

  // Close modal on background click
  modal.onclick = function (e) {
    if (e.target === modal) modal.classList.remove("active");
  };
}

document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  renderProfile(user);

  document.getElementById("editProfileBtn").onclick = function () {
    showEditModal(user);
  };
});
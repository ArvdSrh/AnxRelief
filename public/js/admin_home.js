function logout() {
  localStorage.removeItem("anxrelief_user");
  window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "admin") {
    window.location.href = "login.html";
  }
});
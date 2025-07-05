function goBack() {
    window.history.back();
}

async function fetchCaregivers() {
    const res = await fetch("/api/admin/caregiver");
    return await res.json();
}

function renderCaregivers(caregivers) {
    const container = document.getElementById("adminCaregivers");
    if (!caregivers.length) {
        container.innerHTML = `<div class="no-caregivers">No caregivers found.</div>`;
        return;
    }
    container.innerHTML = caregivers.map(c => `
        <div class="caregiver-card">
            <div class="caregiver-avatar">${c.avatar || "🧑‍⚕️"}</div>
            <div class="caregiver-info">
                <div class="caregiver-name">${c.fullName || c.name || "Unknown"}</div>
                <div class="caregiver-email">${c.email || ""}</div>
            </div>
            <button class="ban-btn" onclick="banCaregiver('${c.id}')">Ban</button>
        </div>
    `).join("");
}

async function banCaregiver(caregiverId) {
    if (!confirm("Are you sure you want to ban this caregiver? This will delete all their data.")) return;
    const res = await fetch(`/api/admin/ban_caregiver/${caregiverId}`, { method: "DELETE" });
    if (res.ok) {
        caregivers = caregivers.filter(c => c.id !== caregiverId);
        renderCaregivers(caregivers);
    } else {
        alert("Failed to ban caregiver.");
    }
}

let caregivers = [];

function filterCaregivers(query) {
    const q = query.trim().toLowerCase();
    if (!q) return caregivers;
    return caregivers.filter(c =>
        (c.fullName || c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
}

document.addEventListener("DOMContentLoaded", async function () {
    const user = JSON.parse(localStorage.getItem("anxrelief_user"));
    if (!user || user.type !== "admin") {
        window.location.href = "login.html";
        return;
    }
    caregivers = await fetchCaregivers();
    renderCaregivers(caregivers);

    document.getElementById("searchCaregiver").addEventListener("input", function () {
        renderCaregivers(filterCaregivers(this.value));
    });
});

// Expose to global
window.banCaregiver = banCaregiver;
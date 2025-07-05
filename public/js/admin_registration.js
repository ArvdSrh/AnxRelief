async function fetchCaregivers() {
    const res = await fetch("/api/admin/caregivers");
    return await res.json();
}

function renderCaregivers(list, containerId, type) {
    const container = document.getElementById(containerId);
    if (!list.length) {
        container.innerHTML = `<div class="no-caregivers">No caregivers found.</div>`;
        return;
    }
    container.innerHTML = list.map(c => `
        <div class="caregiver-card">
            <div class="caregiver-info">
                <div class="caregiver-name">${c.fullName || c.name || "Unknown"}</div>
                <div class="caregiver-email">${c.email || ""}</div>
                ${c.certificate ? `<a class="cert-link" href="cert/${c.certificate}" target="_blank">View Certificate</a>` : ""}
            </div>
            <div class="btns">
                ${
                    type === "pending"
                    ? `
                        <button class="btn btn-approve" onclick="approveCaregiver('${c.id}')">Approve</button>
                        <button class="btn btn-reject" onclick="rejectCaregiver('${c.id}')">Reject</button>
                    `
                    : `
                        <button class="btn btn-revoke" onclick="revokeCaregiver('${c.id}')">Revoke</button>
                    `
                }
            </div>
        </div>
    `).join("");
}

async function approveCaregiver(id) {
    const res = await fetch("/api/admin/caregivers/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
    if (res.ok) {
        loadCaregivers();
    } else {
        alert("Failed to approve caregiver.");
    }
}

async function rejectCaregiver(id) {
    const res = await fetch("/api/admin/caregivers/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
    if (res.ok) {
        loadCaregivers();
    } else {
        alert("Failed to reject caregiver.");
    }
}

async function revokeCaregiver(id) {
    const res = await fetch("/api/admin/caregivers/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    });
    if (res.ok) {
        loadCaregivers();
    } else {
        alert("Failed to revoke caregiver.");
    }
}

async function loadCaregivers() {
    const data = await fetchCaregivers();
    renderCaregivers(data.pending || [], "pendingCaregivers", "pending");
    renderCaregivers(data.accepted || [], "acceptedCaregivers", "accepted");
}

document.addEventListener("DOMContentLoaded", function () {
    const user = JSON.parse(localStorage.getItem("anxrelief_user"));
    if (!user || user.type !== "admin") {
        window.location.href = "login.html";
        return;
    }
    loadCaregivers();
});

// Expose functions globally
window.approveCaregiver = approveCaregiver;
window.rejectCaregiver = rejectCaregiver;
window.revokeCaregiver = revokeCaregiver;
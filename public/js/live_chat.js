const socket = io(); // Connect to server

// Get user info and room (e.g., from URL or localStorage)
const user = JSON.parse(localStorage.getItem("anxrelief_user"));
const urlParams = new URLSearchParams(window.location.search);
const room = urlParams.get("room"); // e.g., ?room=appointmentId

if (!user || !room) {
    alert("Missing user or room info.");
    window.location.href = "login.html";
}

let messages = [];

function renderMessages() {
    const container = document.getElementById("chatMessages");
    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.sender === user.fullName ? "self" : "other"}">
            <div style="font-size:0.85em;color:#888;">${msg.sender} <span style="font-size:0.8em;">${new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>
            <div>${msg.message}</div>
        </div>
    `).join("");
    container.scrollTop = container.scrollHeight;
}

// Join the chat room and load history
socket.emit("joinRoom", { room });

socket.on("chatHistory", (history) => {
    messages = history;
    renderMessages();
});

document.getElementById("chatForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    const text = input.value.trim();
    if (!text) return;
    socket.emit("chatMessage", { room, sender: user.fullName, message: text });
    input.value = "";
});

// Receive new messages in real time
socket.on("chatMessage", function(msg) {
    messages.push(msg);
    renderMessages();
});
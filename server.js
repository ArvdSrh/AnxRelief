const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/cert", express.static(path.join(__dirname, "public/cert")));

const USERS_PATH = path.join(__dirname, "database/users.json");
const APPOINTMENTS_PATH = path.join(__dirname, "database/appointments.json");
const SLEEP_PATH = path.join(__dirname, "database/sleep.json");
const PHYSICAL_ACTIVITY_PATH = path.join(__dirname, "database/physical_activity.json");
const SCREEN_TIME_PATH = path.join(__dirname, "database/screen_time.json");
const MOOD_PATH = path.join(__dirname, "database/mood.json");
const FOOD_PATH = path.join(__dirname, "database/food_intake.json");
const CERT_PATH = path.join(__dirname, "public/cert");

// Multer for caregiver certificate uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, CERT_PATH);
    },
    filename: function (req, file, cb) {
        cb(null, uuidv4() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

function readJSON(file) {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8") || "[]");
}
function writeJSON(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Registration
app.post("/api/register", upload.single("certificate"), (req, res) => {
    let users = readJSON(USERS_PATH);
    const { fullName, email, phone, gender, password, type } = req.body;
    if (!fullName || !email || !phone || !gender || !password || !type) {
        return res.status(400).json({ error: "All fields are required." });
    }
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: "Email already exists." });
    }
    if (type === "caregiver" && !req.file) {
        return res.status(400).json({ error: "Certificate required for caregivers." });
    }
    const hash = bcrypt.hashSync(password, 10);
    const user = {
        id: uuidv4(),
        fullName,
        email,
        phone,
        gender,
        password: hash,
        type,
        status: type === "caregiver" ? "pending" : "accepted",
        certificate: type === "caregiver" ? req.file.filename : null,
        registeredAt: new Date().toISOString()
    };
    users.push(user);
    writeJSON(USERS_PATH, users);
    res.json({ success: true });
});

// Login
app.post("/api/login", (req, res) => {
    let users = readJSON(USERS_PATH);
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);
    if (!user) return res.status(400).json({ error: "Invalid credentials." });
    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(400).json({ error: "Invalid credentials." });
    }
    if (user.type === "caregiver" && user.status !== "accepted") {
        return res.status(403).json({ error: "Caregiver not approved yet." });
    }
    res.json({ success: true, user: { ...user, password: undefined } });
});

// Admin: Registration Approval
app.get("/api/admin/caregiver", (req, res) => {
    let users = readJSON(USERS_PATH);
    const caregivers = users.filter(u => u.type === "caregiver");
    res.json(caregivers);
});
app.get("/api/admin/caregivers", (req, res) => {
    let users = readJSON(USERS_PATH);
    const pending = users.filter(u => u.type === "caregiver" && u.status === "pending");
    const accepted = users.filter(u => u.type === "caregiver" && u.status === "accepted");
    res.json({ pending, accepted });
});
app.post("/api/admin/caregivers/approve", (req, res) => {
    let users = readJSON(USERS_PATH);
    const { id } = req.body;
    let user = users.find(u => u.id === id && u.type === "caregiver");
    if (!user) return res.status(404).json({ error: "Caregiver not found." });
    user.status = "accepted";
    writeJSON(USERS_PATH, users);
    res.json({ success: true });
});
app.post("/api/admin/caregivers/reject", (req, res) => {
    let users = readJSON(USERS_PATH);
    const { id } = req.body;
    let idx = users.findIndex(u => u.id === id && u.type === "caregiver");
    if (idx === -1) return res.status(404).json({ error: "Caregiver not found." });
    if (users[idx].certificate) {
        try { fs.unlinkSync(path.join(CERT_PATH, users[idx].certificate)); } catch { }
    }
    users.splice(idx, 1);
    writeJSON(USERS_PATH, users);
    res.json({ success: true });
});
app.post("/api/admin/caregivers/revoke", (req, res) => {
    let users = readJSON(USERS_PATH);
    const { id } = req.body;
    let user = users.find(u => u.id === id && u.type === "caregiver");
    if (!user) return res.status(404).json({ error: "Caregiver not found." });
    user.status = "pending";
    writeJSON(USERS_PATH, users);
    res.json({ success: true });
});

// Admin: List of Patients & Caregivers
app.get("/api/admin/patients", (req, res) => {
    let users = readJSON(USERS_PATH);
    res.json(users.filter(u => u.type === "patient"));
});
app.get("/api/admin/caregivers/all", (req, res) => {
    let users = readJSON(USERS_PATH);
    res.json(users.filter(u => u.type === "caregiver"));
});

// Admin: List of Appointments
app.get("/api/admin/appointments", (req, res) => {
    let appointments = readJSON(APPOINTMENTS_PATH);
    res.json(appointments);
});

// Patient: Health Overview (REAL DATA)
app.get("/api/patient/overview/:userId", (req, res) => {
    const userId = req.params.userId;
    function loadUserArray(filePath, key = "userId") {
        if (!fs.existsSync(filePath)) return [];
        try {
            const arr = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
            return arr.filter(e => e[key] == userId);
        } catch {
            return [];
        }
    }
    // Sleep: [{userId, duration, ...}]
    const sleepArr = loadUserArray(SLEEP_PATH);
    const sleep = sleepArr.map(e => Number(e.duration)).filter(Boolean);

    // Mood: [{userId, mood, date, reasons}]
    const moodArr = loadUserArray(MOOD_PATH);
    const mood = moodArr.map(e => ({
        value: e.mood,
        timestamp: e.date
    }));

    // Physical Activity: [{userId, activities, date}]
    const activityArr = loadUserArray(PHYSICAL_ACTIVITY_PATH);
    let activity = [];
    activityArr.forEach(entry => {
        if (Array.isArray(entry.activities)) {
            // Sum up duration for each activity in this day
            let total = 0;
            entry.activities.forEach(act => {
                if (act.start && act.end) {
                    // Parse start and end as "HH:mm"
                    const [startH, startM] = act.start.split(":").map(Number);
                    const [endH, endM] = act.end.split(":").map(Number);
                    let startMinutes = startH * 60 + startM;
                    let endMinutes = endH * 60 + endM;
                    // If end is less than start, assume activity passed midnight
                    if (endMinutes < startMinutes) endMinutes += 24 * 60;
                    const diff = (endMinutes - startMinutes) / 60;
                    if (diff > 0) total += diff;
                } else if (act.duration) {
                    total += Number(act.duration) || 0;
                }
            });
            if (total > 0) activity.push(total);
        }
    });

    // Screen Time: [{userId, total, date, breakdown}]
    const screenArr = loadUserArray(SCREEN_TIME_PATH);
    const screenTime = screenArr.map(e => Number(e.total)).filter(Boolean);

    // Food Intake: [{userId, summary, date}]
    const foodArr = loadUserArray(FOOD_PATH);
    const food = foodArr.map(f => ({
        breakfast: Number(f.breakfast) || 0,
        lunch: Number(f.lunch) || 0,
        dinner: Number(f.dinner) || 0,
        date: f.date
    }));

    res.json({
        sleep,
        mood,
        activity,
        screenTime,
        food
    });
});

// Patient: Sleep Tracker
app.get("/api/sleep/:userId", (req, res) => {
    let data = readJSON(SLEEP_PATH);
    res.json(data.filter(d => d.userId === req.params.userId));
});
app.post("/api/sleep", (req, res) => {
    let data = readJSON(SLEEP_PATH);
    const { userId, date, sleepTime, wakeTime, duration } = req.body;
    if (!userId || !date || !sleepTime || !wakeTime || !duration) {
        return res.status(400).json({ error: "All fields required." });
    }
    data = data.filter(d => !(d.userId === userId && d.date === date));
    data.push({ userId, date, sleepTime, wakeTime, duration });
    writeJSON(SLEEP_PATH, data);
    res.json({ success: true });
});

// Patient: Physical Activity Tracker
app.get("/api/activity/:userId", (req, res) => {
    let data = readJSON(PHYSICAL_ACTIVITY_PATH);
    res.json(data.filter(d => d.userId === req.params.userId));
});
app.post("/api/activity", (req, res) => {
    let data = readJSON(PHYSICAL_ACTIVITY_PATH);
    const { userId, date, activities } = req.body;
    if (!userId || !date || !activities) {
        return res.status(400).json({ error: "All fields required." });
    }
    data = data.filter(d => !(d.userId === userId && d.date === date));
    data.push({ userId, date, activities });
    writeJSON(PHYSICAL_ACTIVITY_PATH, data);
    res.json({ success: true });
});

// Patient: Mood Tracker
app.get("/api/mood/:userId", (req, res) => {
    let data = readJSON(MOOD_PATH);
    res.json(data.filter(d => d.userId === req.params.userId));
});
app.post("/api/mood", (req, res) => {
    let data = readJSON(MOOD_PATH);
    const { userId, date, mood, reasons } = req.body;
    if (!userId || !date || !mood || !reasons) {
        return res.status(400).json({ error: "All fields required." });
    }
    data = data.filter(d => !(d.userId === userId && d.date === date));
    data.push({ userId, date, mood, reasons });
    writeJSON(MOOD_PATH, data);
    res.json({ success: true });
});

// Patient: Screen Time Tracker
app.get("/api/screen_time/:userId", (req, res) => {
    let data = readJSON(SCREEN_TIME_PATH);
    res.json(data.filter(d => d.userId === req.params.userId));
});
app.post("/api/screen_time", (req, res) => {
    let data = readJSON(SCREEN_TIME_PATH);
    const { userId, date, total, breakdown } = req.body;
    if (!userId || !date || !total || !breakdown) {
        return res.status(400).json({ error: "All fields required." });
    }
    data = data.filter(d => !(d.userId === userId && d.date === date));
    data.push({ userId, date, total, breakdown });
    writeJSON(SCREEN_TIME_PATH, data);
    res.json({ success: true });
});

// Patient: Food Intake Tracker
app.get("/api/food/:userId", (req, res) => {
    let data = readJSON(FOOD_PATH);
    res.json(data.filter(d => d.userId === req.params.userId));
});
app.post("/api/food", (req, res) => {
    let data = readJSON(FOOD_PATH);
    const { userId, date, breakfast, lunch, dinner } = req.body;
    if (!userId || !date || breakfast === undefined || lunch === undefined || dinner === undefined) {
        return res.status(400).json({ error: "All fields required." });
    }
    data = data.filter(d => !(d.userId === userId && d.date === date));
    data.push({
        userId,
        date,
        breakfast: Number(breakfast) || 0,
        lunch: Number(lunch) || 0,
        dinner: Number(dinner) || 0
    });
    writeJSON(FOOD_PATH, data);
    res.json({ success: true });
});

// Appointments (Booking, Listing, etc.)
app.get('/api/caregivers', (req, res) => {
    const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'database/users.json')));
    const caregivers = users
        .filter(u => u.type === "caregiver" && u.status === "accepted")
        .map(u => ({
            ...u,
            avatar: u.avatar || (u.gender === "male" ? "👨" : u.gender === "female" ? "👩" : "🧑")
        }));
    res.json(caregivers);
});
app.get("/api/appointments/:userId", (req, res) => {
    let data = readJSON(APPOINTMENTS_PATH);
    res.json(data.filter(d => d.patientId === req.params.userId || d.caregiverId === req.params.userId));
});
app.post("/api/appointments", (req, res) => {
    let data = readJSON(APPOINTMENTS_PATH);
    const { patientId, caregiverId, date, time } = req.body;
    if (!patientId || !caregiverId || !date || !time) {
        return res.status(400).json({ error: "All fields required." });
    }
    if (data.find(d => d.caregiverId === caregiverId && d.date === date && d.time === time)) {
        return res.status(400).json({ error: "Caregiver already booked for this slot." });
    }
    data.push({ id: uuidv4(), patientId, caregiverId, date, time, status: "upcoming" });
    writeJSON(APPOINTMENTS_PATH, data);
    res.json({ success: true });
});

// Caregiver: List of Patients they've treated
app.get("/api/caregiver/patients/:caregiverId", (req, res) => {
    let appointments = readJSON(APPOINTMENTS_PATH);
    let users = readJSON(USERS_PATH);
    let patientIds = appointments.filter(a => a.caregiverId === req.params.caregiverId)
        .map(a => a.patientId);
    let uniqueIds = [...new Set(patientIds)];
    let patients = users.filter(u => uniqueIds.includes(u.id));
    res.json(patients);
});

// Profile (View & Edit)
app.get("/api/profile/:userId", (req, res) => {
    let users = readJSON(USERS_PATH);
    let user = users.find(u => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ ...user, password: undefined });
});
app.post("/api/profile", (req, res) => {
    let users = readJSON(USERS_PATH);
    const { id, fullName, phone, gender } = req.body;
    let user = users.find(u => u.id === id);
    if (!user) return res.status(404).json({ error: "User not found." });
    user.fullName = fullName;
    user.phone = phone;
    user.gender = gender;
    writeJSON(USERS_PATH, users);
    res.json({ success: true });
});

app.get("/api/appointments/patient/:userId", (req, res) => {
    let data = readJSON(APPOINTMENTS_PATH);
    res.json(data.filter(d => d.patientId === req.params.userId));
});
app.get("/api/appointments/caregiver/:userId", (req, res) => {
    let data = readJSON(APPOINTMENTS_PATH);
    res.json(data.filter(d => d.caregiverId === req.params.userId));
});
app.delete("/api/appointments/:id", (req, res) => {
    let data = readJSON(APPOINTMENTS_PATH);
    const idx = data.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Appointment not found." });
    data.splice(idx, 1);
    writeJSON(APPOINTMENTS_PATH, data);
    res.json({ success: true });
});

app.post("/api/chatbot", async (req, res) => {
    try {
        const OPENROUTER_API_KEY = "sk-3b1f4c2d-8e0a-4c5b-9f6d-7e8f9a0b1c2d"; // Replace with your actual OpenRouter API key
        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "deepseek/deepseek-r1-0528:free",
                messages: req.body.messages
            },
            {
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                }
            }
        );
        res.json(response.data);
    } catch (err) {
        console.error(err?.response?.data || err);
        res.status(500).json({ error: "Chatbot service unavailable." });
    }
});

// Live Chat (Socket.io)
let chatRooms = {};
io.on("connection", (socket) => {
    socket.on("joinRoom", ({ room }) => {
        socket.join(room);
        if (!chatRooms[room]) chatRooms[room] = [];
        socket.emit("chatHistory", chatRooms[room]);
    });
    socket.on("chatMessage", ({ room, sender, message }) => {
        const msg = { sender, message, time: new Date().toISOString() };
        if (!chatRooms[room]) chatRooms[room] = [];
        chatRooms[room].push(msg);
        io.to(room).emit("chatMessage", msg);
    });
});

app.delete("/api/admin/ban_patient/:id", (req, res) => {
    const userId = req.params.id;
    let users = readJSON(USERS_PATH);
    users = users.filter(u => u.id !== userId);
    writeJSON(USERS_PATH, users);
    let appointments = readJSON(APPOINTMENTS_PATH);
    appointments = appointments.filter(a => a.patientId !== userId);
    writeJSON(APPOINTMENTS_PATH, appointments);
    let mood = readJSON(MOOD_PATH);
    mood = mood.filter(m => m.userId !== userId);
    writeJSON(MOOD_PATH, mood);
    let physical = readJSON(PHYSICAL_ACTIVITY_PATH);
    physical = physical.filter(p => p.userId !== userId);
    writeJSON(PHYSICAL_ACTIVITY_PATH, physical);
    let screen = readJSON(SCREEN_TIME_PATH);
    screen = screen.filter(s => s.userId !== userId);
    writeJSON(SCREEN_TIME_PATH, screen);
    let sleep = readJSON(SLEEP_PATH);
    sleep = sleep.filter(s => s.userId !== userId);
    writeJSON(SLEEP_PATH, sleep);
    res.json({ success: true });
});

app.get("/api/sleep_trend/:userId", (req, res) => {
    const userId = req.params.userId;
    let data = readJSON(SLEEP_PATH).filter(d => d.userId === userId);
    // Sort by date ascending
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Prepare daily data
    const daily = data.map(d => ({
        date: d.date,
        duration: Number(d.duration) || 0
    }));

    // Prepare weekly data (average per week, weeks start on Monday)
    const weeks = {};
    daily.forEach(d => {
        const dateObj = new Date(d.date);
        // Get ISO week number
        const tempDate = new Date(dateObj.getTime());
        tempDate.setHours(0,0,0,0);
        // Set to nearest Thursday: current date + 4 - current day number
        tempDate.setDate(tempDate.getDate() + 4 - (tempDate.getDay()||7));
        // ISO week year
        const yearStart = new Date(tempDate.getFullYear(),0,1);
        // Calculate week number
        const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1)/7);
        const key = `${tempDate.getFullYear()}-W${weekNo}`;
        if (!weeks[key]) weeks[key] = [];
        weeks[key].push(d.duration);
    });
    const weekly = Object.entries(weeks).map(([week, arr]) => ({
        week,
        avg: arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length) : 0
    }));

    res.json({ daily, weekly });
});

// Anxiety result endpoint
app.get("/api/patient/anxiety/:userId", (req, res) => {
    const filePath = path.join(__dirname, "database", "anxiety.json");
    let data = [];
    if (fs.existsSync(filePath)) {
        try {
            data = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
        } catch {
            data = [];
        }
    }
    const userResults = data.filter(entry => entry.userId == req.params.userId);
    if (userResults.length > 0) {
        userResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return res.json({ anxietyType: userResults[0].anxietyLevel });
    }
    res.json({ anxietyType: "normal" });
});

server.listen(3000, () => {
    console.log("AnxRelief server running on http://localhost:3000");
});
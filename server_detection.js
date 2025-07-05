const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const axios = require("axios");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  maxHttpBufferSize: 1e8,
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});
app.get("/chatbot", (req, res) => {
  res.sendFile(__dirname + "/public/chatbot.html");
});
app.get("/take_anxiety_test", (req, res) => {
  res.sendFile(__dirname + "/public/anxiety_test.html");
});

// Helper to save or update anxiety result in anxiety.json
function saveAnxietyResult(userId, anxietyLevel) {
  const filePath = path.join(__dirname, "database", "anxiety.json");
  let data = [];
  if (fs.existsSync(filePath)) {
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    } catch (e) {
      data = [];
    }
  }
  // Check if user already exists
  const idx = data.findIndex(entry => entry.userId == userId);
  if (idx !== -1) {
    // Update existing entry
    data[idx].anxietyLevel = anxietyLevel;
    data[idx].timestamp = new Date().toISOString();
  } else {
    // Add new entry
    data.push({
      userId,
      anxietyLevel,
      timestamp: new Date().toISOString()
    });
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

io.on("connection", (socket) => {
  console.log("New client connected");
  let anxietyResults = [];
  let questionCount = 0;
  let userId = null;

  // Listen for user id from client (should be sent before test starts)
  socket.on("set_user_id", (id) => {
    userId = id;
  });

  socket.on("process_files", async (data) => {
    try {
      // Optionally get userId from data if sent with each request
      if (data.userId) userId = data.userId;

      // Convert arrays back to Buffer
      const audioBuffer = Buffer.from(data.audioFile);
      const videoBuffer = Buffer.from(data.videoFile);

      // Use live transcription if provided, else process audio
      let transcription = (data.liveTranscription && data.liveTranscription.trim())
        ? data.liveTranscription.trim()
        : await processAudio(audioBuffer);

      // Process video for emotion using DeepFace (robust to mp4/webm)
      const emotion = await processVideo(videoBuffer);

      // Use AI-based anxiety classification (your local FastAPI model)
      const anxietyType = await classifyAnxietyAI(transcription);

      anxietyResults.push(anxietyType);
      questionCount++;

      // Emit anxiety type for the current question, including transcription/emotion for frontend display
      socket.emit("anxiety_result", {
        transcription,
        emotion,
        type: anxietyType
      });

      // If all questions have been processed, calculate and emit final result
      if (anxietyResults.length === 7) {
        const finalType = getFinalAnxietyType(anxietyResults);
        socket.emit("final_result", finalType);

        // Save or update userId and anxiety level in anxiety.json
        if (userId) {
          saveAnxietyResult(userId, finalType);
        }

        // Reset for next test if user reloads
        anxietyResults = [];
        questionCount = 0;
      }
    } catch (err) {
      console.error("Processing error:", err);
      socket.emit("anxiety_result", {
        transcription: "",
        emotion: "neutral",
        type: "normal"
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Function to process audio file (Wav2Vec2 via Hugging Face)
const HF_API_KEY = process.env.HF_API_KEY || "your_huggingface_api_key_here"; // Set your Hugging Face API key here
async function processAudio(audioBuffer) {
  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/facebook/wav2vec2-large-960h",
      audioBuffer,
      {
        headers: {
          "Content-Type": "audio/wav",
          ...(HF_API_KEY && { Authorization: `Bearer ${HF_API_KEY}` })
        },
        timeout: 60000
      }
    );
    // Hugging Face returns { text: "..." }
    return response.data.text || "";
  } catch (error) {
    console.error("Error processing audio:", error?.response?.data || error.message);
    return "";
  }
}

// Function to process video file (extract frame, save as image, call DeepFace)
// Tries both mp4 and webm for robustness
async function processVideo(videoBuffer) {
  try {
    const framePath = path.join(__dirname, "frame_" + Date.now() + ".jpg");
    try {
      await extractFrameFromVideo(videoBuffer, framePath, 'mp4');
    } catch (e) {
      await extractFrameFromVideo(videoBuffer, framePath, 'webm');
    }
    const emotion = await detectEmotionWithDeepFace(framePath);
    fs.unlink(framePath, () => {});
    return emotion;
  } catch (error) {
    console.error("Error processing video with DeepFace:", error);
    return "neutral";
  }
}

// Helper to extract a frame from video buffer and save as JPEG
function extractFrameFromVideo(videoBuffer, outPath, format) {
  return new Promise((resolve, reject) => {
    const inputStream = new Readable();
    inputStream.push(videoBuffer);
    inputStream.push(null);

    ffmpeg()
      .setFfmpegPath(ffmpegPath)
      .input(inputStream)
      .inputFormat(format)
      .outputOptions('-frames:v 1')
      .save(outPath)
      .on('end', () => resolve(outPath))
      .on('error', reject);
  });
}

// Call DeepFace Python script for emotion detection
function detectEmotionWithDeepFace(imagePath) {
  return new Promise((resolve, reject) => {
    execFile("python", ["deepface_emotion.py", imagePath], (error, stdout, stderr) => {
      if (error) {
        console.error("DeepFace error:", stderr || error);
        return resolve("neutral");
      }
      resolve(stdout.trim());
    });
  });
}

// AI-based anxiety classification using your local FastAPI model
async function classifyAnxietyAI(transcription) {
  if (!transcription) return "normal";
  try {
    const response = await axios.post(
      "http://127.0.0.1:8000/predict/",
      { text: transcription },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 60000
      }
    );
    // Example response: { prediction: "Mild Anxiety" }
    const label = response.data.prediction || "";
    if (label.toLowerCase().includes("mild")) return "mild";
    if (label.toLowerCase().includes("moderate")) return "moderate";
    if (label.toLowerCase().includes("severe")) return "severe";
    return "normal";
  } catch (error) {
    console.error("Error classifying anxiety:", error?.response?.data || error.message);
    return "normal";
  }
}

// Function to determine the most frequent anxiety type
function getFinalAnxietyType(anxietyResults) {
  const frequencies = anxietyResults.reduce((acc, anxietyType) => {
    acc[anxietyType] = (acc[anxietyType] || 0) + 1;
    return acc;
  }, {});
  return Object.keys(frequencies).reduce((a, b) => frequencies[a] > frequencies[b] ? a : b);
}

server.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
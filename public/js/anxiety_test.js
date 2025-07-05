const questions = [
  "Feeling nervous, anxious, or on edge?",
  "Not being able to stop or control worrying?",
  "Worrying too much about different things?",
  "Trouble relaxing?",
  "Being so restless that it is hard to sit still?",
  "Becoming easily annoyed or irritable?",
  "Feeling afraid as if something awful might happen?"
];

let currentQuestion = 0;
let audioChunks = [];
let mediaRecorderAudio;
let mediaRecorderVideo;
let videoStream;
let videoChunks = [];
let socket = io("http://localhost:3001");
let anxietyResults = [];
let perQuestionResults = [];
let liveTranscription = "";
let recognition;
let recognizing = false;
let quizStarted = false;

const questionContainer = document.getElementById('question-container');
const startBtn = document.getElementById('start-button');
const stopBtn = document.getElementById('stop-button');
const loadingDiv = document.getElementById('loading');
const anxietyResultDiv = document.getElementById('anxiety-result');
const finalResultDiv = document.getElementById('final-result');
const progressBar = document.getElementById('progress');
const questionCount = document.getElementById('question-count');
const videoElement = document.getElementById('video');
let restartBtn = document.getElementById('restart-button');

// Get user id from localStorage (if available)
let userId = null;
const anxUser = localStorage.getItem("anxrelief_user");
if (anxUser) {
  try {
    userId = JSON.parse(anxUser).id;
  } catch { }
}

// If no userId, redirect to login page
if (!userId) {
  window.location.href = "login.html";
}

// Send user id to server as soon as possible
if (userId) {
  socket.emit("set_user_id", userId);
}

// Add a restart button if not present
if (!restartBtn) {
  restartBtn = document.createElement('button');
  restartBtn.id = 'restart-button';
  restartBtn.textContent = 'Restart Test';
  restartBtn.style.display = 'none';
  restartBtn.style.marginTop = '1rem';
  finalResultDiv.parentNode.insertBefore(restartBtn, finalResultDiv.nextSibling);
}

// Show intro screen instead of first question
function showIntro() {
  questionContainer.innerHTML = `
    <div class="intro-card" style="text-align:center;">
      <h2>Are you ready to take the anxiety test?</h2>
      <p>This test consists of multiple questions. Please ensure your microphone and camera are enabled.</p>
      <div style="text-align:left;max-width:400px;margin:18px auto 0 auto;">
        <b>Instructions:</b>
        <ol style="text-align:left;margin:10px 0 0 1.2em;padding:0;">
          <li>Answer each question by <b>speaking clearly into your microphone</b>.</li>
          <li><b>Make sure your face is visible to the camera</b> during the test.</li>
        </ol>
      </div>
    </div>
  `;
  questionCount.textContent = '';
  progressBar.style.width = '0%';
  anxietyResultDiv.innerHTML = '';
  anxietyResultDiv.style.display = 'none';
  startBtn.style.display = '';
  stopBtn.style.display = 'none';
  loadingDiv.style.display = 'none';
  finalResultDiv.innerHTML = '';
  finalResultDiv.style.display = 'none';
  restartBtn.style.display = 'none';
  liveTranscription = "";
  currentQuestion = 0;
  anxietyResults = [];
  perQuestionResults = [];
  quizStarted = false;
  startBtn.textContent = "Start";
}

// Show the current question
function showQuestion() {
  questionContainer.innerHTML = `<div class="question-card">${questions[currentQuestion]}</div>`;
  questionCount.textContent = `Question ${currentQuestion + 1} of ${questions.length}`;
  progressBar.style.width = `${((currentQuestion) / questions.length) * 100}%`;
  anxietyResultDiv.innerHTML = '';
  anxietyResultDiv.style.display = '';
  startBtn.style.display = '';
  stopBtn.style.display = 'none';
  loadingDiv.style.display = 'none';
  finalResultDiv.innerHTML = '';
  finalResultDiv.style.display = 'none';
  restartBtn.style.display = 'none';
  liveTranscription = "";
  videoElement.style.display = 'none';
}

// Start recording and answering
async function startAnswer() {
  startBtn.style.display = 'none';
  stopBtn.style.display = '';
  anxietyResultDiv.innerHTML = `<b>Transcription:</b> <span id="live-transcript" style="color:#3a8dde"></span>`;
  anxietyResultDiv.style.display = '';
  loadingDiv.style.display = 'none';

  // Start audio recording
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorderAudio = new MediaRecorder(audioStream);
  audioChunks = [];
  mediaRecorderAudio.ondataavailable = e => audioChunks.push(e.data);

  // Start video recording (force webm for best compatibility)
  videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
  videoElement.srcObject = videoStream;
  videoElement.play();
  videoElement.style.display = '';
  mediaRecorderVideo = new MediaRecorder(videoStream, { mimeType: "video/webm" });
  videoChunks = [];
  mediaRecorderVideo.ondataavailable = e => videoChunks.push(e.data);

  mediaRecorderAudio.start();
  mediaRecorderVideo.start();

  // Start live transcription
  startLiveTranscription();
}

function startLiveTranscription() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    document.getElementById('live-transcript').innerText = "Live transcription not supported in this browser.";
    return;
  }
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognizing = true;
  liveTranscription = "";

  recognition.onresult = function (event) {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        liveTranscription += event.results[i][0].transcript + " ";
      } else {
        interim += event.results[i][0].transcript;
      }
    }
    document.getElementById('live-transcript').innerText = (liveTranscription + interim).trim();
  };
  recognition.onerror = function (event) {
    document.getElementById('live-transcript').innerText = "Transcription error: " + event.error;
  };
  recognition.onend = function () {
    recognizing = false;
  };
  recognition.start();
}

async function stopAnswer() {
  stopBtn.style.display = 'none';
  loadingDiv.style.display = '';
  // Stop live transcription
  if (recognition && recognizing) {
    recognition.stop();
    recognizing = false;
  }
  // Stop audio and video recording
  mediaRecorderAudio.stop();
  mediaRecorderVideo.stop();

  // Wait for data to be available
  mediaRecorderAudio.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
    mediaRecorderVideo.onstop = async () => {
      const videoBlob = new Blob(videoChunks, { type: 'video/webm' });

      // Send audio, video, and live transcription to server via Socket.io
      const audioArrayBuffer = await audioBlob.arrayBuffer();
      const videoArrayBuffer = await videoBlob.arrayBuffer();

      socket.emit('process_files', {
        audioFile: Array.from(new Uint8Array(audioArrayBuffer)),
        videoFile: Array.from(new Uint8Array(videoArrayBuffer)),
        liveTranscription: liveTranscription.trim(),
        userId: userId // send userId with each request for redundancy
      });

      socket.once('anxiety_result', (result) => {
        anxietyResults.push(result.type);
        perQuestionResults.push({
          question: questions[currentQuestion],
          transcription: result.transcription,
          emotion: result.emotion,
          type: result.type
        });
        anxietyResultDiv.innerHTML = `
          <b>Transcription:</b> ${result.transcription || "(not detected)"}<br>
          <b>Emotion:</b> ${capitalize(result.emotion)}<br>
          <b>Detected:</b> <span style="color:#3a8dde">${capitalize(result.type)} Anxiety</span>
        `;
        anxietyResultDiv.style.display = '';
        loadingDiv.style.display = 'none';
        setTimeout(() => {
          nextQuestion();
        }, 2000);
      });

      socket.once('final_result', (finalType) => {
        showFinalResult(finalType);
      });

      // Stop video stream
      videoStream.getTracks().forEach(track => track.stop());
      videoElement.style.display = 'none';
    };
    mediaRecorderVideo.stop();
  };
  mediaRecorderAudio.stop();
}

function nextQuestion() {
  currentQuestion++;
  if (currentQuestion < questions.length) {
    showQuestion();
    startBtn.style.display = '';
    startBtn.textContent = "Start Answer";
    quizStarted = true;
  } else {
    startBtn.style.display = 'none';
    stopBtn.style.display = 'none';
    loadingDiv.style.display = 'none';
    // Hide question and progress when showing final results
    questionContainer.innerHTML = '';
    questionCount.textContent = '';
    progressBar.style.width = '100%';
    showFinalResult();
  }
}

function showFinalResult(finalType) {
  // Hide the single-question result when showing the final results
  anxietyResultDiv.innerHTML = '';
  anxietyResultDiv.style.display = 'none';
  // Hide question container and progress bar
  questionContainer.innerHTML = '';
  questionCount.textContent = '';
  progressBar.style.width = '100%';

  // Show overall anxiety type at the top
  let html = `<div style="margin-bottom:1.5rem;font-size:1.2rem;">
    <b>Your overall anxiety type is:</b><br>
    <span style="font-size:1.7rem;color:#3a8dde;">${capitalize(finalType || getFinalType())} Anxiety</span>
  </div>`;
  html += `<h3>Results per question:</h3><ol>`;
  perQuestionResults.forEach((res, idx) => {
    html += `<li>
      <b>${res.question}</b><br>
      <b>Transcription:</b> ${res.transcription || "(not detected)"}<br>
      <b>Emotion:</b> ${capitalize(res.emotion)}<br>
      <b>Detected:</b> <span style="color:#3a8dde">${capitalize(res.type)} Anxiety</span>
    </li>`;
  });
  html += `</ol>`;
  finalResultDiv.innerHTML = html;
  finalResultDiv.style.display = '';
  restartBtn.style.display = '';
}

function getFinalType() {
  // Fallback if server doesn't send final_type
  const freq = {};
  anxietyResults.forEach(type => freq[type] = (freq[type] || 0) + 1);
  return Object.keys(freq).reduce((a, b) => freq[a] > freq[b] ? a : b, "");
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function resetTest() {
  currentQuestion = 0;
  anxietyResults = [];
  perQuestionResults = [];
  finalResultDiv.innerHTML = '';
  finalResultDiv.style.display = 'none';
  showIntro();
}

// Button event listeners
startBtn.onclick = function () {
  if (!quizStarted) {
    showQuestion();
    startBtn.textContent = "Start Answer";
    quizStarted = true;
  } else {
    startAnswer();
    startBtn.style.display = 'none';
    quizStarted = false;
    startBtn.textContent = "Start";
  }
};
stopBtn.onclick = stopAnswer;
restartBtn.onclick = resetTest;

// Initialize intro screen on page load
window.onload = showIntro;
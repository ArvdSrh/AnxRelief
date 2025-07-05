document.addEventListener("DOMContentLoaded", async function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  const anxietyTypeDiv = document.getElementById("anxietyType");
  const overviewList = document.getElementById("overviewList");

  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  // Fetch health overview data from server
  let summary = {};
  try {
    const res = await fetch(`/api/patient/overview/${user.id}`);
    summary = await res.json();
  } catch {
    summary = {};
  }

  // Fetch user's anxiety type from server (new endpoint)
  let anxietyType = "No Anxiety";
  try {
    const anxRes = await fetch(`/api/patient/anxiety/${user.id}`);
    if (anxRes.ok) {
      const anxData = await anxRes.json();
      // Map backend values to display values
      if (anxData && anxData.anxietyType) {
        if (anxData.anxietyType === "normal") anxietyType = "Normal Anxiety";
        else if (anxData.anxietyType === "mild") anxietyType = "Mild Anxiety";
        else if (anxData.anxietyType === "moderate") anxietyType = "Moderate Anxiety";
        else if (anxData.anxietyType === "severe") anxietyType = "Severe Anxiety";
        else anxietyType = "No Anxiety";
      }
    }
  } catch {
    anxietyType = "No Anxiety";
  }

  let anxietyIcon = "😐";
  if (anxietyType === "Normal Anxiety") anxietyIcon = "😃";
  if (anxietyType === "Mild Anxiety") anxietyIcon = "😟";
  if (anxietyType === "Moderate Anxiety") anxietyIcon = "😰";
  if (anxietyType === "Severe Anxiety") anxietyIcon = "😱";

  anxietyTypeDiv.innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      <span style="font-size:2.5em;">${anxietyIcon}</span>
      <div style="font-size:1.2em;font-weight:600;margin-top:8px;">${anxietyType}</div>
    </div>
  `;

  // --- Sleep Tracker: average sleep time ---
  let sleepSummary = "No data";
  if (summary.sleep && Array.isArray(summary.sleep) && summary.sleep.length > 0) {
    const avgSleep = summary.sleep.reduce((a, b) => a + b, 0) / summary.sleep.length;
    sleepSummary = `${avgSleep.toFixed(1)} hr/day`;
  }

  // --- Mood Tracker: latest mood emoji ---
  let moodSummary = "No data";
  if (summary.mood && Array.isArray(summary.mood) && summary.mood.length > 0) {
    // Assume each mood entry is { value: "happy", timestamp: ... }
    const latestMood = summary.mood[summary.mood.length - 1];
    const moodMap = {
      happy: "😃",
      sad: "😢",
      angry: "😠",
      neutral: "😐",
      anxious: "😰",
      excited: "🤩",
      tired: "😴",
      stressed: "😫"
    };
    moodSummary = moodMap[latestMood.value] || latestMood.value || "No data";
  }

  // --- Physical Activities: average activity time (sum all activities per day) ---
  let activitySummary = "No data";
  if (summary.activity && Array.isArray(summary.activity) && summary.activity.length > 0) {
    // summary.activity is an array of total hours per day (from server)
    const avgActivity = summary.activity.reduce((a, b) => a + b, 0) / summary.activity.length;
    activitySummary = `${avgActivity.toFixed(1)} hr/day`;
  }

  // --- Screen Time: average screen time ---
  let screenTimeSummary = "No data";
  if (summary.screenTime && Array.isArray(summary.screenTime) && summary.screenTime.length > 0) {
    const avgScreen = summary.screenTime.reduce((a, b) => a + b, 0) / summary.screenTime.length;
    screenTimeSummary = `${avgScreen.toFixed(1)} hr/day`;
  }

  // --- Food Intake: average calories per day ---
  let foodSummary = "No data";
  if (summary.food && Array.isArray(summary.food) && summary.food.length > 0) {
    // Each entry: { breakfast, lunch, dinner }
    const totalCaloriesArr = summary.food.map(f =>
      (Number(f.breakfast) || 0) + (Number(f.lunch) || 0) + (Number(f.dinner) || 0)
    );
    const avgCalories = totalCaloriesArr.reduce((a, b) => a + b, 0) / totalCaloriesArr.length;
    foodSummary = `${avgCalories.toFixed(0)} kcal/day`;
  }

  // Overview items
  const overviews = [
    {
      icon: "😴",
      title: "Sleep Tracker",
      summary: sleepSummary,
      page: "sleep_tracker.html"
    },
    {
      icon: "🍎",
      title: "Food Intake",
      summary: foodSummary,
      page: "food_intake.html"
    },
    {
      icon: "😊",
      title: "Mood Tracker",
      summary: moodSummary,
      page: "mood_tracker.html"
    },
    {
      icon: "🏃‍♂️",
      title: "Physical Activities",
      summary: activitySummary,
      page: "physical_activity.html"
    }
  ];

  overviewList.innerHTML = overviews.map(item => `
    <div class="overview-item" onclick="window.location='${item.page}'">
      <div class="overview-icon">${item.icon}</div>
      <div class="overview-content">
        <div class="overview-title">${item.title}</div>
        <div class="overview-summary">${item.summary}</div>
      </div>
    </div>
  `).join("");
});

// Optional: goBack function for back button
function goBack() {
  window.history.back();
}
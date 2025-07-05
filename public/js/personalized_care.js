function goBack() {
  window.history.back();
}

document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("anxrelief_user"));
  if (!user || user.type !== "patient") {
    window.location.href = "login.html";
    return;
  }

  const activities = [
    {
      icon: "🧘‍♂️",
      title: "Guided Meditation",
      desc: "Relax your mind with a short guided meditation.",
      url: "https://www.youtube.com/watch?v=inpok4MKVLM"
    },
    {
      icon: "🎵",
      title: "Calming Music",
      desc: "Listen to calming music to ease anxiety.",
      url: "https://www.youtube.com/watch?v=2OEL4P1Rz04"
    },
    {
      icon: "🌳",
      title: "Nature Walk",
      desc: "Take a mindful walk outside and enjoy nature.",
      url: "https://silvotherapy.co.uk/articles/the-health-benefits-of-walking-in-nature"
    },
    {
      icon: "📖",
      title: "Read a Book",
      desc: "Distract your mind with a good book or story.",
      url: "https://www.goodreads.com/genres/self-help"
    },
    {
      icon: "📝",
      title: "Journaling",
      desc: "Write down your thoughts and feelings.",
      url: "https://www.verywellmind.com/journaling-for-stress-relief-3144611"
    },
    {
      icon: "💪",
      title: "Light Exercise",
      desc: "Try some light stretching or yoga at home.",
      url: "https://www.youtube.com/watch?v=4pKly2JojMw"
    },
    {
      icon: "🎨",
      title: "Creative Art",
      desc: "Express yourself through drawing or coloring.",
      url: "https://www.youtube.com/results?search_query=art+therapy+for+anxiety"
    },
    {
      icon: "☕",
      title: "Mindful Tea Break",
      desc: "Make a cup of tea and enjoy it mindfully.",
      url: "https://www.mindful.org/mindful-cup-tea/"
    }
  ];

  const careActivities = document.getElementById("careActivities");
  careActivities.innerHTML = activities.map(act => `
    <div class="care-activity-card" onclick="window.open('${act.url}', '_blank')">
      <div class="care-activity-icon">${act.icon}</div>
      <div class="care-activity-title">${act.title}</div>
      <div class="care-activity-desc">${act.desc}</div>
    </div>
  `).join("");
});
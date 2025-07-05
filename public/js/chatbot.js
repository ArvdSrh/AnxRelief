const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");

// Initial greeting
addMessage("bot", "Hello! I'm AnxRelief's AI chatbot. How can I support you today? You can talk to me about your anxiety, worries, or anything on your mind.");

// Add message to chat window
function addMessage(sender, text) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "chat-message " + sender;
    msgDiv.innerHTML = `<span class="bubble">${text}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle form submit
chatForm.onsubmit = async function (e) {
    e.preventDefault();
    const userMsg = chatInput.value.trim();
    if (!userMsg) return;
    addMessage("user", userMsg);
    chatInput.value = "";
    chatInput.disabled = true;
    chatForm.querySelector("button").disabled = true;

    // Fetch health overview and anxiety level for the current user
    let user = JSON.parse(localStorage.getItem("anxrelief_user"));
    let overviewText = "";
    let anxietyLevelText = "";
    if (user && user.id) {
        try {
            // Fetch health overview
            const res = await fetch(`/api/patient/overview/${user.id}`);
            const summary = await res.json();

            // Calculate averages as in health_overview.js
            let avgSleep = "No data";
            if (summary.sleep && summary.sleep.length > 0) {
                avgSleep = (summary.sleep.reduce((a, b) => a + b, 0) / summary.sleep.length).toFixed(1) + " hr/day";
            }
            let avgMood = "No data";
            if (summary.mood && summary.mood.length > 0) {
                const latestMood = summary.mood[summary.mood.length - 1];
                avgMood = latestMood.value || "No data";
            }
            let avgActivity = "No data";
            if (summary.activity && summary.activity.length > 0) {
                avgActivity = (summary.activity.reduce((a, b) => a + b, 0) / summary.activity.length).toFixed(1) + " hr/day";
            }
            let avgScreen = "No data";
            if (summary.screenTime && summary.screenTime.length > 0) {
                avgScreen = (summary.screenTime.reduce((a, b) => a + b, 0) / summary.screenTime.length).toFixed(1) + " hr/day";
            }
            let avgCalories = "No data";
            if (summary.food && summary.food.length > 0) {
                const totalCaloriesArr = summary.food.map(f =>
                    (Number(f.breakfast) || 0) + (Number(f.lunch) || 0) + (Number(f.dinner) || 0)
                );
                avgCalories = (totalCaloriesArr.reduce((a, b) => a + b, 0) / totalCaloriesArr.length).toFixed(0) + " kcal/day";
            }

            overviewText = `User's health overview: Average sleep: ${avgSleep}, Latest mood: ${avgMood}, Average activity: ${avgActivity}, Average screen time: ${avgScreen}, Average food intake: ${avgCalories}.`;
        } catch {
            overviewText = "";
        }

        try {
            // Fetch anxiety level
            const anxRes = await fetch(`/api/patient/anxiety/${user.id}`);
            if (anxRes.ok) {
                const anxData = await anxRes.json();
                if (anxData && anxData.anxietyType) {
                    let anxietyType = anxData.anxietyType;
                    if (anxietyType === "normal") anxietyLevelText = "Anxiety level: No Anxiety.";
                    else if (anxietyType === "mild") anxietyLevelText = "Anxiety level: Mild Anxiety.";
                    else if (anxietyType === "moderate") anxietyLevelText = "Anxiety level: Moderate Anxiety.";
                    else if (anxietyType === "severe") anxietyLevelText = "Anxiety level: Severe Anxiety.";
                    else anxietyLevelText = "";
                }
            }
        } catch {
            anxietyLevelText = "";
        }
    }

    try {
        const response = await fetch("/api/chatbot", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: [
                    {
                        role: "system",
                        content:
                            `${overviewText} ${anxietyLevelText}\nYou are a supportive mental health chatbot for anxiety. Respond empathetically and helpfully to the user's message. You can use the user's health overview and anxiety level to personalize your advice. Don't use any special characters like '*' except for emojis but only use them if necessary. Also, your message can't be too long. You have to act like a friend towards them.`
                    },
                    { role: "user", content: userMsg }
                ]
            })
        });
        if (!response.ok) throw new Error("API error");
        const data = await response.json();
        let botMsg = "";
        if (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            botMsg = data.choices[0].message.content.trim();
        } else {
            botMsg = "Sorry, I couldn't process that. Please try again.";
        }
        addMessage("bot", botMsg);
    } catch (err) {
        addMessage("bot", "Sorry, I'm having trouble responding right now. Please try again later.");
    }
    chatInput.disabled = false;
    chatForm.querySelector("button").disabled = false;
    chatInput.focus();
};
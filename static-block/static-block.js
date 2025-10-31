// /static-block/static-block.js

const ROAST_LIST = [
    "You really thought I wouldn't notice you trying to check Instagram during work? 🦉",
    "TikTok? Really? Your future self is disappointed. Get back to work!",
    "Instagram can wait. Your goals can't. Focus up! 💪",
    "Scrolling won't get you closer to your goal. But working will! 🎯",
    "Nice try sneaking off to social media. I'm watching you! 👀",
    "Your brain said 'quick break' but we both know that's a lie. Back to work!",
    "That dopamine hit from scrolling? Not worth it. Your goal is! 🔥",
    "Plot twist: You're stronger than your distractions. Prove it!",
    "Every scroll is a step away from success. Every focus session is a step toward it.",
    "Your goal won't achieve itself while you're scrolling. Let's go! 🚀",
    "Caught red-handed! 🦉 Now get back to being productive!",
    "Social media will still be there after your session. Your focus won't. Choose wisely.",
    "You're better than this distraction. Show me what you've got! 💯",
    "Imagine how good you'll feel AFTER you complete your goal. Hold that thought!",
    "That site is a time thief. Don't let it rob you of success!"
];

document.addEventListener("DOMContentLoaded", async () => {
    const siteNameElement = document.getElementById("siteName");
    const goalTextElement = document.getElementById("goalText");
    const roastTextElement = document.getElementById("roastText");
    const timeRemainingElement = document.getElementById("timeRemaining");
    const goHomeBtn = document.getElementById("goHome");
    const endSessionBtn = document.getElementById("endSession");

    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const blockedSite = params.get("site") || "This Site";

    // Display blocked site
    siteNameElement.textContent = blockedSite;

    // Get session data
    const data = await chrome.storage.local.get(["goal", "endTime"]);
    const goal = data.goal || "staying focused";
    const endTime = data.endTime;

    // Display goal
    goalTextElement.textContent = goal;

    // Display random roast from list
    const randomRoast = ROAST_LIST[Math.floor(Math.random() * ROAST_LIST.length)];
    roastTextElement.textContent = randomRoast;

    // Update countdown timer
    function updateTimer() {
        if (!endTime) {
            timeRemainingElement.textContent = "Session active";
            return;
        }

        const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));

        if (remaining <= 0) {
            timeRemainingElement.textContent = "Session ended!";
            return;
        }

        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = remaining % 60;

        timeRemainingElement.textContent =
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);

    // Go home button
    goHomeBtn.addEventListener("click", () => {
        clearInterval(timerInterval);
        window.location.href = "https://www.google.com";
    });

    // End session button
    endSessionBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to end your focus session early?")) {
            clearInterval(timerInterval);

            await chrome.storage.local.set({
                isRunning: false,
                blockListActive: false,
                endTime: null
            });

            chrome.runtime.sendMessage({ action: "clearBlockList" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Message error:", chrome.runtime.lastError);
                }
            });

            alert("Session ended. Great effort! 🎉");
            window.location.href = "https://www.google.com";
        }
    });
});

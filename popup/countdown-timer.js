console.log("Countdown timer module loaded.");

const goalInput = document.getElementById("goal");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");

let countdownInterval;

// -------------------- Helper Functions --------------------

function saveState(state) {
    chrome.storage.local.set(state);
}

function loadState(callback) {
    chrome.storage.local.get(["goal", "endTime", "isRunning"], callback);
}

function format(num) {
    return num.toString().padStart(2, "0");
}

function updateTimerUI(remaining) {
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = remaining % 60;

    hoursInput.value = format(hours);
    minutesInput.value = format(minutes);
    secondsInput.value = format(seconds);
}

// -------------------- Countdown Logic --------------------

function startCountdown(endTime) {
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        // When time is up
        if (remaining <= 0) {
            clearInterval(countdownInterval);
            updateTimerUI(0);

            // 🧹 Clear the goal input & reset state in storage
            goalInput.value = "";
            chrome.storage.local.remove(["goal", "endTime", "isRunning"], () => {
                console.log("Session data cleared.");
            });

            // 🥳 Visual feedback
            startBtn.textContent = "Session Complete 🎉";
            setTimeout(() => (startBtn.textContent = "Start Session"), 2000);

            // 🔔 Optional: Play sound or trigger notification
            try {
                const sound = new Audio("ding.mp3");
                sound.play();
            } catch (e) {
                console.warn("Audio playback issue:", e);
            }

            return;
        }

        updateTimerUI(remaining);
    }, 1000);
}

// -------------------- Initialization --------------------

loadState((data) => {
    if (data.goal) goalInput.value = data.goal;

    if (data.isRunning && data.endTime) {
        const remaining = Math.floor((data.endTime - Date.now()) / 1000);
        if (remaining > 0) {
            updateTimerUI(remaining);
            startCountdown(data.endTime);
        }
    }
});

goalInput.addEventListener("input", () => {
    saveState({ goal: goalInput.value });
});

startBtn.addEventListener("click", () => {
    const goal = goalInput.value.trim();
    if (!goal) {
        alert("Please enter your goal before starting a session.");
        return;
    }

    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    if (totalSeconds <= 0) {
        alert("Please set a valid duration for your session.");
        return;
    }

    const endTime = Date.now() + totalSeconds * 1000;
    saveState({ endTime, isRunning: true, goal });

    // ⏰ Create alarm for background.js
    chrome.alarms.create("focusSessionEnd", { when: endTime });

    startCountdown(endTime);
});


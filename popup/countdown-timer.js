
console.log("Countdown timer module loaded.");

const goalInput = document.getElementById("goal");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");

// New dynamic goal display
let goalDisplay = document.createElement("p");
goalDisplay.id = "goalDisplay";
goalDisplay.classList.add("goal-display");
goalDisplay.style.display = "none"; // hidden by default
goalInput.insertAdjacentElement("afterend", goalDisplay);

let countdownInterval;

// -------------------- Helpers --------------------

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

// -------------------- UI Helpers --------------------

function showGoalDisplay(goal) {
    goalDisplay.textContent = `🎯 ${goal}`;
    goalDisplay.style.display = "block";
    goalInput.style.display = "none";
    startBtn.style.display = "none";
}

function resetUI() {
    goalDisplay.style.display = "none";
    goalInput.style.display = "block";
    startBtn.style.display = "block";
    goalInput.value = "";
}

// -------------------- Countdown Logic --------------------

function startCountdown(endTime) {
    clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            clearInterval(countdownInterval);
            updateTimerUI(0);

            // 🧹 Clear session state
            chrome.storage.local.remove(["goal", "endTime", "isRunning"], () => {
                console.log("Session data cleared.");
            });

            // 🧽 Reset UI
            resetUI();

            // 🥳 Visual feedback
            startBtn.textContent = "Session Complete 🎉";
            setTimeout(() => (startBtn.textContent = "Start Session"), 2000);

            // 🔔 Sound or notification
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
    if (data.goal) {
        goalInput.value = data.goal;
    }

    if (data.isRunning && data.endTime) {
        const remaining = Math.floor((data.endTime - Date.now()) / 1000);
        if (remaining > 0) {
            showGoalDisplay(data.goal || "Focusing...");
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
        alert("Please set a valid session duration.");
        return;
    }

    const endTime = Date.now() + totalSeconds * 1000;

    saveState({ endTime, isRunning: true, goal });
    chrome.alarms.create("focusSessionEnd", { when: endTime });

    showGoalDisplay(goal);
    startCountdown(endTime);
});


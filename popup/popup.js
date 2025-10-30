// popup functionality go there //
console.log("Popup loaded!")


const goalInput = document.getElementById("goal");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const startBtn = document.getElementById("startBtn");

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
    const hours = parseInt(hoursInput.value) || 0;
    const minutes = parseInt(minutesInput.value) || 0;
    const seconds = parseInt(secondsInput.value) || 0;
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;

    const endTime = Date.now() + totalSeconds * 1000;
    saveState({ endTime, isRunning: true, goal: goalInput.value });
    startCountdown(endTime);
});

function startCountdown(endTime) {
    const interval = setInterval(() => {
        const remaining = Math.floor((endTime - Date.now()) / 1000);

        if (remaining <= 0) {
            clearInterval(interval);
            updateTimerUI(0);
            saveState({ isRunning: false });
            return;
        }

        updateTimerUI(remaining);
    }, 1000);
}

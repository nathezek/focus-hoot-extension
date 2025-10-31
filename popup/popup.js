// popup/popup.js

import { generateBlockList, activateBlockList } from '../ai/block-list-generator.js';

console.log("Popup script loaded");

const startBtn = document.getElementById("startBtn");
const goalInput = document.getElementById("goal");
const hoursInput = document.getElementById("hours");
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");

// Check if API key is configured
chrome.storage.local.get(["geminiApiKey"], (data) => {
    if (!data.geminiApiKey) {
        if (confirm("Gemini API key not configured. Open settings?")) {
            chrome.runtime.openOptionsPage();
        }
    }
});

startBtn.addEventListener("click", async () => {
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

    // Disable button
    startBtn.textContent = "Starting session...";
    startBtn.disabled = true;

    try {
        // Get static block list (no AI needed)
        const blockList = await generateBlockList();

        console.log("📋 Block list:", blockList);

        // Activate blocking
        await activateBlockList(blockList);

        // Calculate end time
        const endTime = Date.now() + totalSeconds * 1000;

        // Save session state
        await chrome.storage.local.set({
            goal: goal,
            endTime: endTime,
            isRunning: true,
            sessionBlockList: blockList
        });

        // Schedule alarm in background
        chrome.runtime.sendMessage({
            action: "scheduleAlarm",
            endTime: endTime
        }, (response) => {
            console.log("Alarm scheduled:", response);
        });

        startBtn.textContent = "Session Started! ✅";

        setTimeout(() => window.close(), 1000);

    } catch (error) {
        console.error("Error starting session:", error);
        alert("Failed to start session. Please try again.");
        startBtn.textContent = "Start Session";
        startBtn.disabled = false;
    }
});

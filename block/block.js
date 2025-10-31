
// block/block.js

import { generateRoast } from '../ai/roast-generator.js';

document.addEventListener("DOMContentLoaded", async () => {
    const goalText = document.getElementById("goalText");
    const roastLoader = document.getElementById("roastLoader");
    const roastText = document.getElementById("roastText");
    const videoTitleElement = document.getElementById("videoTitle");
    const reasonElement = document.getElementById("reason");
    const goBackBtn = document.getElementById("goBack");
    const endSessionBtn = document.getElementById("endSession");

    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const videoTitle = params.get("title");
    const reason = params.get("reason");

    // Get goal from storage
    const data = await chrome.storage.local.get(["goal"]);
    const goal = data.goal || "staying focused";

    // Display goal
    goalText.textContent = goal;

    // Display video info
    if (videoTitle) {
        videoTitleElement.textContent = `"${videoTitle}"`;
        reasonElement.textContent = reason || "This doesn't align with your goal";
    }

    // Generate AI roast - NO FALLBACK
    try {
        const aiRoast = await generateRoast(goal, { title: videoTitle });
        roastLoader.style.display = "none";
        roastText.textContent = aiRoast;
        roastText.style.display = "block";
        console.log("✅ AI roast displayed");
    } catch (error) {
        console.error("❌ AI roast generation failed:", error);
        roastLoader.style.display = "none";
        roastText.textContent = "Focus Hoot is taking a quick break, but you should be focusing on your goal! 🦉";
        roastText.style.display = "block";
    }

    // Go back button
    goBackBtn.addEventListener("click", () => {
        window.location.href = "https://www.youtube.com";
    });

    // End session button
    endSessionBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to end your focus session?")) {
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
            window.location.href = "https://www.youtube.com";
        }
    });
});


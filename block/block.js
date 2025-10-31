
// block/block.js

import { generateRoast } from '../ai/roast-generator.js';

document.addEventListener("DOMContentLoaded", async () => {
    console.log("🦉 [BLOCK PAGE] Loaded");

    const goalText = document.getElementById("goalText");
    const roastLoader = document.getElementById("roastLoader");
    const roastText = document.getElementById("roastText");
    const videoTitleElement = document.getElementById("videoTitle");
    const videoChannelElement = document.getElementById("videoChannel");
    const reasonElement = document.getElementById("reason");
    const goBackBtn = document.getElementById("goBack");
    const endSessionBtn = document.getElementById("endSession");

    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("videoId");
    const videoTitle = params.get("title") || "Unknown Video";
    const videoChannel = params.get("channel") || "Unknown Channel";
    const reason = params.get("reason") || "";

    console.log("🦉 [BLOCK PAGE] URL params:", { videoId, videoTitle, videoChannel, reason });

    // Get goal from storage
    const data = await chrome.storage.local.get(["goal"]);
    const goal = data.goal || "staying focused";

    console.log("🦉 [BLOCK PAGE] Goal from storage:", goal);

    // Display goal
    goalText.textContent = goal;

    // Display video info
    videoTitleElement.textContent = `"${videoTitle}"`;
    if (videoChannelElement) {
        videoChannelElement.textContent = `Channel: ${videoChannel}`;
    }
    reasonElement.textContent = reason;

    // Generate AI roast
    console.log("🦉 [BLOCK PAGE] Starting roast generation...");

    try {
        const aiRoast = await generateRoast(goal, {
            title: videoTitle,
            channel: videoChannel
        });

        console.log("🦉 [BLOCK PAGE] ✅ Roast received:", aiRoast);

        // Hide loader, show roast
        roastLoader.style.display = "none";
        roastText.textContent = aiRoast;
        roastText.style.display = "block";

        console.log("🦉 [BLOCK PAGE] Roast displayed successfully");
    } catch (error) {
        console.error("🦉 [BLOCK PAGE] ❌ Roast generation failed:", error);

        // Show error in UI
        roastLoader.style.display = "none";
        roastText.textContent = `Hmm, I'm at a loss for words. You said you were focusing on "${goal}", but here you are trying to watch "${videoTitle}"? Come on, you know better than this! 🦉`;
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

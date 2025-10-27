
console.log("Background service worker running");

import { onMessage } from "../utils/messaging.js";
import { setData, getData } from "../utils/storage.js";
import { analyzeContent } from "../ai/analyzer.js";

// --- 1️⃣ Handle Session Start from Popup ---
onMessage("START_SESSION", async ({ goal, timer }) => {
    const startTime = Date.now();
    await setData("session", { goal, timer, startTime, active: true });
    console.log("[MindTrackr] Session started:", goal, timer);

    chrome.action.setBadgeText({ text: "ON" });
    chrome.action.setBadgeBackgroundColor({ color: "#00b894" });
});

// --- 2️⃣ Tab Update Listener: Watch YouTube Pages ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;

    const url = tab.url || "";
    const session = await getData("session");

    // Only act if session is active
    if (!session?.active) return;

    // Inject content script into YouTube video pages
    if (url.includes("youtube.com/watch")) {
        console.log("[MindTrackr] Injecting content script into YouTube...");
        try {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content/content.js"]
            });
        } catch (err) {
            console.warn("[MindTrackr] Injection failed:", err.message);
        }
    }

    // Fully block distraction sites (MVP default)
    if (url.includes("tiktok.com") || url.includes("instagram.com")) {
        console.log("[MindTrackr] Blocking full site:", url);
        await setData("lastBlock", {
            title: "Browsing distraction site",
            url,
            reason: "Full site block (default)",
            goal: session.goal,
            timestamp: Date.now()
        });
        chrome.tabs.update(tabId, {
            url: chrome.runtime.getURL("block/dynamic-block.html")
        });
    }
});

// --- 3️⃣ Handle Metadata from Content Script ---
onMessage("PAGE_METADATA", async (data, sender, sendResponse) => {
    const session = await getData("session");
    if (!session?.active) {
        return sendResponse({ status: "pass" });
    }

    const { title, desc, url } = data;
    console.log("[MindTrackr] Received metadata:", { title, url });

    try {
        // Call AI analyzer (mock or Chrome built-in)
        const result = analyzeContent(title, desc, session.goal);

        console.log("[MindTrackr] AI Verdict:", result);

        if (result.verdict === "block") {
            await setData("lastBlock", {
                title,
                url,
                reason: result.reason,
                goal: session.goal,
                timestamp: Date.now()
            });

            // Redirect to block page
            chrome.tabs.update(sender.tab.id, {
                url: chrome.runtime.getURL("block/dynamic-block.html")
            });
        }

        sendResponse({ status: result.verdict });
    } catch (err) {
        console.error("[MindTrackr] AI analysis failed:", err);
        sendResponse({ status: "pass" });
    }
});

// --- 4️⃣ Optional: Clear Badge When Session Ends ---
async function checkSessionExpiry() {
    const session = await getData("session");
    if (!session?.active) return;

    const elapsed = (Date.now() - session.startTime) / 60000; // mins
    if (elapsed >= session.timer) {
        console.log("[MindTrackr] Session timer finished.");
        session.active = false;
        await setData("session", session);
        chrome.action.setBadgeText({ text: "" });

        // Notify popup if open
        chrome.runtime.sendMessage({ type: "SESSION_COMPLETE" });
    }
}

// Check session timer every minute
setInterval(checkSessionExpiry, 60 * 1000);

console.log("[MindTrackr] Background service worker loaded ✅");


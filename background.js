// background.js (service worker)

import { analyzeVideoContent } from './ai/content-analyzer.js';
import { deactivateBlockList } from './ai/block-list-generator.js';

const ALARM_NAME = "focusHootEnd";

// Active block list in memory
let activeBlockList = [];
let isInitialized = false;

// =====================================
// INITIALIZATION
// =====================================

async function initializeExtension() {
    if (isInitialized) return;

    console.log("🦉 Focus Hoot: Initializing...");

    const data = await chrome.storage.local.get([
        "endTime",
        "isRunning",
        "activeBlockList",
        "blockListActive"
    ]);

    console.log("📦 Loaded storage data:", data);

    // Restore session if active
    if (data && data.endTime && data.isRunning) {
        const endTime = data.endTime;
        if (endTime > Date.now()) {
            scheduleAlarmAt(endTime);
            console.log("✅ Restored active session");
        } else {
            await chrome.storage.local.set({
                goal: "",
                endTime: null,
                isRunning: false,
                blockListActive: false
            });
            console.log("⏰ Session expired, cleaned up");
        }
    }

    // Restore block list
    if (data.blockListActive && data.activeBlockList && Array.isArray(data.activeBlockList)) {
        activeBlockList = data.activeBlockList;
        console.log("✅ Restored block list:", activeBlockList);
    } else {
        console.log("ℹ️ No active block list");
    }

    isInitialized = true;
    console.log("🦉 Focus Hoot: Ready!");
}

// Initialize immediately
initializeExtension();

// =====================================
// ALARM MANAGEMENT
// =====================================

function scheduleAlarmAt(endTimeMs) {
    chrome.alarms.clear(ALARM_NAME, () => {
        chrome.alarms.create(ALARM_NAME, { when: endTimeMs });
        console.log("⏰ Scheduled alarm for", new Date(endTimeMs).toString());
    });
}

function clearScheduledAlarm() {
    chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
        if (wasCleared) console.log("✅ Cleared alarm", ALARM_NAME);
    });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    console.log("⏰ Alarm fired:", alarm.name);

    await deactivateBlockList();
    activeBlockList = [];

    chrome.storage.local.set({
        goal: "",
        endTime: null,
        isRunning: false,
        blockListActive: false
    }, () => {
        console.log("✅ Session ended, state cleared");
    });

    chrome.notifications.create({
        type: "basic",
        iconUrl: "assets/icons/favicon-32x32.png",
        title: "Session Complete 🎉",
        message: "Good job — your focus session is done!",
        priority: 2
    });

    clearScheduledAlarm();
});

// =====================================
// BLOCKING LOGIC
// =====================================

/**
 * Check if a URL should be blocked
 */
function shouldBlockUrl(url, blockList) {
    if (!blockList || blockList.length === 0) return false;

    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');

        console.log("🔍 Checking hostname:", hostname, "against list:", blockList);

        // Check if hostname matches any blocked domain
        const isBlocked = blockList.some(blockedDomain => {
            const cleanBlocked = blockedDomain.toLowerCase().replace(/^www\./, '');
            const matches = hostname === cleanBlocked || hostname.endsWith('.' + cleanBlocked);
            if (matches) {
                console.log("🎯 Match found:", hostname, "blocked by", cleanBlocked);
            }
            return matches;
        });

        return isBlocked;
    } catch (e) {
        console.error("❌ Error parsing URL:", url, e);
        return false;
    }
}

// Block sites using webNavigation
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    // Only intercept main frame navigations
    if (details.frameId !== 0) return;

    // Skip extension pages
    if (details.url.startsWith('chrome-extension://')) return;

    console.log("🌐 Navigation detected:", details.url);

    // Get block list from storage (don't rely on memory)
    chrome.storage.local.get(["blockListActive", "activeBlockList"], (data) => {
        console.log("📋 Block list active:", data.blockListActive, "List:", data.activeBlockList);

        if (!data.blockListActive || !data.activeBlockList || data.activeBlockList.length === 0) {
            console.log("✅ Blocking not active");
            return;
        }

        const blockList = data.activeBlockList;

        // Check if URL should be blocked (exclude YouTube - handled by content script)
        if (details.url.includes('youtube.com')) {
            console.log("📺 YouTube detected, handled by content script");
            return;
        }

        if (shouldBlockUrl(details.url, blockList)) {
            const urlObj = new URL(details.url);
            const domain = urlObj.hostname.replace(/^www\./, '');

            console.log("🚫 BLOCKING SITE:", domain);

            // Redirect to static block page
            chrome.tabs.update(details.tabId, {
                url: chrome.runtime.getURL("static-block/static-block.html") +
                    `?site=${encodeURIComponent(domain)}`
            });
        }
    });
});

// Additional method: Block on tab update
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Only check when URL changes
    if (changeInfo.status === 'loading' && changeInfo.url) {
        console.log("🔄 Tab updated:", changeInfo.url);

        // Skip extension pages
        if (changeInfo.url.startsWith('chrome-extension://')) return;

        chrome.storage.local.get(["blockListActive", "activeBlockList"], (data) => {
            if (!data.blockListActive || !data.activeBlockList || data.activeBlockList.length === 0) {
                return;
            }

            const blockList = data.activeBlockList;

            // Skip YouTube
            if (changeInfo.url.includes('youtube.com')) return;

            if (shouldBlockUrl(changeInfo.url, blockList)) {
                const urlObj = new URL(changeInfo.url);
                const domain = urlObj.hostname.replace(/^www\./, '');

                console.log("🚫 BLOCKING via tab update:", domain);

                chrome.tabs.update(tabId, {
                    url: chrome.runtime.getURL("static-block/static-block.html") +
                        `?site=${encodeURIComponent(domain)}`
                });
            }
        });
    }
});

// =====================================
// MESSAGE HANDLERS
// =====================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("📨 Message received:", message.action);

    if (!message || !message.action) {
        sendResponse({ error: "No action specified" });
        return true;
    }

    if (message.action === "scheduleAlarm") {
        const endTime = message.endTime;
        if (typeof endTime === "number" && endTime > Date.now()) {
            scheduleAlarmAt(endTime);
            sendResponse({ scheduled: true });
        } else {
            clearScheduledAlarm();
            sendResponse({ scheduled: false });
        }
        return true;
    }

    else if (message.action === "updateBlockList") {
        activeBlockList = message.blockList;
        console.log("✅ Block list updated in memory:", activeBlockList);

        // Verify it's saved in storage
        chrome.storage.local.get(["activeBlockList", "blockListActive"], (data) => {
            console.log("✅ Verified storage:", data);
        });

        sendResponse({ success: true });
        return true;
    }

    else if (message.action === "clearBlockList") {
        activeBlockList = [];
        console.log("✅ Block list cleared");
        sendResponse({ success: true });
        return true;
    }

    else if (message.action === "analyzeVideo") {
        console.log("🎥 Analyzing video:", message.videoData.title);

        analyzeVideoContent(message.videoData, message.goal)
            .then(result => {
                console.log("✅ Analysis result:", result);
                sendResponse(result);
            })
            .catch(err => {
                console.error("❌ Video analysis error:", err);
                sendResponse({ allowed: true, reason: "Analysis failed" });
            });

        return true;
    }

    else if (message.action === "showNotification") {
        chrome.notifications.create({
            type: "basic",
            iconUrl: "assets/icons/favicon-32x32.png",
            title: "Session Complete 🎉",
            message: message.message || "Time to take a short break and recharge!",
            priority: 2
        });
        sendResponse({ ok: true });
        return true;
    }

    else {
        sendResponse({ error: "Unknown action" });
        return true;
    }
});

// =====================================
// LIFECYCLE EVENTS
// =====================================

chrome.runtime.onStartup?.addListener?.(() => {
    console.log("🦉 Chrome startup detected");
    isInitialized = false;
    initializeExtension();
});

chrome.runtime.onInstalled?.addListener?.(() => {
    console.log("🦉 Extension installed/updated");
    isInitialized = false;
    initializeExtension();
});

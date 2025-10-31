// background.js (service worker)

const ALARM_NAME = "focusHootEnd";

// Helper: schedule chrome alarm at a timestamp (ms)
function scheduleAlarmAt(endTimeMs) {
    // clear previous alarm first
    chrome.alarms.clear(ALARM_NAME, () => {
        // chrome.alarms.create accepts 'when' as epoch ms
        chrome.alarms.create(ALARM_NAME, { when: endTimeMs });
        console.log("Scheduled alarm for", new Date(endTimeMs).toString());
    });
}

// Helper: clear scheduled alarm
function clearScheduledAlarm() {
    chrome.alarms.clear(ALARM_NAME, (wasCleared) => {
        if (wasCleared) console.log("Cleared alarm", ALARM_NAME);
    });
}

// When an alarm fires
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== ALARM_NAME) return;

    console.log("Alarm fired:", alarm.name);

    // Clear the stored session info and goal
    chrome.storage.local.set({ goal: "", endTime: null, isRunning: false }, () => {
        console.log("Cleared stored goal and timer state.");
    });

    // Show a notification
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icon128.png", // ensure this path exists in your extension
        title: "Session Complete 🎉",
        message: "Good job — your focus session is done!",
        priority: 2
    });

    // Optionally: clear alarm (it already fired, but keep tidy)
    clearScheduledAlarm();
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.action) return;

    if (message.action === "scheduleAlarm") {
        const endTime = message.endTime;
        if (typeof endTime === "number" && endTime > Date.now()) {
            scheduleAlarmAt(endTime);
            sendResponse({ scheduled: true });
        } else {
            // If endTime already past or invalid, clear any scheduled alarm
            clearScheduledAlarm();
            sendResponse({ scheduled: false });
        }
    } else if (message.action === "showNotification") {
        // keep compatibility if popup still sends this
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon128.png",
            title: "Session Complete 🎉",
            message: message.message || "Time to take a short break and recharge!",
            priority: 2
        });
        sendResponse({ ok: true });
    }
    // IMPORTANT: return true if you want to send async response (not needed here)
});

// When background starts up (service worker activation), read storage and schedule alarm if needed
chrome.runtime.onStartup?.addListener?.(() => {
    chrome.storage.local.get(["endTime", "isRunning"], (data) => {
        if (data && data.endTime && data.isRunning) {
            const endTime = data.endTime;
            if (endTime > Date.now()) scheduleAlarmAt(endTime);
            else {
                // expired while worker was off — ensure cleanup
                chrome.storage.local.set({ goal: "", endTime: null, isRunning: false });
            }
        }
    });
});

// Service worker may also be started in other ways — check on install/load
chrome.runtime.onInstalled?.addListener?.(() => {
    chrome.storage.local.get(["endTime", "isRunning"], (data) => {
        if (data && data.endTime && data.isRunning) {
            const endTime = data.endTime;
            if (endTime > Date.now()) scheduleAlarmAt(endTime);
            else chrome.storage.local.set({ goal: "", endTime: null, isRunning: false });
        }
    });
});

// Also run on worker start (some platforms don't fire onInstalled/onStartup the same way)
(() => {
    chrome.storage.local.get(["endTime", "isRunning"], (data) => {
        if (data && data.endTime && data.isRunning) {
            const endTime = data.endTime;
            if (endTime > Date.now()) scheduleAlarmAt(endTime);
            else chrome.storage.local.set({ goal: "", endTime: null, isRunning: false });
        }
    });
})();


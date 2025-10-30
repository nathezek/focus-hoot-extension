
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "focusTimer") {
        chrome.storage.local.set({ isRunning: false });
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icon.png",
            title: "Session Complete!",
            message: "Good job — your focus session is done!",
            priority: 2,
        });
    }
});

// This file the responsible for the popup functionalities //


// Send message to the active tab asking for metadata
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "getMeta" }, (response) => {
        if (chrome.runtime.lastError) {
            document.getElementById("title").innerText = "Not a YouTube video page.";
            return;
        }

        if (response) {
            document.getElementById("title").innerText = response.title || "No title found";
            document.getElementById("channel").innerText = response.channelName || "Unknown";
            document.getElementById("description").innerText = response.description || "No description";
        } else {
            document.getElementById("title").innerText = "Could not fetch metadata.";
        }
    });
});


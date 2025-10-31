// /settings/settings.js

const apiKeyInput = document.getElementById("apiKeyInput");
const toggleKeyVisibility = document.getElementById("toggleKeyVisibility");
const saveApiKey = document.getElementById("saveApiKey");
const testApiKey = document.getElementById("testApiKey");
const clearData = document.getElementById("clearData");
const statusMessage = document.getElementById("statusMessage");

// Load existing API key on page load
chrome.storage.local.get(["geminiApiKey"], (data) => {
    if (data.geminiApiKey) {
        apiKeyInput.value = data.geminiApiKey;
    }
});

// Toggle API key visibility
toggleKeyVisibility.addEventListener("click", () => {
    if (apiKeyInput.type === "password") {
        apiKeyInput.type = "text";
        toggleKeyVisibility.textContent = "🙈";
    } else {
        apiKeyInput.type = "password";
        toggleKeyVisibility.textContent = "👁️";
    }
});

// Save API key
saveApiKey.addEventListener("click", () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus("Please enter an API key", "error");
        return;
    }

    chrome.storage.local.set({ geminiApiKey: apiKey }, () => {
        showStatus("✅ API key saved successfully!", "success");
    });
});

// Test API connection
testApiKey.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
        showStatus("Please enter an API key first", "error");
        return;
    }

    showStatus("🔄 Testing connection...", "info");

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Hello" }] }]
                })
            }
        );

        if (response.ok) {
            showStatus("✅ Connection successful! API key is working.", "success");
        } else {
            const error = await response.json();
            showStatus(`❌ API Error: ${error.error.message}`, "error");
        }
    } catch (error) {
        showStatus(`❌ Connection failed: ${error.message}`, "error");
    }
});

// Clear all extension data
clearData.addEventListener("click", () => {
    if (confirm("Are you sure? This will delete all settings and session data.")) {
        chrome.storage.local.clear(() => {
            apiKeyInput.value = "";
            showStatus("🗑️ All data cleared", "info");
        });
    }
});

// Helper: show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusMessage.className = "status-message";
    }, 5000);
}

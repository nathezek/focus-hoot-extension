
console.log("[Focus Hoot] Content script loaded.");

// --- Messaging helper ---
function sendMessage(type, data = {}) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type, data }, resolve);
    });
}

// --- Wait for an element to exist (async) ---
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(interval);
                resolve(el);
            }
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            resolve(null); // fallback
        }, timeout);
    });
}

// --- Scrape YouTube video metadata safely ---
async function getVideoMetadataAsync() {
    const titleEl = await waitForElement("h1.title, h1.ytd-watch-metadata");
    const descEl = await waitForElement("#description, #description-inline-expander");

    const title = titleEl && titleEl.innerText ? titleEl.innerText.trim() : document.title || "";
    const description = descEl && descEl.innerText ? descEl.innerText.trim().slice(0, 300) : "";
    const url = window.location.href || "";

    return { title, desc: description, url };
}

// --- Overlay UI ---
function showOverlay(message = "Analyzing content...") {
    let overlay = document.createElement("div");
    overlay.id = "focushoot-overlay";
    overlay.innerText = message;
    overlay.style = `
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.75);
    color: white;
    font-size: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    font-family: sans-serif;
  `;
    document.body.appendChild(overlay);
    return overlay;
}

function removeOverlay() {
    const overlay = document.getElementById("focushoot-overlay");
    if (overlay) overlay.remove();
}

// --- Main runner ---
async function runAnalysis() {
    const overlay = showOverlay("🦉 Focus Hoot is checking your focus...");

    try {
        const meta = await getVideoMetadataAsync();
        const response = await sendMessage("PAGE_METADATA", meta);
        removeOverlay();

        if (response.status === "block") {
            console.warn("[Focus Hoot] AI decided to block this video.");
            // Background script handles the redirect to dynamic-block.html
        } else {
            console.log("[Focus Hoot] Video allowed ✅");
        }
    } catch (err) {
        console.error("[Focus Hoot] Failed to analyze video:", err);
        removeOverlay();
    }
}

// --- Trigger analysis on YouTube watch pages ---
window.addEventListener("load", () => {
    if (window.location.href.includes("watch")) {
        // small delay to ensure metadata loads
        setTimeout(runAnalysis, 2000);
    }
});


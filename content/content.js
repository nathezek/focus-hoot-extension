
console.log("Content script loaded on", window.location.href);

import { sendMessage } from "../utils/messaging.js";

console.log("[Focus Hoot] Content script active.");

// --- Get video metadata ---
function getVideoMetadata() {
    const titleEl = document.querySelector("h1.title, h1.ytd-watch-metadata");
    const descEl = document.querySelector("#description, #description-inline-expander");
    const title = titleEl ? titleEl.innerText.trim() : document.title;
    const description = descEl ? descEl.innerText.trim().slice(0, 300) : "";
    const url = window.location.href;

    return { title, desc: description, url };
}

// --- Overlay when checking ---
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

// --- Remove overlay ---
function removeOverlay() {
    const overlay = document.getElementById("focushoot-overlay");
    if (overlay) overlay.remove();
}

// --- Main runner ---
async function runAnalysis() {
    const meta = getVideoMetadata();
    const overlay = showOverlay("🦉 Focus Hoot is checking your focus...");

    try {
        const response = await sendMessage("PAGE_METADATA", meta);
        removeOverlay();

        if (response.status === "block") {
            console.warn("[Focus Hoot] AI decided to block this video.");
            // background.js handles redirect — we stop here
        } else {
            console.log("[Focus Hoot] Video allowed ✅");
        }
    } catch (err) {
        console.error("[Focus Hoot] Failed to analyze video:", err);
        removeOverlay();
    }
}

// --- Trigger once the page loads ---
window.addEventListener("load", () => {
    if (window.location.href.includes("watch")) {
        setTimeout(runAnalysis, 2000); // small delay for metadata to load
    }
});


// /content/content.js

console.log("🦉 Focus Hoot: YouTube content script loaded");

let isAnalyzing = false;
let lastAnalyzedVideoId = null;
let currentVideoId = null;

/**
 * Show analyzing overlay
 */
function showAnalyzingOverlay() {
    // Remove existing overlay if present
    hideAnalyzingOverlay();

    const overlay = document.createElement("div");
    overlay.className = "focus-hoot-overlay";
    overlay.id = "focusHootOverlay";

    const iconUrl = chrome.runtime.getURL("assets/icons/android-chrome-512x512.png");

    overlay.innerHTML = `
        <div class="focus-hoot-modal">
            <img src="${iconUrl}" alt="Focus Hoot">
            <h2>Hold on a sec!</h2>
            <p>Let me check if this matches your goal...</p>
            <div class="focus-hoot-spinner"></div>
        </div>
    `;

    document.body.appendChild(overlay);
}

/**
 * Hide analyzing overlay
 */
function hideAnalyzingOverlay() {
    const overlay = document.getElementById("focusHootOverlay");
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Wait for element to appear on page
 */
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }

        const observer = new MutationObserver((mutations, obs) => {
            const element = document.querySelector(selector);
            if (element) {
                obs.disconnect();
                resolve(element);
            }
        });

        // Only observe if document.body exists
        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        } else {
            reject(new Error("document.body not available"));
        }

        setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Element ${selector} not found within ${timeout}ms`));
        }, timeout);
    });
}

/**
 * Extract video metadata from YouTube page
 */
async function extractVideoMetadata(videoId) {
    console.log("📊 Waiting for video metadata to load...");

    try {
        // Wait for title to appear
        await waitForElement('h1.ytd-watch-metadata yt-formatted-string, h1 yt-formatted-string', 5000);

        // Give extra time for all elements
        await new Promise(resolve => setTimeout(resolve, 1500));

        const titleElement =
            document.querySelector('h1.ytd-watch-metadata yt-formatted-string') ||
            document.querySelector('h1 yt-formatted-string') ||
            document.querySelector('h1.title') ||
            document.querySelector('#title h1');

        const channelElement =
            document.querySelector('ytd-channel-name#channel-name a') ||
            document.querySelector('#owner-name a') ||
            document.querySelector('ytd-video-owner-renderer a');

        const descriptionElement =
            document.querySelector('ytd-text-inline-expander#description-inline-expander yt-attributed-string span') ||
            document.querySelector('#description yt-formatted-string') ||
            document.querySelector('#snippet-text');

        const title = titleElement?.textContent?.trim() || "Unknown Video";
        const channel = channelElement?.textContent?.trim() || "Unknown Channel";
        const description = descriptionElement?.textContent?.trim()?.substring(0, 500) || "";

        console.log("✅ Extracted metadata:", { title, channel });

        return {
            videoId: videoId,
            title: title,
            channel: channel,
            description: description,
            url: window.location.href
        };
    } catch (error) {
        console.error("❌ Error extracting metadata:", error);
        return {
            videoId: videoId,
            title: "Unknown Video",
            channel: "Unknown Channel",
            description: "",
            url: window.location.href
        };
    }
}

/**
 * Get video ID from URL
 */
function getVideoIdFromUrl(url) {
    try {
        const urlParams = new URLSearchParams(new URL(url).search);
        return urlParams.get('v');
    } catch (e) {
        return null;
    }
}

/**
 * Pause video playback
 */
function pauseVideo() {
    const video = document.querySelector('video');
    if (video) {
        video.pause();
        console.log("⏸️ Video paused for analysis");
    }
}

/**
 * Check if we should analyze this video
 */
async function checkVideoAccess() {
    const videoId = getVideoIdFromUrl(window.location.href);

    if (!videoId) {
        console.log("⚠️ No video ID found in URL");
        return;
    }

    // If same video as current, skip
    if (videoId === currentVideoId) {
        console.log("ℹ️ Same video, skipping analysis");
        return;
    }

    // Update current video
    currentVideoId = videoId;

    // If already analyzed this video, skip
    if (videoId === lastAnalyzedVideoId) {
        console.log("ℹ️ Already analyzed this video:", videoId);
        return;
    }

    // If already analyzing, skip
    if (isAnalyzing) {
        console.log("⏳ Already analyzing another video");
        return;
    }

    // Check if session is running
    chrome.storage.local.get(["isRunning", "goal"], async (data) => {
        if (chrome.runtime.lastError) {
            console.error("❌ Storage error:", chrome.runtime.lastError);
            return;
        }

        if (!data.isRunning) {
            console.log("✅ No active session, allowing video");
            return;
        }

        console.log("🔍 Active session detected, analyzing video:", videoId);

        isAnalyzing = true;
        lastAnalyzedVideoId = videoId;

        // Pause video immediately
        pauseVideo();

        // Show overlay
        showAnalyzingOverlay();

        try {
            // Extract metadata
            const metadata = await extractVideoMetadata(videoId);

            // Send to background for AI analysis
            chrome.runtime.sendMessage({
                action: "analyzeVideo",
                videoData: metadata,
                goal: data.goal
            }, (response) => {
                isAnalyzing = false;
                hideAnalyzingOverlay();

                if (chrome.runtime.lastError) {
                    console.error("❌ Message error:", chrome.runtime.lastError);
                    // Allow video if communication fails
                    return;
                }

                if (response && !response.allowed) {
                    console.log("🚫 Video blocked:", response.reason);
                    // Redirect to block page
                    const blockUrl = chrome.runtime.getURL("block/dynamic-block.html") +
                        `?videoId=${videoId}&title=${encodeURIComponent(metadata.title)}&reason=${encodeURIComponent(response.reason)}`;
                    window.location.href = blockUrl;
                } else {
                    console.log("✅ Video allowed");
                }
            });
        } catch (error) {
            console.error("❌ Error during video analysis:", error);
            isAnalyzing = false;
            hideAnalyzingOverlay();
        }
    });
}

/**
 * Detect URL changes in YouTube SPA
 */
let lastUrl = location.href;

function onUrlChange() {
    const currentUrl = location.href;

    if (currentUrl !== lastUrl) {
        console.log("🔄 URL changed:", currentUrl);
        lastUrl = currentUrl;

        // Reset state when leaving video page
        if (!currentUrl.includes('/watch?v=')) {
            currentVideoId = null;
            isAnalyzing = false;
            hideAnalyzingOverlay();
            console.log("📍 Not on video page, resetting state");
        } else {
            // New video detected
            console.log("🎬 New video detected, checking access...");
            checkVideoAccess();
        }
    }
}

/**
 * Initialize URL change detection
 */
function initializeUrlDetection() {
    // Wait for document.body to be available
    if (!document.body) {
        console.log("⏳ Waiting for document.body...");
        const bodyObserver = new MutationObserver(() => {
            if (document.body) {
                bodyObserver.disconnect();
                console.log("✅ document.body ready, setting up detection");
                setupUrlDetection();
            }
        });
        bodyObserver.observe(document.documentElement, { childList: true });
        return;
    }

    setupUrlDetection();
}

/**
 * Setup all URL detection methods
 */
function setupUrlDetection() {
    // Method 1: MutationObserver for DOM changes
    const observer = new MutationObserver(onUrlChange);
    observer.observe(document.body, { subtree: true, childList: true });
    console.log("✅ MutationObserver set up");

    // Method 2: Intercept pushState and replaceState
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function() {
        originalPushState.apply(this, arguments);
        onUrlChange();
    };

    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        onUrlChange();
    };
    console.log("✅ History API intercepted");

    // Method 3: Listen for popstate
    window.addEventListener('popstate', onUrlChange);
    console.log("✅ Popstate listener added");

    // Method 4: Periodic check (backup)
    setInterval(() => {
        if (location.href !== lastUrl) {
            onUrlChange();
        }
    }, 500);
    console.log("✅ Periodic URL check started");

    // Initial check if we're already on a video page
    if (window.location.href.includes('/watch?v=')) {
        console.log("🎬 Initial video page detected");
        setTimeout(() => {
            checkVideoAccess();
        }, 1000);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUrlDetection);
} else {
    initializeUrlDetection();
}

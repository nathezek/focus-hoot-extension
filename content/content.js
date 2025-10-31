// /content/content.js

console.log("🦉 Focus Hoot: YouTube content script loaded");

let isAnalyzing = false;
let lastAnalyzedVideoId = null;
let currentVideoId = null;

/**
 * Show analyzing overlay
 */
function showAnalyzingOverlay() {
    hideAnalyzingOverlay();

    const overlay = document.createElement("div");
    overlay.className = "focus-hoot-overlay";
    overlay.id = "focusHootOverlay";

    const iconUrl = chrome.runtime.getURL("assets/icons/favicon-32x32.png");

    overlay.innerHTML = `
        <div class="focus-hoot-modal">
            <img src="${iconUrl}" alt="Focus Hoot">
            <h2>Hold on a sec! 🦉</h2>
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
 * Wait for video title to be loaded and NOT be a placeholder
 */
function waitForRealTitle(maxAttempts = 30, intervalMs = 200) {
    return new Promise((resolve, reject) => {
        let attempts = 0;

        const checkTitle = () => {
            attempts++;

            const titleSelectors = [
                'h1.ytd-watch-metadata yt-formatted-string',
                'ytd-watch-metadata h1 yt-formatted-string',
                'h1 yt-formatted-string'
            ];

            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const text = element.textContent?.trim();
                    // Make sure it's not empty and not a placeholder
                    if (text && text.length > 0 && !text.includes('…')) {
                        console.log(`✅ Real title found: "${text}"`);
                        resolve(element);
                        return;
                    }
                }
            }

            if (attempts >= maxAttempts) {
                console.warn(`⚠️ Title not found after ${maxAttempts} attempts`);
                reject(new Error("Title not loaded"));
                return;
            }

            console.log(`⏳ Attempt ${attempts}/${maxAttempts} - waiting for title...`);
            setTimeout(checkTitle, intervalMs);
        };

        checkTitle();
    });
}

/**
 * Extract video metadata - ONLY when elements are actually loaded
 */
async function extractVideoMetadata(videoId) {
    console.log("📊 Extracting metadata for video:", videoId);

    try {
        // WAIT for the real title to appear (up to 6 seconds)
        await waitForRealTitle(30, 200);

        // Give a bit more time for other elements to populate
        await new Promise(resolve => setTimeout(resolve, 500));

        // Now extract everything
        const titleSelectors = [
            'h1.ytd-watch-metadata yt-formatted-string',
            'ytd-watch-metadata h1 yt-formatted-string',
            'h1 yt-formatted-string'
        ];

        let titleElement = null;
        for (const selector of titleSelectors) {
            titleElement = document.querySelector(selector);
            if (titleElement?.textContent?.trim()) {
                break;
            }
        }

        const channelSelectors = [
            'ytd-channel-name#channel-name yt-formatted-string a',
            'ytd-channel-name#channel-name a',
            '#channel-name a',
            'ytd-video-owner-renderer a'
        ];

        let channelElement = null;
        for (const selector of channelSelectors) {
            channelElement = document.querySelector(selector);
            if (channelElement?.textContent?.trim()) {
                break;
            }
        }

        const descriptionSelectors = [
            'ytd-text-inline-expander#description-inline-expander yt-attributed-string span',
            '#description yt-attributed-string',
            'ytd-expandable-video-description-body-renderer yt-attributed-string'
        ];

        let descriptionElement = null;
        for (const selector of descriptionSelectors) {
            descriptionElement = document.querySelector(selector);
            if (descriptionElement?.textContent?.trim()) {
                break;
            }
        }

        const title = titleElement?.textContent?.trim() || "";
        const channel = channelElement?.textContent?.trim() || "";
        const description = descriptionElement?.textContent?.trim()?.substring(0, 500) || "";

        console.log("📊 Extracted:");
        console.log("  ✓ Title:", title);
        console.log("  ✓ Channel:", channel);
        console.log("  ✓ Description:", description ? `${description.substring(0, 50)}...` : "(none)");

        // VERIFY we got real data
        if (!title || title.length < 3) {
            throw new Error("Title too short or missing");
        }

        return {
            videoId: videoId,
            title: title,
            channel: channel || "Unknown Channel",
            description: description,
            url: window.location.href
        };
    } catch (error) {
        console.error("❌ Failed to extract metadata:", error);
        // Return null to indicate failure (don't analyze with bad data)
        return null;
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

    if (videoId === currentVideoId) {
        console.log("ℹ️ Same video, skipping analysis");
        return;
    }

    currentVideoId = videoId;

    if (videoId === lastAnalyzedVideoId) {
        console.log("ℹ️ Already analyzed this video:", videoId);
        return;
    }

    if (isAnalyzing) {
        console.log("⏳ Already analyzing another video");
        return;
    }

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

        pauseVideo();
        showAnalyzingOverlay();

        try {
            // Extract metadata - will wait for real data
            const metadata = await extractVideoMetadata(videoId);

            // If metadata extraction failed, ALLOW the video (fail open)
            if (!metadata || !metadata.title || metadata.title.length < 3) {
                console.warn("⚠️ Could not get valid metadata, ALLOWING video");
                isAnalyzing = false;
                hideAnalyzingOverlay();
                return;
            }

            console.log("📤 Sending to background for analysis:", metadata);

            chrome.runtime.sendMessage({
                action: "analyzeVideo",
                videoData: metadata,
                goal: data.goal
            }, (response) => {
                isAnalyzing = false;
                hideAnalyzingOverlay();

                if (chrome.runtime.lastError) {
                    console.error("❌ Message error:", chrome.runtime.lastError);
                    return;
                }

                console.log("📥 Received response:", response);

                if (response && !response.allowed) {
                    console.log("🚫 Video blocked:", response.reason);
                    const blockUrl = chrome.runtime.getURL("block/dynamic-block.html") +
                        `?videoId=${encodeURIComponent(videoId)}` +
                        `&title=${encodeURIComponent(metadata.title)}` +
                        `&channel=${encodeURIComponent(metadata.channel)}` +
                        `&reason=${encodeURIComponent(response.reason)}`;
                    window.location.href = blockUrl;
                } else {
                    console.log("✅ Video allowed");
                }
            });
        } catch (error) {
            console.error("❌ Error during video analysis:", error);
            console.warn("⚠️ Analysis failed, ALLOWING video");
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

        if (!currentUrl.includes('/watch?v=')) {
            currentVideoId = null;
            isAnalyzing = false;
            hideAnalyzingOverlay();
            console.log("📍 Not on video page, resetting state");
        } else {
            console.log("🎬 New video detected, checking access...");
            // Add a small delay to let YouTube start loading
            setTimeout(() => {
                checkVideoAccess();
            }, 300);
        }
    }
}

/**
 * Initialize URL change detection
 */
function initializeUrlDetection() {
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
    const observer = new MutationObserver(onUrlChange);
    observer.observe(document.body, { subtree: true, childList: true });

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

    window.addEventListener('popstate', onUrlChange);

    setInterval(() => {
        if (location.href !== lastUrl) {
            onUrlChange();
        }
    }, 500);

    if (window.location.href.includes('/watch?v=')) {
        console.log("🎬 Initial video page detected");
        setTimeout(() => {
            checkVideoAccess();
        }, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeUrlDetection);
} else {
    initializeUrlDetection();
}

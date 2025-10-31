// /ai/block-list-generator.js

// Sites that are ALWAYS blocked when a session starts
const STATIC_BLOCK_LIST = [
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "snapchat.com",
    "netflix.com",
    "hulu.com",
    "twitch.tv",
    "discord.com"
];

/**
 * Get the static block list (no AI involved)
 * @returns {Promise<string[]>} - Array of domains to block
 */
export async function generateBlockList() {
    console.log("🔒 Using static block list:", STATIC_BLOCK_LIST);
    return STATIC_BLOCK_LIST;
}

/**
 * Save block list to storage and activate blocking
 * @param {string[]} blockList 
 */
export async function activateBlockList(blockList) {
    console.log("💾 Activating block list:", blockList);

    await chrome.storage.local.set({
        activeBlockList: blockList,
        blockListActive: true
    });

    console.log("✅ Saved to storage");

    return new Promise((resolve) => {
        chrome.runtime.sendMessage({
            action: "updateBlockList",
            blockList: blockList
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("❌ Error sending to background:", chrome.runtime.lastError);
            } else {
                console.log("✅ Background notified:", response);
            }
            resolve();
        });
    });
}

/**
 * Deactivate blocking when session ends
 */
export async function deactivateBlockList() {
    console.log("🔓 Deactivating block list");

    await chrome.storage.local.set({
        blockListActive: false,
        activeBlockList: []
    });

    chrome.runtime.sendMessage({
        action: "clearBlockList"
    }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("❌ Error clearing block list:", chrome.runtime.lastError);
        }
    });

    console.log("✅ Block list deactivated");
}

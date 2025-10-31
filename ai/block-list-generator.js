// /ai/block-list-generator.js

import { getGeminiClient } from './gemini-client.js';

// Core distractions that are ALWAYS blocked
const ALWAYS_BLOCK = [
    "instagram.com",
    "tiktok.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com"
];

/**
 * Generate a list of sites to fully block based on user's goal
 * @param {string} goal - User's focus goal
 * @param {number} durationMinutes - Session duration
 * @returns {Promise<string[]>} - Array of domains to block
 */
export async function generateBlockList(goal, durationMinutes) {
    const client = await getGeminiClient();

    const prompt = `You are Focus Hoot, an AI productivity assistant that helps users stay focused.

A user wants to focus on: "${goal}"
Session duration: ${durationMinutes} minutes

Based on this goal, generate a JSON array of additional website domains that should be blocked during this session.

NOTE: Instagram, TikTok, Facebook, Twitter, and Reddit are ALREADY being blocked automatically.

Rules:
1. Only suggest ADDITIONAL distracting websites beyond the core social media platforms
2. Focus on: streaming sites (Netflix, Hulu), shopping (Amazon), entertainment news, gaming sites, etc.
3. Return domains in format: ["domain1.com", "domain2.com"]
4. DO NOT include: youtube.com (handled separately), work tools, or sites needed for the goal
5. Include only the domain (no protocol, no www, no paths)
6. Consider the goal context - if they're learning web dev, don't block documentation sites

Return ONLY a valid JSON array of strings, nothing else.

Example output:
["netflix.com", "twitch.tv", "espn.com", "buzzfeed.com"]`;

    try {
        const result = await client.generateJSON(prompt);

        // Ensure result is an array
        const additionalBlocks = Array.isArray(result) ? result : [];

        // Combine with always-blocked sites
        const fullBlockList = [...ALWAYS_BLOCK, ...additionalBlocks];

        console.log("Generated block list:", fullBlockList);
        return fullBlockList;
    } catch (error) {
        console.error("Error generating block list:", error);
        // Return default block list as fallback
        return ALWAYS_BLOCK;
    }
}

/**
 * Save block list to storage and activate blocking
 * @param {string[]} blockList 
 */
export async function activateBlockList(blockList) {
    // Save to storage
    await chrome.storage.local.set({
        activeBlockList: blockList,
        blockListActive: true
    });

    console.log("Block list activated:", blockList);

    // Send message to background to enable blocking
    chrome.runtime.sendMessage({
        action: "updateBlockList",
        blockList: blockList
    });
}

/**
 * Deactivate blocking when session ends
 */
export async function deactivateBlockList() {
    await chrome.storage.local.set({
        blockListActive: false
    });

    chrome.runtime.sendMessage({
        action: "clearBlockList"
    });

    console.log("Block list deactivated");
}

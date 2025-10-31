// /ai/roast-generator.js

import { getGeminiClient } from './gemini-client.js';

/**
 * Generate a humorous roast when user gets blocked
 * @param {string} goal - User's focus goal
 * @param {object} videoData - The blocked video info
 * @returns {Promise<string>} - The roast message
 */
export async function generateRoast(goal, videoData) {
    console.log("🎭 [ROAST] Starting generation");
    console.log("🎭 [ROAST] Goal:", goal);
    console.log("🎭 [ROAST] Video data:", videoData);

    try {
        const client = await getGeminiClient();
        console.log("🎭 [ROAST] Client obtained");

        const videoInfo = videoData.channel
            ? `"${videoData.title}" by ${videoData.channel}`
            : `"${videoData.title}"`;

        console.log("🎭 [ROAST] Video info string:", videoInfo);

        // Add timestamp to ensure unique roasts
        const timestamp = new Date().toLocaleTimeString();

        const prompt = `You are Focus Hoot 🦉, a witty owl AI assistant that roasts users when they get distracted.

User said they wanted to focus on: "${goal}"
But they just tried to watch: ${videoInfo}
Current time: ${timestamp}

Generate a SHORT, FUNNY, slightly sassy roast (2-3 sentences max) that:
1. Calls out the hypocrisy between their goal and what they tried to watch
2. Uses owl puns or wisdom themes occasionally (but not always)
3. Is playful and motivating, not mean-spirited
4. Ends with encouragement to get back on track
5. Makes it personal to their specific goal and the video they tried to watch
6. IMPORTANT: Make each roast UNIQUE - vary your style, humor, and approach every time

Tone: Playful, witty, supportive friend who caught you slacking

Return ONLY the roast text, no quotes, no extra formatting.`;

        console.log("🎭 [ROAST] Sending request to Gemini...");
        const roast = await client.generate(prompt, 200);
        console.log("🎭 [ROAST] ✅ SUCCESS! Generated roast:", roast);

        // Verify it's not empty
        if (!roast || roast.trim().length === 0) {
            throw new Error("Empty roast received from AI");
        }

        return roast;
    } catch (error) {
        console.error("🎭 [ROAST] ❌ ERROR:", error);
        console.error("🎭 [ROAST] Error details:", error.message);
        throw error;
    }
}

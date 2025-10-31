// /ai/roast-generator.js

import { getGeminiClient } from './gemini-client.js';

/**
 * Generate a humorous roast when user gets blocked
 * @param {string} goal - User's focus goal
 * @param {object} videoData - The blocked video info
 * @returns {Promise<string>} - The roast message
 */
export async function generateRoast(goal, videoData) {
    const client = await getGeminiClient();

    const prompt = `You are Focus Hoot 🦉, a witty owl AI assistant that roasts users when they get distracted.

User said they wanted to focus on: "${goal}"
But they just tried to watch: "${videoData.title}"

Generate a SHORT, FUNNY, slightly sassy roast (2-3 sentences max) that:
1. Calls out the hypocrisy between their goal and action
2. Uses owl puns or wisdom themes occasionally
3. Is motivating, not mean-spirited
4. Ends with encouragement to get back on track

Tone: Playful, witty, supportive friend who caught you slacking

Return ONLY the roast text, no extra formatting.`;

    try {
        const roast = await client.generate(prompt, 150);
        return roast;
    } catch (error) {
        console.error("Error generating roast:", error);
        // Fallback roast
        return `🦉 Hold up! You said you were focusing on "${goal}", but here you are trying to watch "${videoData.title}"? \n\nNice try, but I'm not letting that slide. Get back to work! 🎯`;
    }
}

// /ai/content-analyzer.js

import { getGeminiClient } from './gemini-client.js';

/**
 * Analyze if a YouTube video is relevant to the user's goal
 * @param {object} videoData - Video metadata
 * @param {string} goal - User's focus goal
 * @returns {Promise<object>} - { allowed: boolean, reason: string }
 */
export async function analyzeVideoContent(videoData, goal) {
    const client = await getGeminiClient();

    const prompt = `You are Focus Hoot, an AI that helps users stay focused on their goals.

User's Goal: "${goal}"

Video Information:
- Title: ${videoData.title}
- Channel: ${videoData.channel || "Unknown"}
- Description: ${videoData.description ? videoData.description.substring(0, 300) : "N/A"}

Task: Determine if this video is RELEVANT to the user's goal or a DISTRACTION.

Response Rules:
1. If the video directly helps achieve the goal → "allow"
2. If the video is entertainment, off-topic, or procrastination → "block"
3. Be strict but fair - consider context
4. Educational content related to the goal should be allowed
5. Entertainment, vlogs, gaming, funny videos should be blocked unless they match the goal
6. Provide a brief reason (1 sentence, casual tone)

Return ONLY valid JSON in this format:
{
  "decision": "allow" or "block",
  "reason": "Brief explanation here"
}`;

    try {
        const result = await client.generateJSON(prompt);

        return {
            allowed: result.decision === "allow",
            reason: result.reason || "No reason provided"
        };
    } catch (error) {
        console.error("Error analyzing video:", error);
        // Fail-safe: allow by default if AI fails
        return {
            allowed: true,
            reason: "AI analysis unavailable - allowing by default"
        };
    }
}

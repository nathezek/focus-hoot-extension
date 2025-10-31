// /ai/gemini-client.js

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Main Gemini API client
 */
export class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
    }

    /**
     * Send a prompt to Gemini and get response
     * @param {string} prompt - The prompt to send
     * @param {number} maxTokens - Max response tokens (default 1024)
     * @returns {Promise<string>} - The generated text
     */
    async generate(prompt, maxTokens = 1024) {
        if (!this.apiKey) {
            throw new Error("Gemini API key not set. Please add it in extension settings.");
        }

        const url = `${GEMINI_API_ENDPOINT}?key=${this.apiKey}`;

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.9,
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const error = await response.text();
                console.error("Gemini API Error:", error);
                throw new Error(`Gemini API failed: ${response.status}`);
            }

            const data = await response.json();

            // Extract text from Gemini response structure
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!text) {
                throw new Error("No text generated from Gemini");
            }

            return text.trim();
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            throw error;
        }
    }

    /**
     * Generate structured JSON response
     * @param {string} prompt 
     * @returns {Promise<object>}
     */
    async generateJSON(prompt) {
        const text = await this.generate(prompt);

        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
            const jsonText = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
            return JSON.parse(jsonText);
        } catch (e) {
            console.error("Failed to parse JSON from Gemini:", text);
            throw new Error("Gemini did not return valid JSON");
        }
    }
}

/**
 * Get or initialize Gemini client with stored API key
 * @returns {Promise<GeminiClient>}
 */
export async function getGeminiClient() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["geminiApiKey"], (data) => {
            if (!data.geminiApiKey) {
                reject(new Error("API key not configured"));
            } else {
                resolve(new GeminiClient(data.geminiApiKey));
            }
        });
    });
}

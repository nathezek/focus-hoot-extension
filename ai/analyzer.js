
export async function analyzeContent(title, description, goal) {
    console.log("[Focus Hoot AI] Analyzing content…");

    // --- Safety fallback if AI model not available ---
    if (!("ai" in self) || !self.ai?.languageModel) {
        console.warn("[Focus Hoot AI] Chrome AI not available, using mock analysis.");
        const random = Math.random() > 0.5 ? "pass" : "block";
        return { verdict: random, reason: random === "block" ? "Seems off-topic." : "Looks related enough." };
    }

    try {
        // --- 1️⃣ Load the on-device or cloud model ---
        const session = await self.ai.languageModel.create({
            // "on-device" is preferred for speed & privacy
            model: "on-device",
            temperature: 0.2
        });

        // --- 2️⃣ Build a short, focused prompt ---
        const prompt = `
      You are Focus Hoot, an AI that keeps students on track.
      The user is studying: "${goal}"

      Video Title: "${title}"
      Description: "${description}"

      Decide if this content is relevant to their goal.
      Respond ONLY with:
      - "pass" if it's educational or related to their goal.
      - "block" if it's off-topic or distracting.
      Also give a short reason (1 sentence max).
    `;

        // --- 3️⃣ Send prompt to AI model ---
        const response = await session.prompt(prompt);

        // --- 4️⃣ Parse response ---
        const lower = response.toLowerCase();
        const verdict = lower.includes("block") ? "block" : "pass";

        const reasonMatch = response.match(/reason[:\-]?\s*(.*)/i);
        const reason = reasonMatch ? reasonMatch[1].trim() : verdict === "block" ? "Seems distracting." : "Relevant to goal.";

        console.log("[Focus Hoot AI] Verdict:", verdict, "| Reason:", reason);
        return { verdict, reason };

    } catch (err) {
        console.error("[Focus Hoot AI] Error using Chrome AI:", err);
        // fallback if AI fails
        const random = Math.random() > 0.5 ? "pass" : "block";
        return { verdict: random, reason: random === "block" ? "Fallback random block." : "Fallback random pass." };
    }
}


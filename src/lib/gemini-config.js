import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// List of fallback models to try if the primary one returns 404
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash"
];

/**
 * Attempts to generate content using a sequence of fallback models.
 * This is crucial for avoiding 404 errors when specific models are 
 * unavailable in certain regions or for certain API keys on v1beta.
 */
export async function generateWithFallback(prompt, systemInstruction = null, sourceLabel = 'backend-unspecified') {
  console.log(`[DIRECT GEMINI CALL DETECTED] Backend generateWithFallback from source: ${sourceLabel} at ${new Date().toISOString()}`);
  let lastError = null;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Gemini Config] Attempting generation with model: ${modelName}`);
      
      const modelOpts = {
        model: modelName,
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
        }
      };

      const model = genAI.getGenerativeModel(modelOpts);
      
      let tracerId;
      if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
        try {
          const cb = await import('@/lib/debug/circuitBreaker');
          cb.checkRequest(sourceLabel);
          const tr = await import('@/lib/debug/geminiTracer');
          tracerId = tr.recordRequest({ 
            source: sourceLabel, 
            promptSnippet: (typeof prompt === 'string' ? prompt : JSON.stringify(prompt)).slice(0, 100), 
            timestamp: new Date().toISOString() 
          });
        } catch (e) {}
      }

      const start = Date.now();
      
      let result;
      // If we have system instructions, we combine them into the prompt for maximum compatibility
      // since older models (like gemini-1.0-pro) don't support the systemInstruction parameter natively.
      if (systemInstruction) {
        const combinedPrompt = `System Instructions:\n${systemInstruction}\n\nUser Request:\n${typeof prompt === 'string' ? prompt : JSON.stringify(prompt)}`;
        result = await model.generateContent(combinedPrompt);
      } else {
        result = await model.generateContent(typeof prompt === 'string' ? prompt : JSON.stringify(prompt));
      }
      
      console.log(`[Gemini Config] API Success with model: ${modelName}`);

      if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true' && tracerId) {
        try {
          const tr = await import('@/lib/debug/geminiTracer');
          tr.updateRequest(tracerId, { result: 'success', durationMs: Date.now() - start });
        } catch (e) {}
      }

      return result;
    } catch (error) {
      if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
        try {
          const is429 = error?.status === 429 || error?.message?.includes('QUOTA_EXCEEDED') || error?.message?.includes('429');
          const tr = await import('@/lib/debug/geminiTracer');
          // need to get latest id but we know it failed
        } catch(e) {}
      }
      lastError = error;
      
      // If the error is a 429 (quota exceeded), do NOT fallback. Throw immediately to prevent spamming the API.
      if (error.message?.includes("429")) {
        console.warn(`[Gemini Config] Model ${modelName} failed (429 Quota Exceeded). Aborting fallbacks.`);
        const customError = new Error("QUOTA_EXCEEDED");
        customError.status = 429;
        throw customError;
      }
      
      // If the error is a 404 (model not found), log and try the next model
      if (error.message?.includes("is not found for API version") || error.message?.includes("models/")) {
        console.warn(`[Gemini Config] Model ${modelName} failed (404 Not Found). Trying fallback...`);
        continue;
      }
      
      // If it's an API Key or Safety error, don't retry, just throw immediately
      if (error.message?.includes("API key") || error.message?.includes("API_KEY")) {
        console.error("[Gemini Config] Fatal API Key error. Aborting fallbacks.");
        throw error; 
      }
      if (error.message?.includes("SAFETY")) {
         console.error("[Gemini Config] Safety block. Aborting fallbacks.");
         throw error;
      }

      console.warn(`[Gemini Config] Model ${modelName} failed. Reason: ${error.message}`);
    }
  }

  console.error(`[Gemini Config] All fallback models failed.`);
  throw lastError;
}

export const isBackoffActive = () => true;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 30000; // 30s, 60s, 120s

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function geminiCallWithBackoff(callFn, currentRequestId, attempt = 0) {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
    import('../debug/geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'backoff')).catch(()=>{});
  }
  console.log(`[BACKOFF ACTIVE] Attempt ${attempt} for request ${currentRequestId || ''}`);
  try {
    return await callFn();
  } catch (err) {
    const is429 = err?.status === 429 || err?.message?.includes("QUOTA_EXCEEDED") || err?.message?.includes("429");
    
    if (is429 && attempt < MAX_RETRIES) {
      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt);
      console.warn(`[Gemini] 429 — backing off ${delay / 1000}s (attempt ${attempt + 1})`);
      await sleep(delay);
      return geminiCallWithBackoff(callFn, currentRequestId, attempt + 1);
    }
    throw err;
  }
}

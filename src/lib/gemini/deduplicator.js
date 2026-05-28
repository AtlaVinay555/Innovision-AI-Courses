export const isDedupActive = () => true;
const inFlightRequests = new Map();

export async function deduplicatedRequest(key, requestFn, currentRequestId) {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
    import('../debug/geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'dedup')).catch(()=>{});
  }
  console.log(`[DEDUP ACTIVE] Checking flight map for ${key}`);
  if (inFlightRequests.has(key)) {
    console.log(`[DEDUP HIT] Reusing existing promise for ${key}`);
    return inFlightRequests.get(key); // reuse existing promise
  }
  console.log(`[DEDUP MISS] Executing request for ${key}`);
  
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });
  
  inFlightRequests.set(key, promise);
  return promise;
}

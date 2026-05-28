export const isDedupActive = () => true;
const inFlightRequests = new Map();

export async function deduplicatedRequest(key, requestFn, currentRequestId) {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
    import('./geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'dedup')).catch(()=>{});
  }
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key); // reuse existing promise
  }
  const promise = requestFn().finally(() => {
    inFlightRequests.delete(key);
  });
  inFlightRequests.set(key, promise);
  return promise;
}

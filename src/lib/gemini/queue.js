export const isQueueActive = () => true;
const RATE_LIMIT_RPM = 4;
const MIN_GAP_MS = 60000 / RATE_LIMIT_RPM; // 15 seconds

let queue = [];
let processing = false;
let lastRequestTime = 0;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function enqueueGeminiRequest(requestFn, currentRequestId) {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
    import('../debug/geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'queue')).catch(()=>{});
  }
  console.log(`[QUEUE ACTIVE] Enqueueing request ${currentRequestId || ''}`);
  return new Promise((resolve, reject) => {
    queue.push({ requestFn, resolve, reject });
    if (!processing) processQueue();
  });
}

async function processQueue() {
  if (!queue.length) { 
    processing = false; 
    return; 
  }
  processing = true;

  const { requestFn, resolve, reject } = queue.shift();
  const gap = Math.max(0, MIN_GAP_MS - (Date.now() - lastRequestTime));
  if (gap > 0) {
    await sleep(gap);
  }

  try {
    lastRequestTime = Date.now();
    const result = await requestFn();
    resolve(result);
  } catch (err) {
    reject(err);
  }
  
  processQueue();
}

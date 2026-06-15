import { deduplicatedRequest } from './geminiDeduplicator';
export const isCacheActive = () => true;

const memoryCache = new Map();
const MEMORY_TTL = 10 * 60 * 1000; // 10 minutes
const LS_PREFIX = 'innovision_gemini_';
const LS_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function getCached(key) {
  const memHit = memoryCache.get(key);
  if (memHit && Date.now() - memHit.timestamp < MEMORY_TTL) {
    return memHit.data;
  }
  return null;
}

export function setCached(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() });
}

export function getLSCached(key) {
  if (typeof window === 'undefined') return null;
  try {
    const item = localStorage.getItem(LS_PREFIX + key);
    if (!item) return null;
    const parsed = JSON.parse(item);
    if (Date.now() - parsed.timestamp < LS_TTL) {
      return parsed.data;
    }
    localStorage.removeItem(LS_PREFIX + key);
  } catch (e) {
    console.warn("localStorage read failed", e);
  }
  return null;
}

export function setLSCached(key, data) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {
    console.warn("localStorage write failed", e);
  }
}

export async function cachedGeminiCall(key, requestFn, currentRequestId) {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
    import('./geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'cache')).catch(()=>{});
  }
  // Tier A: Memory Cache
  const memHit = getCached(key);
  if (memHit) return memHit;

  // Tier B: Local Storage Cache
  const lsHit = getLSCached(key);
  if (lsHit) {
    setCached(key, lsHit);
    return lsHit;
  }

  // Full miss: fetch and deduplicate
  const result = await deduplicatedRequest(key, requestFn, currentRequestId);
  setCached(key, result);
  setLSCached(key, result);
  return result;
}

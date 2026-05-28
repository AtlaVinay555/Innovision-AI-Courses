"use client";

import { deduplicatedRequest } from './deduplicator';
import { getCached, setCached } from './cacheCore';

const LS_PREFIX = 'innovision_gemini_';
const LS_TTL = 24 * 60 * 60 * 1000; // 24 hours

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
    import('../debug/geminiTracer').then(t => t.markLayerTraversal(currentRequestId, 'cache')).catch(()=>{});
  }

  // Bypass cache for roadmap generation (returns pending job IDs, not final data)
  if (key && key.startsWith('roadmap:')) {
    console.log(`[CACHE BYPASS] Skipping cache for roadmap trigger: ${key}`);
    return await deduplicatedRequest(key, requestFn, currentRequestId);
  }

  // Tier A: Memory Cache
  const memHit = getCached(key);
  if (memHit) {
    console.log(`[CACHE HIT] Memory hit for ${key}`);
    return memHit;
  }

  // Tier B: Local Storage Cache
  const lsHit = getLSCached(key);
  if (lsHit) {
    console.log(`[CACHE HIT] LocalStorage hit for ${key}`);
    setCached(key, lsHit);
    return lsHit;
  }

  console.log(`[CACHE MISS] No cache for ${key}, proceeding...`);
  // Full miss: fetch and deduplicate
  const result = await deduplicatedRequest(key, requestFn, currentRequestId);
  setCached(key, result);
  setLSCached(key, result);
  return result;
}

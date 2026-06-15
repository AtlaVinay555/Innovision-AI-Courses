export const isCacheActive = () => true;

const memoryCache = new Map();
const MEMORY_TTL = 10 * 60 * 1000; // 10 minutes

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

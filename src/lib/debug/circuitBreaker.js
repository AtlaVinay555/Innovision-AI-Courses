const RPM_CEILING = 4;
const WINDOW_MS = 60 * 1000;

let recentCalls = [];

export function checkRequest(source = 'unknown') {
  const now = Date.now();
  // Purge old
  recentCalls = recentCalls.filter(call => now - call.timestamp < WINDOW_MS);
  
  if (recentCalls.length >= RPM_CEILING) {
    const oldest = recentCalls[0];
    const secondsUntilExpiry = Math.ceil((oldest.timestamp + WINDOW_MS - now) / 1000);
    const sourcesStr = recentCalls.map(c => c.source).join(', ');
    throw new Error(`CIRCUIT OPEN — Gemini RPM ceiling hit. Source: ${source}. Expires in: ${secondsUntilExpiry}s. Recent sources: ${sourcesStr}`);
  }
  
  recentCalls.push({ source, timestamp: now });
}

export function getRecentSources() {
  return [...recentCalls];
}

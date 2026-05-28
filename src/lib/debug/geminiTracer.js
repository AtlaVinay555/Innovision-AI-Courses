let log = [];
let sequence = 0;

export function recordRequest(entry) {
  const id = ++sequence;
  const newEntry = {
    id,
    timestamp: entry.timestamp || new Date().toISOString(),
    source: entry.source || 'unknown',
    promptSnippet: entry.promptSnippet || '',
    stack: entry.stack || [],
    wentThroughCache: false,
    wentThroughDedup: false,
    wentThroughQueue: false,
    wentThroughBackoff: false,
    result: 'pending',
    durationMs: 0
  };
  log.push(newEntry);
  return id;
}

export function updateRequest(id, patch) {
  const entry = log.find(e => e.id === id);
  if (entry) {
    Object.assign(entry, patch);
  }
}

export function markLayerTraversal(id, layer) {
  const entry = log.find(e => e.id === id);
  if (entry) {
    if (layer === 'cache') entry.wentThroughCache = true;
    if (layer === 'dedup') entry.wentThroughDedup = true;
    if (layer === 'queue') entry.wentThroughQueue = true;
    if (layer === 'backoff') entry.wentThroughBackoff = true;
  }
}

export function getLog() {
  return [...log];
}

export function getRPMCount() {
  const oneMinAgo = new Date(Date.now() - 60000).toISOString();
  return log.filter(e => e.timestamp >= oneMinAgo).length;
}

export function getSuspectedUnwrapped() {
  return log.filter(e => !e.wentThroughCache && !e.wentThroughDedup && !e.wentThroughQueue);
}

export function reset() {
  log = [];
  sequence = 0;
}

export function printSummary() {
  console.log(`=== GEMINI DEBUG SUMMARY ===`);
  console.log(`Total Requests: ${log.length}`);
  console.log(`Current RPM: ${getRPMCount()}`);
  
  const unwrapped = getSuspectedUnwrapped();
  console.log(`Suspected Unwrapped Calls: ${unwrapped.length}`);
  
  const sources = log.reduce((acc, e) => {
    acc[e.source] = (acc[e.source] || 0) + 1;
    return acc;
  }, {});
  console.table(sources);
}

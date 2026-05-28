import { useEffect, useRef } from 'react';
import { recordRequest } from './geminiTracer';

const effectCounts = new Map();

export function auditedEffect(effectFn, deps, label = 'unlabeled-effect') {
  useEffect(() => {
    const now = Date.now();
    let history = effectCounts.get(label) || [];
    // prune older than 10s
    history = history.filter(time => now - time < 10000);
    history.push(now);
    effectCounts.set(label, history);

    if (history.length > 3) {
      console.warn(`[EffectAudit] ⚠️ RENDER LOOP DETECTED: "${label}" fired ${history.length} times in 10s. Deps:`, deps);
    } else {
      console.log(`[EffectAudit] "${label}" fired. Deps:`, deps);
    }

    if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
      recordRequest({
        source: `effect:${label}`,
        promptSnippet: 'N/A',
        stack: [],
        timestamp: new Date().toISOString()
      });
    }

    return effectFn();
  }, deps);
}

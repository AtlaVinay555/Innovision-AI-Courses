import { getSuspectedUnwrapped } from './geminiTracer';
import { isCacheActive } from '@/lib/gemini/cacheCore';
import { isDedupActive } from '@/lib/gemini/deduplicator';
import { isQueueActive } from '@/lib/gemini/queue';
import { isBackoffActive } from '@/lib/gemini/client';

export function runLayerVerification() {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return;
  console.log('[LayerVerifier] Starting checks...');

  const layers = [
    { name: 'Cache',      check: () => isCacheActive?.() === true },
    { name: 'Dedup',      check: () => isDedupActive?.() === true },
    { name: 'Queue',      check: () => isQueueActive?.() === true },
    { name: 'Backoff',    check: () => isBackoffActive?.() === true },
  ];

  layers.forEach(({ name, check }) => {
    try {
      const ok = check();
      console.log(`[LayerVerifier] ${ok ? '✅' : '❌'} ${name} layer`);
    } catch (e) {
      console.log(`[LayerVerifier] ❌ ${name} layer — import failed: ${e.message}`);
    }
  });

  console.log('[LayerVerifier] ℹ️  Hook layer (useGeminiRequest) verified on client only');

  if (globalThis.__geminiInterceptorActive) {
    console.log('[LayerVerifier] ✅ INTERCEPTOR ACTIVE');
  } else {
    console.warn('[LayerVerifier] ❌ INTERCEPTOR NOT ACTIVE');
  }
}

export function reportUnwrappedCalls() {
  const unwrapped = getSuspectedUnwrapped();
  console.log(`[LayerVerifier] Found ${unwrapped.length} unwrapped calls.`);
  if (unwrapped.length > 0) {
    console.table(unwrapped);
  }
}

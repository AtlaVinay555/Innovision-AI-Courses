"use client";

import { useState, useCallback } from 'react';
import { cachedGeminiCall } from '@/lib/gemini/cache.client';
import { enqueueGeminiRequest } from '@/lib/gemini/queue';
import { geminiCallWithBackoff } from '@/lib/gemini/client';

export const isHookActive = () => true;

export function useGeminiRequest() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (cacheKey, apiFn) => {
    console.log(`[WRAPPER ACTIVE] Source: hook:${cacheKey} at ${new Date().toISOString()}`);
    setLoading(true);
    setError(null);
    let currentRequestId = null;
    if (process.env.NEXT_PUBLIC_GEMINI_DEBUG === 'true') {
        try {
            const t = await import('@/lib/debug/geminiTracer');
            currentRequestId = t.recordRequest({ source: `hook:${cacheKey}` });
        } catch (e) {}
    }

    try {
      return await cachedGeminiCall(
        cacheKey,
        () => enqueueGeminiRequest(
          () => geminiCallWithBackoff(apiFn, currentRequestId),
          currentRequestId
        ),
        currentRequestId
      );
    } catch (err) {
      setError(err.message || "An error occurred");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

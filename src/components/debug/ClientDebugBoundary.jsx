"use client";

import dynamic from "next/dynamic";
import { useEffect } from 'react';

const GeminiDebugPanel = dynamic(
  () => import('./GeminiDebugPanel'),
  { ssr: false, loading: () => null }
);

export default function ClientDebugBoundary() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return;
    import('@/hooks/useGeminiRequest').then(m => {
      const ok = m.isHookActive?.() === true;
      console.log(`[LayerVerifier] ${ok ? '✅' : '❌'} Hook layer (client-side check)`);
    });
  }, []);

  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return null;
  return <GeminiDebugPanel />;
}

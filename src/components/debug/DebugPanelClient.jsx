"use client";

import dynamic from "next/dynamic";

const GeminiDebugPanel = dynamic(
  () => import('./GeminiDebugPanel'),
  { ssr: false }
);

export default function DebugPanelClient() {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return null;
  return <GeminiDebugPanel />;
}

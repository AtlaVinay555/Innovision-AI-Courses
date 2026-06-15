"use client";

import { useEffect, useState } from 'react';
import * as tracer from '@/lib/debug/geminiTracer';
import { getRecentSources } from '@/lib/debug/circuitBreaker';

if (typeof window !== 'undefined') {
  window.__geminiDebug = tracer;
}

export default function GeminiDebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('log');
  const [logs, setLogs] = useState([]);
  const [rpm, setRpm] = useState(0);
  const [recentSources, setRecentSources] = useState([]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return;

    const interval = setInterval(() => {
      setLogs(tracer.getLog());
      setRpm(tracer.getRPMCount());
      setRecentSources(getRecentSources());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return null;

  const rpmColor = rpm < 3 ? 'bg-green-500' : rpm < 4 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="fixed bottom-4 right-4 z-[9999] bg-background border border-border shadow-lg rounded-lg overflow-hidden flex flex-col" style={{ width: expanded ? '600px' : 'auto', maxHeight: '80vh' }}>
      {/* Header */}
      <div 
        className="px-4 py-2 bg-muted flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${rpmColor}`} />
          <span className="font-bold text-sm">GEMINI DEBUG</span>
          <span className="text-xs bg-background px-2 py-0.5 rounded border">Total: {logs.length}</span>
          <span className="text-xs bg-background px-2 py-0.5 rounded border">RPM: {rpm}</span>
        </div>
        <span className="text-xs text-muted-foreground">{expanded ? '▼ Collapse' : '▲ Expand'}</span>
      </div>

      {/* Body */}
      {expanded && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex border-b border-border bg-muted/50">
            <button className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'log' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('log')}>Request Log</button>
            <button className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'layers' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('layers')}>Layer Status</button>
            <button className={`px-3 py-1.5 text-xs font-medium ${activeTab === 'timeline' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
          </div>

          <div className="p-0 overflow-y-auto" style={{ height: '400px' }}>
            {activeTab === 'log' && (
              <table className="w-full text-xs text-left">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-2 border-b">#</th>
                    <th className="p-2 border-b">Time</th>
                    <th className="p-2 border-b">Source</th>
                    <th className="p-2 border-b" title="Cache / Dedup / Queue">C/D/Q</th>
                    <th className="p-2 border-b">Result</th>
                    <th className="p-2 border-b">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice().reverse().map(l => {
                    const unwrapped = !l.wentThroughCache && !l.wentThroughDedup && !l.wentThroughQueue;
                    return (
                      <tr key={l.id} className={`border-b border-border/50 ${unwrapped ? 'bg-red-500/10' : ''} ${l.result === '429' ? 'bg-orange-500/10' : ''}`}>
                        <td className="p-2">{l.id}</td>
                        <td className="p-2">{l.timestamp.substring(11, 19)}</td>
                        <td className="p-2 font-mono truncate max-w-[150px]" title={l.source}>{l.source}</td>
                        <td className="p-2 font-mono">
                          {l.wentThroughCache ? 'Y' : 'N'}/
                          {l.wentThroughDedup ? 'Y' : 'N'}/
                          {l.wentThroughQueue ? 'Y' : 'N'}
                        </td>
                        <td className="p-2">{l.result}</td>
                        <td className="p-2">{l.durationMs}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {activeTab === 'layers' && (
              <div className="p-4 space-y-2 text-sm font-mono">
                <p>Check terminal output for Layer Verifier results.</p>
                <p>Interceptor: {globalThis.__geminiInterceptorActive ? '✅ ACTIVE' : '❌ INACTIVE'}</p>
                <p className="mt-4 text-xs text-muted-foreground break-all">
                  Run window.__geminiDebug.printSummary() in console.
                </p>
              </div>
            )}

            {activeTab === 'timeline' && (
              <div className="p-4 h-full flex items-end gap-1">
                {/* Simplified timeline view */}
                {recentSources.map((s, i) => (
                  <div key={i} className="bg-primary/50 w-4 flex flex-col justify-end" style={{ height: '100%' }} title={`${s.source} @ ${new Date(s.timestamp).toLocaleTimeString()}`}>
                    <div className="w-full bg-primary h-2" />
                  </div>
                ))}
                {recentSources.length === 0 && <p className="text-muted-foreground text-sm self-center mx-auto">No requests in last 60s</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

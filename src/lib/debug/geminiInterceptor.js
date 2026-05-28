import { recordRequest, updateRequest } from './geminiTracer';

export function activateInterceptor() {
  if (globalThis.__geminiInterceptorActive) return;
  globalThis.__geminiInterceptorActive = true;

  const originalFetch = globalThis.fetch;

  globalThis.fetch = async function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    
    if (url && typeof url === 'string' && url.includes('generativelanguage.googleapis.com')) {
      const isGenerateContent = url.includes('generateContent');
      let promptSnippet = '';
      
      try {
        const options = args[1];
        if (options && options.body) {
          const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
          // Try to extract contents part
          promptSnippet = bodyStr.substring(0, 120);
        }
      } catch (e) {}

      // Get stack
      const err = new Error();
      const stack = err.stack ? err.stack.split('\n').filter(line => 
        line.includes('app/') || line.includes('components/') || line.includes('lib/') || line.includes('hooks/')
      ).map(l => l.trim()) : [];

      console.group('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`[GEMINI INTERCEPTED]`);
      console.log(`URL:    ${url}`);
      console.log(`Prompt: "${promptSnippet}"`);
      console.log(`Stack:  ${stack[0] || 'Unknown'}`);
      console.groupEnd();

      const id = recordRequest({
        source: 'fetch-interceptor',
        promptSnippet,
        stack,
        timestamp: new Date().toISOString()
      });

      const start = Date.now();
      try {
        const response = await originalFetch.apply(this, args);
        updateRequest(id, { 
          result: response.status === 429 ? '429' : (response.ok ? 'success' : 'error'),
          durationMs: Date.now() - start
        });
        return response;
      } catch (e) {
        updateRequest(id, { result: 'error', durationMs: Date.now() - start });
        throw e;
      }
    }

    return originalFetch.apply(this, args);
  };
}

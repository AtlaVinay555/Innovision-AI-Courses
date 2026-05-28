import { activateInterceptor } from './geminiInterceptor';
import { runLayerVerification } from './layerVerifier';
import * as tracer from './geminiTracer';

export function initServerDebug() {
  if (process.env.NEXT_PUBLIC_GEMINI_DEBUG !== 'true') return;
  if (globalThis.__geminiServerDebugInitialized) return;
  globalThis.__geminiServerDebugInitialized = true;

  global.__geminiDebug = tracer;

  activateInterceptor();
  runLayerVerification();
  console.log(`
╔══════════════════════════════════════╗
║   GEMINI DEBUG MODE ACTIVE (SERVER)  ║
║   Client panel will mount separately ║
╚══════════════════════════════════════╝
  `);

  setInterval(() => {
    const rpm = tracer.getRPMCount();
    const unwrapped = tracer.getSuspectedUnwrapped().length;
    const total = tracer.getLog().length;
    console.log(`\n--- [Gemini Server Stats] RPM: ${rpm} | Total: ${total} | Unwrapped: ${unwrapped} ---`);
    tracer.getLog().slice(-3).forEach(log => {
      console.log(`  -> [${log.timestamp}] Source: ${log.source} | Status: ${log.result}`);
    });
  }, 10000);
}

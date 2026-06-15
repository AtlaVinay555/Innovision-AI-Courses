// middleware.js
import { NextResponse } from "next/server";
import requestIp from "request-ip";
import { limiters, getTier } from "@/lib/rate-limit";

/**
 * Build a rate-limit key for the request.
 *
 * HYBRID STRATEGY (IP + User):
 *   - Authenticated users: keyed by user:${uid} — one user, one bucket,
 *     regardless of IP.  Prevents a school/NAT/office from forcing dozens
 *     of users into a single shared IP bucket.
 *     Extraction is cheap: reads the "session" cookie, Base64-decodes the
 *     JWT payload segment via atob(), extracts `email`.  No Firebase Admin
 *     SDK, no network call, no database query — safe for Edge Runtime.
 *   - Anonymous users:  keyed by ip:${ip} — fallback when no session exists.
 *
 * IP extraction is delegated to `request-ip`, which checks (in order):
 *   X-Client-IP → X-Forwarded-For → CF-Connecting-IP → Fastly-Client-IP
 *   → True-Client-IP → X-Real-IP → X-Cluster-Client-IP → X-Forwarded
 *   → Forwarded-For → Forwarded → req.socket.remoteAddress
 *
 * If ALL headers and socket are unavailable, falls back to "unknown" (shared
 * bucket — not ideal, but better than crashing).
 */
function buildKey(req) {
  const ip = requestIp.getClientIp(req) || "unknown";

  // Attempt user-based key from session cookie.
  // Mirrors getServerSession() in src/lib/auth-server.js exactly —
  // pure JWT payload decode via atob().  No Firebase Admin, no network.
  // NOTE: JWT payloads are base64url, not standard base64.  atob() works
  // for most tokens in practice but is technically incorrect.  If the
  // token format ever changes, update BOTH this function AND
  // getServerSession() together to prevent divergence.
  try {
    const sessionCookie = req.cookies.get("session");
    if (sessionCookie?.value) {
      const payload = JSON.parse(atob(sessionCookie.value.split(".")[1]));
      if (payload?.email) {
        return `user:${payload.email}`; // per-user, not per-IP
      }
    }
  } catch {
    // Session parse failure → fall back to IP-based key
  }

  return `ip:${ip}`;
}

export async function middleware(req) {
  // Only intercept API routes (matcher config also enforces this)
  if (!req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Global killswitch — set RATE_LIMIT_ENABLED=false to disable
  if (process.env.RATE_LIMIT_ENABLED === "false") {
    return NextResponse.next();
  }

  const tier = getTier(req.nextUrl.pathname);

  // Bypass tier — trusted webhooks / internal routes skip rate limiting
  if (tier === "bypass" || !limiters[tier]) {
    return NextResponse.next();
  }

  const limiter = limiters[tier];
  const key = `${tier}:${buildKey(req)}`;
  const { allowed, remaining, reset } = limiter.check(key);

  if (!allowed) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return new NextResponse(
      JSON.stringify({
        error: "Too many requests. Please slow down and try again later.",
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": String(limiter.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(reset / 1000)),
          "Retry-After": String(retryAfter),
        },
      }
    );
  }

  // Pass through with rate-limit headers so clients can self-throttle
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(limiter.maxRequests));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(reset / 1000)));
  return response;
}

/**
 * PHASE 1 — Protect high-risk routes only.
 *
 * These are the routes with the highest financial risk (every call hits
 * Gemini) and abuse surface (auth brute-force).  After 1-2 weeks of stable
 * operation, expand to Phase 2.
 *
 * Phase 2 matcher (all routes):
 *   export const config = { matcher: ["/api/:path*"] };
 */
export const config = {
  matcher: [
    "/api/ai/:path*",
    "/api/code/:path*",
    "/api/studio/enhance",
    "/api/user_prompt",
    "/api/youtube/:path*",
    "/api/recommendations",
    "/api/chapter-prompt",
    "/api/multimodal/:path*",
    "/api/auth/:path*",
  ],
};

// src/lib/rate-limit.js
import { LRUCache } from "lru-cache";

/**
 * Rolling timestamp list rate limiter backed by an LRU cache.
 *
 * Each cache entry is a sorted array of request timestamps (ms). On check():
 *   1. Timestamps older than (now - windowMs) are pruned.
 *   2. If count < maxRequests, the new timestamp is appended → allowed.
 *   3. If count >= maxRequests → blocked.
 *
 * The LRU cache auto-evicts the least-recently-used entries, keeping memory
 * bounded under high traffic from many distinct keys.
 *
 * This is NOT a fixed window (no clock-boundary double-burst). It is NOT a
 * true sliding window with fractional counts. It is a rolling timestamp list
 * — the simplest correct algorithm that prevents the fixed-window burst problem.
 */
export class RateLimiter {
  /**
   * @param {object} options
   * @param {number} options.windowMs   Window duration in ms (default 60_000)
   * @param {number} options.maxRequests Max allowed in the window (default 60)
   * @param {number} options.maxEntries  LRU cache size cap (default 10_000)
   */
  constructor({ windowMs = 60_000, maxRequests = 60, maxEntries = 10_000 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.cache = new LRUCache({
      max: maxEntries,
      ttl: windowMs,
      allowStale: false,
    });
  }

  /**
   * Check whether a request identified by `key` is allowed.
   *
   * @param {string} key
   * @returns {{ allowed: boolean, remaining: number, reset: number }}
   */
  check(key) {
    const now = Date.now();
    let timestamps = this.cache.get(key) || [];

    // Prune timestamps outside the window
    const windowStart = now - this.windowMs;
    timestamps = timestamps.filter((t) => t > windowStart);

    const count = timestamps.length;
    const allowed = count < this.maxRequests;

    if (allowed) {
      timestamps.push(now);
      this.cache.set(key, timestamps);
    }

    const oldest = timestamps.length > 0 ? timestamps[0] : now;
    const reset = oldest + this.windowMs;

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - (allowed ? count + 1 : count)),
      reset,
    };
  }

  /** Clear all state (for tests). */
  reset() {
    this.cache.clear();
  }
}

// ── Tier configuration (all overridable via env vars) ────────────────

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const DEFAULT_MAX = Number(process.env.RATE_LIMIT_DEFAULT_MAX) || 60;
const AI_MAX = Number(process.env.RATE_LIMIT_AI_MAX) || 10;
const AUTH_MAX = Number(process.env.RATE_LIMIT_AUTH_MAX) || 5;

export const limiters = {
  default: new RateLimiter({ windowMs: WINDOW_MS, maxRequests: DEFAULT_MAX }),
  ai:      new RateLimiter({ windowMs: WINDOW_MS, maxRequests: AI_MAX }),
  auth:    new RateLimiter({ windowMs: WINDOW_MS, maxRequests: AUTH_MAX }),
  // "bypass" tier — no limiter; the middleware skips rate limiting entirely
  bypass:  null,
};

// ── Tier routing ─────────────────────────────────────────────────────

/**
 * AI routes — any path that calls Gemini / OpenAI (most expensive):
 */
const AI_PATTERNS = [
  /^\/api\/ai\//,
  /^\/api\/code\//,
  /^\/api\/studio\/enhance/,
  /^\/api\/user_prompt/,
  /^\/api\/youtube\//,
  /^\/api\/recommendations/,
  /^\/api\/chapter-prompt/,
  /^\/api\/multimodal\//,
];

/**
 * Auth routes — session / token operations (highest abuse surface):
 */
const AUTH_PATTERNS = [/^\/api\/auth\//];

/**
 * Webhook / internal routes — trusted callers that should never be
 * throttled (LMS integrations, payment callbacks, etc.):
 */
const BYPASS_PATTERNS = [
  /^\/api\/lms\/sync/,           // LMS integration webhook
  /^\/api\/premium\/verify-payment/, // Razorpay payment callback
];

/**
 * Map an API path to the appropriate rate-limit tier.
 *
 * Order matters: bypass is checked first so trusted routes skip all limiting.
 */
export function getTier(pathname) {
  if (BYPASS_PATTERNS.some((p) => p.test(pathname))) return "bypass";
  if (AI_PATTERNS.some((p) => p.test(pathname))) return "ai";
  if (AUTH_PATTERNS.some((p) => p.test(pathname))) return "auth";
  return "default";
}

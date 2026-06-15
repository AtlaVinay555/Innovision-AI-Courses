// src/lib/rate-limit.test.js
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { RateLimiter, getTier } from "./rate-limit.js";

describe("RateLimiter", () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, maxRequests: 3, maxEntries: 100 });
  });

  afterEach(() => {
    limiter.reset();
  });

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 3; i++) {
      const r = limiter.check("k");
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(2 - i);
    }
  });

  it("blocks requests exceeding the limit", () => {
    for (let i = 0; i < 3; i++) limiter.check("k");
    const blocked = limiter.check("k");
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("returns a reset timestamp in the future", () => {
    const r = limiter.check("k");
    expect(r.reset).toBeGreaterThan(Date.now());
  });

  it("isolates keys from each other", () => {
    for (let i = 0; i < 3; i++) limiter.check("user-a");
    const r = limiter.check("user-b");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(2);
  });

  it("recovers after the window elapses (no fixed-window double-burst)", async () => {
    vi.useFakeTimers();
    const fresh = new RateLimiter({ windowMs: 1000, maxRequests: 2, maxEntries: 100 });

    fresh.check("k"); // t=0
    fresh.check("k"); // t=0 — limit reached
    expect(fresh.check("k").allowed).toBe(false);

    vi.advanceTimersByTime(1001);

    const allowed = fresh.check("k");
    expect(allowed.allowed).toBe(true);
    expect(allowed.remaining).toBe(1);

    vi.useRealTimers();
  });

  it("evicts old entries via LRU when at capacity", () => {
    const small = new RateLimiter({ windowMs: 60_000, maxRequests: 60, maxEntries: 3 });
    small.check("a"); small.check("b"); small.check("c"); small.check("d");
    // "a" evicted, starts fresh
    const r = small.check("a");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(59);
  });

  it("prevents fixed-window double-burst (timestamps age out individually)", async () => {
    vi.useFakeTimers();
    const fresh = new RateLimiter({ windowMs: 1000, maxRequests: 2, maxEntries: 100 });

    fresh.check("k");                    // t=0ms
    vi.advanceTimersByTime(900);
    fresh.check("k");                    // t=900ms — limit reached
    expect(fresh.check("k").allowed).toBe(false);

    vi.advanceTimersByTime(101);         // t=1001ms — only the t=0 timestamp aged out
    // One slot opened; one request allowed
    const r = fresh.check("k");
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(0);        // t=900ms still occupies a slot

    vi.useRealTimers();
  });
});

describe("getTier", () => {
  it("routes /api/lms/sync to bypass", () => {
    expect(getTier("/api/lms/sync")).toBe("bypass");
  });

  it("routes /api/premium/verify-payment to bypass", () => {
    expect(getTier("/api/premium/verify-payment")).toBe("bypass");
  });

  it("routes /api/ai/generate to ai", () => {
    expect(getTier("/api/ai/generate")).toBe("ai");
  });

  it("routes /api/code/execute to ai", () => {
    expect(getTier("/api/code/execute")).toBe("ai");
  });

  it("routes /api/studio/enhance to ai", () => {
    expect(getTier("/api/studio/enhance")).toBe("ai");
  });

  it("routes /api/youtube/generate-course to ai", () => {
    expect(getTier("/api/youtube/generate-course")).toBe("ai");
  });

  it("routes /api/auth/session to auth", () => {
    expect(getTier("/api/auth/session")).toBe("auth");
  });

  it("routes /api/courses/public to default", () => {
    expect(getTier("/api/courses/public")).toBe("default");
  });

  it("routes /api/user/profile to default", () => {
    expect(getTier("/api/user/profile")).toBe("default");
  });

  it("bypass takes priority over other tiers", () => {
    expect(getTier("/api/lms/sync")).toBe("bypass");
  });
});

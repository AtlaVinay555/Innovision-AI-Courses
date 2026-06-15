// middleware.test.js
import { describe, it, expect, beforeEach, vi } from "vitest";
import { limiters } from "@/lib/rate-limit";

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock("request-ip", () => ({
  default: {
    getClientIp: vi.fn(() => "127.0.0.1"),
  },
}));

// Mock next/server
vi.mock("next/server", () => {
  function makeResponse(status, body, extraHeaders = {}) {
    const headers = new Map(Object.entries(extraHeaders));
    return {
      status,
      headers,
      json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    };
  }

  // NextResponse is used both as a constructor (new NextResponse) and with
  // static methods (NextResponse.next, NextResponse.json).
  function NextResponse(body, init) {
    return makeResponse(init?.status || 200, body, init?.headers);
  }
  NextResponse.next = () => makeResponse(200, null);
  NextResponse.json = (data, init) => makeResponse(init?.status || 200, JSON.stringify(data), init?.headers);

  return { NextResponse };
});

// Must import middleware AFTER mocks are set up
const { middleware, config } = await import("./middleware.js");
const requestIp = await import("request-ip");

// ── Helpers ────────────────────────────────────────────────────────────

function mockRequest(pathname, overrides = {}) {
  const headers = new Map();
  headers.set("x-forwarded-for", overrides.ip || "127.0.0.1");

  const cookies = new Map();
  if (overrides.sessionValue) {
    cookies.set("session", { value: overrides.sessionValue });
  }

  return {
    nextUrl: { pathname },
    url: `http://localhost:3000${pathname}`,
    headers,
    cookies: {
      get: (name) => cookies.get(name) || undefined,
    },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("middleware", () => {
  beforeEach(() => {
    // Reset all rate limiter state between tests
    Object.values(limiters).forEach((l) => l?.reset?.());
    // Default IP for all tests unless overridden
    requestIp.default.getClientIp.mockReturnValue("127.0.0.1");
  });

  it("allows requests under the limit", async () => {
    const res = await middleware(mockRequest("/api/courses/public"));
    expect(res.status).not.toBe(429);
  });

  it("blocks requests exceeding the AI tier limit", async () => {
    const lim = limiters.ai;
    for (let i = 0; i < lim.maxRequests; i++) {
      await middleware(mockRequest("/api/ai/generate"));
    }
    const res = await middleware(mockRequest("/api/ai/generate"));
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error).toContain("Too many requests");
  });

  it("bypasses webhook/internal routes", async () => {
    const lim = limiters.default;
    // Exhaust default tier
    for (let i = 0; i < lim.maxRequests; i++) {
      await middleware(mockRequest("/api/courses/public"));
    }
    // Webhook route should still pass through
    const res = await middleware(mockRequest("/api/lms/sync"));
    expect(res.status).not.toBe(429);
  });

  it("isolates authenticated users by uid (not IP)", async () => {
    const lim = limiters.ai;
    // Create a fake JWT: header.payload.sig where payload has email
    const makeToken = (email) =>
      "header." + btoa(JSON.stringify({ email })) + ".sig";

    // User A exhausts their AI limit
    for (let i = 0; i < lim.maxRequests; i++) {
      await middleware(mockRequest("/api/ai/generate", {
        sessionValue: makeToken("a@test.com"),
      }));
    }
    expect((await middleware(mockRequest("/api/ai/generate", {
      sessionValue: makeToken("a@test.com"),
    }))).status).toBe(429);

    // User B should still be allowed (per-user key, not per-IP)
    const resB = await middleware(mockRequest("/api/ai/generate", {
      sessionValue: makeToken("b@test.com"),
    }));
    expect(resB.status).not.toBe(429);
  });

  it("falls back to IP-based key for anonymous requests", async () => {
    const lim = limiters.ai;
    // Exhaust from one IP
    requestIp.default.getClientIp.mockReturnValue("5.5.5.5");
    for (let i = 0; i < lim.maxRequests; i++) {
      await middleware(mockRequest("/api/ai/generate"));
    }
    expect((await middleware(mockRequest("/api/ai/generate"))).status).toBe(429);

    // Different IP should be allowed
    requestIp.default.getClientIp.mockReturnValue("6.6.6.6");
    const resB = await middleware(mockRequest("/api/ai/generate"));
    expect(resB.status).not.toBe(429);
  });

  it("respects RATE_LIMIT_ENABLED=false", async () => {
    const original = process.env.RATE_LIMIT_ENABLED;
    process.env.RATE_LIMIT_ENABLED = "false";
    try {
      const lim = limiters.ai;
      for (let i = 0; i < lim.maxRequests + 1; i++) {
        await middleware(mockRequest("/api/ai/generate"));
      }
      const res = await middleware(mockRequest("/api/ai/generate"));
      expect(res.status).not.toBe(429);
    } finally {
      process.env.RATE_LIMIT_ENABLED = original;
    }
  });

  it("isolates different tiers", async () => {
    // Exhaust AI tier
    const aiLim = limiters.ai;
    for (let i = 0; i < aiLim.maxRequests; i++) {
      await middleware(mockRequest("/api/ai/generate"));
    }
    // Default tier should still work
    const res = await middleware(mockRequest("/api/courses/public"));
    expect(res.status).not.toBe(429);
  });

  it("skips non-API paths", async () => {
    const res = await middleware(mockRequest("/dashboard"));
    expect(res.status).not.toBe(429);
  });

  it("returns Retry-After header on 429", async () => {
    const lim = limiters.auth;
    for (let i = 0; i < lim.maxRequests; i++) {
      await middleware(mockRequest("/api/auth/session"));
    }
    const res = await middleware(mockRequest("/api/auth/session"));
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
  });
});

describe("middleware config (Phase 1 matcher)", () => {
  it("matches high-risk AI and auth routes only", () => {
    expect(config.matcher).toContain("/api/ai/:path*");
    expect(config.matcher).toContain("/api/auth/:path*");
    expect(config.matcher).toContain("/api/studio/enhance");
    // Phase 1 does NOT include generic catch-all
    expect(config.matcher).not.toContain("/api/:path*");
  });
});

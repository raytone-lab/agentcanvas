import { describe, expect, it } from "vitest";

import { sameOriginRequestAllowed } from "./requestOrigin";

function request(origin: string | undefined, host: string): boolean {
  return sameOriginRequestAllowed({
    headers: {
      ...(origin !== undefined ? { origin } : {}),
      host,
    },
  });
}

describe("sameOriginRequestAllowed", () => {
  it("allows same-origin browser requests", () => {
    expect(request("http://localhost:5173", "localhost:5173")).toBe(true);
    expect(request("http://127.0.0.1:5173", "127.0.0.1:5173")).toBe(true);
    expect(request("http://[::1]:5173", "[::1]:5173")).toBe(true);
  });

  it("allows requests without an Origin header (curl, same-machine clients)", () => {
    expect(request(undefined, "localhost:5173")).toBe(true);
  });

  it("rejects cross-origin pages on other ports or hosts", () => {
    expect(request("http://localhost:9999", "localhost:5173")).toBe(false);
    expect(request("http://evil.example.com", "localhost:5173")).toBe(false);
    expect(request("http://localhost:5173", "localhost:5174")).toBe(false);
    expect(request("http://127.0.0.1:5173", "localhost:5173")).toBe(false);
  });

  it("rejects opaque origins (file:// pages, sandboxed iframes)", () => {
    expect(request("null", "localhost:5173")).toBe(false);
  });

  it("rejects malformed and non-http origins", () => {
    expect(request("not a url", "localhost:5173")).toBe(false);
    expect(request("file:///tmp/x.html", "localhost:5173")).toBe(false);
    expect(request("ftp://localhost:5173", "localhost:5173")).toBe(false);
  });

  it("rejects requests with no usable Host header", () => {
    expect(request("http://localhost:5173", "")).toBe(false);
  });
});

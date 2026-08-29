import { describe, expect, it } from "vitest";

import { configurePiRuntime, getPiRuntimeState, runPiTurn } from "./piClient";

describe("Pi browser client", () => {
  it("reads runtime state and posts configuration without leaking it into a URL", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init });
      return Response.json({ available: true, cwd: "/project", running: false, models: [], tools: [] });
    }) as typeof fetch;

    await getPiRuntimeState(fetcher);
    await configurePiRuntime({ provider: "anthropic", model: "claude", apiKey: "session-secret" }, fetcher);

    expect(calls[0]).toMatchObject({ url: "/__agentcanvas/pi/state", init: undefined });
    expect(calls[1]?.url).toBe("/__agentcanvas/pi/config");
    expect(calls[1]?.init?.method).toBe("POST");
    expect(calls[1]?.init?.body).toContain("session-secret");
    expect(calls[1]?.url).not.toContain("session-secret");
  });

  it("streams complete and chunk-split NDJSON events", async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"type":"run.started","payload":{}}\n{"type":"text.'));
        controller.enqueue(encoder.encode('delta","payload":{"delta":"Hi"}}\n'));
        controller.close();
      },
    });
    const fetcher = (async () => new Response(stream, { status: 200 })) as typeof fetch;
    const events = [];
    for await (const event of runPiTurn({ prompt: "hello" }, { fetcher })) events.push(event);

    expect(events.map((event) => event.type)).toEqual(["run.started", "text.delta"]);
  });

  it("surfaces a structured host error", async () => {
    const fetcher = (async () => Response.json({ error: "No Pi model is configured." }, { status: 409 })) as typeof fetch;
    await expect(async () => {
      for await (const _event of runPiTurn({ prompt: "hello" }, { fetcher })) {
        // no-op
      }
    }).rejects.toThrow("No Pi model is configured.");
  });
});

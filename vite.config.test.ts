import { describe, expect, it, vi } from "vitest";

import { writeUpstreamResponse } from "./vite.config";

describe("AgentCanvas provider dev proxy", () => {
  it("streams event-stream responses without buffering them into a content-length body", async () => {
    const writes: string[] = [];
    const headers: Record<string, string> = {};
    const res = {
      statusCode: 0,
      statusMessage: "",
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
      },
      write(chunk: Buffer) {
        writes.push(chunk.toString("utf8"));
      },
      end: vi.fn(),
      flushHeaders: vi.fn(),
    };
    const upstream = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: one\n\n"));
        controller.enqueue(new TextEncoder().encode("data: two\n\n"));
        controller.close();
      },
    }), {
      status: 200,
      statusText: "OK",
      headers: { "content-type": "text/event-stream" },
    });

    await writeUpstreamResponse(res, upstream);

    expect(headers["content-type"]).toBe("text/event-stream");
    expect(headers["cache-control"]).toBe("no-cache");
    expect(headers["content-length"]).toBeUndefined();
    expect(res.flushHeaders).toHaveBeenCalledTimes(1);
    expect(writes).toEqual(["data: one\n\n", "data: two\n\n"]);
    expect(res.end).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from "vitest";

import { inspectAgentUXEvents } from "../../runtime/eventContract";
import { createEventWriter } from "./eventWriter";

/**
 * The writer exists so adapters cannot emit a malformed stream. These tests pin the pairing
 * rules, because every one of them is a failure that renders as plausible-looking UI rather
 * than an error: an unclosed text block streams forever, an unfinished tool card spins
 * forever, and an empty block trips the contract report while showing a blank bubble.
 */

const types = (writer: { events: readonly { type: string }[] }) => writer.events.map((event) => event.type);

describe("event writer pairing", () => {
  it("opens a block lazily and closes it once", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.textDelta("hello");
    writer.textDelta(" world");
    writer.finishText();
    writer.finishText(); // idempotent

    expect(types(writer)).toEqual(["text.started", "text.delta", "text.delta", "text.finished"]);
  });

  it("emits nothing for a block that never had content", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.textDelta("");
    writer.reasoningDelta("");
    writer.finishText();
    writer.finishReasoning();

    // An empty delta would render an empty bubble and be reported as an error by the contract.
    expect(types(writer)).toEqual([]);
  });

  it("ignores deltas after a block is closed", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.textDelta("a");
    writer.finishText();
    writer.textDelta("late");

    expect(types(writer)).toEqual(["text.started", "text.delta", "text.finished"]);
  });

  it("keeps a tool call's events on one id and finishes it once", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.toolStarted("t1", { name: "read_file", title: "Read x.ts" });
    writer.toolStarted("t1", { name: "read_file" }); // duplicate start ignored
    writer.toolArgsDelta("t1", '{"path":');
    writer.toolArgsDelta("t1", '"x.ts"}');
    writer.toolRunning("t1", { path: "x.ts" });
    writer.toolResult("t1", { result: "body", resultPreview: "3 lines" });
    writer.toolFinished("t1", "success");
    // A late result must not resurrect a finished call.
    writer.toolResult("t1", { result: "ignored" });
    writer.toolFinished("t1", "success");

    expect(types(writer)).toEqual([
      "tool.call.started",
      "tool.call.args.delta",
      "tool.call.args.delta",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
    ]);
  });

  it("drops events for a tool id that never started", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.toolResult("ghost", { result: "x" });
    writer.toolFinished("ghost", "success");

    expect(types(writer)).toEqual([]);
  });

  it("closes everything still open when the stream ends abruptly", () => {
    const writer = createEventWriter({ runId: "r" });
    writer.reasoningDelta("planning");
    writer.textDelta("partial answer");
    writer.toolStarted("t1", { name: "bash" });
    writer.toolRunning("t1", { command: "sleep 10" });
    writer.finishAll();

    expect(types(writer)).toEqual([
      "reasoning.status",
      "reasoning.delta",
      "text.started",
      "text.delta",
      "tool.call.started",
      "tool.call.running",
      "text.finished",
      "reasoning.finished",
      "tool.call.finished",
    ]);
    const finished = writer.events.at(-1) as { payload: Record<string, unknown> };
    // Cancelled, not success — the tool never reported a result.
    expect(finished.payload.status).toBe("cancelled");
  });

  it("produces a stream the contract validator accepts", () => {
    // The point of the writer: an adapter that only decides *meaning* still emits a
    // well-formed stream. Anything the contract flags here is a writer bug, not an adapter bug.
    const writer = createEventWriter({ runId: "r" });
    writer.runStarted({ title: "Audit" });
    writer.reasoningDelta("Read then test.");
    writer.finishReasoning();
    writer.toolStarted("t1", { name: "read_file" });
    writer.toolRunning("t1", { path: "src/a.ts" });
    writer.toolResult("t1", { result: "body", resultPreview: "10 lines" });
    writer.toolFinished("t1", "success");
    writer.toolStarted("t2", { name: "bash" });
    writer.toolRunning("t2", { command: "npm test" });
    writer.toolResult("t2", { result: "4 passed" });
    writer.toolFinished("t2", "success");
    writer.textDelta("Done.");
    writer.finishAll();
    writer.runFinished({ status: "success" });

    const report = inspectAgentUXEvents(writer.events);
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(
      report.coverage.filter((surface) => surface.status === "degraded"),
      "writer 产出的流不应有降级面",
    ).toEqual([]);
  });

  it("emits monotonic seq and ts", () => {
    const writer = createEventWriter({ runId: "r", now: 1000 });
    writer.runStarted();
    writer.textDelta("a");
    writer.finishAll();

    const seqs = writer.events.map((event) => event.seq ?? -1);
    const timestamps = writer.events.map((event) => event.ts ?? -1);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b));
    expect(new Set(seqs).size).toBe(seqs.length);
    expect(timestamps[0]).toBeGreaterThan(1000);
  });

  it("reports events incrementally for live rendering", () => {
    const snapshots: number[] = [];
    const writer = createEventWriter({ runId: "r", onEvents: (events) => snapshots.push(events.length) });
    writer.textDelta("a");
    writer.textDelta("b");
    writer.finishText();

    // started, delta, delta, finished — a snapshot per emit, growing.
    expect(snapshots).toEqual([1, 2, 3, 4]);
  });
});

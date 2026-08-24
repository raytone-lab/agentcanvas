import { describe, expect, it } from "vitest";

import { AGENT_UX_EVENT_TYPES } from "@agent-ux/protocol";
import {
  UNRENDERED_CONCEPTS,
  normalizeAgentUXEvents,
  resolveToolConcept,
  summarizeRejections,
} from "./eventNormalizer";

/**
 * The stream below is the one a real deepseek-harness run produced, reduced to its shape: the
 * writer is called `write` (not `write_file`), the title carries the whole args blob, todo
 * updates and token accounting are emitted as tool calls, and no artifact event is emitted at
 * all even though a file was written.
 *
 * Rendered as-is, that produced generic rows that looked nothing like the composed design and
 * an artifact panel that stayed empty. These tests pin that the admission layer pulls it back
 * onto our vocabulary: recognised concepts render, unrecognised ones are held out, and the
 * artifact the run actually produced is derived.
 */

let seq = 0;
const ev = (type: string, payload: Record<string, unknown> = {}) => {
  seq += 1;
  return { protocol: "agent-ux", version: "0.1", id: `e${seq}`, runId: "r", seq, ts: seq, type, payload };
};

function harnessStream() {
  seq = 0;
  return [
    ev("run.started", { title: "HTML PPT" }),
    ev("text.started", { textId: "u", role: "user" }),
    ev("text.delta", { textId: "u", delta: "我要 HTML 形式的 PPT" }),
    ev("text.finished", { textId: "u" }),

    // Token accounting emitted as a tool call.
    ev("tool.call.started", { toolCallId: "tok", name: "token-usage", title: "模型响应" }),
    ev("tool.call.finished", { toolCallId: "tok", status: "success" }),

    // Todo list updates emitted as tool calls — recognised, but no component exists.
    ev("tool.call.started", { toolCallId: "td1", name: "update_todo_list", title: "Update todo list" }),
    ev("tool.call.result", { toolCallId: "td1", result: "3 pending, 1 in progress" }),
    ev("tool.call.finished", { toolCallId: "td1", status: "success" }),

    // The writer: name is `write`, title is the raw args blob.
    ev("tool.call.started", {
      toolCallId: "w1",
      name: "write",
      title: 'write {"file_path": "/tmp/AI-PPT/index.html", "content": "<!DOCTYPE html>…"}',
    }),
    ev("tool.call.running", {
      toolCallId: "w1",
      args: { file_path: "/tmp/AI-PPT/index.html", content: "<!DOCTYPE html><html><body>PPT</body></html>" },
    }),
    ev("tool.call.result", { toolCallId: "w1", result: "written", resultPreview: "1 file" }),
    ev("tool.call.finished", { toolCallId: "w1", status: "success" }),

    ev("text.started", { textId: "a", role: "assistant" }),
    ev("text.delta", { textId: "a", delta: "已生成，预览 http://127.0.0.1:8999/index.html" }),
    ev("text.finished", { textId: "a" }),
    ev("run.finished", { status: "success" }),
  ];
}

describe("tool concept vocabulary", () => {
  it("resolves the spellings different harnesses use to one concept", () => {
    for (const name of ["write", "write_file", "create_file", "save_file", "append_file"]) {
      expect(resolveToolConcept(name), name).toBe("write-file");
    }
    for (const name of ["read", "read_file", "cat", "view_file"]) {
      expect(resolveToolConcept(name), name).toBe("read-file");
    }
    for (const name of ["bash", "sh", "exec", "run_command", "shell.exec"]) {
      expect(resolveToolConcept(name), name).toBe("run-command");
    }
    for (const name of ["str_replace_editor", "apply_patch", "edit"]) {
      expect(resolveToolConcept(name), name).toBe("edit-file");
    }
    for (const name of ["update_todo_list", "todo", "update_plan"]) {
      expect(resolveToolConcept(name), name).toBe("plan");
    }
  });

  it("returns undefined for tools our components have no place for", () => {
    expect(resolveToolConcept("frobnicate_widget")).toBeUndefined();
    expect(resolveToolConcept(undefined)).toBeUndefined();
  });

  it("does not match on free-text titles alone", () => {
    // A message title mentioning "test" must not become a validate tool.
    expect(resolveToolConcept("frobnicate_widget", "let me test something")).toBeUndefined();
  });
});

describe("admission layer", () => {
  it("derives the artifact a write produced, so the panel is not empty", () => {
    const result = normalizeAgentUXEvents(harnessStream());

    expect(result.derivedArtifacts).toEqual([{ toolCallId: "w1", path: "/tmp/AI-PPT/index.html" }]);

    const artifacts = result.events.filter((event) => event.type.startsWith("artifact."));
    expect(artifacts).toHaveLength(3);

    expect(artifacts[0].payload.title).toBe("index.html");
    // An .html file is worth previewing, not just syntax-highlighting.
    expect(artifacts[0].payload.kind).toBe("preview");
    expect(artifacts[0].payload.mimeType).toBe("text/html");
    expect(artifacts[1].payload.delta).toContain("<!DOCTYPE html>");
  });

  it("rebuilds titles that carry raw args JSON", () => {
    const result = normalizeAgentUXEvents(harnessStream());
    expect(result.normalizedTitles).toHaveLength(1);
    expect(result.normalizedTitles[0].to).toBe("Write index.html");

    const started = result.events.find(
      (event) => event.type === "tool.call.started" && event.payload.toolCallId === "w1",
    );
    expect(started?.payload.title).toBe("Write index.html");
    expect(String(started?.payload.title)).not.toContain("{");
  });

  it("holds back everything our components cannot render", () => {
    const result = normalizeAgentUXEvents(harnessStream());
    const summary = summarizeRejections(result.rejected);

    // Token accounting -> diagnostics.
    expect(summary.diagnostic).toBeGreaterThan(0);
    // Todo updates are recognised but have no component yet.
    expect(summary["unrenderable-concept"]).toBeGreaterThan(0);

    const kept = result.events.map((event) => event.payload.toolCallId);
    expect(kept, "no todo or token rows in the transcript").not.toContain("td1");
    expect(kept).not.toContain("tok");
    expect(kept, "the real write survives").toContain("w1");
  });

  it("rejects every later event of a rejected call, so no half rows appear", () => {
    const result = normalizeAgentUXEvents(harnessStream());
    const todoEvents = result.rejected.filter(
      (item) => (item.event as { payload?: Record<string, unknown> }).payload?.toolCallId === "td1",
    );
    // started + result + finished
    expect(todoEvents).toHaveLength(3);
  });

  it("keeps unknown event types out entirely", () => {
    const result = normalizeAgentUXEvents([
      ev("run.started", {}),
      { type: "deepseek.internal.ping", payload: {} },
      { payload: {} },
    ]);
    const summary = summarizeRejections(result.rejected);
    expect(summary["unknown-type"]).toBe(2);
    expect(result.events).toHaveLength(1);
  });

  it("admits every type the SDK defines", () => {
    // A hand-kept copy of this list had drifted five types behind the SDK — including
    // `step.started` and `tool.call.error`, both of which components render. A stale copy
    // deletes working events silently, so the set is read from the SDK and pinned here.
    seq = 0;
    const oneOfEach = AGENT_UX_EVENT_TYPES.map((type) => ev(type, {}));
    const result = normalizeAgentUXEvents(oneOfEach);
    const unknown = result.rejected.filter((item) => item.reason === "unknown-type");
    expect(
      unknown.map((item) => item.detail),
      "SDK 定义的事件类型不应被当作未知类型丢掉",
    ).toEqual([]);
  });

  it("lets a backend widen our vocabulary without touching the table", () => {
    seq = 0;
    const stream = [
      ev("tool.call.started", { toolCallId: "x", name: "dsh_put_blob" }),
      ev("tool.call.running", { toolCallId: "x", args: { path: "out/report.md", content: "# hi" } }),
      ev("tool.call.finished", { toolCallId: "x", status: "success" }),
    ];
    // Unrecognised: still admitted (all three events survive), just reported.
    const before = normalizeAgentUXEvents(stream);
    expect(before.undesignedTools).toEqual([{ toolCallId: "x", name: "dsh_put_blob" }]);
    expect(before.events).toHaveLength(3);
    // No concept means no artifact derivation — we do not know it wrote a file.
    expect(before.derivedArtifacts).toEqual([]);

    const widened = normalizeAgentUXEvents(stream, {
      extraAliases: { "write-file": ["dsh_put_blob"] },
    });
    expect(widened.undesignedTools).toEqual([]);
    expect(widened.derivedArtifacts).toEqual([{ toolCallId: "x", path: "out/report.md" }]);
  });

  it("admits a tool it cannot label rather than deleting the interaction", () => {
    // This was a real regression: `publish` resolved to no concept, so the call was rejected
    // — and with it the `awaiting_approval` event, so the approval buttons disappeared from a
    // shipped fixture. A plain card the user can act on beats a missing one.
    seq = 0;
    const stream = [
      ev("tool.call.started", { toolCallId: "p", name: "publish", title: "Publish production release" }),
      ev("tool.call.args.delta", { toolCallId: "p", delta: "{}" }),
      ev("tool.call.awaiting_approval", { toolCallId: "p", prompt: "确认发布？" }),
    ];
    const result = normalizeAgentUXEvents(stream);

    expect(result.events).toEqual(stream);
    expect(result.rejected).toEqual([]);
    expect(result.undesignedTools).toEqual([{ toolCallId: "p", name: "publish" }]);
    // Untouched: no rename either, so the component's own matcher decides the card.
    expect(result.canonicalizedNames).toEqual([]);
  });

  it("does not relabel an ambiguous name the component already reads correctly", () => {
    // A bare "run" alias made every `run_*` tool a plain command, including `run_checks` —
    // which `resolveToolAction` reads as a validation, which is more accurate. The table is
    // for unambiguous spellings; it must not out-guess the component.
    expect(resolveToolConcept("run_checks")).toBeUndefined();
    expect(resolveToolConcept("run_migration")).toBeUndefined();
    // Unambiguous shells still resolve.
    expect(resolveToolConcept("bash")).toBe("run-command");
    expect(resolveToolConcept("run_command")).toBe("run-command");
  });

  it("does not derive an artifact from a failed or contentless write", () => {
    seq = 0;
    const failed = normalizeAgentUXEvents([
      ev("tool.call.started", { toolCallId: "f", name: "write" }),
      ev("tool.call.running", { toolCallId: "f", args: { path: "a.txt", content: "x" } }),
      ev("tool.call.finished", { toolCallId: "f", status: "error" }),
    ]);
    expect(failed.derivedArtifacts).toEqual([]);

    const noContent = normalizeAgentUXEvents([
      ev("tool.call.started", { toolCallId: "n", name: "write" }),
      ev("tool.call.running", { toolCallId: "n", args: { path: "a.txt" } }),
      ev("tool.call.finished", { toolCallId: "n", status: "success" }),
    ]);
    expect(noContent.derivedArtifacts).toEqual([]);
  });

  it("leaves a well-formed stream untouched", () => {
    // This is the guard that lets the admission layer ship without touching a component: for
    // a stream that already speaks our protocol it must be the identity function. If this
    // fails, every existing fixture and preview changes appearance.
    seq = 0;
    const clean = [
      ev("run.started", {}),
      ev("tool.call.started", { toolCallId: "t", name: "read_file", title: "Read session.ts" }),
      ev("tool.call.running", { toolCallId: "t", args: { path: "src/session.ts" } }),
      ev("tool.call.result", { toolCallId: "t", result: "body" }),
      ev("tool.call.finished", { toolCallId: "t", status: "success" }),
      ev("artifact.created", { artifactId: "a", kind: "code", title: "x.ts" }),
    ];
    const result = normalizeAgentUXEvents(clean);
    expect(result.rejected).toEqual([]);
    expect(result.derivedArtifacts).toEqual([]);
    expect(result.normalizedTitles).toEqual([]);
    expect(result.canonicalizedNames).toEqual([]);
    expect(result.events).toEqual(clean);
  });

  it("rewrites tool names to the spelling components match on", () => {
    const result = normalizeAgentUXEvents([
      { type: "tool.call.started", payload: { toolCallId: "a", name: "read" } },
      { type: "tool.call.started", payload: { toolCallId: "b", name: "str_replace_editor" } },
      { type: "tool.call.started", payload: { toolCallId: "c", name: "sh" } },
    ]);
    expect(result.canonicalizedNames).toEqual([
      { toolCallId: "a", from: "read", to: "read_file" },
      { toolCallId: "b", from: "str_replace_editor", to: "edit_file" },
      { toolCallId: "c", from: "sh", to: "run_command" },
    ]);
    // A name already canonical is left alone.
    expect(normalizeAgentUXEvents([
      { type: "tool.call.started", payload: { toolCallId: "d", name: "read_file" } },
    ]).canonicalizedNames).toEqual([]);
  });

  it("documents which concepts still lack a component", () => {
    // If a component is added for plans, remove it here and the transcript will admit it.
    expect(UNRENDERED_CONCEPTS).toEqual(["plan"]);
  });
});

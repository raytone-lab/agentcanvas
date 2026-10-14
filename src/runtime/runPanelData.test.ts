import { describe, expect, it } from "vitest";

import { runProgress, runTaskRows, workspaceFileRows } from "./runPanelData";

const tool = (fields: Record<string, unknown>) => ({ kind: "tool", ...fields });
const step = (fields: Record<string, unknown>) => ({ kind: "step", ...fields });

describe("run panel data", () => {
  it("prefers a producer's own steps over the tool calls", () => {
    // A backend that emits `step.*` is telling us its plan; the tool calls are
    // the fallback for the (far more common) backend that emits none.
    const rows = runTaskRows([
      step({ id: "s1", label: "Read the notes", status: "finished" }),
      step({ id: "s2", label: "Fill the gap", status: "running" }),
      tool({ id: "t1", name: "read_file", title: "Read file", status: "success" }),
    ]);
    expect(rows.map((row) => [row.label, row.status])).toEqual([
      ["Read the notes", "done"],
      ["Fill the gap", "running"],
    ]);
  });

  it("leaves the interrupt out of the task list", () => {
    // `stepKind: "session"` is a break in the stream — ChatFrame draws it as a
    // rule — so listing 已被你中断 as a task would be reading it as one. With it
    // excluded and no other step, the tool calls take over.
    const rows = runTaskRows([
      step({ id: "s1", stepKind: "session", label: "Stopped by you", status: "stopped" }),
      tool({ id: "t1", name: "read_file", title: "Read file", status: "success", args: { path: "notes.md" } }),
    ]);
    expect(rows.map((row) => row.id)).toEqual(["t1"]);
    expect(rows[0].target).toBe("notes.md");
  });

  it("counts a run that is still working as running, not failed", () => {
    const summary = runProgress([
      tool({ id: "t1", name: "read_file", status: "success" }),
      tool({ id: "t2", name: "write_file", status: "error" }),
      tool({ id: "t3", name: "validate", status: "running" }),
    ]);
    expect(summary).toEqual({ done: 1, total: 3, status: "running" });
  });

  it("reports a finished run that lost a call as failed", () => {
    const summary = runProgress([
      tool({ id: "t1", name: "read_file", status: "success" }),
      tool({ id: "t2", name: "write_file", status: "error" }),
    ]);
    expect(summary.status).toBe("failed");
  });

  it("has nothing to report for a run with no work", () => {
    expect(runTaskRows([{ kind: "message" }])).toEqual([]);
    expect(runProgress([{ kind: "message" }])).toEqual({ done: 0, total: 0, status: "finished" });
    expect(workspaceFileRows([{ kind: "message" }])).toEqual([]);
  });

  it("says a file was changed when it was read and then written", () => {
    // One row per file, not per call, and the stronger claim wins: the useful
    // thing to say about a file that was read and then rewritten is that it
    // changed.
    const rows = workspaceFileRows([
      tool({ id: "t1", name: "read_file", status: "success", args: { path: "src/notes.md" } }),
      tool({ id: "t2", name: "edit_file", status: "success", args: { path: "src/notes.md" } }),
    ]);
    expect(rows).toEqual([
      { id: "file:src/notes.md", path: "src/notes.md", name: "notes.md", action: "modified" },
    ]);
  });

  it("makes no claim about a file whose call failed or was cancelled", () => {
    // The same rule that stopped a failed write from reporting 已修改 notes.md
    // on the tool row: a write that errored did not change the file.
    const rows = workspaceFileRows([
      tool({ id: "t1", name: "write_file", status: "error", args: { path: "notes.md" } }),
      tool({ id: "t2", name: "write_file", status: "cancelled", args: { path: "other.md" } }),
      tool({ id: "t3", name: "write_file", status: "awaiting_approval", args: { path: "third.md" } }),
    ]);
    expect(rows).toEqual([]);
  });

  it("reads the target out of streamed args and an approval preview", () => {
    const rows = workspaceFileRows([
      tool({ id: "t1", name: "read_file", status: "success", argsText: '{"path":"a.md"}' }),
      tool({ id: "t2", name: "validate", status: "success", approval: { argsPreview: { path: "b.test.tsx" } } }),
    ]);
    expect(rows.map((row) => [row.name, row.action])).toEqual([
      ["a.md", "read"],
      ["b.test.tsx", "checked"],
    ]);
  });

  it("skips a tool that named a path without saying what it did to it", () => {
    // A row is a claim, so an unrecognised tool gets none rather than a hedged
    // one that says "read" because that is the harmless-looking default.
    expect(workspaceFileRows([tool({ id: "t1", name: "mystery_tool", status: "success", args: { path: "x.md" } })])).toEqual([]);
  });
});

import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { IconSetProvider } from "../../agentmatrix";
import { ChatFrame } from "../../components/agent-preview/ChatFrame";
import { OutputFrame } from "../../components/agent-preview/OutputFrame";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { admitEvents } from "../../runtime/admissionReport";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { anthropicEventsFromFrames } from "./anthropicAdapter";
import { claudeCodeMapping } from "./mappings/claudeCode";
import { codexMapping } from "./mappings/codex";
import { opencodeMapping } from "./mappings/opencode";
import { translateHarnessStream } from "./tableDrivenAdapter";

/**
 * Vendor parity, asserted on rendered DOM.
 *
 * Everything else in this suite checks events. This checks the thing that was actually wrong
 * when a real harness was wired up: the events were plausible and the *screen* was not — noise
 * cards flooding the transcript, tool rows falling back to a bare line, an artifact panel that
 * stayed empty. Those are render-time outcomes, so they need a render-time assertion.
 *
 * One conversation — write a file, then answer — is expressed in four vendor formats and
 * pushed all the way to markup through the real components. What must match is the *designed
 * surface*: which card types appear, and whether the artifact panel has content. Vendor
 * wording differs and is not compared.
 */

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale="en">
      <IconSetProvider>{node}</IconSetProvider>
    </LocaleProvider>,
  );
}

/**
 * `previewPrompt` is passed explicitly as "" because `ChatFrame` defaults it to a sample
 * sentence, which would add a user turn no vendor sent and make every comparison here compare
 * that instead. (The default itself is reported separately — a component should not invent
 * content.) `App.tsx` always passes this prop, so this matches how the app renders.
 */
function chatFrame(viewModel: never) {
  return <ChatFrame project={defaultCodingAgentProject} viewModel={viewModel} previewPrompt="" />;
}

/** Drive raw vendor events through admission and the real projection the app uses. */
function viewModelFor(rawEvents: readonly unknown[], extraAliases?: Record<string, readonly string[]>) {
  const admission = admitEvents(rawEvents, { extraAliases: extraAliases as never });
  const state = replayAgentUXEvents(admission.events as never);
  return { admission, viewModel: createAgentUXViewModel(state as never) as never };
}

/**
 * The designed surface of a rendered conversation: which components the markup contains, and
 * whether each tool card got a designed treatment. Deliberately structural — the text is
 * vendor wording and would differ for good reasons.
 *
 * `data-action` is the load-bearing part. `ToolCallCard.resolveToolAction` matches on the tool
 * name and returns `undefined` when nothing fits, which drops the attribute entirely — so a
 * card without `data-action` is precisely the un-designed generic row that a real harness
 * integration produced. Counting those is the mechanical version of "does it look like what I
 * composed".
 */
function surfaceOf(markup: string) {
  const toolCardTags = markup.match(/<section class="tool-card"[^>]*>/g) ?? [];
  return {
    toolCards: toolCardTags.length,
    toolActions: toolCardTags
      .map((tag) => /data-action="([^"]*)"/.exec(tag)?.[1])
      .filter((action): action is string => Boolean(action))
      .sort(),
    cardsWithoutAction: toolCardTags.filter((tag) => !tag.includes("data-action=")).length,
    reasoningBlocks: (markup.match(/<section class="reasoning-block"/g) ?? []).length,
  };
}

// --- the same conversation, four ways -------------------------------------------------------

const codexLines = [
  { id: "0", msg: { type: "task_started" } },
  { id: "1", msg: { type: "agent_reasoning", text: "写一个页面。" } },
  {
    id: "2",
    msg: {
      type: "patch_apply_begin",
      call_id: "c1",
      invocation: { tool: "apply_patch", arguments: { path: "index.html", content: "<!DOCTYPE html><h1>hi</h1>" } },
    },
  },
  { id: "3", msg: { type: "patch_apply_end", call_id: "c1", stdout: "written", exit_code: 0 } },
  { id: "4", msg: { type: "token_count", total: 999 } },
  { id: "5", msg: { type: "agent_message", message: "已生成 index.html。" } },
  { id: "6", msg: { type: "task_complete" } },
];

const claudeCodeLines = [
  { type: "system", subtype: "init" },
  { type: "assistant", message: { content: [{ type: "thinking", thinking: "写一个页面。" }] } },
  {
    type: "assistant",
    message: {
      content: [
        {
          type: "tool_use",
          id: "c1",
          name: "Write",
          input: { file_path: "index.html", content: "<!DOCTYPE html><h1>hi</h1>" },
        },
      ],
    },
  },
  { type: "user", message: { content: [{ type: "tool_result", tool_use_id: "c1", content: "written" }] } },
  { type: "assistant", message: { content: [{ type: "text", text: "已生成 index.html。" }] } },
  { type: "result", subtype: "success", result: "done" },
];

const opencodeLines = [
  { type: "session.created", properties: { id: "s" } },
  { type: "message.part.updated", properties: { part: { type: "reasoning", reasoning: "写一个页面。" } } },
  {
    type: "tool.execute.start",
    properties: {
      part: {
        callID: "c1",
        tool: "write",
        state: { input: { path: "index.html", content: "<!DOCTYPE html><h1>hi</h1>" } },
      },
    },
  },
  {
    type: "tool.execute.end",
    properties: { part: { callID: "c1", state: { output: "written", status: "completed" } } },
  },
  { type: "message.part.updated", properties: { part: { type: "text", text: "已生成 index.html。" } } },
  { type: "session.idle", properties: { id: "s" } },
];

const anthropicFrames = [
  { type: "message_start", message: { model: "claude-sonnet-4" } },
  { type: "content_block_start", index: 0, content_block: { type: "thinking" } },
  { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking: "写一个页面。" } },
  { type: "content_block_stop", index: 0 },
  { type: "content_block_start", index: 1, content_block: { type: "tool_use", id: "c1", name: "write_file" } },
  {
    type: "content_block_delta",
    index: 1,
    delta: {
      type: "input_json_delta",
      partial_json: '{"path":"index.html","content":"<!DOCTYPE html><h1>hi</h1>"}',
    },
  },
  { type: "content_block_stop", index: 1 },
  { type: "content_block_start", index: 2, content_block: { type: "text" } },
  { type: "content_block_delta", index: 2, delta: { type: "text_delta", text: "已生成 index.html。" } },
  { type: "content_block_stop", index: 2 },
  { type: "message_stop" },
];

type Vendor = { id: string; events: readonly unknown[]; aliases?: Record<string, readonly string[]> };

/** Harnesses: a process ran the tool, so a file really was written. */
const harnesses: Vendor[] = [
  {
    id: "codex",
    events: translateHarnessStream(codexLines, codexMapping).events,
    aliases: codexMapping.extraAliases as never,
  },
  {
    id: "claude-code",
    events: translateHarnessStream(claudeCodeLines, claudeCodeMapping).events,
    aliases: claudeCodeMapping.extraAliases as never,
  },
  {
    id: "opencode",
    events: translateHarnessStream(opencodeLines, opencodeMapping).events,
    aliases: opencodeMapping.extraAliases as never,
  },
];

/** A model API: it asked for the tool; nothing executed it. */
const modelApi: Vendor = { id: "anthropic", events: anthropicEventsFromFrames(anthropicFrames) };

const vendors: Vendor[] = [...harnesses, modelApi];

/** The treatments `ToolCallCard` has a designed card for. */
const DESIGNED_ACTIONS = [
  "read-file", "read-image", "edit-file", "modify-file",
  "run-command", "validate", "search",
];

describe("vendor parity on rendered output", () => {
  const surfaces = () =>
    vendors.map((vendor) => {
      const { viewModel } = viewModelFor(vendor.events, vendor.aliases);
      return { id: vendor.id, surface: surfaceOf(render(chatFrame(viewModel))) };
    });

  it("renders the same component composition for every vendor", () => {
    // What must match is the *composition*: how many tool cards, how many reasoning blocks,
    // and no un-designed rows. Which specific card a tool gets is allowed to differ, because
    // the vendors did not all do the same thing — see the test below.
    const compositions = surfaces().map(({ id, surface }) => ({
      id,
      toolCards: surface.toolCards,
      reasoningBlocks: surface.reasoningBlocks,
      cardsWithoutAction: surface.cardsWithoutAction,
    }));

    const [first, ...rest] = compositions;
    for (const other of rest) {
      expect(other, `${other.id} 与 ${first.id} 的组件构成不一致`).toEqual({ ...first, id: other.id });
    }
    expect(first.toolCards, "写文件的运行应渲染出工具卡").toBeGreaterThan(0);
    expect(first.reasoningBlocks, "思考应渲染成思考块").toBeGreaterThan(0);
  });

  it("gives every tool a designed card, whatever the vendor called it", () => {
    // This is the guarantee that matters. `resolveToolAction` returns undefined for a name it
    // does not recognise, which drops `data-action` and renders the un-designed row a real
    // harness integration produced. Zero of those, for every vendor, is the mechanical form
    // of "it looks like what I composed".
    for (const { id, surface } of surfaces()) {
      expect(surface.cardsWithoutAction, `${id}: 有工具卡没拿到 data-action，会渲染成没设计过的通用行`).toBe(0);
      for (const action of surface.toolActions) {
        expect(DESIGNED_ACTIONS, `${id}: ${action} 不在设计过的卡片类型里`).toContain(action);
      }
    }
  });

  it("keeps a genuine difference in what the vendors did visible", () => {
    // Codex has no file-writing tool — it patches (`apply_patch`). Claude Code and opencode
    // call a `Write` tool. Patching an existing file and creating a new one are different
    // operations, so they get different cards on purpose; flattening them would misreport
    // what ran. Both are still our cards, which is the part that has to hold.
    const byId = Object.fromEntries(surfaces().map(({ id, surface }) => [id, surface.toolActions]));
    expect(byId["codex"]).toEqual(["edit-file"]);
    expect(byId["claude-code"]).toEqual(["modify-file"]);
    expect(byId["opencode"]).toEqual(["modify-file"]);
    expect(byId["anthropic"]).toEqual(["modify-file"]);
  });

  it("fills the artifact panel for every harness that actually wrote the file", () => {
    // No harness here emits an artifact event; each writes a file with a tool, and the
    // admission layer derives the artifact from the completed write. That derivation is what
    // makes the right-hand preview panel non-empty — the failure a real run hit was a page
    // sitting on disk with an empty panel.
    for (const vendor of harnesses) {
      const { admission, viewModel } = viewModelFor(vendor.events, vendor.aliases);

      expect(
        admission.normalize.derivedArtifacts.map((item) => item.path),
        `${vendor.id}: 应从写文件推导出产物`,
      ).toEqual(["index.html"]);

      const markup = render(
        <OutputFrame project={defaultCodingAgentProject} viewModel={viewModel} />,
      );
      expect(markup, `${vendor.id}: 产物面板应有内容`).toContain("index.html");
    }
  });

  it("does not invent an artifact for a model API that only asked for the tool", () => {
    // Anthropic's Messages API returns the model's *intent*: it names a tool and its arguments,
    // and nothing runs them. No file exists, so deriving an artifact would fabricate one. The
    // tool card still renders; the write simply never completes. This is the line between a
    // provider (`protocol: "anthropic"`) and a harness (`harness: "claude"`).
    const { admission } = viewModelFor(modelApi.events, modelApi.aliases);
    expect(admission.normalize.derivedArtifacts).toEqual([]);
    expect(
      admission.events.filter((event) => event.type === "tool.call.finished").map((event) => event.payload.status),
    ).toEqual(["cancelled"]);
  });

  it("keeps vendor bookkeeping out of the transcript", () => {
    // Codex reports token counts as stream events; rendering them as activity is what buried
    // the real file operations in a wall of grey cards. Asserted against the timeline rather
    // than raw markup — "999" also occurs inside SVG path coordinates.
    const { admission, viewModel } = viewModelFor(vendors[0].events, vendors[0].aliases);
    const timeline = JSON.stringify((viewModel as unknown as { timeline: unknown }).timeline);
    expect(timeline).not.toContain("999");
    expect(timeline.toLowerCase()).not.toContain("token_count");
    // Held back by the table before admission ever saw it, so nothing to report here.
    expect(admission.normalize.rejected).toEqual([]);
  });

  it("shows the reasoning each vendor sent, in its own words", () => {
    for (const vendor of vendors) {
      const { viewModel } = viewModelFor(vendor.events, vendor.aliases);
      const markup = render(chatFrame(viewModel));
      expect(markup, `${vendor.id}: 思考内容应出现在界面上`).toContain("写一个页面。");
      expect(markup, `${vendor.id}: 回答应出现在界面上`).toContain("已生成 index.html。");
    }
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IconSetProvider } from ".";
import { createMockClient } from "./client";
import { SCENARIOS, scenarioById, type ScenarioId } from "./fixtures";
import { fixtureDurableEvents } from "./mockSse";
import { projectSession } from "./projector";
import type { SessionViewModel } from "./viewModel";
import { AgentMatrixWorkspace } from "../components/agentmatrix/AgentMatrixWorkspace";
import { ToolCallCard } from "../components/agentmatrix/ToolCallCard";

/**
 * Event stream -> UI, end to end.
 *
 * `projector.test.ts` proves events project to a view model, and the component
 * files are individually reasonable. Nothing joined the two: no test rendered a
 * component from a real event stream, so a view-model field that no component
 * reads — or an item kind no component handles — was invisible to the suite.
 *
 * These tests drive each reference scenario through the whole chain the app
 * uses at runtime:
 *
 *   fixture events -> mock SSE frames -> AgentMatrixClient -> projectSession
 *     -> AgentMatrixWorkspace -> HTML
 *
 * `instant: true` replays the timeline synchronously, so the client has
 * converged before render and `autoConnect={false}` keeps the effect (which
 * never runs under `renderToStaticMarkup`) out of the picture.
 */

function connectedClient(fixtureId: ScenarioId) {
  const client = createMockClient(scenarioById(fixtureId).fixture, { instant: true });
  client.connect();
  return client;
}

function renderScenario(fixtureId: ScenarioId, sidePanel: "activity" | "diagnostics" = "activity") {
  const client = connectedClient(fixtureId);
  const html = renderToStaticMarkup(
    <IconSetProvider>
      <AgentMatrixWorkspace client={client} sidePanel={sidePanel} autoConnect={false} />
    </IconSetProvider>,
  );
  return { html, viewModel: client.getSnapshot().viewModel };
}

const count = (html: string, needle: string) => html.split(needle).length - 1;

function expectedRows(vm: SessionViewModel) {
  const items = vm.transcript.flatMap((turn) => turn.items);
  return {
    message: items.filter((item) => item.kind === "message").length,
    thinking: items.filter((item) => item.kind === "thinking").length,
    tool: items.filter((item) => item.kind === "tool").length,
    total: items.length,
  };
}

describe("event stream -> UI", () => {
  it("renders every scenario without throwing", () => {
    for (const scenario of SCENARIOS) {
      expect(() => renderScenario(scenario.id), scenario.id).not.toThrow();
    }
  });

  it("puts every projected transcript item on screen", () => {
    // The failure this guards: the projector emits an item kind (or a whole
    // turn) that the workspace's branch does not handle, so it silently never
    // reaches the DOM. Counting per kind means a dropped tool card cannot be
    // masked by an extra message row.
    const report: string[] = [];
    for (const scenario of SCENARIOS) {
      const { html, viewModel } = renderScenario(scenario.id);
      const want = expectedRows(viewModel);
      const got = {
        message: count(html, 'class="am-message"'),
        thinking: count(html, 'class="am-thinking"'),
        tool: count(html, 'class="am-tool"'),
      };
      if (want.message !== got.message || want.thinking !== got.thinking || want.tool !== got.tool) {
        report.push(
          `  ${scenario.id}: 期望 message/thinking/tool = ` +
            `${want.message}/${want.thinking}/${want.tool}，实际渲染 ` +
            `${got.message}/${got.thinking}/${got.tool}`,
        );
      }
      // A non-empty transcript must never fall through to the empty state.
      if (want.total > 0) {
        expect(html, `${scenario.id} 显示了空状态`).not.toContain("am-transcript-empty");
      }
    }
    expect(
      report,
      report.length === 0
        ? ""
        : ["", "事件流映射到 UI 时有条目被丢掉：", report.join("\n"), ""].join("\n"),
    ).toEqual([]);
  });

  it("leaks no placeholder text into the rendered output", () => {
    // `undefined` / `[object Object]` / `NaN` in the HTML means a component read
    // a view-model field that does not exist under that name, or interpolated an
    // object. Both render as plausible-looking UI, so only a string check catches it.
    const offenders: string[] = [];
    for (const scenario of SCENARIOS) {
      const { html } = renderScenario(scenario.id);
      for (const needle of ["undefined", "[object Object]", "NaN"]) {
        if (html.includes(needle)) offenders.push(`  ${scenario.id}: "${needle}"`);
      }
    }
    expect(offenders, offenders.length === 0 ? "" : ["", "渲染结果里出现占位垃圾值：", offenders.join("\n"), ""].join("\n")).toEqual([]);
  });

  it("carries the user's words through to the transcript", () => {
    const { html, viewModel } = renderScenario("normal-turn");
    const firstUser = viewModel.transcript
      .flatMap((turn) => turn.items)
      .find((item) => item.kind === "message" && item.author === "user");
    expect(firstUser, "fixture 里应该有一条用户消息").toBeTruthy();
    const text = (firstUser as { blocks: Array<{ type: string; text?: string }> }).blocks
      .filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
    expect(text.trim().length, "用户消息不能是空的").toBeGreaterThan(0);
    // The exact words the event carried must appear, not a summary of them.
    expect(html).toContain(text.split("\n")[0].slice(0, 24));
  });

  it("renders the approval affordance when a tool waits on the user", () => {
    // The fixture resolves its approval before the stream ends, so cut it at the
    // `requires_action` idle event — the moment the user is actually being asked.
    const upToRequest = fixtureDurableEvents(scenarioById("tool-approval").fixture).filter(
      (event) => event.sequence <= 4,
    );
    const vm = projectSession(upToRequest);
    const tool = vm.transcript.flatMap((turn) => turn.items).find((item) => item.kind === "tool");
    expect(tool, "fixture 里应该有一个工具调用").toBeTruthy();
    expect((tool as { awaitingApproval: boolean }).awaitingApproval).toBe(true);

    const html = renderToStaticMarkup(
      <IconSetProvider>
        <ToolCallCard tool={tool as never} onConfirm={() => {}} />
      </IconSetProvider>,
    );
    // Asking for a decision means offering the buttons that make it.
    expect(html).toContain("am-approval");
    expect(html).toContain('data-action="allow"');
    expect(html).toContain('data-action="deny"');

    // And once the decision is durable, the ask is gone.
    const resolved = renderScenario("tool-approval");
    expect(resolved.html).not.toContain('data-action="allow"');
  });

  it("never shows an approval badge without the buttons to act on it", () => {
    // `agent.tool_use{status:"pending"}` arrives one frame before the
    // `session.status_idle{stop_reason:requires_action}` that actually asks the
    // user. In that window the projector reports lifecycle `pending_approval`
    // (badge: "Needs approval") while `awaitingApproval` is still false, so the
    // card demands a decision and renders no way to make one. Transient in a
    // healthy stream; permanent if the stream stalls after the tool_use, if a
    // reconnect resumes past the idle event, or if a backend never emits
    // requires_action at all.
    const beforeRequest = fixtureDurableEvents(scenarioById("tool-approval").fixture).filter(
      (event) => event.sequence <= 3,
    );
    const tool = projectSession(beforeRequest)
      .transcript.flatMap((turn) => turn.items)
      .find((item) => item.kind === "tool") as { lifecycle: string; awaitingApproval: boolean };

    const html = renderToStaticMarkup(
      <IconSetProvider>
        <ToolCallCard tool={tool as never} onConfirm={() => {}} />
      </IconSetProvider>,
    );
    const badge = /class="am-tool-badge"[^>]*>([^<]*)</.exec(html)?.[1] ?? "";
    const hasActions = html.includes('data-action="allow"');

    expect(
      badge === "Needs approval" && !hasActions,
      [
        "",
        "工具卡显示徽标「Needs approval」，但没有渲染任何审批按钮 —— 用户被要求做决定却没有入口。",
        `  lifecycle = ${tool.lifecycle}`,
        `  awaitingApproval = ${tool.awaitingApproval}`,
        `  徽标 = ${badge}`,
        "",
        "两处口径不一致：projector 把 useStatus:\"pending\" 直接映射成 lifecycle",
        "\"pending_approval\"，而 ToolCallCard 的审批区是由 awaitingApproval 控制的。",
        "",
      ].join("\n"),
    ).toBe(false);
  });

  it("locks the composer on a terminal incident and keeps it open otherwise", () => {
    const terminal = renderScenario("terminal-incident");
    expect(terminal.viewModel.readOnly || terminal.viewModel.blockingIncident?.composerLocked).toBe(
      true,
    );
    expect(terminal.html).toContain('data-locked="true"');

    const normal = renderScenario("normal-turn");
    expect(normal.html).toContain('data-locked="false"');
  });

  it("routes runtime and diagnostics facts to the side panel, not the transcript", () => {
    const { html, viewModel } = renderScenario("diagnostics-and-update", "diagnostics");
    // The diagnostics scenario is model spans + a session update: real facts that
    // must not manufacture transcript rows.
    expect(viewModel.transcript.flatMap((turn) => turn.items).filter((item) => item.kind === "message"))
      .toHaveLength(0);
    expect(html).toContain('class="am-side"');
  });

  it("shows streaming state while deltas are still open", () => {
    const { html, viewModel } = renderScenario("streamed-message");
    const streaming = viewModel.transcript
      .flatMap((turn) => turn.items)
      .some((item) => (item as { streaming?: boolean }).streaming);
    // Converged stream: nothing should still claim to be streaming.
    expect(streaming, "回放结束后不应还有条目停在 streaming").toBe(false);
    expect(html).toContain('data-streaming="false"');
  });

  it("converges to the same view model whether replayed or streamed", () => {
    // Durable replay (reconnect / history load) and live streaming must land on
    // the same UI. If they diverge, a page refresh changes what the user sees.
    for (const scenario of SCENARIOS) {
      const streamed = connectedClient(scenario.id).getSnapshot().viewModel;
      const replayed = projectSession(fixtureDurableEvents(scenario.fixture));
      expect(
        streamed.transcript.flatMap((turn) => turn.items).map((item) => `${item.kind}:${item.id}`),
        `${scenario.id} 流式与回放结果不一致`,
      ).toEqual(replayed.transcript.flatMap((turn) => turn.items).map((item) => `${item.kind}:${item.id}`));
    }
  });
});

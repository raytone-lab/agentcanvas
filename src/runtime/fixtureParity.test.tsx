import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createAgentUXViewModel } from "@agent-ux/render-core";
import { replayAgentUXEvents } from "@agent-ux/runtime";

import { IconSetProvider, SCENARIOS, scenarioById, toAgentUXEvents } from "../agentmatrix";
import { fixtureDurableEvents } from "../agentmatrix/mockSse";
import { ChatFrame } from "../components/agent-preview/ChatFrame";
import { OutputFrame } from "../components/agent-preview/OutputFrame";
import { LocaleProvider } from "../i18n/LocaleContext";
import { parsePreviewFixture, previewFixtures } from "../preview/fixtures";
import { admitEvents } from "./admissionReport";
import { defaultCodingAgentProject } from "../schema/agentuxConfig";

/**
 * The admission layer must be invisible to everything that already works.
 *
 * It sits at `App.tsx`'s single event funnel, so it touches every preview, every fixture and
 * every saved project. The guarantee it has to earn is narrow and absolute: for a stream that
 * already speaks our protocol, the events out are the events in, and the rendered markup is
 * byte-identical. Anything less means composing a UI in the configurator and shipping it would
 * produce two different screens.
 *
 * `eventNormalizer.test.ts` asserts this on a synthetic clean stream. This asserts it on the
 * real thing: all 7 shipped preview fixtures and all 9 reference scenarios, compared as
 * rendered DOM rather than as data.
 *
 * Both of the regressions that made this file necessary were found here and nowhere else:
 *
 * - a bare `"run"` alias relabelled `run_checks` a plain command, when the component's own
 *   matcher reads it as a validation — a different card, silently;
 * - rejecting a tool we had no concept for (`publish`) also dropped its
 *   `tool.call.awaiting_approval`, so the approval buttons vanished from a shipped scenario.
 */

function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale="zh">
      <IconSetProvider>{node}</IconSetProvider>
    </LocaleProvider>,
  );
}

const viewModelOf = (events: readonly unknown[]) =>
  createAgentUXViewModel(replayAgentUXEvents(events as never) as never) as never;

/**
 * Both surfaces that read the timeline. `previewPrompt` is pinned to "" because `ChatFrame`
 * defaults it to a sample sentence; `App.tsx` always passes the prop, so this matches the app.
 */
function markupOf(events: readonly unknown[]): string {
  const viewModel = viewModelOf(events);
  return (
    render(<ChatFrame project={defaultCodingAgentProject} viewModel={viewModel} previewPrompt="" />) +
    render(<OutputFrame project={defaultCodingAgentProject} viewModel={viewModel} />)
  );
}

const shippedStreams: Array<{ id: string; events: readonly unknown[] }> = [
  ...previewFixtures.map((fixture) => ({ id: `fixture:${fixture.id}`, events: parsePreviewFixture(fixture) })),
  ...SCENARIOS.map((scenario) => ({
    id: `scenario:${scenario.id}`,
    events: toAgentUXEvents(fixtureDurableEvents(scenarioById(scenario.id).fixture) as never) as readonly unknown[],
  })),
];

describe("admission is a no-op for everything already shipping", () => {
  it("covers every shipped stream", () => {
    // A parity suite that silently stops covering things is worse than none.
    expect(shippedStreams.length).toBe(16);
  });

  it("passes the same events through untouched", () => {
    const changed: string[] = [];
    for (const { id, events } of shippedStreams) {
      const admitted = admitEvents(events);
      if (JSON.stringify(admitted.events) !== JSON.stringify(events)) {
        changed.push(`  ${id}: ${events.length} → ${admitted.events.length}`);
      }
    }
    expect(
      changed,
      changed.length === 0
        ? ""
        : ["", "收敛层改动了已有 fixture 的事件流：", changed.join("\n"), ""].join("\n"),
    ).toEqual([]);
  });

  it("renders byte-identical markup", () => {
    const differing: string[] = [];
    for (const { id, events } of shippedStreams) {
      const before = markupOf(events);
      const after = markupOf(admitEvents(events).events);
      if (before !== after) differing.push(`  ${id}`);
    }
    expect(
      differing,
      differing.length === 0
        ? ""
        : [
          "",
          "以下已有 fixture 经收敛层后渲染结果变了 —— 配置器里组合的界面和导出的界面会不一致：",
          differing.join("\n"),
          "",
        ].join("\n"),
    ).toEqual([]);
  });

  it("reports the tools it has no concept for without dropping them", () => {
    // `mcp-and-interrupt` uses `run_checks` and `publish`, neither of which maps to one of our
    // concepts. They must show up as findings and still be admitted in full.
    const mcp = shippedStreams.find((stream) => stream.id === "scenario:mcp-and-interrupt")!;
    const admitted = admitEvents(mcp.events);

    expect(admitted.normalize.undesignedTools.map((item) => item.name).sort()).toEqual([
      "publish",
      "run_checks",
    ]);
    expect(admitted.normalize.rejected).toEqual([]);
    expect(admitted.normalize.canonicalizedNames).toEqual([]);
    // The approval the scenario exists to demonstrate survives.
    expect(
      admitted.events.some((event) => event.type === "tool.call.awaiting_approval"),
      "审批事件必须保留，否则审批按钮会消失",
    ).toBe(true);
  });
});

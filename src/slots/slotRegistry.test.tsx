import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IconSetProvider } from "../agentmatrix";
import { LocaleProvider } from "../i18n/LocaleContext";
import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { applyPresetOption } from "../schema/presetActions";
import { renderSlots, slotsForTemplate } from "./slotRegistry";

/**
 * Mirror the app's provider tree (App.tsx and the exported main.tsx both wrap in
 * LocaleProvider + IconSetProvider). Without IconSetProvider `useIconSet()` throws, and
 * without a pinned locale the copy falls back to zh, which breaks English assertions.
 */
function render(node: ReactNode): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale="en">
      <IconSetProvider>{node}</IconSetProvider>
    </LocaleProvider>,
  );
}

describe("template slot visibility", () => {
  it("hides Git preview slots outside coding-oriented templates", () => {
    expect(slotsForTemplate(defaultCodingAgentProject.layout.slots, "chat").some((slot) => slot.component === "GitFrame")).toBe(false);
    expect(slotsForTemplate(defaultCodingAgentProject.layout.slots, "coding").some((slot) => slot.component === "GitFrame")).toBe(true);
    expect(slotsForTemplate(defaultCodingAgentProject.layout.slots, "tool-heavy").some((slot) => slot.component === "GitFrame")).toBe(true);
  });

  it("keeps external approval in the main chat slot instead of the output slot", () => {
    const project = applyPresetOption(defaultCodingAgentProject, "tool-approval-hidden");
    const viewModel = {
      runId: "test",
      status: "running",
      title: "Approval test",
      capabilities: [],
      errors: [],
      timeline: [
        {
          kind: "tool",
          id: "tool_rm_cache",
          name: "rm",
          title: "Remove temp cache",
          status: "awaiting_approval",
          approval: {
            prompt: "Remove .agent/tmp-cache recursively?",
            argsPreview: { path: ".agent/tmp-cache", recursive: true, force: true },
          },
        },
      ],
    } as never;

    const slotContext = {
      project,
      viewModel,
      events: [],
      showDebugBadges: false,
      modelOptions: ["gpt-4o"],
      onSubmit: () => undefined,
      onExport: () => undefined,
      onModelChange: () => undefined,
    };
    const mainMarkup = render(
      <>
        {renderSlots(project.layout.slots, "main", slotContext)}
      </>,
    );
    const rightPanelMarkup = render(
      <>
        {renderSlots(project.layout.slots, "right-panel", slotContext)}
      </>,
    );

    expect(mainMarkup).toContain('data-approval-surface="external"');
    expect(mainMarkup).toContain("Remove .agent/tmp-cache recursively?");
    expect(rightPanelMarkup).toContain("Output ·");
    expect(rightPanelMarkup).toContain("Git");
    expect(rightPanelMarkup).not.toContain("Generate export");
    expect(rightPanelMarkup).not.toContain('data-approval-surface="external"');
  });
});

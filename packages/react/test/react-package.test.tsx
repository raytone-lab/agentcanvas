import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  applyExperiencePresetOption,
  defaultAgentCanvasExperience,
  defaultAgentCanvasExperienceV2,
  experiencePresetGroups,
} from "@agentmatrix/agentcanvas-contract";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ExperienceConfigurator } from "../src/ExperienceConfigurator";
import { ExperiencePresetOptionPreview } from "../src/ExperiencePresetOptionPreview";
import { ExperiencePreview } from "../src/ExperiencePreview";
import { ExperienceStudio } from "../src/ExperienceStudio";
import { ProductInterfacePreview } from "../src/ProductInterfacePreview";
import { ProductInterfaceStudio } from "../src/ProductInterfaceStudio";
import { localizedPresetGroups } from "../src/presetLocale";

describe("AgentCanvas React package", () => {
  it("renders persisted v2 Brand, Welcome, and bounded token overrides", () => {
    const value = {
      ...defaultAgentCanvasExperienceV2,
      brand: {
        ...defaultAgentCanvasExperienceV2.brand,
        displayName: "Signal Desk",
        accent: { kind: "custom" as const, color: "#c2410c" },
        corners: "rounded" as const,
      },
      welcome: {
        headline: "How can Signal Desk help?",
        supportingText: "Ask about tickets, exports, or billing.",
        suggestedPrompts: ["Summarize support tickets", "Find slow queues"],
        showSuggestedPrompts: true,
      },
      design: {
        colorMode: "light" as const,
        colors: { canvas: "#fffaf2", text: "#241a12" },
        typography: {
          fontUi: "Inter, sans-serif",
          fontDisplay: "Georgia, serif",
          baseSize: 15,
          headingScale: 1.2,
        },
        geometry: { spacingScale: 1.1, radiusScale: 1.2, borderScale: 0.8 },
      },
    };
    const markup = renderToStaticMarkup(
      <ProductInterfacePreview value={value} locale="en" />,
    );

    expect(markup).toContain("Signal Desk");
    expect(markup).toContain("How can Signal Desk help?");
    expect(markup).toContain("Summarize support tickets");
    expect(markup).toContain(
      'data-agentcanvas-contract="agentcanvas-experience-v2"',
    );
    expect(markup).toContain('data-agentcanvas-color-mode="light"');
    expect(markup).toContain("--agentcanvas-action:#c2410c");
    expect(markup).toContain("--agentcanvas-font-display:Georgia, serif");
    expect(markup).toContain("--agentcanvas-spacing-scale:1.1");
    expect(markup).not.toContain("http://");
    expect(markup).not.toContain("https://");
  });

  it("shows a truthful custom UI handoff without rendering Canvas controls", () => {
    const markup = renderToStaticMarkup(
      <ProductInterfacePreview
        value={{
          ...defaultAgentCanvasExperienceV2,
          surface: { mode: "custom" },
        }}
        locale="zh-CN"
      />,
    );

    expect(markup).toContain('data-agentcanvas-surface="custom"');
    expect(markup).toContain("自定义界面");
    expect(markup).not.toContain("agentcanvas-preview__surface");
  });

  it("adds Brand and Welcome controls around the unchanged Canvas configuration", () => {
    const markup = renderToStaticMarkup(
      <ProductInterfaceStudio
        value={{
          ...defaultAgentCanvasExperienceV2,
          brand: {
            ...defaultAgentCanvasExperienceV2.brand,
            displayName: "Operations Copilot",
          },
        }}
        onChange={() => undefined}
        initialScenario="welcome"
      />,
    );

    expect(markup).toContain('class="agentcanvas-product-studio"');
    expect(markup).toContain("Brand");
    expect(markup).toContain("Welcome");
    expect(markup).toContain("Canvas");
    expect(markup).toContain("Operations Copilot");
    expect(markup).toContain("How can I help?");
    expect(markup).not.toContain("Interface mode");
    expect(markup).not.toContain("Custom UI");
  });

  it("keeps the v2 reference Studio Canvas-native and free of host product chrome", () => {
    const markup = renderToStaticMarkup(
      <ProductInterfaceStudio
        value={defaultAgentCanvasExperienceV2}
        onChange={() => undefined}
      />,
    );

    expect(markup).toContain("AgentCanvas");
    expect(markup).not.toContain("Workspace");
    expect(markup).not.toContain("Save draft");
    expect(markup).not.toContain("Apply to template");
    expect(markup).not.toContain("API key");
  });

  it("renders the product-sized Studio without network or host landmarks", () => {
    const previousFetch = globalThis.fetch;
    const fetchSpy = vi.fn(() =>
      Promise.reject(new Error("network is forbidden")),
    );
    globalThis.fetch = fetchSpy as typeof fetch;
    try {
      const markup = renderToStaticMarkup(
        <main>
          <ExperienceStudio
            value={defaultAgentCanvasExperience}
            onChange={() => undefined}
            capabilities={{ provider: false, liveRun: false }}
          />
        </main>,
      );

      expect(markup.match(/<main/g)).toHaveLength(1);
      expect(markup).toContain('class="agentcanvas-studio__groups"');
      expect(markup).toContain('class="agentcanvas-studio__options"');
      expect(markup).toContain('aria-label="Live preview"');
      expect(markup).toContain("Completed run");
      expect(markup).toContain("Desktop preview");
      expect(markup).not.toContain("Terminal drawer");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("localizes Studio chrome and supports welcome preview fixtures", () => {
    const markup = renderToStaticMarkup(
      <ExperienceStudio
        value={defaultAgentCanvasExperience}
        onChange={() => undefined}
        locale="zh-CN"
        initialScenario="welcome"
        initialViewport="mobile"
      />,
    );

    expect(markup).toContain("实时预览");
    expect(markup).toContain("欢迎页");
    expect(markup).toContain('data-viewport="mobile"');
    expect(markup).toContain("你的 Agent 可以如何帮助");
  });

  it("renders controlled React 19 entrypoints without network access", () => {
    const previousFetch = globalThis.fetch;
    const fetchSpy = vi.fn(() =>
      Promise.reject(new Error("network is forbidden")),
    );
    globalThis.fetch = fetchSpy as typeof fetch;
    try {
      const configurator = renderToStaticMarkup(
        <ExperienceConfigurator
          value={defaultAgentCanvasExperience}
          onChange={() => undefined}
          locale="en"
          capabilities={{
            provider: false,
            liveRun: false,
            gitMutation: false,
            debug: false,
          }}
        />,
      );
      const preview = renderToStaticMarkup(
        <ExperiencePreview
          value={defaultAgentCanvasExperience}
          locale="zh-CN"
        />,
      );

      expect(configurator).toContain("Experience");
      expect(configurator).not.toContain("Model and tools");
      expect(preview).toContain("会话");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  it("does not add a main landmark inside a host and previews layout ratios", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      layout: {
        ...defaultAgentCanvasExperience.layout,
        mainSize: 90,
        rightPanelSize: 10,
        bottomDockSize: 44,
        slots: defaultAgentCanvasExperience.layout.slots.map((slot) =>
          slot.component === "OutputFrame"
            ? { ...slot, region: "bottom-dock" as const }
            : slot,
        ),
      },
    };
    const markup = renderToStaticMarkup(
      <main>
        <ExperiencePreview value={value} />
      </main>,
    );

    expect(markup.match(/<main/g)).toHaveLength(1);
    expect(markup).toContain('<div class="agentcanvas-preview__conversation"');
    expect(markup).toContain("--agentcanvas-main-size:90");
    expect(markup).toContain("--agentcanvas-right-panel-size:10");
    expect(markup).toContain("--agentcanvas-bottom-dock-size:44%");
    expect(markup).toContain('data-region="bottom-dock"');
  });

  it("respects disabled ChatFrame and ComposerFrame slots independently", () => {
    const withSlots = (chat: boolean, composer: boolean) => ({
      ...defaultAgentCanvasExperience,
      layout: {
        ...defaultAgentCanvasExperience.layout,
        slots: defaultAgentCanvasExperience.layout.slots.map((slot) => {
          if (slot.component === "ChatFrame") return { ...slot, enabled: chat };
          if (slot.component === "ComposerFrame")
            return { ...slot, enabled: composer };
          return slot;
        }),
      },
    });

    const chatOnly = renderToStaticMarkup(
      <ExperiencePreview value={withSlots(true, false)} />,
    );
    expect(chatOnly).toContain("Turn these support issues");
    expect(chatOnly).not.toContain("agentcanvas-preview__composer");
    expect(chatOnly).not.toContain(">Send<");

    const composerOnly = renderToStaticMarkup(
      <ExperiencePreview value={withSlots(false, true)} />,
    );
    expect(composerOnly).not.toContain("Turn these support issues");
    expect(composerOnly).toContain("agentcanvas-preview__composer");
    expect(composerOnly).toContain(">Send<");

    const neither = renderToStaticMarkup(
      <ExperiencePreview value={withSlots(false, false)} />,
    );
    expect(neither).not.toContain("agentcanvas-preview__conversation");
    expect(neither).not.toContain("Turn these support issues");
    expect(neither).not.toContain(">Send<");
  });

  it("names each utility landmark when right and bottom regions coexist", () => {
    const markup = renderToStaticMarkup(
      <ExperiencePreview
        value={defaultAgentCanvasExperience}
        capabilities={{ debug: true, git: true }}
      />,
    );

    expect(markup).toContain(
      'data-region="right-panel" aria-label="Output · Git changes"',
    );
    expect(markup).toContain(
      'data-region="bottom-dock" aria-label="Debug diagnostics"',
    );
  });

  it("localizes group, option, and description copy for zh-CN", () => {
    const markup = renderToStaticMarkup(
      <ExperienceConfigurator
        value={defaultAgentCanvasExperience}
        onChange={() => undefined}
        locale="zh-CN"
      />,
    );

    expect(markup).toContain("布局");
    expect(markup).toContain("显示侧边栏");
    expect(markup).toContain("在对话旁显示会话导航");
    expect(markup).not.toContain(">Layout<");
    expect(markup).not.toContain("Show session navigation");

    const localized = localizedPresetGroups(
      experiencePresetGroups.map((group) => ({
        ...group,
        options: [...group.options],
      })),
      "zh-CN",
    );
    for (const [groupIndex, group] of experiencePresetGroups.entries()) {
      expect(localized[groupIndex]?.label).not.toBe(group.label);
      for (const [optionIndex, option] of group.options.entries()) {
        expect(localized[groupIndex]?.options[optionIndex]?.label).not.toBe(
          option.label,
        );
        expect(
          localized[groupIndex]?.options[optionIndex]?.description,
        ).not.toBe(option.description);
      }
    }
  });

  it("renders loading, error, migration, and read-only states", () => {
    const base = {
      value: defaultAgentCanvasExperience,
      onChange: () => undefined,
    };
    expect(
      renderToStaticMarkup(<ExperienceConfigurator {...base} loading />),
    ).toContain("Loading Experience");
    expect(
      renderToStaticMarkup(
        <ExperienceConfigurator {...base} error="Could not load" />,
      ),
    ).toContain("Could not load");
    expect(
      renderToStaticMarkup(
        <ExperienceConfigurator {...base} migrationRequired />,
      ),
    ).toContain("unsupported contract version");
    expect(
      renderToStaticMarkup(<ExperienceConfigurator {...base} readOnly />),
    ).toContain("Read-only");
  });

  it("renders only capability-approved option previews", () => {
    const markup = renderToStaticMarkup(
      <ExperiencePresetOptionPreview
        value={defaultAgentCanvasExperience}
        optionId="writing-typewriter"
      />,
    );
    expect(markup).toContain('aria-label="Typewriter"');
    const unavailable = renderToStaticMarkup(
      <ExperiencePresetOptionPreview
        value={defaultAgentCanvasExperience}
        optionId="git-visible"
      />,
    );
    expect(unavailable).toContain('role="alert"');
    expect(unavailable).toContain(
      "Preset option is unavailable for this host: git-visible",
    );
  });

  it("shows configuration feedback across the complete preview surface", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      theme: {
        ...defaultAgentCanvasExperience.theme,
        preset: "graphite" as const,
      },
      composer: {
        ...defaultAgentCanvasExperience.composer,
        mic: true,
        promptShortcuts: true,
      },
      conversation: {
        ...defaultAgentCanvasExperience.conversation,
        messageActions: { copy: true, regenerate: true, edit: true },
      },
      toolCalls: {
        detail: "full" as const,
        progress: "bar" as const,
        approval: "inline" as const,
      },
      blocks: {
        ...defaultAgentCanvasExperience.blocks,
        toolLogTail: true,
        errorCollapse: true,
      },
    };
    const markup = renderToStaticMarkup(
      <ExperiencePreview
        value={value}
        capabilities={{ git: true, provider: true }}
      />,
    );

    expect(markup).toContain('data-theme="graphite"');
    expect(markup).toContain("Graphite Mono");
    expect(markup).toContain("Summarize files");
    expect(markup).toContain("Mic");
    expect(markup).toContain("Regenerate");
    expect(markup).toContain('aria-label="Tool progress"');
    expect(markup).toContain("Approve");
    expect(markup).toContain("48 records processed");
    expect(markup).toContain("Errors collapsed");
    expect(markup).toContain("3 changed files");
    expect(markup).toContain("--agentcanvas-canvas:#17191d");
  });

  it("localizes preview chrome and accessible labels for zh-CN", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      conversation: {
        ...defaultAgentCanvasExperience.conversation,
        messageActions: { copy: true, regenerate: true, edit: true },
      },
      toolCalls: {
        detail: "full" as const,
        progress: "bar" as const,
        approval: "inline" as const,
      },
      blocks: {
        ...defaultAgentCanvasExperience.blocks,
        toolLogTail: true,
      },
    };
    const markup = renderToStaticMarkup(
      <ExperiencePreview
        value={value}
        locale="zh-CN"
        capabilities={{ debug: true, git: true, provider: true }}
      />,
    );

    for (const text of [
      "已检查支持问题分组",
      "复制",
      "重新生成",
      "编辑",
      "批准",
      "拒绝",
      "事件诊断",
      "3 个文件已更改 · 仅供审阅",
      "已处理 48 条记录",
      "差异",
      "Agent 模型",
      'aria-label="消息操作"',
      'aria-label="工具进度"',
    ]) {
      expect(markup).toContain(text);
    }
    for (const text of [
      "Reviewed the support issue groups",
      "Regenerate",
      "Approve",
      "Deny",
      "Event diagnostics",
      "3 changed files · review only",
      "48 records processed",
      "Agent model",
      'aria-label="Message actions"',
      'aria-label="Tool progress"',
    ]) {
      expect(markup).not.toContain(text);
    }
  });

  it("keeps Git visible when the output panel is hidden", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      layout: {
        ...defaultAgentCanvasExperience.layout,
        slots: defaultAgentCanvasExperience.layout.slots.map((slot) =>
          slot.component === "OutputFrame" ? { ...slot, enabled: false } : slot,
        ),
      },
    };
    const markup = renderToStaticMarkup(
      <ExperiencePreview value={value} capabilities={{ git: true }} />,
    );

    expect(markup).toContain("3 changed files");
    expect(markup).not.toContain('aria-label="Output"');
  });

  it("does not preview provider or live-run UI without host capabilities", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      composer: {
        ...defaultAgentCanvasExperience.composer,
        modelSwitcher: true,
        toolToggle: true,
      },
      output: {
        ...defaultAgentCanvasExperience.output,
        source: "console" as const,
      },
    };
    const unavailable = renderToStaticMarkup(
      <ExperiencePreview
        value={value}
        capabilities={{ provider: false, liveRun: false }}
      />,
    );
    expect(unavailable).not.toContain("Agent model");
    expect(unavailable).not.toContain("Tools: on");
    expect(unavailable).not.toContain("Live output");
    expect(unavailable).not.toContain('data-source="console"');
    expect(unavailable).toContain('data-source="artifact"');

    const available = renderToStaticMarkup(
      <ExperiencePreview
        value={value}
        capabilities={{ provider: true, liveRun: true }}
      />,
    );
    expect(available).toContain("Agent model");
    expect(available).toContain("Tools: on");
    expect(available).toContain("Live output");
    expect(available).toContain('data-source="console"');
  });

  it("makes tool layouts and reasoning disclosure visible in the preview", () => {
    const cards = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "command-cards",
    );
    const timeline = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "timeline-rail",
    );
    expect(renderToStaticMarkup(<ExperiencePreview value={cards} />)).toContain(
      "agentcanvas-tool--card",
    );
    expect(
      renderToStaticMarkup(<ExperiencePreview value={timeline} />),
    ).toContain("agentcanvas-tool--timeline");

    const collapsed = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "reasoning-auto-collapse",
    );
    const expanded = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "reasoning-expanded",
    );
    const collapsedMarkup = renderToStaticMarkup(
      <ExperiencePreview value={collapsed} />,
    );
    const expandedMarkup = renderToStaticMarkup(
      <ExperiencePreview value={expanded} />,
    );
    expect(collapsedMarkup).toContain('<details class="agentcanvas-reasoning"');
    expect(collapsedMarkup).toContain('data-collapse="auto"');
    expect(collapsedMarkup).not.toMatch(/data-collapse="auto"[^>]* open=""/);
    expect(expandedMarkup).toContain(
      'data-collapse="expanded" data-expandable="true" open=""',
    );
  });

  it("honors persisted non-expandable and thinking reasoning values", () => {
    const value = {
      ...defaultAgentCanvasExperience,
      reasoning: {
        ...defaultAgentCanvasExperience.reasoning,
        show: "thinking" as const,
        expandable: false,
      },
    };
    const markup = renderToStaticMarkup(<ExperiencePreview value={value} />);

    expect(markup).toContain('data-expandable="false"');
    expect(markup).not.toContain('<details class="agentcanvas-reasoning"');
    expect(markup).toContain('<div class="agentcanvas-reasoning"');
    expect(markup.match(/Thinking summary/g)).toHaveLength(1);
    expect(markup).not.toContain(
      "Reviewing context and planning the next action",
    );

    const expandableMarkup = renderToStaticMarkup(
      <ExperiencePreview
        value={{
          ...value,
          reasoning: { ...value.reasoning, expandable: true },
        }}
      />,
    );
    expect(expandableMarkup).toContain("<details");
    expect(expandableMarkup).toContain(
      "Reviewing context and planning the next action",
    );
  });

  it("keeps CSS scoped to the package boundary", async () => {
    const css = await readFile(
      resolve(import.meta.dirname, "../src/styles.css"),
      "utf8",
    );
    expect(css).not.toMatch(/(^|[}\n]\s*)(:root|html|body)(\b|\s|\{|,)/m);
    expect(css).not.toContain("#");
    expect(css).toContain(".agentcanvas-embed");
    expect(css).toContain("forced-colors: active");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("container-type: inline-size");
    expect(css).toContain("@container agentcanvas-embed");
    expect(css).not.toContain("@media (max-width");
    for (const motion of [
      "wave",
      "pulse",
      "terminal",
      "minimal",
      "shimmer",
      "bars",
      "orbit",
    ]) {
      expect(css).toContain(`[data-motion="${motion}"]`);
    }
    for (const writing of ["smooth-stream", "typewriter", "chunked"]) {
      expect(css).toContain(`[data-writing="${writing}"]`);
    }
    expect(css).toContain(".agentcanvas-tool--timeline::before");
    expect(css).toContain('.agentcanvas-reasoning[data-collapse="auto"]');
    expect(css).toContain('.agentcanvas-reasoning[data-collapse="expanded"]');
    expect(css).toMatch(
      /\.agentcanvas-preview__composer\s*\{[^}]*margin-top:\s*auto;/s,
    );
  });

  it("exposes keyboard-operable tabs and scoped host theme tokens", () => {
    const markup = renderToStaticMarkup(
      <ExperienceConfigurator
        value={defaultAgentCanvasExperience}
        onChange={() => undefined}
        semanticTokens={{
          canvas: "oklch(18% 0.01 250)",
          text: "oklch(96% 0.01 250)",
        }}
      />,
    );

    expect(markup).toContain('role="tablist"');
    expect(markup).toContain('role="tabpanel"');
    expect(markup).toContain('aria-selected="true"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).not.toMatch(/tabindex="[1-9]/);
    expect(markup).toContain("--agentcanvas-canvas:oklch(18% 0.01 250)");
    expect(markup).toContain("--agentcanvas-text:oklch(96% 0.01 250)");
  });
});

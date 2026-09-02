import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { App, STYLE_AVATAR_DEFAULTS, selectedComponentItemsForProject } from "./App";
import { ICON_OPTIONS, IconSetProvider } from "./agentmatrix";
import { defaultCodingAgentProject } from "./schema/agentuxConfig";
import { applyPresetOption, togglePresetOption } from "./schema/presetActions";
import { presetGroupsForProject } from "./schema/presets";
import { themeTokens } from "./theme/themeTokens";

vi.mock("./agentux", () => ({
  useAgentUXRuntime: () => ({ replay: vi.fn() }),
  useAgentUXViewModel: () => ({
    runId: "test",
    status: "finished",
    title: "Rendering test",
    timeline: [],
    capabilities: [],
    errors: [],
  }),
}));

function topbarControls(markup: string): string {
  const start = markup.indexOf('<div class="topbar-controls">');
  const end = markup.indexOf("</header>", start);
  return start >= 0 && end >= 0 ? markup.slice(start, end) : "";
}

function cssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  const end = styles.indexOf("\n}", start);
  return start >= 0 && end >= 0 ? styles.slice(start, end) : "";
}

function visiblePresetGroupsForTest(project: typeof defaultCodingAgentProject) {
  return presetGroupsForProject(project).filter((group) => group.id !== "render");
}

describe("App shell controls", () => {
  it("keeps save and selected components in the topbar without preview controls", () => {
    const controls = topbarControls(renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>));

    expect(controls).toContain('aria-label="保存"');
    expect(controls).toContain("已选组件");
    expect(controls).toContain("下载 Agent");
    expect(controls).not.toContain('aria-label="预览"');
    expect(controls).not.toContain('topbar-preview-button');
    expect(controls).not.toContain('run-status-line');
    expect(controls).not.toContain(">保存</button>");
    expect(controls).not.toContain("<select");
    expect(controls).not.toContain("Run replay");
  });

  it("keeps saved-preview pickers icon-free and visually aligned with selected components control", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const topbarControlRule = cssRule(styles, ".topbar-controls > .secondary-button,\n.topbar-controls .scenario-picker .ui-select,\n.topbar-controls .run-mode-picker .ui-select");
    const hoverRule = cssRule(styles, ".topbar-controls > .secondary-button:hover:not(:disabled),\n.topbar-controls .scenario-picker .ui-select:hover:not(:disabled),\n.topbar-controls .run-mode-picker .ui-select:hover:not(:disabled)");

    expect(appSource).not.toContain("<span>{copy.shell.topbar.runModeLabel}</span>");
    expect(appSource).not.toContain("<span>{copy.shell.topbar.scenarioLabel}</span>");
    expect(topbarControlRule).toContain("height: 40px;");
    expect(topbarControlRule).toContain("border-color: var(--border-strong);");
    expect(topbarControlRule).toContain("border-radius: var(--fn-r-sm);");
    expect(hoverRule).toContain("background: color-mix(in srgb, var(--text-primary) 6%, transparent);");
  });

  it("counts only effective selected components in the topbar summary", () => {
    const defaultItems = selectedComponentItemsForProject(
      defaultCodingAgentProject,
      visiblePresetGroupsForTest(defaultCodingAgentProject),
      "zh",
    );
    const projectWithoutSidebar = togglePresetOption(defaultCodingAgentProject, "sidebar-visible");
    const sidebarItems = selectedComponentItemsForProject(
      projectWithoutSidebar,
      visiblePresetGroupsForTest(projectWithoutSidebar),
      "zh",
    );
    const projectWithoutOutput = togglePresetOption(defaultCodingAgentProject, "output-visible");
    const outputItems = selectedComponentItemsForProject(
      projectWithoutOutput,
      visiblePresetGroupsForTest(projectWithoutOutput),
      "zh",
    );
    const projectWithoutGit = togglePresetOption(defaultCodingAgentProject, "git-visible");
    const gitItems = selectedComponentItemsForProject(
      projectWithoutGit,
      visiblePresetGroupsForTest(projectWithoutGit),
      "zh",
    );
    const projectWithHiddenErrorOption = togglePresetOption(defaultCodingAgentProject, "error-collapse");
    const hiddenOptionItems = selectedComponentItemsForProject(
      projectWithHiddenErrorOption,
      visiblePresetGroupsForTest(projectWithHiddenErrorOption),
      "zh",
    );

    expect(defaultItems.some((item) => item.group === "Git")).toBe(false);
    expect(defaultItems.some((item) => item.id === "reasoning-public-summary")).toBe(false);
    expect(sidebarItems.some((item) => item.id === "sidebar-search")).toBe(false);
    expect(sidebarItems.some((item) => item.id === "sidebar-new-button")).toBe(false);
    expect(sidebarItems.some((item) => item.group === "左侧栏")).toBe(false);
    expect(outputItems.some((item) => item.id === "output-source-artifact")).toBe(false);
    expect(outputItems.some((item) => item.group === "输出")).toBe(false);
    expect(gitItems.some((item) => item.id === "branch-status")).toBe(false);
    expect(gitItems.some((item) => item.group === "Git")).toBe(false);
    expect(hiddenOptionItems.some((item) => item.id === "error-collapse")).toBe(false);
  });

  it("orders selected components by the visible left rail flow", () => {
    const projectWithMessageActions = applyPresetOption(defaultCodingAgentProject, "message-actions");
    const items = selectedComponentItemsForProject(
      projectWithMessageActions,
      visiblePresetGroupsForTest(projectWithMessageActions),
      "zh",
    );
    const indexOf = (id: string) => items.findIndex((item) => item.id === id);

    expect(indexOf("state:author.user")).toBeLessThan(indexOf("writing-smooth"));
    expect(indexOf("thinking-wave")).toBeLessThan(indexOf("sidebar-visible"));
    expect(indexOf("sidebar-visible")).toBeLessThan(indexOf("output-visible"));
    expect(indexOf("message-actions")).toBe(-1);
    expect(indexOf("message-action:userCopy")).toBeGreaterThan(indexOf("speaker-labels"));
  });

  it("keeps the selected components popover scrollbar light and near the edge", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const popoverRule = cssRule(styles, ".selected-components-popover");
    const listRule = cssRule(styles, ".selected-components-list");
    const thumbRule = cssRule(styles, ".selected-components-list::-webkit-scrollbar-thumb");

    expect(popoverRule).toContain("padding: var(--space-2) 2px var(--space-2) var(--space-2);");
    expect(listRule).toContain("scrollbar-color: color-mix(in srgb, var(--text-muted) 34%, transparent) transparent;");
    expect(listRule).toContain("scrollbar-width: thin;");
    expect(thumbRule).toContain("background: color-mix(in srgb, var(--text-muted) 34%, transparent);");
  });

  it("keeps generated preview as the primary workspace surface", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    expect(markup).toContain('class="builder-surface" data-output-zone="generated-scaffold"');
    expect(markup).toContain('data-welcome="true"');
    expect(markup).toContain("Meet My Agent ~");
    expect(markup).toContain("选择风格");
  });

  it("asks for approval above the composer instead of under or over it", () => {
    // Both preset previews used to answer this wrongly, in opposite directions: a
    // bottom-anchored absolute overlay covered the composer during a conversation, and the
    // welcome state's static override dropped the panel below the input. Every approval
    // surface belongs above the field, and the field must stay visible — "type an answer
    // instead" is one of the choices on the panel.
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const composerSlots = '{renderSlots(visibleLayoutSlots, "composer", slotContext)}';

    // Checked per stack, not across the whole file: the preview renders one stack with the
    // right panel and one without, and a first-occurrence search would let a regression in
    // the second one pass unnoticed.
    const stacks = appSource
      .split('<section className="preview-stack')
      .slice(1)
      .map((chunk) => chunk.slice(0, chunk.indexOf("</section>")));
    expect(stacks).toHaveLength(2);

    for (const stack of stacks) {
      expect(stack).toContain(composerSlots);
      for (const overlay of [
        "{inlineRuntimeApprovalOverlay}",
        "{externalApprovalOverlay}",
        "{inlineApprovalDemoOverlay}",
      ]) {
        expect(stack.indexOf(overlay), `${overlay} 应渲染在输入框之前`).toBeGreaterThan(-1);
        expect(stack.indexOf(overlay), `${overlay} 应渲染在输入框之前`)
          .toBeLessThan(stack.indexOf(composerSlots));
      }
    }

    const overlayRule = cssRule(styles, ".preview-approval-overlay");
    expect(overlayRule).not.toContain("position: absolute");
    expect(overlayRule).not.toContain("bottom:");
    expect(cssRule(styles, '.preview-stack[data-welcome="true"] > .preview-approval-overlay'))
      .not.toContain("margin-top:");
  });

  it("lets speaker-label presets control chat labels instead of hard-hiding them in CSS", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    expect(styles).not.toMatch(/\.preview-frame\[data-style-preset=["']native["']\]\s+\.assistant-turn-label,\s*\.preview-frame\[data-style-preset=["']native["']\]\s+\.message-role\s*\{\s*display:\s*none;/);
    expect(styles).not.toMatch(/\.preview-frame\[data-style-preset=["']illustrated["']\]\s+\.assistant-turn-label,\s*\.preview-frame\[data-style-preset=["']illustrated["']\]\s+\.message-role\s*\{\s*display:\s*none;/);
  });

  it("keeps preview style presets linked to selected theme tokens", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const nativeRule = cssRule(styles, '.preview-frame[data-style-preset="native"]');
    const nativeDarkRule = cssRule(styles, '.preview-frame[data-style-preset="native"][data-appearance="dark"]');
    const illustratedRule = cssRule(styles, '.preview-frame[data-style-preset="illustrated"]');

    expect(styles).toContain("--preview-hover-fill: var(--accent-soft);");
    expect(styles).toContain("--preview-hover-text: var(--accent);");
    expect(styles).toContain("--preview-shimmer-light: #ffffff;");
    expect(nativeRule).toContain("--preview-hover-fill: var(--native-user-bubble);");
    expect(nativeRule).toContain("--preview-hover-text: var(--text-primary);");
    expect(nativeRule).toContain("--native-user-bubble: var(--surface-hover);");
    expect(nativeRule).toContain("--native-sidebar-active: var(--native-user-bubble);");
    expect(nativeRule).toContain("--native-send-bg: var(--accent);");
    expect(nativeRule).not.toMatch(/--(?:surface|text|accent|native)[\w-]*:\s*#[0-9a-f]{3,8}/i);
    expect(nativeDarkRule).toContain("--preview-soft-fill: color-mix(in srgb, var(--accent) 12%, var(--surface-panel));");
    expect(nativeDarkRule).toContain("--native-sidebar-active: color-mix(in srgb, var(--accent) 20%, var(--surface-panel));");
    expect(nativeDarkRule).toContain("--native-user-bubble: color-mix(in srgb, var(--accent) 22%, var(--surface-panel));");
    expect(nativeDarkRule).toContain("--native-muted-text: color-mix(in srgb, var(--accent) 40%, var(--text-muted));");
    expect(illustratedRule).toContain("--particle-accent: var(--accent);");
    expect(illustratedRule).toContain("--particle-fill: color-mix(in srgb, var(--particle-accent) 8%, var(--surface-panel));");
    expect(illustratedRule).toContain("--particle-divider-line: color-mix(in srgb, var(--particle-line) 42%, transparent);");
    expect(illustratedRule).toContain("--particle-selection-bg: var(--accent-soft);");
    expect(illustratedRule).toContain("--particle-user-bubble-bg: var(--particle-selection-bg);");
    expect(illustratedRule).toContain("--preview-soft-fill: var(--particle-fill);");
    expect(illustratedRule).toContain("--preview-soft-line: var(--particle-line);");
    expect(illustratedRule).toContain("--minimal-radius-xs: 2px;");
    expect(illustratedRule).toContain("--minimal-radius-xl: 8px;");
    expect(illustratedRule).toContain("--radius-full: var(--minimal-radius-md);");
    expect(illustratedRule).toContain("background: var(--surface-panel);");
    expect(illustratedRule).not.toContain("radial-gradient");
    expect(illustratedRule).not.toMatch(/--(?:surface|text|accent|particle)[\w-]*:\s*#[0-9a-f]{3,8}/i);
  });

  it("keeps minimal session hover backgrounds as wide as native", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const baseRule = cssRule(styles, ".session-item-bg");
    const minimalRule = cssRule(styles, '.preview-frame[data-style-preset="illustrated"] .session-item-bg');

    expect(baseRule).toContain("inset: 2px calc(-1 * var(--session-row-bleed));");
    expect(minimalRule).not.toContain("inset:");
  });

  it("keeps expanded output modules fixed at the top while body content scrolls", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    expect(styles).toContain('.artifact-frame[data-expanded="true"] .opened-output {');
    expect(styles).toContain("flex-direction: column;");
    expect(styles).toContain('.artifact-frame[data-expanded="true"] .opened-output > .output-tabs');
    expect(styles).toContain("flex: 0 0 auto;");
    expect(styles).toContain('.artifact-frame[data-expanded="true"] .opened-output-item > :not(.artifact-title)');
    expect(styles).toContain("overflow: auto;");
  });

  it("keeps native new-chat hover background transparent", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const nativeNewChatHoverRule = cssRule(styles, '.preview-frame[data-style-preset="native"] .session-new:hover');

    expect(nativeNewChatHoverRule).toContain("background: transparent;");
  });

  it("keeps minimal send disabled as grey and non-interactive as native", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const nativeDisabledRule = cssRule(styles, '.preview-frame[data-style-preset="native"] .ui-button.send-button[data-size]:disabled');
    const minimalDisabledRule = cssRule(styles, '.preview-frame[data-style-preset="illustrated"] .ui-button.send-button[data-size]:disabled');

    expect(nativeDisabledRule).toContain("background: var(--surface-disabled);");
    expect(minimalDisabledRule).toContain("background: var(--surface-disabled);");
    expect(minimalDisabledRule).toContain("opacity: 1;");
    expect(minimalDisabledRule).toContain("cursor: default;");
  });

  it("uses white shimmer light for running tool text instead of theme accent", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const titleRule = cssRule(styles, ".preview-frame .tool-card[data-status=\"running\"][data-action] .tool-title,\n.preview-frame .tool-card[data-status=\"args_streaming\"][data-action] .tool-title,\n.preview-frame .tool-card[data-running-title=\"true\"][data-action] .tool-title");
    const fileStatusRule = cssRule(styles, ".preview-frame .tool-card[data-action] .tool-file-row-status[data-active=\"true\"]");

    expect(titleRule).toContain("var(--preview-shimmer-light)");
    expect(fileStatusRule).toContain("var(--preview-shimmer-light)");
    expect(titleRule).not.toContain("var(--accent)");
    expect(fileStatusRule).not.toContain("var(--accent)");
  });

  it("keeps tool action hover backgroundless and theme-tokened", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const baseHeaderHoverRule = cssRule(styles, '.preview-frame .tool-card[data-action]:hover .tool-card-header,\n.preview-frame .tool-card[data-file-tool="true"]:hover .tool-card-header');
    const baseTextHoverRule = cssRule(styles, '.preview-frame .tool-card[data-action]:hover .tool-status-icon,\n.preview-frame .tool-card[data-action]:hover .tool-title,\n.preview-frame .tool-card[data-action]:hover .tool-preview,\n.preview-frame .tool-card[data-action]:hover .tool-disclosure-button,\n.preview-frame .tool-card[data-file-tool="true"]:hover .tool-status-icon,\n.preview-frame .tool-card[data-file-tool="true"]:hover .tool-title,\n.preview-frame .tool-card[data-file-tool="true"]:hover .tool-preview,\n.preview-frame .tool-card[data-file-tool="true"]:hover .tool-disclosure-button');
    const nativeHeaderHoverRule = cssRule(styles, '.preview-frame[data-style-preset="native"] .tool-card[data-file-tool="true"]:hover .tool-card-header,\n.preview-frame[data-style-preset="native"] .tool-card[data-action]:hover .tool-card-header');

    expect(baseHeaderHoverRule).toContain("background: transparent;");
    expect(nativeHeaderHoverRule).toContain("background: transparent;");
    expect(baseTextHoverRule).toContain("color: var(--text-primary);");
    expect(baseTextHoverRule).not.toContain("var(--accent)");
  });

  it("keeps reasoning hover backgroundless and theme-tokened", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const previewHoverRule = cssRule(styles, ".preview-frame .reasoning-header:hover");
    const nativeHoverRule = cssRule(styles, '.preview-frame[data-style-preset="native"] .reasoning-header:hover');
    const textHoverRule = cssRule(styles, ".preview-frame .reasoning-header:hover .reasoning-title,\n.preview-frame .reasoning-header:hover .reasoning-meta code,\n.preview-frame .reasoning-header:hover .chevron,\n.preview-frame .reasoning-header:hover .reasoning-indicator-slot,\n.preview-frame .reasoning-header:hover .reasoning-classic,\n.preview-frame .reasoning-header:hover .reasoning-native-orb,\n.preview-frame .reasoning-header:hover .reasoning-pulse,\n.preview-frame .reasoning-header:hover .reasoning-terminal,\n.preview-frame .reasoning-header:hover .reasoning-minimal,\n.preview-frame .reasoning-header:hover .reasoning-bars,\n.preview-frame .reasoning-header:hover .reasoning-ninety-ring");
    const shimmerHoverRule = cssRule(styles, '.preview-frame .reasoning-header:hover .reasoning-title[data-shimmer-text="true"] > span');

    expect(previewHoverRule).toContain("background: transparent;");
    expect(nativeHoverRule).toContain("background: transparent;");
    expect(textHoverRule).toContain("color: var(--text-primary);");
    expect(shimmerHoverRule).toContain("color: var(--text-primary);");
    expect(shimmerHoverRule).toContain("animation: none;");
  });

  it("keeps the second and third native light themes clean instead of muddy", () => {
    expect(themeTokens["sand-workspace"].surface.hover).toBe("#FFECD6");
    expect(themeTokens["sand-workspace"].accent.soft).toBe("#FFECD6");
    expect(themeTokens["sand-workspace"].accent.action).toBe("#C87330");

    expect(themeTokens["apricot-agent"].surface.hover).toBe("#FFD1A3");
    expect(themeTokens["apricot-agent"].accent.soft).toBe("#FFEDD5");
    expect(themeTokens["apricot-agent"].accent.action).toBe("#F97316");
  });

  it("keeps the second and third minimal light themes visually distinct", () => {
    expect(themeTokens["ice-white"].accent.action).toBe("#2563EB");
    expect(themeTokens["mist-blue"].name).toBe("Mist Violet");
    expect(themeTokens["mist-blue"].accent.action).toBe("#7C3AED");
    expect(themeTokens["mist-blue"].accent.action).not.toBe(themeTokens["ice-white"].accent.action);

    expect(themeTokens["polar-mono"].name).toBe("Polar Navy");
    expect(themeTokens["polar-mono"].accent.action).toBe("#172554");
    expect(themeTokens["polar-mono"].accent.action).not.toBe(themeTokens["ice-white"].accent.action);
    expect(themeTokens["polar-mono"].accent.action).not.toBe(themeTokens["mist-blue"].accent.action);
  });

  it("keeps minimal user avatar choices limited to the first four", () => {
    const styles = readFileSync(new URL("./styles/agentmatrix.css", import.meta.url), "utf8");

    expect(styles).toContain('.preset-panel[data-style-preset="illustrated"] .am-state-options[data-slot="author.user"] .am-state-option:nth-of-type(n + 5)');
  });

  it("defaults avatars to the first visible choice for each style", () => {
    const styles = readFileSync(new URL("./styles/agentmatrix.css", import.meta.url), "utf8");

    expect(STYLE_AVATAR_DEFAULTS.native).toEqual({
      "author.user": "blue-smile",
      "author.agent": "orange-blob",
    });
    expect(STYLE_AVATAR_DEFAULTS.illustrated).toEqual({
      "author.user": "user",
      "author.agent": "orange-blob",
    });
    expect(ICON_OPTIONS["author.agent"][0]?.id).toBe("orange-blob");
    expect(styles).toContain('.preset-panel[data-style-preset="illustrated"] .am-state-options[data-slot="author.agent"] .am-state-option[data-option-id="orange-blob"]');
    expect(styles).toContain("order: -1;");
  });
});

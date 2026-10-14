import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { presetStyleIds } from "../schema/agentuxConfig";
import { hasPresetAction } from "../schema/presetActions";
import { hasPreviewAnchorForPresetOption } from "../preview/presetPreviewTarget";
import { themeTokens, workbuddyThemePresetIds } from "./themeTokens";

/**
 * The WorkBuddy style exists to match a specific shipped product, so its
 * numbers are findings rather than choices. These assertions record where each
 * one came from: /Applications/WorkBuddy AI.app v5.2.7,
 * Contents/Resources/app.asar → renderer/assets/src-kZTgkaJN.css.
 *
 * A normal style could be tuned by eye; this one cannot, because "close
 * enough" is indistinguishable from "drifted" without the app open beside it.
 * If a value here has to change, re-read it from the app first.
 */
function cssRule(styles: string, selector: string): string {
  const start = styles.indexOf(`${selector} {`);
  if (start < 0) return "";
  const end = styles.indexOf("\n}", start);
  return end < 0 ? "" : styles.slice(start, end);
}

const appCss = readFileSync(new URL("../styles/app.css", import.meta.url), "utf8");
const WB = '.preview-frame[data-style-preset="workbuddy"]';

describe("WorkBuddy style", () => {
  it("is a selectable style with its own two themes", () => {
    expect(presetStyleIds).toContain("workbuddy");
    expect([...workbuddyThemePresetIds]).toEqual(["wb-light", "wb-dark"]);
  });

  it("wires both themes to a preset action and a preview target", () => {
    // A theme card with no action renders and does nothing; one with no preview
    // anchor scrolls nowhere. Both lists used to be hardcoded copies of the
    // twelve ids that existed at the time.
    for (const id of workbuddyThemePresetIds) {
      expect(hasPresetAction(id), `${id} needs a preset action`).toBe(true);
      expect(hasPreviewAnchorForPresetOption(id), `${id} needs a preview anchor`).toBe(true);
    }
  });

  it("carries the client's light palette verbatim", () => {
    const t = themeTokens["wb-light"];

    expect(t.appearance).toBe("light");
    // --cb-panel-bg-primary → var(--vscode-editor-background, #ffffff)
    expect(t.surface.canvas).toBe("#FFFFFF");
    expect(t.surface.panel).toBe("#FFFFFF");
    // --cb-bg-secondary / --cb-bg-primary-hover / --cb-bg-primary-active
    expect(t.surface.inset).toBe("#F5F5F5");
    expect(t.surface.hover).toBe("#EBEBEB");
    // --cb-text-primary / -secondary / -tertiary
    expect(t.text.primary).toBe("#333333");
    expect(t.text.secondary).toBe("#666666");
    expect(t.text.muted).toBe("#808080");
    // --cb-border-secondary / --cb-stroke-secondary
    expect(t.border.subtle).toBe("#EBEBEB");
    expect(t.border.strong).toBe("#D8DEE4");
    // --cb-send-button-loading-bg — the near-black send button
    expect(t.accent.action).toBe("rgba(0, 0, 0, 0.9)");
  });

  it("carries the client's dark palette verbatim", () => {
    const t = themeTokens["wb-dark"];

    expect(t.appearance).toBe("dark");
    // Base dark block: --cb-bg-primary / --cb-bg-secondary
    expect(t.surface.canvas).toBe("#101114");
    expect(t.surface.inset).toBe("#17191D");
    // body[data-vscode-theme-name="IDE Dark"]: --cb-panel-bg-primary / -secondary
    expect(t.surface.panel).toBe("#212234");
    expect(t.surface.raised).toBe("#313248");
    expect(t.text.primary).toBe("#D2D3E0");
    // --cb-input-border-primary
    expect(t.border.strong).toBe("#4C4F6B");
  });

  it("uses the client's font stacks, not a house font", () => {
    for (const id of workbuddyThemePresetIds) {
      // --cb-font-family / --cb-font-family-mono
      expect(themeTokens[id].font.ui).toMatch(/^-apple-system, BlinkMacSystemFont/);
      expect(themeTokens[id].font.mono).toContain("Menlo");
    }
  });

  it("shares one status ramp across both appearances", () => {
    // --cb-success / --cb-green-color / --cb-error / --cb-text-link. The client
    // does not re-tint these per appearance, so neither do we.
    expect(themeTokens["wb-light"].status).toEqual(themeTokens["wb-dark"].status);
    expect(themeTokens["wb-light"].status).toEqual({
      success: "#10b981",
      warning: "#00b96b",
      danger: "#ef4444",
      info: "#006ab1",
    });
  });

  it("reproduces the user bubble geometry", () => {
    // ._userMessageBubble_cko0t_8 { padding: 8px 12px;
    //   border-radius: 16px 16px 0 16px; font-size: 13px; line-height: 19px }
    const rule = cssRule(appCss, `${WB} .message-item[data-role="user"] .msg-surface`);

    expect(rule).toContain("padding: 8px 12px;");
    expect(rule).toContain("border-radius: 16px 16px 0 16px;");
    expect(rule).toContain("font-size: 13px;");
    expect(rule).toContain("line-height: 19px;");
  });

  it("hides the avatars and speaker labels the client does not show", () => {
    const rule = cssRule(appCss, `${WB} :is(.msg-avatar, .assistant-turn-label, .message-role)`);

    expect(rule).toContain("display: none;");
  });

  it("renders tool calls as single-line rows with a 14px icon", () => {
    // .single-line-tool-header .tool-icon { width: 14px; height: 14px }
    const icon = cssRule(appCss, `${WB} .tool-status-icon`);

    expect(icon).toContain("width: 14px;");
    expect(icon).toContain("height: 14px;");
  });

  it("keeps the running tool title solid instead of shimmering", () => {
    // The base style clips a gradient to the glyphs, which computes to
    // `color: transparent`. The override has to out-specify
    // `.preview-frame .tool-card[data-running-title="true"][data-action]
    // .tool-title`, so the `.tool-card[data-action]` part is required.
    expect(appCss).toContain(`${WB} .tool-card[data-action] .tool-title`);

    const rule = cssRule(appCss, `${WB} .tool-title,\n${WB} .tool-card[data-action] .tool-title`);
    expect(rule).toContain("background: none;");
    expect(rule).toContain("-webkit-text-fill-color: currentcolor;");
  });

  it("keeps the send button round, icon-only and solid when idle", () => {
    // --cb-send-button-loading-bg: rgba(0,0,0,0.9) with a white glyph. The
    // client does not gray it out for an empty composer.
    const rule = cssRule(appCss, `${WB} .ui-button.send-button[data-size]`);
    expect(rule).toContain("width: 32px;");
    expect(rule).toContain("border-radius: 999px;");
    expect(rule).toContain("background: var(--accent);");
    // The label is a bare text node, so it can only be collapsed.
    expect(rule).toContain("font-size: 0;");

    const disabled = cssRule(appCss, `${WB} .ui-button.send-button[data-size]:disabled`);
    expect(disabled).toContain("background: var(--accent);");
    expect(disabled).toContain("opacity: 1;");
  });

  it("pings the outline while a tool waits for approval", () => {
    // outline: 2px solid #3794ff + border-ping 2s cubic-bezier(0,0,0.2,1)
    const rule = cssRule(appCss, `${WB} .tool-card[data-status="awaiting_approval"]`);

    expect(rule).toContain("outline: 2px solid #3794ff;");
    expect(rule).toContain("cubic-bezier(0, 0, 0.2, 1)");
    expect(appCss).toContain("@keyframes wb-border-ping");
  });

  it("lets the themed subtree resolve its own font", () => {
    // font-family is inherited, so body resolves --font-ui against :root and
    // the computed stack inherits in. Without this the theme's font is dead
    // for every style, which is how Native's IBM Plex never applied.
    //
    // Matched as a whole block rather than via cssRule(): there are several
    // `.preview-frame {` rules and cssRule returns the first.
    expect(appCss).toContain(".preview-frame {\n  font-family: var(--font-ui);\n}");
  });

  it("keeps message actions hidden until the turn is hovered", () => {
    // ._userMessageToolbar_jakxt_5 { position: absolute; right: 0; top: 100%;
    //   gap: 8px; padding-top: 4px; opacity: 0;
    //   transition: opacity 0.2s ease-in-out }
    const actions = cssRule(appCss, `${WB} .message-actions`);

    expect(actions).toContain("position: absolute;");
    expect(actions).toContain("top: 100%;");
    expect(actions).toContain("right: 0;");
    expect(actions).toContain("opacity: 0;");
    expect(actions).toContain("transition: opacity 0.2s ease-in-out;");

    // Needs a positioned ancestor, which the base .msg-stack does not have.
    const wrapper = cssRule(appCss, `${WB} .msg-stack,\n${WB} .message-bubble.lane-message`);
    expect(wrapper).toContain("position: relative;");

    expect(cssRule(appCss, `${WB} .msg-stack:hover .message-actions`)).toContain("opacity: 1;");
  });

  it("reveals the agent's actions at the group level, via :has()", () => {
    // .group-messages:has(.cb-assistant-message:hover) .cb-message-time-tip
    // — hovering the turn's padding must not count, only a message in it.
    expect(appCss).toContain(`${WB} .assistant-turn:has(.lane-message:hover) .message-actions`);
  });

  it("gives the hover-only reveals a keyboard path", () => {
    // A reveal that only answers to a pointer is unreachable by keyboard.
    expect(appCss).toContain(`${WB} .msg-stack:focus-within .message-actions`);
    expect(appCss).toContain(`${WB} .assistant-turn:focus-within .message-actions`);
  });

  it("hides the disclosure arrow until hover, but keeps it once expanded", () => {
    // .collapsible:hover .tool-arrow { opacity: 1 }
    // .collapsible.expanded .tool-arrow { transform: rotate(0deg); opacity: 1 }
    expect(cssRule(appCss, `${WB} .tool-disclosure-button`)).toContain("opacity: 0;");
    // An expanded row keeps its arrow after the pointer leaves; the open
    // state lives on the chevron, so the reveal reads it through :has().
    expect(appCss).toContain(`${WB} .tool-disclosure-button:has(.chevron[data-open="true"])`);
    expect(appCss).toContain(`${WB} .tool-card:hover .tool-disclosure-button`);
  });

  it("matches the home screen's title scale", () => {
    // .wb-home-header__title / __subtitle { font-family: "PingFang SC",
    //   -apple-system, …; font-size: 36px; font-weight: 600;
    //   line-height: 48px; letter-spacing: 0 }
    const rule = cssRule(appCss, `${WB} .composer-greeting-text`);

    expect(rule).toContain("font-size: 36px;");
    expect(rule).toContain("line-height: 48px;");
    expect(rule).toContain("font-weight: 600;");
    expect(rule).toContain('"PingFang SC"');
  });

  it("matches the home screen's chip geometry", () => {
    // .quick-actions__item { height: 32px; padding: 0 12px;
    //   border-radius: 8px; border: 1px solid var(--wb-border-default);
    //   font-size: 13px; font-weight: 500; gap: 4px }
    // --wb-border-default = color-mix(in srgb, black 8%, transparent)
    const rule = cssRule(appCss, `${WB} .prompt-shortcuts button`);

    expect(rule).toContain("height: 32px;");
    expect(rule).toContain("padding: 0 12px;");
    expect(rule).toContain("border-radius: 8px;");
    expect(rule).toContain("font-size: 13px;");
    expect(rule).toContain("font-weight: 500;");
    expect(rule).toContain("8%");
  });

  it("frames the welcome composer in the client's gradient, welcome only", () => {
    // .wb-home-composer__input-slot {
    //   background: linear-gradient(180deg, #f0f0f0 0%, #f5f5f5 100%);
    //   border-radius: 18px; padding: 2px 2px 4px 2px }
    //   --cb-main-area-background: #ffffff;  > * { border-radius: 16px }
    const frame = cssRule(
      appCss,
      `${WB} .composer-frame[data-welcome="true"] .composer-shell::before`,
    );
    expect(frame).toContain("linear-gradient(180deg, #f0f0f0 0%, #f5f5f5 100%)");
    expect(frame).toContain("border-radius: 18px;");
    // 2px on three sides and 4px at the bottom, as padding in the client.
    expect(frame).toContain("inset: -2px -2px -4px;");

    // The inner panel is the white 16px surface.
    const shell = cssRule(appCss, `${WB} .composer-frame[data-welcome="true"] .composer-shell`);
    expect(shell).toContain("border-radius: 16px;");

    // Scoped to [data-welcome]: the in-conversation composer is a plain
    // bordered box in the client, not a gradient frame.
    expect(appCss).not.toContain(`${WB} .composer-shell::before`);
  });

  it("flattens the welcome canvas, which the client does not tint", () => {
    // .preview-stack[data-welcome="true"]::before paints a blue radial glow.
    // .preview-stack is inside .preview-frame, so it ships with the export.
    const rule = cssRule(
      appCss,
      `${WB} .preview-stack[data-welcome="true"]::before`,
    );
    expect(rule).toContain("display: none;");
  });

  it("bundles none of the client's artwork", () => {
    // The mascot and welcome illustrations (mascot-new-*.png,
    // claw-welcome-light-*.svg) are copyright Tencent Technology
    // (Shenzhen) Company Limited. This repo is MIT and its export ships to
    // third parties, so the layout keeps the client's 200px slot and fills
    // it with nothing.
    expect(cssRule(appCss, `${WB} .composer-greeting-illustration`)).toContain("width: 200px;");

    // Naming the files in a comment is the point — it records where the
    // values came from. What must not exist is a reference that loads one,
    // so this looks at url() targets rather than any mention of the name.
    const urls = [...appCss.matchAll(/url\(\s*['"]?([^'")]+)/g)].map((m) => m[1]);
    expect(urls.filter((u) => /mascot|claw|workbuddy/i.test(u))).toEqual([]);
  });

  it("renders codicon glyphs, and only for this style", () => {
    // The client draws its icons as filled 16px glyphs (viewBox="0 0 16 16"
    // fill="currentColor"), which is codicon's language, not lucide's stroked
    // 24px outlines. Scoping matters beyond looks: codicon is CC-BY-4.0, so
    // any other style leaves an export with no attribution obligation.
    const appTsx = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
    const exporter = readFileSync(new URL("../export/scaffoldManifest.ts", import.meta.url), "utf8");

    // Both surfaces must agree about which icon set they draw; a mismatch means
    // the preview and the exported app disagree.
    //
    // This used to be checked by requiring each file to contain the same
    // `? "codicon"` ternary and inspecting the 120 characters in front of it.
    // Both now call one resolver instead, so agreement is structural rather
    // than asserted — which is the stronger version of what this was for: the
    // old shape could drift the moment a style was added to one copy and not
    // the other, and that only surfaced after running an export.
    for (const source of [appTsx, exporter]) {
      expect(source).toContain("iconStyleForStylePreset");
      expect(source).not.toContain('? "codicon"');
    }

    // And the resolver is where the scoping lives. Load-bearing beyond looks:
    // codicon is CC-BY-4.0, so any other style leaves an export with no
    // attribution obligation.
    const icons = readFileSync(new URL("../agentmatrix/icons.tsx", import.meta.url), "utf8");
    const resolver = icons.slice(icons.indexOf("export function iconStyleForStylePreset"));
    const codiconIdx = resolver.indexOf('return "codicon"');
    expect(codiconIdx, "codicon must be chosen by a style conditional").toBeGreaterThan(-1);
    expect(resolver.slice(0, codiconIdx)).toContain("workbuddy");
    // Nothing else may reach it.
    expect(resolver.match(/return "codicon"/g)).toHaveLength(1);
  });

  it("keeps the codicon attribution with anything that redistributes it", () => {
    // CC-BY-4.0 allows redistribution only with attribution, and an exported
    // project is a redistribution — a notice in this repo does nothing for
    // someone who only receives the zip.
    const notices = readFileSync(new URL("../../THIRD_PARTY_NOTICES.md", import.meta.url), "utf8");
    expect(notices).toContain("CC-BY-4.0");
    expect(notices).toContain("vscode-codicons");

    const exporter = readFileSync(new URL("../export/scaffoldManifest.ts", import.meta.url), "utf8");
    expect(exporter).toContain('"THIRD_PARTY_NOTICES.md"');
    expect(exporter).toContain('"@vscode/codicons"');
  });

  it("shows only the active style's theme cards, without naming the others", () => {
    // The previous version listed every foreign theme id per style, so a new
    // style could not be added without editing CSS.
    expect(appCss).toContain('.preset-panel[data-style-preset] .preset-option-cell[data-theme-style]');
    expect(appCss).toContain('.preset-panel[data-style-preset="workbuddy"] .preset-option-cell[data-theme-style="workbuddy"]');
  });
});

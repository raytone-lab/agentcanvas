import { renderToStaticMarkup } from "react-dom/server";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { App, STYLE_AVATAR_DEFAULTS, selectedComponentItemsForProject } from "./App";
import { ICON_OPTIONS, IconSetProvider } from "./agentmatrix";
import { defaultCodingAgentProject, emptyStructureProject, presetStyleIds } from "./schema/agentuxConfig";
import { applyPresetOption, togglePresetOption } from "./schema/presetActions";
import {
  FLOW_EXIT_GROUP_IDS,
  DEFAULT_USER_AVATAR_IDS,
  STYLE_AVATAR_OPTIONS,
  selectablePresetStyleOptions,
  styleAvatarOptionIds,
  styleCardOptions,
  styleCardThemeIds,
  visibleStateCards,
  visualStylePreset,
  RAIL_WITHHELD_GROUP_IDS,
  presetRailSections,
} from "./app/projection/presetRailData";
import { createInitialWorkspaceState } from "./app/state/workspaceState";
import { canvasBackgroundColor } from "./app/view/canvasBackgrounds";
import { presetGroups, presetGroupsForProject } from "./schema/presets";
import { nativeThemePresetIds, themeTokens } from "./theme/themeTokens";

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
  return presetGroupsForProject(project);
}

describe("App shell controls", () => {
  it("keeps preview and export in the topbar, and nothing else", () => {
    const controls = topbarControls(renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>));

    // Four controls: the style being worn, the two previews, and export.
    //
    // The interface-preview eye is back beside the play key. It was pulled for
    // being a second control called "preview" — that was a naming problem, and
    // the answers were never the same one: the eye folds the editor's furniture
    // away and leaves the live project on screen, gating on nothing, while the
    // play key snapshots the project and runs a transcript through it. So both
    // are drawn, under labels that say which is which.
    expect(controls).toContain("topbar-ui-preview-button");
    expect(controls).toContain("topbar-preview-button");
    expect(controls).toContain("Export");
    // A bare "预览" on either of them is what made them one question, so
    // neither label is allowed to be it any more. (zh: nothing wraps `App`
    // here, and the locale context defaults to it.)
    expect(controls).toContain('aria-label="界面预览"');
    expect(controls).toContain('aria-label="运行预览"');
    expect(controls).not.toContain('aria-label="预览"');
    /*
     * The panel is open on first paint now — it holds the style cards, and
     * "pick a ready-made look" is one of the two ways into this product, so it
     * should not open behind a chevron. Open, the chip is not drawn at all:
     * the cards in the panel are the same list, and drawing both put the list
     * on screen twice.
     */
    expect(controls).not.toContain("style-chip");
    expect(createInitialWorkspaceState("zh").layersOpen).toBe(true);
    // The component count moved to File → Layers, which lists the same
    // components by the column they sit in.
    expect(controls).not.toContain("已选组件");
    // "保存" is gone because it never saved: it snapshotted the project and
    // entered the preview surface, which is what the preview control does now
    // under an honest label. Nothing is written to disk, and the canvas already
    // renders the configuration as it is edited.
    expect(controls).not.toContain('aria-label="保存"');
    // The debug-view toggle is hidden for now.
    expect(controls).not.toContain("mode-toggle-button");
    // Still no preview *run* controls up here — run status, scenario picker and
    // replay belong to the preview surface, not the editor chrome. Entering a
    // preview is a topbar control; driving one is not.
    expect(controls).not.toContain('run-status-line');
    expect(controls).not.toContain("<select");
    expect(controls).not.toContain("Run replay");
  });

  it("gives the interface preview a way in, and folds the furniture the way in promises", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // The mode's plumbing was all here except the door: the reducer action, the
    // Esc handler, the exit pill and the CSS below were wired while nothing
    // dispatched `active: true`, so the mode was unreachable from the product.
    expect(topbarControls(markup)).toContain("topbar-ui-preview-button");
    expect(readFileSync(new URL("./App.tsx", import.meta.url), "utf8")).toContain(
      'dispatch({ type: "uiPreviewToggled", active: !state.uiPreview })',
    );

    /*
     * What the eye promises, held to the four pieces of chrome it hides.
     *
     * Asserted against the CSS because that is where the folding lives — the
     * attribute on `.workspace-layout` is the whole mechanism, so renaming any
     * one of these cards would leave the button on screen doing three quarters
     * of nothing, with no test to say so.
     */
    const foldRule = cssRule(styles, '.workspace-layout[data-ui-preview="true"] :is(.preset-nav, .topbar, .style-bar, .region-labels)');
    expect(foldRule).toContain("opacity: 0;");
    // Not just faded: `visibility` is what takes the folded cards out of the
    // tab order, which `pointer-events` alone would not do.
    expect(foldRule).toContain("visibility: hidden;");
    expect(foldRule).toContain("pointer-events: none;");
    // The opacity leg wherever it sits in the shorthand, rather than the
    // literal "transition: opacity". `.preset-nav` transitions `width` as well
    // now — it folds to its icon column instead of away — and that leg is
    // written first, so the old substring asserted declaration order and not
    // the fade it was named for.
    for (const selector of [".preset-nav", ".topbar"]) {
      expect(cssRule(styles, selector), `${selector} should fade rather than snap`).toContain(
        "opacity var(--motion-base)",
      );
    }
    // The room the folded cards were holding comes back to the canvas, evenly:
    // the asymmetric gutter existed only to clear the rail and the panel.
    const padRule = cssRule(styles, '.workspace-layout[data-ui-preview="true"]');
    for (const declaration of ["--canvas-pad-top: 24px;", "--canvas-pad-left: 24px;", "--canvas-pad-right: 24px;"]) {
      expect(padRule).toContain(declaration);
    }
    // And the canvas loses its editing marks, which are pure CSS on the frame
    // and so knew nothing about the mode until these two tokens were emptied.
    const frameRule = cssRule(styles, '.workspace-layout[data-ui-preview="true"] .preview-frame');
    expect(frameRule).toContain("--select-line: transparent;");
    expect(frameRule).toContain("--select-fill: transparent;");
  });

  it("floats the chrome over a canvas that fills the window", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // The canvas is the only thing in flow — it spans the whole window, and the
    // chrome sits on it as cards. The shell's first row used to be the topbar.
    expect(cssRule(styles, ".app-shell")).toContain("grid-template-rows: minmax(0, 1fr) auto;");
    for (const selector of [".topbar", ".preset-nav", '.shell-brand[data-floating="true"]']) {
      const rule = cssRule(styles, selector);
      expect(rule, `${selector} should float`).toContain("position: absolute;");
      expect(rule, `${selector} needs the chrome layer`).toContain("z-index: var(--z-shell-chrome);");
    }

    // The room each card takes comes back as canvas padding, so what the canvas
    // draws still centres in the part of it nothing is covering. The exported
    // shell shares the rule and has no chrome, hence the fallbacks.
    const surfaceRule = cssRule(styles, ".builder-surface,\n.exported-shell");
    // All four sides come from a variable now. The bottom used to be a literal
    // 24px, which was both larger than the gap the cards leave and not the same
    // measurement — the rail and the canvas panel stop at
    // `bottom: var(--fn-float-gap)`, so the canvas stops there too and the
    // three line up along the bottom edge.
    expect(surfaceRule).toContain("padding: var(--canvas-pad-top, 24px) var(--canvas-pad-right, 24px)");
    expect(surfaceRule).toContain("var(--canvas-pad-bottom, 24px) var(--canvas-pad-left, 24px);");
    expect(cssRule(styles, ".workspace-layout")).toContain("--canvas-pad-bottom: var(--fn-float-gap);");
    expect(cssRule(styles, ".workspace-layout")).toContain(
      "--canvas-pad-left: calc(var(--fn-float-gap) * 2 + var(--rail-col));",
    );
    // Both sides: the canvas's own panel is full height when open, so it is left
    // room the same way the rail is.
    expect(cssRule(styles, '.workspace-layout[data-layers-open="true"]')).toContain(
      "--canvas-pad-right: calc(var(--fn-float-gap) * 2 + var(--layers-col));",
    );

    // And the mark is inside the rail card rather than in a bar of its own.
    expect(markup.indexOf('class="shell-brand"')).toBeGreaterThan(markup.indexOf('class="preset-nav"'));
    expect(topbarControls(markup)).not.toContain("brand-logo");
  });

  it("puts the language switch behind the product menu", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    // The mark is the menu button now. The language switch was a permanent
    // control for a once-a-session decision and the second-widest thing in the
    // chrome; it is in preferences, which is what the menu leads to.
    expect(markup).toContain('src="/brand-mark.png"');
    expect(markup).toContain('class="brand-trigger"');
    expect(markup).not.toContain('class="language-picker"');

    // The canvas paints from preferences, and opens on the colour it has
    // always been.
    expect(markup).toContain("--canvas-bg");
    expect(canvasBackgroundColor(createInitialWorkspaceState("zh").canvasBackground)).toBe("#DDE1E9");
  });

  it("folds the rail to its icon column rather than away", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    /*
     * Folding is for giving the canvas width, not for giving up navigation.
     *
     * It used to fold to the wordmark row alone — `bottom: auto` plus a
     * content width — which took the five destinations (图层 / 架构 / 组件 /
     * 大模型 / Git) away with the panel, leaving no way to change destination
     * without unfolding first. The card now narrows to exactly the icon
     * column's own track and keeps its full height.
     */
    const folded = cssRule(styles, '.workspace-layout[data-rail-collapsed="true"] .preset-nav');
    expect(folded).toContain("width: var(--iconbar-col);");
    // Full height: the base rule pins the card top and bottom, and the folded
    // rule must not take that back.
    expect(folded, "the folded card keeps its full height").not.toContain("bottom:");

    // The two tracks survive folding. This is the regression guard: the icon
    // column disappears the moment either track is removed or the columns grid
    // is hidden, and the width animation would hide the breakage.
    expect(cssRule(styles, ".preset-columns")).toContain(
      "grid-template-columns: var(--iconbar-col) minmax(0, 1fr);",
    );
    expect(
      styles,
      "nothing may hide the icon column when the rail is folded",
    ).not.toContain('[data-rail-collapsed="true"] .preset-iconbar');

    // Only the panel goes, and by fading — `display: none` cannot be
    // transitioned, which is why the fold used to happen in a single frame.
    const foldedPanel = cssRule(styles, '.workspace-layout[data-rail-collapsed="true"] .preset-panel');
    expect(foldedPanel).toContain("opacity: 0;");
    expect(foldedPanel).toContain("pointer-events: none;");

    // Two curves, one per direction: the card eases back into the open width
    // and plainly into the folded one. A panel springing past its folded width
    // has nothing to its left to spring into.
    expect(cssRule(styles, ".preset-nav")).toContain("width var(--motion-rail-out) var(--ease-back)");
    expect(folded).toContain("width var(--motion-rail-in) var(--ease-out)");

    // The canvas takes back the panel's width and no more — the rail is still
    // beside it. Same shape as the open value with `--iconbar-col` for
    // `--rail-col`: 72px against 288px, where it used to be a flat 24px.
    expect(cssRule(styles, '.workspace-layout[data-rail-collapsed="true"]')).toContain(
      "--canvas-pad-left: calc(var(--fn-float-gap) * 2 + var(--iconbar-col));",
    );

    // Folded, the mark's row is a column of two — the mark, then the control
    // that unfolds it. The control stays visible: it is the only way back to
    // the panel, so a hover-only affordance would leave touch and keyboard
    // users with a rail that folds and does not unfold.
    expect(cssRule(styles, '.workspace-layout[data-rail-collapsed="true"] .shell-brand')).toContain(
      "flex-direction: column;",
    );
    expect(
      cssRule(styles, '.workspace-layout[data-rail-collapsed="true"] .shell-brand-title'),
    ).toContain("display: none;");
    expect(
      styles,
      "the unfold control stays reachable while folded",
    ).not.toContain('[data-rail-collapsed="true"] .rail-collapse');

    // The chrome is white paper on the canvas, and the rail's rows tint towards
    // the ink because a lift towards white would be invisible on it.
    expect(cssRule(styles, ".app-shell")).toContain("--fn-bg: #ffffff;");
    expect(cssRule(styles, ".preset-option-cell:hover")).toContain("background: var(--fn-row-wash);");
    // Selected is its own state now, not a copy of hover: the editor's
    // selection accent on the card's edge, so a column of cards reads at a
    // glance.
    expect(
      cssRule(styles, '.preset-option-cell:has(.preset-option[data-active="true"])'),
    ).toContain("border-color: var(--select-line);");
  });

  it("keeps saved-preview pickers icon-free and matched to the zoom readout", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const topbarControlRule = cssRule(styles, ".topbar-controls > .secondary-button,\n.topbar-controls .scenario-picker .ui-select,\n.topbar-controls .run-mode-picker .ui-select");
    const hoverRule = cssRule(styles, ".topbar-controls > .secondary-button:hover:not(:disabled),\n.topbar-controls .scenario-picker .ui-select:hover:not(:disabled),\n.topbar-controls .run-mode-picker .ui-select:hover:not(:disabled)");

    expect(appSource).not.toContain("<span>{copy.shell.topbar.runModeLabel}</span>");
    expect(appSource).not.toContain("<span>{copy.shell.topbar.scenarioLabel}</span>");
    // Every control in the topbar reads as the same control. These were 40px
    // tall with a visible border while the zoom readout beside them was 32px on
    // a plain inset fill, so the bar had two kinds of button in it.
    for (const declaration of ["height: 32px;", "border-radius: 8px;", "background: var(--surface-inset);"]) {
      expect(topbarControlRule, declaration).toContain(declaration);
    }
    // The zoom is a floating card of its own now, the same 32px tall.
    expect(cssRule(styles, ".zoom-control")).toContain("height: 32px;");
    expect(topbarControlRule).toContain("border: 1px solid transparent;");
    expect(hoverRule).toContain("background: color-mix(in srgb, var(--text-primary) 8%, transparent);");
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
    // No presence gate any more. An option that is on counts as selected even
    // when its component's own toggle is off, because picking the option is
    // what puts the component on the canvas — gating it on the component
    // already being there meant picking 名称标签 did nothing at all.
    expect(sidebarItems.some((item) => item.id === "sidebar-search")).toBe(true);
    expect(outputItems.some((item) => item.id === "output-source-artifact")).toBe(true);
    // Which is why deleting a column clears its contents as well: leaving them
    // on would re-mount the column that had just been deleted.
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
    // Structure precedes event flow, and within Structure the order is spatial
    // (left nav → chat area → composer → right panel).
    expect(indexOf("sidebar-visible")).toBeLessThan(indexOf("state:author.user"));
    expect(indexOf("output-visible")).toBeLessThan(indexOf("thinking-wave"));
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

  it("opens on two columns and a fold, with their contents unpicked", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    expect(markup).toContain('class="builder-surface" data-output-zone="generated-scaffold"');
    // Every column's presence toggle is on, so all three are there to be
    // configured; what goes *in* them is the reader's to pick.
    //
    // Two labels, not three: the right column opens folded. It is configured,
    // and nothing has been put in it yet — an empty column taking a third of the
    // page says less than a wider centre plus a control saying there is a column
    // here. That control is the float below, at the centre column's top right.
    expect(markup.match(/class="region-label"/g)?.length).toBe(2);
    for (const layer of ["左栏", "中栏"]) {
      expect(markup).toContain(layer);
    }
    expect(createInitialWorkspaceState("zh").rightCollapsed).toBe(true);
    expect(markup).toContain('class="rail-icon-btn preview-rail-float" data-side="right"');
    // Inside the centre column, not the frame: the frame's right edge is the
    // *right* column's edge whenever that column is open.
    expect(markup.indexOf('class="preview-stack')).toBeLessThan(
      markup.indexOf('data-side="right"'),
    );
    // The side columns' presence toggles, which create columns without mounting
    // anything, plus the composer.
    //
    // `chat` is off: a conversation is content, and content is the reader's to
    // pick. It was briefly on, which broke once the configurator opened on 空白 —
    // the replay streams one fixed full turn whatever is picked, so an enabled
    // conversation put the whole exchange on a deliberately empty canvas.
    expect(emptyStructureProject.layout.slots.filter((slot) => slot.enabled).map((slot) => slot.id))
      .toEqual(["sessions", "composer", "output"]);

    // The sidebar's "Content" section starts unpicked — the column is present,
    // its contents are not chosen. Same rule as the slots, and it covers every
    // part of the column: the title, the collapse control and the conversation
    // rows used to arrive with the component, so picking one thing put four on
    // the canvas.
    expect(emptyStructureProject.sidebar).toEqual({
      title: false,
      collapse: false,
      newButton: false,
      search: false,
      sessionList: false,
      // New: a mark in front of each row, which only 游戏风 opens with.
      rowIcon: false,
      grouping: false,
      footer: false,
    });
    expect(markup).not.toContain("session-new");
    expect(markup).not.toContain("session-footer");
    expect(markup).not.toContain("session-brand-name");
    expect(markup).not.toContain("session-collapse");
    expect(markup).not.toContain("session-list");
    // With no header row, whatever is picked next needs the top spacing that
    // row used to provide — a list against the frame's edge reads as clipped.
    expect(
      cssRule(readFileSync(new URL("./styles/app.css", import.meta.url), "utf8"), '.session-sidebar[data-header="none"]'),
    ).toContain("padding-top: 40px;");

    // No welcome state either. It used to be inferred from an empty timeline,
    // which is also what an unconfigured canvas looks like, so a new project
    // opened on a greeting nobody had written. It is asked for now — the
    // greeting field lights it up while it is being edited.
    expect(createInitialWorkspaceState("zh").welcomeActive).toBe(false);
    expect(markup).not.toContain('data-welcome="true"');

    // And the composer sits on the stack's last row, so with no conversation
    // above it it stays at the bottom of the column instead of taking the 1fr
    // row and floating in the middle.
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    expect(
      cssRule(styles, '.preview-stack:not([data-welcome="true"]) > .composer-frame'),
    ).toContain("grid-row: 2;");
  });

  it("keeps the centre column when it is empty, but not the side ones", () => {
    // A side column with nothing in it is gone, so unticking 显示侧边栏 removes
    // it and the centre takes the width — that is what makes the canvas
    // toolbar's delete mean something. The centre is the exception: it cannot be
    // deleted, so an empty centre still has to read as the place a conversation
    // will go, which needs an element to hold the width open.
    const emptied = {
      ...emptyStructureProject,
      layout: {
        ...emptyStructureProject.layout,
        slots: emptyStructureProject.layout.slots.map((slot) => ({ ...slot, enabled: false })),
      },
    };
    expect(emptied.layout.regions).toContain("sidebar");
    expect(emptied.layout.regions).toContain("right-panel");
    // Presence is region AND content, so the declared-but-empty side regions
    // do not render. Asserted on the rule rather than the markup because App
    // owns its own project state.
    const regionHasContent = (region: string) =>
      emptied.layout.regions.includes(region as never) &&
      emptied.layout.slots.some((slot) => slot.enabled && slot.region === region);
    expect(regionHasContent("sidebar")).toBe(false);
    expect(regionHasContent("right-panel")).toBe(false);
    expect(emptied.layout.regions).toContain("main");
  });

  it("opens the rail on Structure, with the layer list a destination beside it", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    // 图层 is the first destination and Structure is the one that opens: the
    // list is an inventory of what is on the canvas, so on an empty project it
    // has the least to say.
    expect(markup).toContain('data-nav-section="structure" data-active="true"');
    expect(markup).not.toContain('data-nav-section="file"');
    // Still five destinations, and Theme is not one of them: 图层, Structure,
    // Components, Model, Git. The palettes went to the canvas's panel, next to
    // the style they recolour.
    expect(markup.match(/class="nav-section-tile"/g)?.length).toBe(5);
    for (const section of ["layers", "structure", "git"]) {
      expect(markup).toContain(`data-nav-section="${section}"`);
    }
    expect(markup).not.toContain('data-nav-section="theme"');
    // The style picker is in the canvas's panel, not the rail.
    //
    // It has had three homes: inside the rail's Theme destination, where
    // picking a whole style sat three clicks inside "assemble one part at a
    // time"; a floating card centred over the canvas, which put the product's
    // second entry path on top of its output; and now the card at the top
    // right, opposite the rail, with the palettes under it.
    expect(markup).not.toContain('class="style-bar"');
    // The panel is open on first paint and the cards are in it, so *it* is the
    // picker's home now; the chip is the same list collapsed, for when the
    // panel is closed.
    expect(markup).toContain('class="topbar-panel"');
    expect(markup).toContain('class="style-cards"');
    const railStart = markup.indexOf('class="preset-nav"');
    const panelStart = markup.indexOf('class="topbar-panel"');
    expect(railStart).toBeGreaterThan(-1);
    expect(panelStart).toBeGreaterThan(-1);
    expect(panelStart).toBeLessThan(railStart);
    // Hidden styles stay in the schema but out of the picker. Closed, the chip
    // names one style and the rest are behind it, so this holds over the menu's
    // markup once it is open — the list both shapes render is the same one.
    expect(markup).not.toContain('data-style="workbuddy"');
    expect(markup).not.toContain('data-style="illustrated"');
  });

  it("opens named, with the name editable and shown on the canvas", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    // The panel title is `project.name` — the same value the canvas shows as
    // the product's brand, and the one the export turns into the package name.
    // A real default rather than a placeholder: an unnamed project would put
    // "未命名" on the canvas, which is not a name anyone would ship.
    expect(markup).toContain('class="layers-panel-title"');
    expect(markup).toContain(">My Agent<");
    expect(emptyStructureProject.name).toBe("My Agent");
    // A button, so it is reachable by keyboard and reads as editable. It used to
    // be a <span>.
    expect(markup).toMatch(/<button[^>]*class="layers-panel-title"/);
  });

  it("styles the name field with the selection orange and the rail's hover fill", () => {
    // Two borrowed tokens, on purpose: hovering the name should look like
    // hovering an icon tile, and editing it should look like a selection on the
    // canvas. Hardcoded here because a drift in either would make the name look
    // like a different kind of control than it is.
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const ruleFor = (selector: string) => cssRule(styles, selector);
    const hoverRule = ruleFor(".layers-panel-title:hover");
    expect(hoverRule).toContain("color-mix(in srgb, var(--text-primary) 6%, transparent)");
    expect(ruleFor(".nav-section-tile:hover .nav-section-glyph")).toContain(
      "color-mix(in srgb, var(--text-primary) 6%, transparent)",
    );

    const inputRule = ruleFor(".layers-panel-title-input");
    expect(inputRule).toContain("border: 1px solid var(--select-line);");
    expect(ruleFor(".layers-panel-title-input::selection")).toContain("var(--select-fill)");

    // Label and field share padding and type so the row does not jump when it
    // swaps.
    // line-height included deliberately: `normal` resolves differently for a
    // button than for an input, which made the row jump 3px on click.
    for (const declaration of [
      "padding: 3px 6px;",
      "font-size: 14px;",
      "font-weight: 620;",
      "line-height: 20px;",
    ]) {
      expect(ruleFor(".layers-panel-title")).toContain(declaration);
      expect(inputRule).toContain(declaration);
    }
  });

  it("keeps the conversation list rendering when Pi has nothing to list", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const sidebar = readFileSync(
      new URL("./components/agent-preview/SessionSidebar.tsx", import.meta.url),
      "utf8",
    );

    /*
     * 内容模块 and Row marks had no visible effect, and the reason was two
     * steps away from either of them.
     *
     * `SessionSidebar` draws nothing for an empty list — `hasSessions` is
     * `sessionList && sessions.length > 0` — and the list's data source used
     * to switch on `runMode === "pi"` alone. Pi mode is entered by clicking
     * 新建对话 or a conversation row, and a fresh conversation has no events
     * yet, so it is filtered out of `piSessionItems`. One click put the canvas
     * in a mode whose list was empty, and from then on the project said "show
     * the list" while the canvas had no list to show. Row marks went with it:
     * the marks are drawn per row, so no rows means no marks.
     *
     * The canvas is a design surface before it is a runtime one. A module the
     * reader has switched on has to render.
     */
    expect(sidebar).toContain("const hasSessions = sessionList && sessions.length > 0;");
    expect(app).toContain("const hasPiSessions = state.runMode === \"pi\" && piSessionItems.length > 0;");
    for (const prop of [
      "activeSessionPrompt: hasPiSessions ?",
      "sessionPrompts: hasPiSessions ?",
      "activeSessionId: hasPiSessions ?",
      "sessionItems: hasPiSessions ?",
    ]) {
      expect(app, `${prop} must gate on listability, not on the run mode`).toContain(prop);
    }

    /*
     * And the click routes on whether the row *is* a Pi conversation. While Pi
     * has nothing to list the rows are demo rows, and handing one of their ids
     * to `selectPiConversation` would select a conversation that does not
     * exist — a row that looks live and does nothing, which is the failure
     * this file already carries a note about further down.
     */
    expect(app).toContain("if (piSessionItems.some((item) => item.id === id)) {");
  });

  it("keeps the closed card to the controls that cannot wait", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const controls = topbarControls(markup);

    // The row's order, open or closed: the panel toggle first, export last,
    // and the two previews adjacent between them — cheap look before expensive
    // run, which is also the order a reader reaches for them in.
    expect(controls).toContain("topbar-panel-toggle");
    expect(controls.indexOf("topbar-panel-toggle")).toBeLessThan(controls.indexOf("topbar-ui-preview-button"));
    expect(controls.indexOf("topbar-ui-preview-button")).toBeLessThan(controls.indexOf("topbar-preview-button"));
    expect(controls.indexOf("topbar-preview-button")).toBeLessThan(controls.indexOf("topbar-deploy-button"));

    /*
     * What the *closed* card owes, asserted at the source rather than by
     * rendering it: the panel opens on first paint now, and `App` takes no
     * props to override that — a prop that exists only so a test can close the
     * card would be API invented for the test.
     *
     * Two contracts, both one line in `Topbar`: the chip is drawn only while
     * the panel is closed (open, the cards in the panel are the same list, and
     * drawing both put it on screen twice).
     */
    const topbarSource = readFileSync(new URL("./app/view/Topbar.tsx", import.meta.url), "utf8");
    expect(topbarSource).toContain("{panelOpen ? null : styleChip}");
    // The zoom left the panel for the canvas's top right, so folding the
    // panel no longer takes it off screen.
    expect(topbarSource).not.toContain("<ZoomControl");

    /*
     * And the panel is mounted in both states, hidden by CSS.
     *
     * It used to be `{panelOpen ? (…) : null}`, which is why the card snapped:
     * there is no transition to run on an element that stops existing. The
     * fold runs on `grid-template-rows` and `visibility` now, and both need
     * the row present while it is closed — so the conditional mount is the
     * thing this asserts the absence of.
     */
    expect(
      topbarSource,
      "the panel must stay mounted or the fold cannot animate",
    ).not.toContain("{panelOpen ? (");
    expect(topbarSource).toContain('aria-hidden={panelOpen ? undefined : true}');

    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    // Closed it is hidden rather than absent, and `visibility` — not opacity
    // alone — is what keeps its cards and zoom control out of the tab order.
    expect(cssRule(styles, ".topbar-panel")).toContain("visibility: hidden;");
    expect(cssRule(styles, '.topbar[data-open="true"] .topbar-panel')).toContain(
      "visibility: visible;",
    );
    // Two curves, one per direction, matching the rail across the canvas: the
    // card eases back on the way open and plainly on the way closed.
    expect(cssRule(styles, '.topbar[data-open="true"]')).toContain(
      "grid-template-rows var(--motion-rail-out) var(--ease-back)",
    );
    expect(cssRule(styles, ".topbar")).toContain(
      "grid-template-rows var(--motion-rail-in) var(--ease-out)",
    );
  });

  it("lifts the picked colourway instead of ringing it", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    /*
     * The ring came out with a slice missing, and the reason was two rules
     * apart.
     *
     * `outline: 2px` at `outline-offset: 1px` reaches 3px outside the pill,
     * and the pill lives inside `.style-card-body-inner`, whose
     * `overflow: hidden` is what lets the card fold — at `padding: 2px` it
     * clipped the last pixel. Measured in the browser: 2px of room for a 3px
     * ring.
     */
    const inner = cssRule(styles, ".style-card-body-inner");
    expect(inner).toContain("overflow: hidden;");
    expect(inner, "the clip must leave room for whatever the pick draws").toContain(
      "padding: 4px 4px 0;",
    );

    /*
     * And the pick is a lift now, not an outline — no `outline` at all, so
     * there is nothing whose offset can be clipped again.
     */
    const picked = cssRule(styles, ".style-card-swatch[data-active]");
    expect(picked, "the pick must not go back to an outline").not.toContain("outline:");
    expect(picked).toContain("background: var(--fn-bg);");
    expect(picked).toContain("box-shadow:");

    /*
     * The unselected chips carry a faint well, and that is load-bearing: the
     * card is `#ffffff`, so a white selected chip is invisible as a *fill*
     * and the whole selection would rest on its 1px hairline — the outline
     * idiom again, one rule further down. Measured: card background
     * `rgb(255,255,255)`, chip background the same, before this.
     */
    expect(
      cssRule(styles, ".style-card-swatch"),
      "without a well, the lifted chip has nothing to be lifted out of",
    ).toContain("background: color-mix(in srgb, var(--text-primary) 3%, transparent);");
  });

  it("draws the layer tree as an axis, solid above the picked row", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    const panel = readFileSync(new URL("./app/view/LayersPanel.tsx", import.meta.url), "utf8");

    /*
     * ─── The length comes from the component ───
     *
     * The solid stretch runs from a column's mark to the picked row and has to
     * *grow* between picks. A per-row `border-style` flip — which is what this
     * was first — cannot animate, and CSS has no expression for "the distance
     * to my selected sibling". So the index crosses the boundary and every
     * length is derived from it here.
     *
     * `data-axis` is separate from the index because 0 is a real answer: the
     * first row picked. Without it an unset axis and a pick on row 0 would be
     * the same declaration.
     */
    expect(panel).toContain('"--axis-index"');
    expect(panel).toContain('data-axis={');
    expect(cssRule(styles, '.layers-children[data-axis="on"]::after')).toContain(
      "height: calc(var(--axis-index) * var(--axis-pitch) + var(--axis-row) / 2);",
    );
    // Half a row on the end is what lands the line on the bead's centre rather
    // than at the top of its row. Verified in a browser: height 101px against
    // a bead centre measured at 101px from the list's top.
    expect(cssRule(styles, ".layers-children::after")).toContain("height: 0;");

    /*
     * ─── One curve for the line's end and the cursor ───
     *
     * Both are linear functions of the same `--axis-index`, so sharing the
     * curve *and* the duration is what keeps them together through the
     * overshoot — the whole point of the spring. Give the line
     * `--motion-slow` and the cursor `--axis-slide` and the tip arrives while
     * the bead is still springing, which reads as the line being broken.
     */
    expect(cssRule(styles, ".layers-children::after")).toContain(
      "transition: height var(--axis-slide) var(--axis-spring);",
    );
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-slide: 340ms;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-spring: cubic-bezier(");

    /*
     * ─── The rows are pinned, or the line misses ───
     *
     * `--axis-pitch` has to be exact: a content-sized row is a different
     * height per font and per locale, and the error compounds down the list.
     */
    /*
     * ─── A column and its rows are one block ───
     *
     * `--axis-gap` is the 1px between rows and `--axis-pitch` is built from
     * it, so the air between *blocks* is a separate token: at 1px the last row
     * of 左栏 sat against the 中栏 heading with nothing to say they were
     * different things, and each axis's dotted tail had nowhere to end.
     *
     * Applied on `.layers-panel`'s rule only. The unscoped `.layers-list`
     * keeps its 1px for the Structure and Components group lists, whose rows
     * are a flat run rather than blocks — and whose `list-style: none` lives
     * there too (see that rule's note).
     */
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-block-gap: 12px;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("gap: var(--axis-block-gap);");
    expect(cssRule(styles, ".layers-list"), "the shared list keeps its tight gap").toContain(
      "gap: 1px;",
    );
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-row: 28px;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain(
      "--axis-pitch: calc(var(--axis-row) + var(--axis-gap));",
    );
    // Asserted against the stylesheet rather than through `cssRule`: both
    // levels are pinned by one declaration on a two-selector rule, and
    // `cssRule` keys on "<selector> {".
    expect(styles).toContain(
      ".layers-panel .layers-list > li > .layers-row,\n.layers-row--child {\n  height: var(--axis-row);",
    );

    /*
     * ─── The elbow ───
     *
     * Two borders and one corner radius: the stroke leaves the column's mark
     * horizontally, rounds, and arrives vertical on the line. It reaches up out
     * of the first row by half a row plus the gap, which is where the mark
     * above it sits — both measured from `--axis-row`, so they cannot drift.
     */
    const elbow = cssRule(styles, ".layers-children > li:first-child::before");
    expect(elbow).toContain("border-top-right-radius: var(--axis-r);");
    // Half a row up, less half a pixel: that centres the 1px arm *on* the
    // column row's middle instead of hanging it below the middle.
    expect(elbow).toContain(
      "top: calc(-1 * (var(--axis-row) / 2 + var(--axis-gap)) - 0.5px);",
    );
    // Its width is asserted further down, with the rest of the column's
    // pixel arithmetic — the `border-right`-lands-inside-the-box problem.
    // Dashed until the column holds the pick, like the line it feeds.
    expect(elbow).toContain("border-top: 1px dashed var(--axis-line-faint);");
    expect(
      cssRule(styles, '.layers-children[data-axis="on"] > li:first-child::before'),
    ).toContain("border-top: 1px solid var(--axis-line);");

    /*
     * ─── A column sits to the left of the rows it contains ───
     *
     * Two things fought over this. The elbow's arm runs at the row's middle,
     * so a label too far left got its first glyph crossed — seen in a
     * screenshot, not reasoned about. Pushing the label right past the line
     * fixed that and lost the hierarchy: both levels landed on 58px and a
     * parent read like its own children.
     *
     * Settled by moving the collision out of the type and into the geometry:
     * the label sits at `--axis-x`, 14px left of the rows, and the elbow's
     * radius is what keeps the stroke off it. The label may share the line's
     * column because the line starts *below* this row.
     *
     * `--axis-pad` is scoped to the list rather than set on `.layers-row`,
     * which the Components destination's group rows share and which keeps its
     * own 22px.
     */
    const columnRow = cssRule(styles, ".layers-panel .layers-list > li > .layers-row");
    expect(columnRow, "a column must sit left of its rows").toContain(
      "padding-left: var(--axis-pad);",
    );
    expect(columnRow).toContain("gap: calc(var(--axis-x) + 14px - var(--axis-pad) - 14px);");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-pad: 22px;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain(
      "--axis-stem: calc(var(--axis-pad) + 7px);",
    );
    /*
     * The radius is load-bearing, not decoration: it is what gets the stroke
     * below the label's glyphs before it reaches them. For the arc on a box
     * ending at `--axis-x` + 1, the height at the label's own start is
     * `rowMid − 0.5 + r − √(2r − 1)` — so r is the only dial, and CSS clamps
     * it to the box, which is why `--axis-pad` is 4px: a mark further left
     * makes the elbow wider and raises the cap.
     *
     *     r =  8  →  rowMid + 3.6
     *     r = 10  →  rowMid + 5.1   ← grazed a 12px glyph (ink ≈ ±6)
     *     r = 15  →  rowMid + 9.1   ← measured 8px of clearance
     */
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-r: 13px;");

    /*
     * ─── Paint order ───
     *
     * The lines are pseudo-elements on the list and the beads are
     * pseudo-elements on the rows inside it — and a list's `::after` paints
     * *after* every one of its real children. So the solid line was drawn
     * over the beads and over the cursor: the beads read as sitting behind
     * the axis and the cursor had a stroke through it. Reported from a
     * screenshot, which is the only place a paint-order bug shows up.
     */
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-z-line: 0;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-z-bead: 1;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-z-cursor: 2;");
    for (const [selector, token] of [
      [".layers-children::before", "--axis-z-line"],
      [".layers-children::after", "--axis-z-line"],
      [".layers-children > li:first-child::before", "--axis-z-line"],
      [".layers-children > li:first-child::after", "--axis-z-cursor"],
      [".layers-row--child::before", "--axis-z-bead"],
    ] as const) {
      expect(cssRule(styles, selector), `${selector} must declare its layer`).toContain(
        `z-index: var(${token});`,
      );
    }

    // The dotted line is the full length, always; the solid one is over it.
    // Its colour is asserted with the rest of the axis's tokens below.
    expect(cssRule(styles, ".layers-children::before")).toContain("left: var(--axis-x);");
    expect(cssRule(styles, ".layers-children::after")).toContain("left: var(--axis-x);");

    // Beads replace both levels' icons rather than sitting beside them.
    expect(cssRule(styles, ".layers-row--child .layers-row-icon")).toContain("display: none;");
    /*
     * The mark replaces the glyph **only on a column that has children**.
     *
     * It is the start of the elbow — it exists so the axis has something to
     * descend from. On an untouched project there are no children and so no
     * axis, and an unscoped rule left an orphaned tick sitting in the 22px
     * gutter it had reserved for a line that was not there. An empty column
     * keeps its own glyph; alignment does not move, since the glyph sits in
     * the same 14px box.
     */
    expect(
      cssRule(styles, ".layers-panel .layers-list > li:has(.layers-children) > .layers-row > .layers-row-icon > svg"),
      "an empty column must keep its glyph",
    ).toContain("display: none;");
    expect(
      cssRule(styles, ".layers-panel .layers-list > li:has(.layers-children) > .layers-row > .layers-row-icon::before"),
    ).toContain("border-radius: 50%;");

    /*
     * And the count renders at zero, quietly. Hidden below one, an untouched
     * project's columns carried no information at all: three identical rows,
     * no numbers, and a mark that only means something once there is an axis
     * under it.
     */
    const panelSource = readFileSync(new URL("./app/view/LayersPanel.tsx", import.meta.url), "utf8");
    expect(panelSource, "the count must render at zero").toContain(
      'data-empty={layer.children.length === 0 ? "true" : undefined}',
    );
    const emptyCount = cssRule(styles, '.layers-row-count[data-empty="true"]');
    expect(emptyCount).toContain("background: transparent;");
    expect(emptyCount).toContain("color: var(--text-muted);");
    /*
     * ─── Everything round centres on the line's centre, not its left edge ───
     *
     * `--axis-x` is where the 1px stroke *starts*: it occupies
     * [44, 45), so its centre is 44.5. Centring the beads on `--axis-x` put
     * every one of them half a pixel left of the line it sits on — which at 2×
     * reads as the line running along one side of the dot instead of through
     * it, and so as the line being painted over the dot. Measured: bead span
     * [41.5, 47.5), centre 44.5; line [44, 45), centre 44.5; difference 0.
     */
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain(
      "--axis-mid: calc(var(--axis-x) + 0.5px);",
    );
    for (const round of [
      ".layers-row--child::before",
      ".layers-children > li:first-child::after",
    ]) {
      expect(cssRule(styles, round), `${round} must centre on the line`).toContain(
        "left: calc(var(--axis-mid) - 3px);",
      );
      expect(cssRule(styles, round)).toContain("width: 6px;");
    }

    /*
     * And the elbow's descent lands in the line's own column. A
     * `border-right` is drawn inside its box, so the box has to end at
     * `--axis-x` + 1 — ending it at `--axis-x` left the elbow one pixel to the
     * line's left, which is a jog at the join.
     */
    const elbowRule = cssRule(styles, ".layers-children > li:first-child::before");
    expect(elbowRule, "the elbow must descend in the line's column").toContain(
      "width: calc(var(--axis-x) + 1px - var(--axis-stem) - 2.5px);",
    );
    /*
     * And `border-box` is load-bearing, not tidiness.
     *
     * Without it `width` is the *content* width and the 1px `border-right` is
     * added outside it, so the arm painted one pixel right of the line. Both
     * reported `[44, 45)` in `getComputedStyle`; the offset only appeared in
     * the rendered pixels, read off a 12× capture — arm [53, 54) against line
     * [52, 53). Drop this declaration and the measurement comes back.
     */
    expect(elbowRule, "without border-box the elbow paints a pixel off").toContain(
      "box-sizing: border-box;",
    );

    /*
     * ─── The dotted stretch sets its own rhythm ───
     *
     * `border-left: 1px dashed` has a fixed ~2-on-2-off pattern, which reads
     * as a solid hairline — so the only dial was the colour, and the line
     * could be heavy (at `--border-subtle`) or invisible (at 6%) and nothing
     * useful between. A gradient makes the rhythm the dial instead: sparse
     * dashes, and a colour a reader can see.
     */
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-dash: 2px;");
    expect(cssRule(styles, ".layers-panel .layers-list")).toContain("--axis-dash-gap: 4px;");
    const dotted = cssRule(styles, ".layers-children::before");
    expect(dotted).toContain("repeating-linear-gradient(");
    expect(dotted).toContain("var(--axis-line-faint) 0 var(--axis-dash),");
    // Newline plus the rule's own indent, so this matches the *declaration*
    // and not the sentence in the comment above it explaining why it is gone.
    expect(dotted, "a border-dashed line cannot set its own rhythm").not.toContain(
      "\n  border-left: 1px dashed",
    );

    /*
     * ─── The solid line is opaque ───
     *
     * Mixed against the card's background, not against `transparent`. The
     * dotted stretch runs the full height with the solid one painted over it,
     * so a translucent solid let the dashes show through: measured 147 against
     * 124 on the "solid" segment — a 23-level ripple on the dash period.
     */
    expect(
      cssRule(styles, ".layers-panel .layers-list"),
      "a translucent axis line bands over the dotted one beneath it",
    ).toContain("--axis-line: color-mix(in srgb, var(--text-primary) 45%, var(--fn-bg));");

    /*
     * And the beads on the solid stretch drop their ring.
     *
     * The 2px background ring is what makes a bead sit on top of the line, and
     * over the solid stretch it read as a break: the dark line came out as a
     * column of dashes, which is exactly what the dotted stretch below it was
     * supposed to be. Measured in the browser before and after.
     */
    expect(
      cssRule(styles, '.layers-children > li:has(~ li .layers-row[data-active="true"]) .layers-row--child::before'),
      "beads above the pick must join the line, not break it",
    ).toContain("box-shadow: none;");

    /*
     * ─── The labels take the same three steps as the axis ───
     *
     * The line said it — solid above the pick, dotted below — but every label
     * sat at `--text-muted` regardless, so the type flattened the distinction
     * the axis was drawing. There are exactly three text tokens and exactly
     * three states, which is the whole mapping: primary for the picked row,
     * secondary above it, muted below.
     */
    expect(
      cssRule(styles, '.layers-children > li:has(~ li .layers-row[data-active="true"]) .layers-row--child'),
      "rows above the pick must read darker than rows below it",
    ).toContain("color: var(--text-secondary);");
    // And hover stays one step ahead of wherever the row rests: a row already
    // at `--text-secondary` would otherwise answer the pointer with the colour
    // it is wearing — the exact bug the cancelled hover had.
    expect(
      cssRule(styles, '.layers-children > li:has(~ li .layers-row[data-active="true"]) .layers-row--child:hover'),
    ).toContain("color: var(--text-primary);");

    /*
     * ─── The picked bead is one cursor that slides ───
     *
     * It was a per-row bead turned orange, so picking another row
     * extinguished one element and lit another — there is nothing to animate
     * between two elements. One cursor, translated by the same
     * `--axis-index` the line reads, slides. `translateY` rather than `top`
     * so it is composited and stays smooth beside the line's height
     * animation.
     */
    const cursor = cssRule(styles, ".layers-children > li:first-child::after");
    expect(cursor).toContain("background: var(--select-color);");
    expect(cursor, "the cursor and the line must share one curve").toContain(
      "transition: transform var(--axis-slide) var(--axis-spring),",
    );
    // Opacity stays flat: a bouncing fade on first pick reads as a flicker.
    expect(cursor).toContain("opacity var(--motion-base) var(--ease-out);");
    expect(cssRule(styles, '.layers-children[data-axis="on"] > li:first-child::after')).toContain(
      "transform: translateY(calc(var(--axis-index) * var(--axis-pitch)));",
    );
    // The row's own bead steps aside, hidden rather than recoloured: two
    // orange beads would be on screen together for the length of the slide.
    expect(cssRule(styles, '.layers-row--child[data-active="true"]::before')).toContain(
      "background: transparent;",
    );
    // And nothing may put `position` back on the rows: the cursor and the
    // elbow both resolve against the list, where the arithmetic is.
    expect(
      styles,
      "layer rows must stay unpositioned so the cursor resolves against the list",
    ).not.toContain(".layers-children > li {\n  position: relative;");

    /*
     * ─── Hover answers the pointer ───
     *
     * The child rows' hover used to be written as `transparent` and
     * `--text-muted` — their own resting values — to cancel the shared
     * `.layers-row:hover`. Nothing responded until a click, so the rows read
     * as labels rather than controls.
     */
    const childHover = cssRule(styles, ".layers-row--child:hover");
    expect(childHover, "child rows must answer the pointer").toContain(
      "background: var(--fn-row-wash);",
    );
    expect(childHover).not.toContain("background: transparent;");

    /*
     * And the cursor says so too.
     *
     * This row carried `cursor: default` while calling `onSelectSlot` — the
     * third declaration in this one block written as if the row were a label:
     * the hover that cancelled itself, the arrow cursor, and the bead that had
     * no hover state. The rows are controls; all three now say it.
     */
    // Anchored on the padding rather than through `cssRule`: two rules match
    // ".layers-row--child {" — this one and the shared height above it — and
    // `cssRule` keys on the first.
    const childRuleStart = styles.indexOf("  padding-left: calc(var(--axis-x) + 14px);");
    expect(childRuleStart).toBeGreaterThan(-1);
    expect(
      styles.slice(childRuleStart, styles.indexOf("\n}", childRuleStart)),
      "a row that selects something must not show an arrow",
    ).toContain("cursor: pointer;");
    expect(cssRule(styles, ".layers-row--child:hover::before")).toContain(
      "transform: translateY(-50%) scale(1.2);",
    );
    // All three legs on the bead, or the growth snaps while the colour fades.
    // The growth springs; the colours do not — a bouncing tint is a flicker.
    expect(cssRule(styles, ".layers-row--child::before")).toContain(
      "transform var(--motion-base) var(--axis-spring);",
    );

    // Reduced motion keeps the glide and drops the spring. Not `none`: the
    // cursor would then jump between rows, and a jump is harder to follow
    // than a glide — worse for the reader who asked for less motion.
    const calm = styles.slice(styles.indexOf("@media (prefers-reduced-motion: reduce) {\n  .layers-list"));
    expect(calm).toContain("--axis-slide: 120ms;");
    expect(calm).toContain("--axis-spring: var(--ease-out);");

    /*
     * ─── A column is a heading ───
     *
     * Both levels sat at 12px / 400 in neighbouring greys, so 左栏 and
     * 展示标题 carried the same weight on screen while one contains the other.
     */
    const head = cssRule(styles, ".layers-panel .layers-list > li > .layers-row");
    expect(head).toContain("color: var(--text-primary);");
    /*
     * Small, tracked and heavy — a section header, which is what the reference
     * makes of it. Size is the other half of the elbow's clearance (see
     * `--axis-r`): the curve passes under these glyphs, and an 11px CJK
     * character's ink reaches ~5.5px below the row's middle where a 12px one
     * reaches 6. Tracking is what keeps it reading as a heading once the size
     * comes down.
     */
    expect(head).toContain("font-size: 13px;");
    expect(head).toContain("font-weight: 700;");
    expect(head).toContain("letter-spacing: 0.02em;");
  });

  it("folds the canvas panel to an icon column opposite the rail", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const folded = ".workspace-layout .topbar:not([data-open])";

    /*
     * Folded, this card is the rail's opposite number and has to read as one:
     * same width, same full height, same curves. It used to fold to a short
     * row at the top right, which left the two sides of the canvas folding
     * into different shapes.
     *
     * Not scoped to a surface. It was `[data-mode="builder"]`-only, because
     * `saved-preview` put the run-mode and scenario pickers in the same row
     * and a 56px column has no room for them — so that surface kept the short
     * card and folded into a different shape from the builder's. The pickers
     * are a section inside the panel now (`Topbar.tsx`), which is what lets
     * one fold serve both: measured at 1600px, both surfaces fold to a 56px
     * column 934px tall with Export at the bottom.
     */
    const rule = cssRule(styles, folded);
    expect(rule).toContain("width: var(--iconbar-col);");
    expect(rule).toContain("bottom: var(--fn-float-gap);");
    expect(rule).toContain("width var(--motion-rail-in) var(--ease-out)");
    // The control row takes the height, which is what lets Export sit at the
    // bottom of the card instead of under the last icon.
    expect(rule).toContain("grid-template-rows: minmax(0, 1fr) 0fr;");
    expect(cssRule(styles, `${folded} .topbar-controls`)).toContain("flex-direction: column;");
    expect(cssRule(styles, `${folded} .topbar-deploy-button`)).toContain("margin-top: auto;");

    /*
     * `min-width` as well as `width` on the folded Export button.
     *
     * `.primary-button.topbar-deploy-button` carries `min-width: 64px`, which
     * won against `width: 36px` alone and left the button hanging 4px out of a
     * 56px card. Measured in the browser, not reasoned about — which is why
     * this is asserted rather than trusted.
     */
    expect(
      cssRule(styles, `${folded} .topbar-deploy-button`),
      "the folded Export button must beat .primary-button's min-width",
    ).toContain("min-width: 0;");

    // The style reads as a tile — thumbnail over label — because that is the
    // shape the rail's destinations have across the canvas.
    expect(cssRule(styles, `${folded} .style-chip`)).toContain("flex-direction: column;");
    expect(cssRule(styles, `${folded} .style-chip-caret`)).toContain("display: none;");

    // Glyph hidden by default, not hidden-when-open: every surface that is not
    // this folded card keeps the button as it was, the word and nothing beside
    // it.
    expect(cssRule(styles, ".topbar-deploy-glyph")).toContain("display: none;");
    expect(cssRule(styles, `${folded} .topbar-deploy-glyph`)).toContain("display: inline-flex;");

    // And the canvas leaves the column room, the mirror of the rail's own
    // folded gutter. Without this the canvas's card slid under the column.
    expect(
      cssRule(styles, ".workspace-layout:not([data-layers-open])"),
    ).toContain("--canvas-pad-right: calc(var(--fn-float-gap) * 2 + var(--iconbar-col));");

    // 编辑 UI/UX survives the fold as its gear, the same glyph/label split
    // Export uses: it is the way back to the builder, so on `saved-preview` it
    // is the control that must not disappear into the panel.
    expect(cssRule(styles, `${folded} .topbar-edit-button`)).toContain("width: 36px;");
    expect(cssRule(styles, `${folded} .topbar-edit-label`)).toContain("display: none;");
  });

  it("keeps the run-preview panel to controls that surface can actually change", () => {
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("./app/view/Topbar.tsx", import.meta.url), "utf8");

    /*
     * 选择风格 was handed to both surfaces by one `panelSections` prop, and on
     * the run preview it could not work: the canvas there renders
     * `activeProject` — `state.savedProject`, the snapshot taken on entry —
     * while `applyStyle` writes `project`. Measured in the browser: applying a
     * different card left `data-style-preset="native"` on the preview frame
     * and restyled the project *behind* it, which is worse than inert.
     */
    expect(app).toContain('state.surfaceMode !== "builder" ? null : (');

    // What that panel carries instead: the two controls that do belong to a
    // run. They are also why they are not in the control row — see the
    // shear measurements on `.topbar-controls`' wrap guard.
    expect(topbar).toContain("topbar-run-section");
    expect(topbar).toContain("copy.shell.topbar.runModeLabel");
    expect(topbar).toContain('runMode === "replay" ? (');
  });

  it("puts every style in the folded column, and sends the chip to the panel", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const picker = readFileSync(new URL("./app/view/StylePicker.tsx", import.meta.url), "utf8");
    const topbar = readFileSync(new URL("./app/view/Topbar.tsx", import.meta.url), "utf8");
    const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    /*
     * Switching style was the one thing the folded card had no way to do and
     * no shortcut for: the chip named the style being worn, and everything
     * that could change it was in the panel the card had just folded. A 56px
     * column has room for the whole list as plates, so it carries them.
     */
    expect(topbar).toContain("{panelOpen ? null : styleRail}");
    expect(picker).toContain("export function StyleRailThumbs");
    // Plates for every style the picker offers, not a hand-picked few.
    expect(picker).toContain("styleCardOptions.map");
    // Named, not just pictured. Six plates at 36px are six small pictures, and
    // which is 水墨 and which is 复古 is not a question a thumbnail answers —
    // a tooltip answers it one at a time, which is no use when the reason to
    // look at the column is to compare.
    expect(picker).toContain('<span className="style-rail-name">{label}</span>');

    /*
     * And a tile unfolds the panel rather than applying the style.
     *
     * It applied directly for one round. Switching style brings the style's
     * own components with it, the cards carry an Apply button precisely so
     * that is deliberate, and a 36px target in a column you are scrolling is
     * the easiest thing in the product to hit by accident. So the column is an
     * index, and `onApply` is not among its props at all — there is nothing
     * here that could switch a style by mistake.
     */
    expect(picker).toContain("onClick={onExpand}");
    // Bounded to the function: `StyleCards` below it does apply styles, and a
    // slice that ran to the end of the file would always find its `onApply`.
    const railStart = picker.indexOf("export function StyleRailThumbs");
    const railEnd = picker.indexOf("export function", railStart + 1);
    expect(railStart).toBeGreaterThan(-1);
    expect(railEnd).toBeGreaterThan(railStart);
    expect(
      picker.slice(railStart, railEnd),
      "the style column must not be able to apply a style",
    ).not.toContain("onApply");
    // `aria-pressed` would claim the button toggles the style. It opens a
    // panel; the worn one is named with `aria-current` instead.
    expect(picker).toContain('aria-current={active ? "true" : undefined}');

    // It is the segment that takes the slack, so it is the one that scrolls:
    // the tiles outgrow a short window where the fixed controls cannot.
    const rail = cssRule(styles, ".style-rail");
    expect(rail).toContain("overflow-y: auto;");
    expect(rail).toContain("flex: 1 1 auto;");
    // Worn is marked on the plate's frame and in the name, not over the
    // picture — at 36px the picture is the only thing the tile is for.
    expect(cssRule(styles, '.style-rail-tile[data-active="true"] .style-rail-thumb')).toContain(
      "border-color: var(--select-line);",
    );
    expect(cssRule(styles, '.style-rail-tile[data-active="true"] .style-rail-name')).toContain(
      "color: var(--select-strong);",
    );

    /*
     * And the chip unfolds the panel instead of dropping its own menu. The
     * panel's first section is this same list of cards, so the menu put the
     * picker on screen twice — the second time over the thing it duplicates.
     */
    expect(app).toContain("onExpand={() => dispatch({ type: \"patch\", patch: { layersOpen: true } })}");
    expect(picker).toContain("onClick={onExpand ? onExpand : () => setOpen((value) => !value)}");
    // The menu cannot open while the chip is an unfold control, or an outside
    // pointer would be dismissing something that never appeared.
    expect(picker).toContain("{open && !onExpand ? (");
  });

  it("magnifies the canvas without reflowing it", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const zoomRule = cssRule(styles, ".canvas-zoom");

    // The applied factor is the reader's zoom times a constant base scale, so
    // 105% of the fitted size is what a 100% readout now means. Kept as two
    // variables rather than folded into the default `canvasZoom`: the ladder
    // and the readout stay honest, and "back to 100%" returns to the baseline
    // rather than to something smaller than it.
    expect(zoomRule).toContain("zoom: var(--canvas-zoom-effective);");
    expect(zoomRule).toContain("calc(var(--canvas-base-scale, 1) * var(--canvas-zoom, 1))");
    // The region labels resist it too: they are the editor's annotations on the
    // drawing, not part of it.
    expect(cssRule(styles, ".region-label")).toContain("12px / var(--canvas-zoom-effective, 1)");
    // Sized in container units, which is what keeps the layout box the size of
    // the free space while `zoom` magnifies only what is rendered — the reflow
    // that zoom must not cause. A *percentage* under `zoom` resolves against the
    // containing block divided by the zoom, which is why these two used to be
    // multiplied back out by it; container units do not divide, so multiplying
    // them laid the box out 1.5x too wide at 150% and pulled the ratio to 1.31.
    // Measured in Chrome at 150%: layout 1131x848, rendered 1696x1272.
    expect(zoomRule).toContain("width: var(--canvas-page-w);");
    expect(zoomRule).toContain("100cqw");
    // The page is 16:10 — the frame, not the frame plus the label gutters, which
    // is why the height adds them back after taking the ratio.
    // One gutter, not two: the labels are only drawn above the page, so the
    // bottom one was dead space that kept the canvas from reaching its 8px.
    expect(zoomRule).toContain("--canvas-page-ratio: 1.6;");
    expect(zoomRule).toContain("(100cqh - var(--canvas-label-gutter)) * var(--canvas-page-ratio)");
    expect(zoomRule).toContain(
      "height: calc(var(--canvas-page-w) / var(--canvas-page-ratio) + var(--canvas-label-gutter));",
    );
    // And the surface has to be a size container, or `cqh` has nothing to
    // measure against and the width silently falls back to the whole row.
    expect(cssRule(styles, ".builder-surface")).toContain("container-type: size;");
    // Nothing scrolls, at any zoom: the wheel pans the canvas, so a scrollbar
    // would be a second way to move the same thing — and the scrollable area a
    // translated child reports moves as it travels, which made the first pan
    // look like the canvas had overflowed.
    expect(cssRule(styles, '.builder-surface[data-canvas-zoomed="true"]')).toContain("overflow: hidden;");
    // The pan is a transform on the zoom wrapper, divided back out of the zoom
    // so a wheel moves the canvas the same distance at every magnification.
    // Divided by the *effective* factor, which includes the base scale — the
    // raw `--canvas-zoom` would leave the pan 5% out at every level.
    expect(zoomRule).toContain("calc(var(--canvas-pan-x, 0px) / var(--canvas-zoom-effective, 1))");
    /*
     * The Y term also carries the centring offset now — the canvas is centred
     * on the *screen*, and the surface reserves 60px above it for the floating
     * topbar against 8px below, so half that difference is taken back here.
     * Still divided by the zoom, which is what this test is about: an offset
     * measured in screen pixels must not grow with the magnification.
     */
    expect(zoomRule).toContain("var(--canvas-pan-y, 0px) - var(--canvas-centre-offset)");
    expect(zoomRule).toContain("var(--canvas-zoom-effective, 1)");
  });

  it("centres the canvas frame and keeps the region labels outside its clip", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // Equal margins top and bottom. `margin-top` alone, against the frame's
    // `height: 100%`, pushed the frame past the bottom edge of the canvas — it
    // read as sitting too low because it was clipped there.
    const frameRule = cssRule(styles, ".builder-surface .preview-frame");
    expect(frameRule).toContain("height: auto;");
    expect(frameRule).toContain("margin-top: var(--canvas-label-gutter);");
    // Nothing reserved at the bottom, which is what lets the canvas sit exactly
    // 8px off the surface edge and line up with the floating cards.
    expect(frameRule).toContain("margin-bottom: 0;");
    // The same gutter the canvas page's height accounts for, so the frame left
    // inside it is 16:10 rather than 16:10-minus-two-labels.
    expect(cssRule(styles, ".app-shell")).toContain(// 16px: the labels need about that for 12px text, and every pixel freed here
    // goes to the frame — the one reserved band on the canvas not holding a
    // floating card.
    // 16px of label plus a 4px gap under it, composed so the gap is nameable.
    "--canvas-label-gutter: calc(16px + var(--canvas-label-gap));");

    // The labels sit in that gap, as a sibling of the frame. They used to be a
    // child at `top: -26px`, which the frame's `overflow: hidden` clipped away
    // entirely — they were in the markup and never on screen.
    expect(cssRule(styles, ".region-labels")).toContain("top: 0;");
    expect(markup.indexOf('class="region-labels"')).toBeLessThan(markup.indexOf('class="preview-frame"'));
  });

  it("nests each group's options under the group, with the first one open", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    // The rail opens on File, so drive it to Structure the way the app does.
    expect(markup).toContain('data-nav-section="structure"');

    // The default selected group is the first Structure group, so 架构 opens
    // with 左栏 expanded rather than a group from the middle of the list.
    expect(createInitialWorkspaceState("zh").selectedGroup).toBe("sidebar");
    expect(presetRailSections.find((section) => section.id === "structure")?.groupIds[0]).toBe("sidebar");
  });

  it("gives the group list the leftover height so long groups scroll", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // The wordmark row is content-sized and the columns take everything left,
    // so the rail bounds its own children. What must never come back is a track
    // the columns share with empty space: the style cards used to sit above
    // them in a 1fr row, which left the columns content-sized.
    expect(cssRule(styles, ".preset-nav")).toContain("grid-template-rows: auto minmax(0, 1fr);");

    // With the options nested inside it, the list is the panel body — it takes
    // the leftover height and scrolls. Measured before the fix: 1803px of list
    // in an 848px rail, with the groups below the open one unreachable.
    const listRule = cssRule(
      styles,
      '.preset-panel:is([data-nav-section="structure"], [data-nav-section="components"]) > .group-list',
    );
    expect(listRule).toContain("flex: 1;");
    expect(listRule).toContain("min-height: 0;");
    expect(listRule).toContain("overflow-y: auto;");

    // The nested body must not be a second scroll container, or the fade mask
    // and its own scrollbar would sit inside the one that already scrolls.
    const nestedRule = cssRule(styles, ".group-row-body > .preset-panel-body");
    expect(nestedRule).toContain("overflow: visible;");
    expect(nestedRule).toContain("mask-image: none;");

    // The chevron carries the open/closed state; the row no longer has an icon.
    expect(cssRule(styles, '.group-row[aria-expanded="true"] .group-row-chevron')).toContain("rotate(0deg)");
    expect(cssRule(styles, ".group-row-chevron")).toContain("rotate(-90deg)");
  });

  it("opens on no style at all, on the plainest theme, and shows it on the canvas", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // 空白 / 柔光玻璃. It opened on 原生风, which claimed a style the empty canvas
    // was not showing — and made 原生风 unreachable, since `requestStyleSwitch`
    // returns early on the already-selected style.
    expect(emptyStructureProject.theme.stylePreset).toBe("blank");
    expect(emptyStructureProject.theme.preset).toBe("soft-glass");
    expect(nativeThemePresetIds[0]).toBe("soft-glass");
    expect(markup).toContain('data-theme-preset="soft-glass"');

    // 空白 wears 原生风's looks, so the attribute the CSS branches on says
    // `native` while the id beside it says what is really selected. This is
    // also what puts 原生风's palettes in 空白's theme list — the cards pair
    // `[data-style-preset]` with `[data-theme-style]`.
    expect(visualStylePreset("blank")).toBe("native");
    expect(markup).toContain('data-style-preset="native"');
    expect(markup).toContain('data-style-id="blank"');
    // And no branch of its own, or the alias would be fighting real rules.
    expect(styles).not.toContain('[data-style-preset="blank"]');

    // Each empty column shows the surface its style gives it — in 柔光玻璃 that
    // is #F4F6FA for the sidebar and #FFFFFF for the centre and right. It must
    // not paint its own: `--surface-panel` here made all three white (hiding
    // the theme) and `--surface-inset` made all three the tint.
    const emptyRule = cssRule(
      styles,
      ".preview-frame .preview-stack:empty,\n.preview-frame .right-panel:empty",
    );
    expect(emptyRule).not.toContain("background:");

    // The left column keeps the style's own sidebar tint when empty; there used
    // to be a rule forcing `--surface-panel` over it.
    expect(styles).not.toContain(".preview-frame[data-style-preset] > .session-sidebar.region-empty");

    // The centre/right divider survives an empty right panel. The native style
    // hides the resize handle's line and draws it as `.right-panel`'s own
    // `border-left`, so `border: 0` on the empty panel erased it — verified by
    // clipping in at 8x, which showed pure white where the line belongs.
    const placeholderRule = cssRule(
      styles,
      '.preview-frame .region-empty,\n.preview-frame .right-panel[data-empty="true"]',
    );
    expect(placeholderRule).toContain("box-shadow: none;");
    expect(placeholderRule).not.toContain("border: 0;");
    expect(cssRule(styles, '.preview-frame[data-style-preset="native"] .right-panel')).toContain(
      "border-left: 1px solid var(--preview-soft-line);",
    );
  });

  it("keeps the selection accent in one place", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const root = cssRule(styles, ":root");

    // The point of the token set: one value to edit. Every other surface
    // derives from it, so a recolour cannot leave a stale orange behind.
    expect(styles.match(/#ff6a00|rgb\(255 106 0/gi) ?? []).toHaveLength(1);
    expect(root).toContain("--select-color: #ff6a00;");
    for (const derived of [
      "--select-line: var(--select-color);",
      "--select-fill: color-mix(in srgb, var(--select-color) 20%, transparent);",
      "--select-wash: color-mix(in srgb, var(--select-color) 12%, transparent);",
      "--select-text: var(--select-color);",
    ]) {
      expect(root).toContain(derived);
    }

    // The rail's selected destination reads as selection; hover is left as it
    // was, because the two answer different questions ("this is selected"
    // versus "you can click this").
    const activeTile = cssRule(styles, '.nav-section-tile[data-active="true"] .nav-section-glyph');
    expect(activeTile).toContain("background: var(--select-fill);");
    expect(activeTile).toContain("color: var(--select-text);");
    expect(cssRule(styles, ".nav-section-tile:hover .nav-section-glyph")).toContain(
      "color-mix(in srgb, var(--text-primary) 6%, transparent)",
    );
    // Equal specificity, so order decides: selected must come after hover, or
    // hovering the selected tile would grey it back out.
    expect(styles.indexOf(".nav-section-tile:hover .nav-section-glyph")).toBeLessThan(
      styles.indexOf('.nav-section-tile[data-active="true"] .nav-section-glyph'),
    );

    // Not in the rail, though. Selection there looks like hover: the accent is
    // the canvas's language for "this is what you are acting on", and a ring in
    // the rail competed with the canvas for that meaning.
    const activeRow = cssRule(styles, '.layers-row[data-active="true"]');
    expect(activeRow).toContain("color-mix(in srgb, var(--text-primary) 6%, transparent)");
    expect(activeRow).not.toContain("--select-");
  });

  it("asks for approval above the composer instead of under or over it", () => {
    // Both preset previews used to answer this wrongly, in opposite directions: a
    // bottom-anchored absolute overlay covered the composer during a conversation, and the
    // welcome state's static override dropped the panel below the input. Every approval
    // surface belongs above the field, and the field must stay visible — "type an answer
    // instead" is one of the choices on the panel.
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const composerSlots = '{renderRegion("composer")}';

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
    /*
     * 原生风's second colourway was rebuilt from Airbnb's design language —
     * asked for. It was a warm clay palette (#FFF9F2 paper, #C87330 accent)
     * whose hover and accent-soft were deliberately the *same* clean tint,
     * which is what the name of this test is about.
     *
     * The new one separates them, and that is Airbnb's structure rather than a
     * regression: a neutral #EBEBEB hover on the page grey, and a coral tint
     * reserved for accent surfaces. Still clean — neither is a mix of the ink
     * into the paper, which is what "muddy" meant here.
     */
    expect(themeTokens["sand-workspace"].name).toBe("Coral Desk");
    expect(themeTokens["sand-workspace"].surface.hover).toBe("#EBEBEB");
    expect(themeTokens["sand-workspace"].accent.soft).toBe("#FFF0F3");
    // Rausch.
    expect(themeTokens["sand-workspace"].accent.action).toBe("#FF385C");

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

  it("gives the reader the same four default avatars in every style", () => {
    // The reader's side is four fixed people plus an upload tile, whatever the
    // style; the characters styles used to give the reader are the agent's now.
    for (const styleId of presetStyleIds) {
      expect(STYLE_AVATAR_OPTIONS[styleId]["author.user"], styleId).toEqual(DEFAULT_USER_AVATAR_IDS);
      expect(STYLE_AVATAR_DEFAULTS[styleId]["author.user"], styleId).toBe(DEFAULT_USER_AVATAR_IDS[0]);
    }
    expect(ICON_OPTIONS["author.user"].slice(0, 4).map((option) => option.id)).toEqual(DEFAULT_USER_AVATAR_IDS);
    expect(STYLE_AVATAR_DEFAULTS.native["author.agent"]).toBe("orange-blob");
    expect(ICON_OPTIONS["author.agent"][0]?.id).toBe("orange-blob");
  });

  it("moves each style's former reader avatars into its agent gallery", () => {
    expect(STYLE_AVATAR_OPTIONS.native["author.agent"]).toEqual(
      expect.arrayContaining(["blue-smile", "heart-eyes", "golden-joy", "purple-bored"]),
    );
    expect(STYLE_AVATAR_OPTIONS.tech["author.agent"]).toEqual(
      expect.arrayContaining(["tech-user-cloud", "tech-user-gummy", "tech-user-block", "tech-user-hex"]),
    );
    expect(STYLE_AVATAR_OPTIONS.inkwash["author.agent"]).toEqual(
      expect.arrayContaining(["ink-peaks", "ink-bridge", "ink-bamboo", "ink-sun"]),
    );
  });

  it("leaves which avatars a style shows to the table, not to CSS deny-lists", () => {
    // Per-id `display: none` rules used to sit beside the table and had drifted
    // from it: 原生风 listed four agent avatars and drew two.
    const styles = readFileSync(new URL("./styles/agentmatrix.css", import.meta.url), "utf8");
    expect(styles).not.toMatch(/\.am-state-option\[data-option-id="[^"]+"\][^{]*\{\s*display: none;/);
  });

  it("offers at most two rows of avatars a side, and always its own default", () => {
    // The invariant: a style's default has to be in its own list, or the canvas
    // opens wearing a face the gallery cannot select and the reader cannot get
    // back to. This caught `zine`, whose agent default named `square-terminal` —
    // an id belonging to `content.terminal`, so `resolveIcon` had been silently
    // answering with `options[0]`.
    for (const styleId of presetStyleIds) {
      for (const slot of ["author.user", "author.agent"] as const) {
        const ids = STYLE_AVATAR_OPTIONS[styleId][slot];
        expect(ids.length, `${styleId}/${slot}`).toBeLessThanOrEqual(8);
        expect(ids, `${styleId}/${slot} default`).toContain(STYLE_AVATAR_DEFAULTS[styleId][slot]);
        // And every id is real, so a rename cannot leave a hole in the gallery.
        for (const id of ids) {
          expect(ICON_OPTIONS[slot].some((option) => option.id === id), `${styleId} ${id}`).toBe(true);
        }
      }
    }
  });
});

describe("event flow axis", () => {
  it("draws the groups as a plain list, with no axis and no ticks", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const rail = readFileSync(new URL("./app/view/PresetRail.tsx", import.meta.url), "utf8");

    /*
     * Both are gone on request, and this is the tripwire for either coming
     * back by accident.
     *
     * They drew the seven groups as a sequence with a progress state. The
     * sequence is not one — 审批 and 运行状态 end the run and continue in the
     * next — and "covered" answered a question nobody asked: a group is a place
     * to configure something, not a task to tick off.
     */
    expect(styles).not.toContain(".flow-axis-marker");
    expect(styles).not.toContain('.preset-panel[data-nav-section="components"] > .group-list::before');
    expect(rail).not.toContain("flow-axis-marker");

    /*
     * And the gutter went with them. 8px on the row and 24px on the nested body
     * were the line's clearance; with no line they were an empty strip down the
     * left of every group, and the 18px came off the column itself
     * (`--rail-col`) rather than being left as slack.
     */
    expect(
      cssRule(styles, '.preset-panel[data-nav-section="components"] .group-row'),
    ).toContain("padding-left: 2px;");
    // Set once, for both sections: 架构 kept the 22px axis gutter long after the
    // line was gone from 组件, because the shared rule was never the one changed.
    expect(cssRule(styles, ".group-row-body > .preset-panel-body")).toContain(
      "padding: 6px 8px 10px 6px;",
    );
    expect(styles).toContain("--rail-col: 272px;");
    // One token for both columns, so they cannot drift apart.
    expect(styles).toContain("--layers-col: var(--rail-col);");
  });

  it("lets the centre column be highlighted when it is empty", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // The selection overlay lives on `::after`. The welcome wash used to have a
    // second layer there, and the rule that switched that layer off for an
    // empty canvas was switching off the highlight with it: selecting 中栏 set
    // `opacity: 1` on a box that still had `display: none`. Measured before the
    // fix, and the left and right columns worked because their overlays are on
    // different elements.
    expect(styles).not.toContain('.preview-stack[data-welcome="true"]::after');
    expect(
      cssRule(styles, '.preview-frame .preview-stack[data-welcome="true"]:empty::before'),
    ).toContain("display: none;");
  });

  it("reads the flow in the order it happens, and marks any exit as one", () => {
    /*
     * The reader's journey, in their words: 思考中 → 思考完成 → 工具调用 → 审批
     * → 加载 → 运行状态 → 交付.
     *
     * It used to open on `blocks` (运行状态) — where a run *ends* — so the first
     * group in the list was the last thing that happens. Two of these do end
     * the run and continue in the next one (审批 and 运行状态), so the sequence
     * is not strictly linear; but a list has to start somewhere, and starting
     * where the reader starts beats starting at the outcome.
     *
     * `ux-effects` before `thinking-done` is load-bearing, not aesthetic: both
     * write `reasoning.*` and `styleKitOptionIds` resolves that by last-writer
     * in this order, so swapping them would give every style the settled
     * block's choices for the running one.
     */
    const flow = presetRailSections.find((section) => section.id === "event-flow")?.groupIds ?? [];
    expect(flow).toEqual([
      "ux-effects",
      "thinking-done",
      "tool-calls",
      "approval",
      "media-generation",
      "blocks",
      "delivery",
    ]);

    // No exits at the moment: failure moved into 运行状态, which is the frame
    // around the flow rather than a stage in it. Whatever is in the set has to
    // be on the axis, or it is marked as an exit from a sequence it is not in.
    expect([...FLOW_EXIT_GROUP_IDS]).toEqual([]);
    for (const exit of FLOW_EXIT_GROUP_IDS) {
      expect(flow).toContain(exit);
    }

    // 中断 is held back rather than deleted: its four placeholders are about
    // stopping and resuming, which belong to 运行状态 and 人机协作 now.
    expect([...RAIL_WITHHELD_GROUP_IDS]).toEqual(["interrupt"]);
    expect(flow).not.toContain("interrupt");
    expect(presetGroups.some((group) => group.id === "interrupt")).toBe(true);
  });
});

describe("sidebar resize", () => {
  it("keeps the region labels over their columns as the widths change", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const labelsSource = readFileSync(new URL("./app/view/RegionLabels.tsx", import.meta.url), "utf8");

    // The labels track the same custom property the sidebar's width reads, so
    // the left column needs no JavaScript. It is set on the zoom wrapper, not
    // the frame: the labels are a sibling of the frame — they had to leave it
    // to escape its clipping — so a property on the frame never reached them
    // and they stayed put while the columns moved.
    expect(labelsSource).toContain("var(--session-width-set, var(--side-col-w, 236px))");
    const frameIndex = appSource.indexOf('className="preview-frame"');
    const varIndex = appSource.indexOf('"--session-width-set"');
    expect(varIndex).toBeGreaterThan(-1);
    expect(varIndex).toBeLessThan(frameIndex);

    // The right column is a fixed width the same way, read from its own
    // property, and the centre takes the rest — so no JavaScript there either.
    expect(labelsSource).toContain("var(--right-width-set, var(--side-col-w, 236px))");
    expect(labelsSource).toContain('"minmax(0, 1fr)"');
    expect(appSource).toContain('"--right-width-set"');
  });

  it("gives the left column its own drag handle", () => {
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // Both side columns are fixed-width flex items, each with a handle of its
    // own that sets its property directly — `--session-width-set` here.
    expect(appSource).toContain('className="resize-handle sidebar-resize-handle"');
    expect(appSource).toContain('"--session-width-set"');
    // Same class as the panel group's handle, which also exempts it from the
    // canvas's click suppression.
    expect(cssRule(styles, ".sidebar-resize-handle")).toContain("cursor: col-resize;");

    // Overridable, defaulting to the width both side columns share (236px
    // unless the style narrows it), so an export never dragged is unchanged.
    expect(styles).toContain("--session-width: var(--session-width-set, var(--side-col-w, 236px));");
    expect(createInitialWorkspaceState("zh").rightPanelWidth).toBeNull();

    // Session state, like the right split: `layout.mainSize` is the default the
    // panel group starts from, and dragging that does not write back either.
    expect(createInitialWorkspaceState("zh").sidebarWidth).toBeNull();
  });
});

describe("panel header and conversation title", () => {
  it("keeps the project name above every destination", () => {
    const railSource = readFileSync(new URL("./app/view/PresetRail.tsx", import.meta.url), "utf8");
    const layersSource = readFileSync(new URL("./app/view/LayersPanel.tsx", import.meta.url), "utf8");

    // It names the thing being configured, which does not stop being true when
    // the reader switches to Theme. It used to live inside the layer panel and
    // vanish with it — and the layer panel has since moved to the other side of
    // the window, which would have taken the name with it.
    // It is beside the mark now, at the top of the card, rather than over the
    // rail's panel — which is one of several ways to configure the thing it
    // names, and used to take the name with it when the panel changed.
    const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
    expect(railSource).not.toContain("ProjectTitle");
    expect(layersSource).not.toContain("ProjectTitle");
    expect(appSource.match(/<ProjectTitle/g)).toHaveLength(2);

    // And it stays put rather than stretching or scrolling with the list.
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    expect(
      cssRule(
        styles,
        '.preset-panel:is([data-nav-section="structure"], [data-nav-section="components"], [data-nav-section="layers"])\n  > :is(.preset-style-cards, .preset-panel-header, .layers-panel-head)',
      ),
    ).toContain("flex: none;");
  });

  it("titles the chat header with the conversation, not the product", () => {
    const frameSource = readFileSync(
      new URL("./components/agent-preview/ChatFrame.tsx", import.meta.url),
      "utf8",
    );
    // The header used to carry a fixed "编码 Agent" above the real title in
    // small print, naming the wrong thing twice — the product is already named
    // in the sidebar's brand.
    expect(frameSource).toContain("<h2>{viewModel.title ?? copy.chat.frame.fallbackConversationTitle}</h2>");
    expect(frameSource).not.toContain("<h2>{copy.chat.frame.title}</h2>");

    // The composed conversation names what was asked, not the product.
    const timelineSource = readFileSync(
      new URL("./app/projection/canvasTimeline.ts", import.meta.url),
      "utf8",
    );
    expect(timelineSource).toContain('zh: "确认功能"');
    expect(timelineSource).toContain('event("run.started", { title: SAMPLE.title[locale] })');
  });

  it("names the finished reasoning block for the thing, not its state", () => {
    // "已完成思考" restated what being collapsed and past already says.
    const chatCopy = readFileSync(new URL("./i18n/copy/chat.ts", import.meta.url), "utf8");
    expect(chatCopy).toContain('reasoned: "思考过程"');
    expect(chatCopy).not.toContain('reasoned: "已完成思考"');
  });
});

describe("icon galleries", () => {
  it("offers four tiles a slot in every style, and only ids that exist", () => {
    /*
     * The registry is shared between styles: every set that has shipped is
     * registered as options on the same slots, so `tool.search` holds fourteen
     * — lucide's four plus hand-drawn, painted and comic marks. Three styles
     * had a curated list and the rest fell through to "all of them", which put
     * fourteen tiles in one gallery and asked the reader to pick a magnifier
     * drawn for someone else's skin.
     *
     * Four is the count the gallery is built for, so this holds every style to
     * it — including the hidden ones, which a saved project can still be in.
     */
    const gallerySlots = presetGroups.flatMap((group) =>
      visibleStateCards(group.id).map((card) => card.slot),
    );
    expect(gallerySlots.length).toBeGreaterThan(0);

    for (const styleId of presetStyleIds) {
      for (const slot of new Set(gallerySlots)) {
        const ids = styleAvatarOptionIds(styleId, slot);
        expect(ids, `${styleId}/${slot}`).toBeDefined();
        // Avatars run to two rows: the agent's own four and the characters
        // the style used to give the reader.
        const isAvatar = slot === "author.user" || slot === "author.agent";
        expect(ids!.length, `${styleId}/${slot} count`).toBeLessThanOrEqual(isAvatar ? 8 : 4);
        // No tile may name an id the registry does not have: `resolveIcon`
        // answers an unknown id with `options[0]`, so the gallery would show
        // two tiles drawing one picture and the miss would be invisible.
        for (const id of ids!) {
          expect(
            ICON_OPTIONS[slot as keyof typeof ICON_OPTIONS]?.some((option) => option.id === id),
            `${styleId}/${slot} ${id}`,
          ).toBe(true);
        }
        // And no id twice in one gallery, which is the same bug with the
        // registry innocent.
        expect(new Set(ids).size, `${styleId}/${slot} unique`).toBe(ids!.length);
      }
    }
  });
});

describe("style cards", () => {
  it("shows one card per buildable style, each with four colourways and a plate", () => {
    /*
     * The picker is a card per style: a preview plate, and on hover the four
     * colourways it offers plus one Apply button. Three things can rot here and
     * all three are invisible until someone opens the panel — a style with no
     * plate (an empty grey rectangle), a style with three or five colourways
     * (the row was built for four), or 空白 creeping back into a list where it
     * has nothing to offer.
     */
    expect(styleCardOptions.map((style) => style.id)).not.toContain("blank");
    expect(styleCardOptions.every((style) => !style.hidden)).toBe(true);
    // Every buildable style, 空白 excepted, has a card.
    expect(styleCardOptions.length).toBe(
      selectablePresetStyleOptions.filter((style) => style.id !== "blank").length,
    );

    for (const style of styleCardOptions) {
      const themes = styleCardThemeIds(style.id);
      expect(themes.length, `${style.id} colourways`).toBe(4);
      // Real ids, and no id twice — a repeated swatch is two dots doing one job.
      expect(new Set(themes).size, `${style.id} unique`).toBe(4);
      for (const themeId of themes) {
        expect(themeTokens[themeId], `${style.id} ${themeId}`).toBeDefined();
      }
      // The plate the card rests as. Named by the component, not by CSS, so it
      // stays out of every exported project.
      const plate = new URL(`../public/style-card/${style.id}.png`, import.meta.url);
      expect(existsSync(plate), `${style.id} plate`).toBe(true);
    }
  });
});

import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

import { App, STYLE_AVATAR_DEFAULTS, selectedComponentItemsForProject } from "./App";
import { ICON_OPTIONS, IconSetProvider } from "./agentmatrix";
import { defaultCodingAgentProject, emptyStructureProject } from "./schema/agentuxConfig";
import { applyPresetOption, togglePresetOption } from "./schema/presetActions";
import { FLOW_EXIT_GROUP_IDS, presetRailSections } from "./app/projection/presetRailData";
import { createInitialWorkspaceState } from "./app/state/workspaceState";
import { presetGroupsForProject } from "./schema/presets";
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

    // Two controls: enter the preview surface, and export a project.
    expect(controls).toContain("topbar-preview-button");
    expect(controls).toContain("Export");
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
    // replay belong to the preview surface, not the editor chrome. (The two
    // assertions that used to sit here, against `aria-label="预览"` and
    // `topbar-preview-button`, were written when there was no preview control
    // at all; they now contradict the one above.)
    expect(controls).not.toContain('run-status-line');
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

  it("opens on three columns, each present but with its contents unpicked", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    expect(markup).toContain('class="builder-surface" data-output-zone="generated-scaffold"');
    // Every column's presence toggle is on, so all three are there to be
    // configured; what goes *in* them is the reader's to pick.
    expect(markup.match(/class="region-label"/g)?.length).toBe(3);
    for (const layer of ["左栏", "中栏", "右栏"]) {
      expect(markup).toContain(layer);
    }
    // The side columns' presence toggles, which create columns without
    // mounting anything, plus the composer — an agent frontend without a way to
    // type is not one, so it is there from the start in its plainest form.
    // `chat` stays off: a conversation is content, and content is picked.
    expect(emptyStructureProject.layout.slots.filter((slot) => slot.enabled).map((slot) => slot.id))
      .toEqual(["sessions", "composer", "output"]);

    // The sidebar's "Content" section starts unpicked — the column is present,
    // its contents are not chosen. Same rule as the slots.
    expect(emptyStructureProject.sidebar).toEqual({
      newButton: false,
      search: false,
      grouping: false,
      footer: false,
    });
    expect(markup).not.toContain("session-new");
    expect(markup).not.toContain("session-footer");

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

  it("opens the rail on File, with the layer list showing", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);

    expect(markup).toContain('data-nav-section="file" data-active="true"');
    expect(markup).toContain('class="layers-panel"');
    // Six destinations, not the thirteen preset groups that used to be here:
    // File, Structure, Theme, Components, Model, Git. Structure and Components
    // were two sections of one list; each is a destination now.
    expect(markup.match(/class="nav-section-tile"/g)?.length).toBe(6);
    for (const section of ["structure", "git"]) {
      expect(markup).toContain(`data-nav-section="${section}"`);
    }
    // The style picker moved into Theme; it is no longer always on screen (it
    // was clipped there — 550px of cards in a 304px column).
    expect(markup).not.toContain("选择风格");
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

  it("puts a zoom readout left of Export", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const controls = topbarControls(markup);

    expect(controls).toContain('class="zoom-trigger"');
    expect(controls).toContain("100%");
    // Order matters: Export is the last thing in the bar.
    expect(controls.indexOf("zoom-trigger")).toBeLessThan(controls.indexOf("topbar-deploy-button"));
    // The menu is closed until asked for.
    expect(controls).not.toContain('class="zoom-menu"');
  });

  it("magnifies the canvas without reflowing it", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");
    const zoomRule = cssRule(styles, ".canvas-zoom");

    expect(zoomRule).toContain("zoom: var(--canvas-zoom, 1);");
    // The `* var(--canvas-zoom)` is the whole trick. Under `zoom`, percentages
    // resolve against the containing block divided by the zoom factor, so a
    // plain `width: 100%` keeps the rendered size fixed and re-lays-out the
    // contents smaller — a reflow, which is the one thing zoom must not do.
    // Measured in Chrome: with the multiplier, a 200% canvas lays out at 1248px
    // and renders at 2496px; without it, it lays out at 624px and renders at
    // 1248px.
    expect(zoomRule).toContain("width: calc(100% * var(--canvas-zoom, 1));");
    expect(zoomRule).toContain("height: calc(100% * var(--canvas-zoom, 1));");
    // Only a magnified canvas scrolls; at 100% sub-pixel rounding would put a
    // scrollbar on an unzoomed canvas.
    expect(cssRule(styles, '.builder-surface[data-canvas-zoomed="true"]')).toContain("overflow: auto;");
  });

  it("centres the canvas frame and keeps the region labels outside its clip", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // Equal margins top and bottom. `margin-top` alone, against the frame's
    // `height: 100%`, pushed the frame past the bottom edge of the canvas — it
    // read as sitting too low because it was clipped there.
    const frameRule = cssRule(styles, ".builder-surface .preview-frame");
    expect(frameRule).toContain("height: auto;");
    expect(frameRule).toContain("margin-top: 26px;");
    expect(frameRule).toContain("margin-bottom: 26px;");

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

    // One row, not two. The second row dated from when the style cards sat
    // above the columns; empty, it left the columns content-sized, so the rail
    // could not bound its own children.
    expect(cssRule(styles, ".preset-nav")).toContain("grid-template-rows: minmax(0, 1fr);");

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

  it("opens on the native style's first theme and shows it on the canvas", () => {
    const markup = renderToStaticMarkup(<IconSetProvider><App /></IconSetProvider>);
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // 原生风 / 柔光玻璃 — the first theme of the first style.
    expect(emptyStructureProject.theme.stylePreset).toBe("native");
    expect(emptyStructureProject.theme.preset).toBe("soft-glass");
    expect(nativeThemePresetIds[0]).toBe("soft-glass");
    expect(markup).toContain('data-style-preset="native"');
    expect(markup).toContain('data-theme-preset="soft-glass"');

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

describe("event flow axis", () => {
  it("draws the flow as an axis with a marker per stage", () => {
    const styles = readFileSync(new URL("./styles/app.css", import.meta.url), "utf8");

    // The line hangs off the list, not off the rows: an expanded stage pushes
    // the next marker down and the line has to follow.
    const lineRule = cssRule(
      styles,
      '.preset-panel[data-nav-section="components"] > .group-list::before',
    );
    expect(lineRule).toContain("left: 15.5px;");

    // The axis sits in the rail's left gutter and the nested options clear it,
    // rather than the line running down through the option cards. Moving the
    // line left instead of indenting the body is what keeps the cards their
    // width — measured 96px, against 97px before the axis existed.
    expect(
      cssRule(styles, '.preset-panel[data-nav-section="components"] .group-row'),
    ).toContain("padding-left: 8px;");
    expect(
      cssRule(
        styles,
        '.preset-panel[data-nav-section="components"] > .group-list .preset-panel-body',
      ),
    ).toContain("padding-left: 24px;");

    // One fixed box at every state, so a marker's centre stays on the line.
    // Sizing the marker to its content moved the tick right of the line the
    // moment a stage was covered — measured 9px off.
    const markerRule = cssRule(styles, ".flow-axis-marker");
    expect(markerRule).toContain("width: 15px;");
    expect(markerRule).toContain("height: 15px;");
    expect(cssRule(styles, '.flow-axis-marker[data-covered="true"]')).toContain(
      "background: var(--select-fill);",
    );

    // An exit reads as a ring rather than a point on the line.
    expect(cssRule(styles, '.flow-axis-marker[data-kind="exit"]::before')).toContain(
      "background: var(--fn-bg);",
    );
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

  it("treats errors and interrupts as exits, not steps", () => {
    // An error can land while thinking, mid tool call or at delivery, and the
    // reader can stop at any of those points. Neither happens "after tools and
    // before media", so neither is a step on the axis.
    expect([...FLOW_EXIT_GROUP_IDS]).toEqual(["blocks", "interrupt"]);
    const flow = presetRailSections.find((section) => section.id === "event-flow")?.groupIds ?? [];
    for (const exit of FLOW_EXIT_GROUP_IDS) {
      expect(flow).toContain(exit);
    }
  });
});

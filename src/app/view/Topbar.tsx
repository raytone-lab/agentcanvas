import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Eye, Settings2 } from "lucide-react";

import { SidebarToggleIcon } from "../../components/agent-preview/SessionSidebar";
import { HintBubble, HintBubbleGroup } from "./HintBubble";
import { SelectMenu } from "../../components/ui";
import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import { previewScenarios, type PreviewScenarioId } from "../../preview-runner/PreviewRunner";
import type { RunMode } from "../appTypes";
import { previewScenarioLabel } from "../projection/previewDefaults";
import type { SelectedComponentItem } from "../projection/selectedComponents";

/**
 * The canvas's own panel (pure view), floating at the top right.
 *
 * Not a bar any more: the whole window is the canvas, so this is a card over it
 * rather than a row above it. The wordmark and language switch it used to carry
 * moved to `ShellBrand`, at the top of the rail card.
 *
 * Closed, it is the controls that cannot wait — the style being worn, preview,
 * and export. Open, it is the look: every style tiled, and under them the
 * palettes that recolour the one you are in. Those two are halves of one
 * decision and they were on opposite sides of the window; the layer list, which
 * used to open here, went back to the rail — it is an inventory of what is on
 * the canvas, and this side is now the choice of what the canvas *is*.
 *
 * Owns only its local chrome state — the selected-components popover —
 * everything else arrives as props from the workspace controller.
 */
export function Topbar({
  copy,
  locale,
  surfaceMode,
  onReturnToBuilder,
  runMode,
  onRunModeChange,
  selectedScenarioId,
  onScenarioChange,
  showDebugViewToggle,
  workspaceView,
  onWorkspaceViewToggle,
  onEnterPreview,
  uiPreview,
  onToggleUiPreview,
  selectedComponentSummary,
  selectedComponentItems,
  onExport,
  styleChip,
  styleRail,
  panelSections,
  panelOpen,
  onTogglePanel,
}: {
  copy: UiCopy;
  locale: AppLocale;
  surfaceMode: "builder" | "saved-preview";
  onReturnToBuilder: () => void;
  runMode: RunMode;
  onRunModeChange: (mode: RunMode) => void;
  selectedScenarioId: PreviewScenarioId;
  onScenarioChange: (id: PreviewScenarioId) => void;
  showDebugViewToggle: boolean;
  workspaceView: "preview" | "debug";
  onWorkspaceViewToggle: () => void;
  /** The run preview: snapshot the project and enter the preview surface. */
  onEnterPreview: () => void;
  /** Whether the editor's furniture is currently folded away. */
  uiPreview: boolean;
  /** The interface preview: fold that furniture away, or bring it back. */
  onToggleUiPreview: () => void;
  selectedComponentSummary: string;
  selectedComponentItems: SelectedComponentItem[];
  onExport: () => void;
  /** The current style as one control, for the closed card. */
  styleChip: ReactNode;
  /**
   * Every style as a plate, for the folded column.
   *
   * Closed, this card is a 56px column beside the canvas rather than a row
   * above it (see `.topbar:not([data-open])`), so there is room for the whole
   * list — and switching style is the one thing the folded card was missing
   * that it had no shortcut for.
   */
  styleRail: ReactNode;
  /** Styles and palettes, composed by the shell so this stays a view. */
  panelSections: ReactNode;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const [selectedComponentsOpen, setSelectedComponentsOpen] = useState(false);
  const selectedComponentsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedComponentsOpen) {
      return;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && selectedComponentsRef.current?.contains(target)) {
        return;
      }
      setSelectedComponentsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedComponentsOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedComponentsOpen]);

  /* Open, the controls are a row and the hint drops below; folded, they are a
     column against the window's edge, where below is the next control. */
  const hintSide = panelOpen ? "bottom" : "left";

  return (
    <HintBubbleGroup>
    <header className="topbar" data-open={panelOpen ? "true" : undefined}>
      <div className="topbar-controls">
        {/* Opens the panel below. First in the row, the way the canvas
            sidebar's own toggle sits at the start of its header. */}
        <HintBubble title={panelOpen ? copy.shell.presetRail.collapse : copy.shell.presetRail.expand} side={hintSide}>
          <button
            type="button"
            className="rail-icon-btn topbar-panel-toggle"
            aria-label={panelOpen ? copy.shell.presetRail.collapse : copy.shell.presetRail.expand}
            aria-expanded={panelOpen}
            onClick={onTogglePanel}
          >
            <SidebarToggleIcon size={15} />
          </button>
        </HintBubble>
        {/* The run-mode and scenario pickers are not here — they are a section
            inside the panel below. Two pickers plus 编辑 UI/UX plus Export do
            not fit the card's control row (five controls want ~380px against
            260px, and a nowrap flex row answers that by shearing every one of
            them), and they are not controls that cannot wait: a run preview is
            started from the mode it is already in, and changing it is a
            deliberate act. Keeping them out of the row is also what lets this
            surface fold to the same icon column the builder does. */}
        {/* The debug-view toggle is hidden for now. `showDebugViewToggle` and
            `onWorkspaceViewToggle` are still threaded through, so bringing it
            back is re-rendering the button rather than rebuilding the wiring. */}
        {/* Glyph and label split for the same reason as Export's below: folded
            to a 56px column this keeps the gear and drops the words.

            Folded, it unfolds the card; open, it goes back to the builder.
            Same rule the style tile and the plates follow across the canvas —
            whatever you reach for in the folded card, the card opens — and it
            is what the glyph can honestly promise. Folded there is no label,
            so a gear that left the surface outright would be a 36px icon with
            no way to find out beforehand that it discards the run you are
            looking at. Open, the words are there and the action is the one
            they name.

            The accessible name follows the action rather than staying on
            "编辑 UI/UX": a button announced as one thing and wired to another
            is the version of this that is hard to notice. */}
        {surfaceMode === "saved-preview" ? (
          <button
            className="secondary-button topbar-edit-button"
            type="button"
            aria-label={panelOpen ? copy.shell.topbar.editUiUx : copy.shell.presetRail.expand}
            title={panelOpen ? copy.shell.topbar.editUiUx : copy.shell.presetRail.expand}
            onClick={panelOpen ? onReturnToBuilder : onTogglePanel}
          >
            <Settings2 className="topbar-edit-glyph" size={16} aria-hidden="true" />
            <span className="topbar-edit-label">{copy.shell.topbar.editUiUx}</span>
          </button>
        ) : null}
        {/* Two things left the topbar here.

            "已选组件 N 套": File → Layers lists the same components, arranged by
            the column they sit in rather than by preset group.

            "保存": it never saved anything. `saveScaffoldPreview` snapshots the
            project and enters the preview surface — nothing is written to disk,
            and nothing needs to be: the canvas already renders the current
            configuration as it is edited. So this is the same action under an
            honest label, not a replacement for saving. */}
        {surfaceMode === "builder" ? (
          <>
            {/* Closed, the style is one control: what is worn, and a chevron
                that drops the rest. Open, the panel tiles all of them and this
                would be the same list twice. */}
            {panelOpen ? null : styleChip}
            {/* Two previews, and they answer different questions — which is why
                the eye is back beside the play key after having been pulled for
                being a second control called "preview".

                The eye is the cheap one: fold the editor's furniture away and
                leave what is configured right now on screen. It reads the live
                project, starts nothing, gates on nothing, and Esc gives the
                furniture back. The play key is the expensive one: it snapshots
                the project, builds the export, picks a scenario and plays a
                transcript through it, behind the completeness dialog.

                What made them one question was the labels — both "预览" /
                "Preview". They are 界面预览 and 运行预览 now, so the row says
                which is which instead of leaving it to the two glyphs.

                `data-active` is not dead styling: the topbar fades out rather
                than unmounting (see `.topbar`'s transition), so the pressed eye
                is on screen for the length of the fold. */}
            {/* Icons, named in a bubble rather than beside them: the two
                glyphs alone were read as unlabelled mysteries, and a visible
                word made the row change width with every locale. No `title`,
                which would put the browser's own tooltip on top of it. */}
            <HintBubble title={copy.shell.topbar.viewUiPreview} description={copy.shell.topbar.viewUiPreviewHint} side={hintSide}>
              <button
                className="rail-icon-btn topbar-ui-preview-button"
                type="button"
                data-active={uiPreview ? "true" : undefined}
                aria-pressed={uiPreview}
                aria-label={copy.shell.topbar.viewUiPreview}
                onClick={onToggleUiPreview}
              >
                <Eye size={15} aria-hidden="true" />
              </button>
            </HintBubble>
            {/* Same button and same glyph size as the panel toggle beside it:
                two icon controls in one card that were drawn at different
                weights read as two kinds of thing. */}
            <HintBubble title={copy.shell.topbar.viewPreview} description={copy.shell.topbar.viewPreviewHint} side={hintSide}>
              <button
                className="rail-icon-btn topbar-preview-button"
                type="button"
                aria-label={copy.shell.topbar.viewPreview}
                onClick={onEnterPreview}
              >
                <PreviewPlayIcon size={15} />
              </button>
            </HintBubble>
            {/* The plates, under the two previews, in the folded column only —
                a row has no room for eight of them, and open the panel's own
                cards are the same list. */}
            {panelOpen ? null : styleRail}
          </>
        ) : null}
        {/* The glyph and the label are separate so the folded card can keep
            one and drop the other: "Export" does not fit a 56px column, and
            truncating the terminal action to "Exp…" is worse than its glyph.
            The label stays in the DOM either way — hidden with `display: none`
            it is out of the accessible name too, which is what `aria-label`
            and `title` are here for. */}
        <button
          className="primary-button topbar-deploy-button"
          type="button"
          aria-label={copy.shell.topbar.exportScaffold}
          title={copy.shell.topbar.exportScaffold}
          onClick={onExport}
        >
          <Download className="topbar-deploy-glyph" size={15} aria-hidden="true" />
          <span className="topbar-deploy-label">{copy.shell.topbar.exportScaffold}</span>
        </button>
      </div>
      {/* Mounted whether or not it is open, and hidden by CSS instead.
          Unmounting it is why the card used to snap: there is no transition to
          run on an element that stops existing, so the panel vanished in one
          frame while the rail opposite it had just been taught to glide. The
          fold now runs on `grid-template-rows` and `visibility`, which needs
          the row to be there in both states.

          `aria-hidden` rather than relying on `visibility: hidden` alone:
          visibility keeps it out of the tab order, but a screen reader reading
          by region would still announce a panel the card is not showing. */}
      <div className="topbar-panel" aria-hidden={panelOpen ? undefined : true}>
        {/* What this surface's panel is *for*.

            It used to be handed 选择风格 — the same section the builder gets,
            because one `panelSections` prop fed both. On this surface that
            section was inert: `applyStyle` writes the builder's project, and
            the preview renders `state.savedProject`, the snapshot taken when
            you entered. Applying 水墨风 here left `data-style-preset="native"`
            on screen and quietly restyled the project behind the preview. So
            the panel carries the controls that do belong to a run — which mode
            it runs in, and which transcript — and `panelSections` is only
            passed on the builder now.

            Full-width pickers rather than a row of two: the panel is 260px of
            content, which is what crushed them when they were in the control
            row above. */}
        {surfaceMode === "saved-preview" ? (
          <div className="canvas-panel-sections">
            <section className="canvas-panel-section topbar-run-section">
              <h3>{copy.shell.topbar.runModeLabel}</h3>
              <label className="run-mode-picker">
                <SelectMenu
                  size="sm"
                  ariaLabel={copy.shell.topbar.runModeLabel}
                  value={runMode}
                  onValueChange={(value) => onRunModeChange(value as RunMode)}
                  options={[
                    { value: "replay", label: copy.shell.topbar.runModeReplay },
                    { value: "live", label: copy.shell.topbar.runModeLive },
                    { value: "pi", label: copy.shell.topbar.runModePi },
                  ]}
                />
              </label>
              {/* Only replay has a transcript to choose. */}
              {runMode === "replay" ? (
                <label className="scenario-picker">
                  <span className="topbar-run-sublabel">{copy.shell.topbar.scenarioLabel}</span>
                  <SelectMenu
                    size="sm"
                    ariaLabel={copy.shell.topbar.scenarioLabel}
                    value={selectedScenarioId}
                    onValueChange={(value) => onScenarioChange(value as PreviewScenarioId)}
                    options={previewScenarios.map((scenario) => ({
                      value: scenario.id,
                      label: previewScenarioLabel(scenario, locale),
                    }))}
                  />
                </label>
              ) : null}
            </section>
          </div>
        ) : null}
        {panelSections}
      </div>
    </header>
    </HintBubbleGroup>
  );
}

/**
 * Preview control.
 *
 * Path is verbatim from the design; only the stroke is changed to
 * `currentColor` so it inherits the button's colour instead of the spec's
 * literal #111E36 — that value is this theme's `--text-primary`, and
 * hardcoding it would leave the icon invisible on a dark theme.
 */
function PreviewPlayIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M33.25 17.835C34.9167 18.7972 34.9166 21.2028 33.25 22.165L12.25 34.2891C10.5833 35.2513 8.5 34.0485 8.5 32.124L8.5 7.87598C8.5 5.95147 10.5833 4.74869 12.25 5.71094L33.25 17.835Z"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );
}

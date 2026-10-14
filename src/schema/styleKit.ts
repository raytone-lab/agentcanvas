/**
 * A style's default set of picked options — the thing that makes choosing a
 * style fill the canvas instead of only recolouring it.
 *
 * The rule, as specified: the first style in the picker takes the *first*
 * option of every either/or set, the second style takes the second, and so on,
 * clamped when a set is shorter than the style's position. It is a placeholder
 * for per-style curation, and a deliberately cheap one — it costs one function
 * instead of one table per style, and it guarantees the styles do not all open
 * on an identical configuration, which is the failure it exists to avoid.
 *
 * Two things it must not do, both of which "just take the Nth option
 * everywhere" would:
 *
 *   1. Leave a component off the canvas while picking options *for* it. The
 *      presence toggles are always included, so the third style does not end up
 *      selecting the sidebar's search field of a sidebar that was never turned
 *      on.
 *   2. Reduce an additive set to one member. A sidebar's title, search, list
 *      and footer are not alternatives — taking only the Nth would produce a
 *      sidebar with a search box and nothing else. Additive sets are taken
 *      whole.
 */

import { defaultCodingAgentProject, type AgentFrontendProject } from "./agentuxConfig";
import { applyPresetOption, isPresetOptionActive } from "./presetActions";
import { presetGroups, type PresetGroupId, type PresetOption } from "./presets";

/**
 * Groups a style has no opinion about.
 *
 * `theme` is the palette, which the style already sets through
 * `defaultThemeForStyle` — including it here would have the kit fight that.
 * `provider` and `git` are integration: which model is connected and whether a
 * repository is wired are the reader's facts about their own project, and a
 * style has no business overwriting them.
 *
 * `sidebar` and `composer` are structure. What a style has an opinion about is
 * how the event flow looks — the thinking glyph, the tool card, the settled
 * block — not whether there is a search field in the left column or a model
 * switcher in the composer. Those are the reader's to assemble, so entering a
 * style leaves both columns as they were: empty from a blank start, and
 * untouched if the reader had already built them.
 */
const KIT_EXCLUDED_GROUP_IDS: ReadonlySet<PresetGroupId> = new Set([
  "theme",
  "provider",
  "git",
  "sidebar",
  "composer",
]);

/**
 * Options the kit never requests, whatever section they sit in.
 *
 * `thinking-bars` writes `theme.motion.reasoning` — the same field the Motion
 * section's glyphs write — but it lives in Done style, because it is the choice
 * to show no glyph at all. Two sections writing one field is exactly the case
 * the reconciliation at the end of `styleKitOptionIds` resolves by last-writer,
 * and Done style comes after Motion in the option list: left in, it would win
 * for every style, so every style would open with the text cycle and the rail
 * would show its Motion pick unticked.
 *
 * Excluded rather than reordered, because the ordering is load-bearing in the
 * other direction too (the Nth-option rule reads it), and because a reader
 * picking Text cycle by hand *should* replace the glyph. The kit just has no
 * business choosing it on their behalf.
 */
const KIT_EXCLUDED_OPTION_IDS: ReadonlySet<string> = new Set([
  "thinking-bars",
  /*
   * The tool-call progress bar: a 3px fully-rounded track indented 33px from
   * the card above it, outlined by nothing.
   *
   * Excluded because nobody chose it. Its "Progress" section holds a single
   * card, and `isExclusiveSection` needs two members to observe one displacing
   * the other — so a section of one is read as additive and taken whole. That
   * quietly turned a behaviour opt-in into a default for every style.
   *
   * `toolCalls.progress` falls back to "status-icon", so the tool card keeps
   * its spinner; and the card is still there in the rail for anyone who wants
   * the bar. This only stops it arriving unasked.
   */
  "tool-progress-bar",
  /*
   * Four picks the Nth-option rule must not make, all for one reason: they are
   * the reader's to choose and they change *behaviour*, not looks — so a style
   * landing on them by position gave "some styles open, some closed", which is
   * exactly what was asked to stop ("我希望都是收起的"、"都能点开").
   *
   * `compact-chips` is "expanded rows, no disclosure button": the tool card
   * arrives open and cannot be closed.
   * `reasoning-expanded` and `summary-first` pin the thinking block open —
   * `summary-first` also removes the toggle (see `canToggleSummary`).
   * `reasoning-done-title-only` throws the settled body away, so there is
   * nothing left to open.
   *
   * All four stay in the rail. This only stops them arriving unasked, which
   * leaves every style on `command-cards` + `reasoning-auto-collapse` +
   * `reasoning-done-expandable`: closed when settled, and openable.
   */
  "compact-chips",
  "reasoning-expanded",
  "summary-first",
  "reasoning-done-title-only",
  /*
   * And the fifth, found by measuring rather than reading: 原生风's Visibility
   * pick landed here, and `show: "status"` means the block shows a status word
   * and *no* thinking text — so there was nothing behind the fold and the
   * header was correctly not clickable. Every other style had a summary to
   * open; this one could not, whatever the disclosure said.
   */
  "reasoning-status-only",
  /*
   * The right panel's three run sections.
   *
   * Additive by measurement — a task list does not displace a progress bar —
   * so the Nth-option rule does not apply and the kit takes the section whole:
   * measured as all three arriving for every style, against a schema default of
   * off for all three. `tool-progress-bar` was excluded for the same reason,
   * and the reasoning is the same one: a section of panel contents is a
   * behaviour opt-in, and taking it whole turns it into a default nobody chose.
   *
   * It also contradicts what the panel is. It opens as a document viewer, and
   * these three are each a second thing to read in it — which is a decision
   * about the product, not about the style.
   */
  "task-list",
  "exec-progress",
  "workspace-files",
]);

/** The options of one group, split into the sets the rail treats as sections. */
function sectionsOfGroup(options: readonly PresetOption[]): PresetOption[][] {
  const bySection = new Map<string, PresetOption[]>();
  for (const option of options) {
    const key = option.section ?? "";
    const bucket = bySection.get(key);
    if (bucket) bucket.push(option);
    else bySection.set(key, [option]);
  }
  return [...bySection.values()];
}

/**
 * Whether a section is an either/or set, measured rather than declared.
 *
 * There is no flag in the schema for this, and a hand-written list of "these
 * groups are exclusive" would drift the moment an option moved. So it is
 * observed instead: activate the first option, then the second, and ask whether
 * the first survived. If it did not, the section is mutually exclusive, because
 * that is exactly what mutual exclusion *is* — the same fact
 * `isOptionSelectedInRail` relies on when it says picking a second variant must
 * unselect the first.
 *
 * Run against a pristine project so the answer never depends on what the
 * reader has already configured.
 */
export function isExclusiveSection(options: readonly PresetOption[]): boolean {
  if (options.length < 2) return false;
  const [first, second] = options;

  let probe: AgentFrontendProject = defaultCodingAgentProject;
  if (!isPresetOptionActive(probe, first.id)) probe = applyPresetOption(probe, first.id);
  // An option with no preset action cannot be activated at all, so it can tell
  // us nothing about the section. Treat that as additive: taking the whole set
  // is the safe answer, since it cannot silently drop a live alternative.
  if (!isPresetOptionActive(probe, first.id)) return false;

  const after = isPresetOptionActive(probe, second.id) ? probe : applyPresetOption(probe, second.id);
  return !isPresetOptionActive(after, first.id);
}

/**
 * The handful of picks a style asks for by name.
 *
 * The index rule is a placeholder — it guarantees the styles do not all open on
 * an identical configuration, and nothing more. Where a style has an actual
 * opinion it says so here, and it is applied *after* the generic pass so it
 * wins: an either/or option applied last sets its field, and the reconciliation
 * at the end of `styleKitOptionIds` then drops whichever sibling it displaced,
 * so the rail never ticks something the canvas is not showing.
 *
 * Keyed by style id rather than by index, because these are statements about a
 * particular style rather than about its position in the picker.
 */
/*
 * A tool call opens collapsed, in every style.
 *
 * The index rule put only `native` on "Collapsed cards": `studio` landed on
 * "Expanded rows" and `game` and `pixel` on the timeline rail (the index
 * clamps, and the section has three entries for four styles). All three of
 * those render the body unconditionally and suppress the disclosure, so three
 * of the four styles opened on a tool call that could not be folded — while
 * the rail offered a fold control the canvas was not showing.
 *
 * The other two stay pickable from the rail; this only decides what a style
 * *opens* on.
 */
const COLLAPSED_TOOL_CALL = "command-cards";

export const STYLE_KIT_OVERRIDES: Partial<Record<string, readonly string[]>> = {
  // An hourglass, in a style whose whole vocabulary is a quest log. The
  // index rule would have handed it whichever motion happened to sit third in
  // the list.
  /* `sidebar-row-icon` is the one structural pick this style asks for by name,
     and it is allowed to because `sidebar` is excluded from the *generic* index
     pass rather than from overrides: the marks are not a component the reader
     assembles, they are how this style's list is read. */
  game: ["thinking-hourglass", COLLAPSED_TOOL_CALL, "sidebar-row-icon"],
  studio: [COLLAPSED_TOOL_CALL],
  pixel: [COLLAPSED_TOOL_CALL],
  /* Row marks: the reference puts a page glyph in front of every conversation,
     and this style resolves it through `pixelIconForSlot["session.item"]`, so no
     allow-list entry is needed — the pixel branch ignores the per-option choice
     for that slot and draws the grid glyph. */
  pixeldesk: [COLLAPSED_TOOL_CALL, "sidebar-row-icon"],
  retro: ["thinking-wave", COLLAPSED_TOOL_CALL],
};


/**
 * The option ids a style opens with.
 *
 * `styleIndex` is the style's position among the styles that have a kit — see
 * `styleKitIndex`. Returned as ids rather than as a project so the caller can
 * do both things that have to happen — fold them into the project, and record
 * them as picked so the rail shows them ticked. The rail needs the second half:
 * an either/or option reads as selected only when it was picked *and* is in
 * force, so a kit that only patched the project would leave the left column
 * looking untouched.
 *
 * A negative index means the style takes no kit (`blank`), and the answer is
 * the empty list — not the first option of every section, which is what a
 * clamp would have produced.
 */
export function styleKitOptionIds(styleIndex: number, overrides: readonly string[] = []): string[] {
  if (styleIndex < 0) return [];
  const requested: string[] = [];

  for (const group of presetGroups) {
    if (KIT_EXCLUDED_GROUP_IDS.has(group.id)) continue;

    for (const section of sectionsOfGroup(group.options)) {
      // Named-but-unbuilt options have no action behind them; including one
      // would put a tick on a card that does nothing.
      //
      // Filtered here rather than from the finished list so that dropping one
      // member of an either/or set lets the next one through, instead of
      // leaving the section unrepresented.
      const usable = section.filter(
        (option) => !option.pending && !KIT_EXCLUDED_OPTION_IDS.has(option.id),
      );
      if (usable.length === 0) continue;

      if (isExclusiveSection(usable)) {
        requested.push(usable[Math.min(styleIndex, usable.length - 1)].id);
      } else {
        for (const option of usable) requested.push(option.id);
      }
    }
  }

  /*
   * Reconcile, because "the Nth of every set" can ask for a combination that
   * cannot exist.
   *
   * Exclusivity is not confined to a section. Picking a renderer
   * (`renderer-auto` and friends) also sets `output.source` to "artifact" as a
   * consequence, which silently overwrites whatever the *output source*
   * section chose — so a kit could request `output-source-console` and end up
   * with a project showing an artifact. Measured: two of the 36 requested ids
   * came out inactive.
   *
   * Last writer wins, which is the right resolution — the implication is real,
   * and a renderer with no artifact to render would be the incoherent half. So
   * the kit is folded into a pristine project and then filtered down to what
   * actually survived. Keeping a clobbered id would put a tick in the rail
   * against something the canvas is not showing, which is the exact
   * contradiction `isOptionSelectedInRail` exists to prevent.
   *
   * Against a pristine project rather than the live one on purpose: the kit
   * writes every field it has an opinion about, so the survivors are a property
   * of the kit, not of what the reader had configured before.
   */
  // Last, so the style's own choices displace the generic pick in their section.
  for (const id of overrides) requested.push(id);

  const settled = applyStyleKit(defaultCodingAgentProject, requested);
  return requested.filter((id) => isPresetOptionActive(settled, id));
}

/**
 * Fold a kit into a project.
 *
 * Guarded rather than applied blind, because `applyPresetOption` toggles: an
 * additive option that is already on would be turned *off* by a second
 * application, so a kit run against a half-configured project would undo
 * exactly the parts that already matched it. Same guard `fillInAndRun` uses
 * for the completeness dialog.
 */
export function applyStyleKit(
  project: AgentFrontendProject,
  optionIds: readonly string[],
): AgentFrontendProject {
  return optionIds.reduce(
    (next, id) => (isPresetOptionActive(next, id) ? next : applyPresetOption(next, id)),
    project,
  );
}

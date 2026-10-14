import { useEffect, useMemo, useState, type ReactNode } from "react";
/* Split on purpose. `ChevronDown` is this panel's own disclosure arrow and
   `GitMerge` labels a section of it — editor chrome, which stays neutral
   whatever the canvas is wearing. The four below are the message-action
   picker, and every glyph in it is a picture of a button the canvas draws, so
   they come from `uiIcons` and follow the style. Same reasoning, and the same
   reported bug, as the import at the top of `PresetOptionPreview`. */
import { ChevronDown, GitMerge } from "lucide-react";
import { Clock3, Copy, Pencil, RotateCcw } from "../../agentmatrix/uiIcons";

import { StateGallery, type StateCard } from "../../components/agentmatrix/StateGallery";
import { PresetOptionPreview } from "../../components/PresetOptionPreview";
import { ProviderSettingsPanel } from "../../components/ProviderSettingsPanel";
import { WelcomeSettingsPanel } from "../../components/WelcomeSettingsPanel";
import { WritingParamControls, hasWritingParams } from "../../components/agent-preview/WritingParamControls";
import {
  translatePresetGroupName,
  translatePresetOptionDescription,
  translatePresetOptionLabel,
  translatePresetSection,
} from "../../i18n/presetCopy";
import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import { isPresetOptionActive } from "../../schema/presetActions";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import type {
  AgentFrontendProject,
  PresetStyleId,
  ProviderCatalogId,
  ProviderConnection,
  ProviderConnectionId,
} from "../../schema/agentuxConfig";
import { themeTokens } from "../../theme/themeTokens";
import type { MessageActionKey } from "../appTypes";
import {
  isOptionSelectedInRail,
  mountedComponentsForProject,
  visualStylePreset,
  groupsForNavSection,
  navSections,
  stateSectionTitle,
  type NavSectionId,
} from "../projection/presetRailData";
import { groupChoiceProgress, type SelectedComponentItem } from "../projection/selectedComponents";
import type { ProviderCheckResult } from "../viewmodel/useProviderSettings";

type PresetGroup = {
  id: PresetGroupId;
  label: string;
  options: PresetOption[];
};

type WritingParamKey = keyof AgentFrontendProject["theme"]["motion"]["writingParams"];

/**
 * The builder's left preset rail (pure view): style cards + confirm dialog,
 * group icon bar, and the per-group option panel. Every interaction funnels
 * into the callbacks the workspace controller provides.
 */
export function PresetRail({
  copy,
  locale,
  brand,
  layersPanel,
  project,
  navSection,
  onNavSectionChange,
  selectedComponentItems,
  pickedOptionIds,
  pickedIconSlots,
  eventFlowReady,
  onEventFlowLocked,
  pinnedOptionId,
  onPinnedOptionShown,
  presetDrawerOpen,
  visiblePresetGroups,
  selectedGroupId,
  selectedPresetGroup,
  selectedPresetStyle,
  styleSwitching,
  onPresetGroupClick,
  stateCards,
  selectedStateCode,
  isStateCardSelected,
  onStateCardToggle,
  onStateCardPickIcon,
  onStateCardDisable,
  onToolActionsOverview,
  renderedPresetSections,
  showPresetSectionLabels,
  onSelectPreset,
  onWritingParamChange,
  showDebugBadges,
  messageActionActive,
  onMessageActionChange,
  sessionKeys,
  providerControls,
  onWelcomeGreetingChange,
  onWelcomeActivate,
}: {
  copy: UiCopy;
  locale: AppLocale;
  /** The product wordmark and language switch, which sit at the top of the card. */
  brand?: ReactNode;
  /**
   * The canvas's layer list, composed by the shell.
   *
   * It needs the project and half the workspace's selection state, so threading
   * all of it through this view — which otherwise only knows about preset
   * groups — would make the rail the shell.
   */
  layersPanel: ReactNode;
  project: AgentFrontendProject;
  navSection: NavSectionId;
  onNavSectionChange: (section: NavSectionId) => void;
  selectedComponentItems: readonly SelectedComponentItem[];
  /** Clicked options, which the layer tree needs for variant-only picks. */
  pickedOptionIds: readonly string[];
  /** Icon slots the reader has chosen, so a default does not read as a pick. */
  pickedIconSlots: readonly string[];
  /** False until a conversation exists for the event flow's stages to show in. */
  eventFlowReady: boolean;
  /** A click landed in the locked event flow; say what is missing, where it landed. */
  onEventFlowLocked: (x: number, y: number) => void;
  /** Set by the canvas toolbar's Edit: scroll this option in and flash it. */
  pinnedOptionId: string | null;
  onPinnedOptionShown: () => void;
  presetDrawerOpen: boolean;
  visiblePresetGroups: PresetGroup[];
  selectedGroupId: PresetGroupId;
  selectedPresetGroup: PresetGroup;
  selectedPresetStyle: PresetStyleId;
  styleSwitching: boolean;
  onPresetGroupClick: (groupId: PresetGroupId) => void;
  stateCards: StateCard[];
  selectedStateCode: string | null;
  isStateCardSelected: (card: StateCard) => boolean;
  onStateCardToggle: (card: StateCard) => void;
  onStateCardPickIcon: (card: StateCard) => void;
  onStateCardDisable: (card: StateCard) => void;
  onToolActionsOverview: (card?: StateCard) => void;
  renderedPresetSections: { label: string; items: PresetOption[] }[];
  showPresetSectionLabels: boolean;
  onSelectPreset: (optionId: string) => void;
  onWritingParamChange: (key: WritingParamKey, value: number) => void;
  showDebugBadges: boolean;
  messageActionActive: (key: MessageActionKey) => boolean;
  onMessageActionChange: (key: MessageActionKey, enabled: boolean) => void;
  sessionKeys: Record<string, string>;
  providerControls: {
    onFetchModels: (provider: ProviderConnection, sessionKey?: string) => void | Promise<ProviderCheckResult>;
    onSave: () => void;
    onSetDefaultProvider: (id: ProviderConnectionId) => void;
    onSessionKeyChange: (id: ProviderConnectionId, value: string) => void;
    onTestProvider: (provider: ProviderConnection, sessionKey?: string) => void | Promise<ProviderCheckResult>;
    onToggleProvider: (id: ProviderCatalogId) => void;
    onToggleSettingsLauncher: () => void;
    onUpdateProvider: (
      id: ProviderConnectionId,
      patch: Partial<Pick<ProviderConnection, "baseUrl" | "defaultModel" | "label" | "models">> & { authEnvVar?: string },
    ) => void;
  };
  onWelcomeGreetingChange: (greeting: string) => void;
  onWelcomeActivate: () => void;
}) {
  // Structure and Components show their groups as a containment tree: the group
  // row is the header, and the options it owns are nested under it. The other
  // destinations have a single group, so there is nothing to nest.
  const nestsOptionsUnderGroups = navSection === "structure" || navSection === "components";
  /**
   * Which stages of the turn have been covered.
   *
   * The event flow is a sequence, so Components reads as a vertical axis: a dot
   * per stage, and a tick once that stage has something picked in it. Progress,
   * not a gate — an agent with no tools never enters 工具调用, and demanding all
   * seven would mean configuring states it cannot reach. Preview and export are
   * where a project is actually held to a requirement.
   */
  // What the canvas is drawing, so a presence toggle can tick when its
  // component is on it.
  const mountedComponents = mountedComponentsForProject(project, selectedComponentItems, pickedOptionIds);
  // Every group's count, for the rows. Memoised: the exclusivity test applies
  // options pairwise, which is cheap once and wasteful on every hover.
  const groupProgress = useMemo(
    () =>
      new Map(
        visiblePresetGroups.map((group) => [
          group.id,
          groupChoiceProgress(project, group, {
            stylePreset: selectedPresetStyle,
            picked: pickedOptionIds,
            mounted: mountedComponentsForProject(project, selectedComponentItems, pickedOptionIds),
          }),
        ]),
      ),
    [project, visiblePresetGroups, selectedPresetStyle, pickedOptionIds, selectedComponentItems],
  );
  // Exactly one group is open at a time, because the option set is projected for
  // the selected group — expanding a second would have to re-project the first,
  // which is work the panel does not need to do to be read top to bottom.
  // `null` means "the selected group is open", which is the default.
  const [collapsedGroupId, setCollapsedGroupId] = useState<PresetGroupId | null>(null);

  // The option arrives pinned before the group that holds it has rendered, so
  // this runs after paint and clears the pin once it has done its job.
  useEffect(() => {
    if (!pinnedOptionId) return;
    const cell = document.querySelector(`.preset-option-cell[data-option-id="${pinnedOptionId}"]`);
    if (!cell) return;
    cell.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = window.setTimeout(onPinnedOptionShown, 2600);
    return () => window.clearTimeout(timer);
  }, [pinnedOptionId, onPinnedOptionShown, navSection, selectedGroupId]);

  /**
   * Whether this panel has anything in it — which decides the "先占个位"
   * placeholder below.
   *
   * Option sections are not the only thing a panel holds, and keying the
   * placeholder on them alone is what put the dashed box directly above 运行
   * 状态's cards: that group's content *is* its state cards, and its only two
   * options are `error-collapse` (surfaced as its own block, so filtered out of
   * the sections) and one more that is withheld. Sections empty, panel full.
   *
   * The four terms are the four kinds of content this panel can render. Git and
   * Provider are not among them because they replace this whole branch in the
   * conditional below, so the placeholder can never compete with either.
   */
  const hasPanelContent =
    renderedPresetSections.length > 0 ||
    stateCards.length > 0 ||
    // 输入框 ends with the welcome-message editor, 对话区 with the two
    // message-action pickers — both outside the sections.
    selectedPresetGroup.id === "composer" ||
    selectedPresetGroup.id === "conversation";

  /**
   * The avatar gallery. Hoisted so it can sit on either side of the option
   * sections: 对话区 puts 布局 first, because whether the conversation shows at
   * all comes before which face it wears.
   */
  const stateGallerySection =
    stateCards.length > 0 && selectedPresetGroup.id !== "tool-calls" ? (
            <section className="preset-option-section">
              <h3>{stateSectionTitle(selectedPresetGroup.id, locale)}</h3>
              <StateGallery
                cards={stateCards}
                activeCode={selectedStateCode}
                isSelected={isStateCardSelected}
                onSelect={onStateCardToggle}
                onPickIcon={onStateCardPickIcon}
                onDeselect={onStateCardDisable}
                pickedSlots={pickedIconSlots}
                stylePreset={project.theme.stylePreset}
                themePreset={project.theme.preset}
              />
              {selectedPresetGroup.id === "conversation" ? (
                <div className="preset-option-cell" data-option-id="speaker-labels">
                  <button
                    className="preset-option"
                    data-active={isPresetOptionActive(project, "speaker-labels")}
                    aria-pressed={isPresetOptionActive(project, "speaker-labels")}
                    aria-label={translatePresetOptionLabel("speaker-labels", "Name label", locale)}
                    type="button"
                    onClick={() => onSelectPreset("speaker-labels")}
                  >
                    <PresetOptionPreview optionId="speaker-labels" />
                  </button>
                  <span className="preset-option-name">
                    <span>{translatePresetOptionLabel("speaker-labels", "Name label", locale)}</span>
                  </span>
                </div>
              ) : null}
            </section>
    ) : null;
  // Groups whose gallery belongs after their options rather than before.
  const galleryAfterOptions = selectedPresetGroup.id === "conversation";
  const panelBody = (
        <div className="preset-panel-body">
          {styleSwitching ? (
            <div className="preset-panel-skeleton" aria-hidden="true">
              <span className="preset-skel-line" />
              <span className="preset-skel-card" />
              <span className="preset-skel-card" />
              <span className="preset-skel-card" />
              <span className="preset-skel-card" />
              <span className="preset-skel-card" />
            </div>
          ) : (
            <>
          {stateCards.length && selectedPresetGroup.id === "tool-calls" ? (
            <section className="preset-option-section">
              <h3>{stateSectionTitle(selectedPresetGroup.id, locale)}</h3>
              <StateGallery
                cards={stateCards}
                activeCode={selectedStateCode}
                isSelected={isStateCardSelected}
                onSelect={onToolActionsOverview}
                onPickIcon={onToolActionsOverview}
                onDeselect={onToolActionsOverview}
                pickedSlots={pickedIconSlots}
                stylePreset={project.theme.stylePreset}
                themePreset={project.theme.preset}
              />
            </section>
          ) : null}
          {galleryAfterOptions ? null : stateGallerySection}
          {selectedPresetGroup.id === "git" ? (
            <div className="am-comingsoon">
              <span className="am-comingsoon-icon" aria-hidden="true">
                <GitMerge size={18} strokeWidth={1.5} />
              </span>
              <strong>{copy.workspace.gitFrame.comingSoonTitle}</strong>
              <p>{copy.workspace.gitFrame.comingSoonBody}</p>
            </div>
          ) : selectedPresetGroup.id === "provider" ? (
            <ProviderSettingsPanel
              project={project}
              sessionKeys={sessionKeys}
              onFetchModels={providerControls.onFetchModels}
              onSave={providerControls.onSave}
              onSetDefaultProvider={providerControls.onSetDefaultProvider}
              onSessionKeyChange={providerControls.onSessionKeyChange}
              onTestProvider={providerControls.onTestProvider}
              onToggleProvider={providerControls.onToggleProvider}
              onToggleSettingsLauncher={providerControls.onToggleSettingsLauncher}
              onUpdateProvider={providerControls.onUpdateProvider}
            />
          ) : (
            <>
            {hasPanelContent ? null : (
              // A stage that is in the flow but has nothing to configure yet.
              // Silence here reads as a bug — the reader clicked a group and
              // got a blank panel — so the group says so itself.
              <p className="preset-panel-placeholder">{copy.shell.presetRail.emptyGroup}</p>
            )}
            {renderedPresetSections.map((section) => (
              <section className="preset-option-section" key={section.label}>
                {/* 动效 over 思考中's eight motions repeats the group's own name;
                    it stays unlabelled now that the group has other sections
                    which do need telling apart. */}
                {showPresetSectionLabels && section.label !== "Scaffold theme" && section.label !== "Motion" ? (
                  <h3>{translatePresetSection(section.label, locale)}</h3>
                ) : null}
                <div className="preset-option-list">
                  {section.items.map((option) => {
                    const active = isOptionSelectedInRail(
                      project,
                      option,
                      selectedPresetGroup.id,
                      pickedOptionIds,
                      mountedComponents,
                    );
                    const showParams = active && hasWritingParams(option.id);
                    const optionLabel = translatePresetOptionLabel(option.id, option.label, locale);
                    // Named but unbuilt: inert and dimmed, with the description
                    // in the tooltip so the card still says what it will do.
                    if (option.pending) {
                      return (
                        <div className="preset-option-cell" key={option.id} data-option-id={option.id} data-pending="true">
                          <span
                            className="preset-option"
                            data-pending="true"
                            aria-disabled="true"
                            title={translatePresetOptionDescription(option.id, option.description, locale)}
                          >
                            <PresetOptionPreview optionId={option.id} />
                          </span>
                          <span className="preset-option-name">
                            <span>{optionLabel}</span>
                            <em className="preset-option-badge" data-pending="true">
                              {copy.shell.presetRail.pendingBadge}
                            </em>
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        className="preset-option-cell"
                        key={option.id}
                        data-option-id={option.id}
                        data-theme-style={option.themeStyle}
                        data-pinned={option.id === pinnedOptionId ? "true" : undefined}
                      >
                        <button
                          className="preset-option"
                          data-active={active}
                          aria-pressed={active}
                          aria-label={optionLabel}
                          type="button"
                          onClick={() => onSelectPreset(option.id)}
                        >
                          <PresetOptionPreview optionId={option.id} projectName={project.name} />
                        </button>
                        {showParams ? (
                          <WritingParamControls
                            optionId={option.id}
                            params={project.theme.motion.writingParams}
                            onChange={onWritingParamChange}
                          />
                        ) : null}
                        <span className="preset-option-name">
                          <span>{optionLabel}</span>
                          {active && showDebugBadges ? (
                            <em className="preset-option-badge">{copy.shell.presetRail.activeBadge}</em>
                          ) : null}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
            {selectedPresetGroup.id === "composer" ? (
              <WelcomeSettingsPanel
                greeting={project.welcome.greeting}
                onChange={onWelcomeGreetingChange}
                onActivate={onWelcomeActivate}
              />
            ) : null}
            </>
          )}
          {selectedPresetGroup.id === "conversation" ? (
            <>
              {(
                [
                  {
                    title: copy.shell.editor.messageActions.sentTitle,
                    items: [
                      { key: "userCopy", label: copy.shell.editor.messageActions.copy, Icon: Copy },
                      { key: "userEdit", label: copy.shell.editor.messageActions.edit, Icon: Pencil },
                      { key: "userTime", label: copy.shell.editor.messageActions.time, Icon: Clock3 },
                    ],
                  },
                  {
                    title: copy.shell.editor.messageActions.generatedTitle,
                    items: [
                      { key: "agentCopy", label: copy.shell.editor.messageActions.copy, Icon: Copy },
                      { key: "agentRegenerate", label: copy.shell.editor.messageActions.regenerate, Icon: RotateCcw },
                      { key: "agentEdit", label: copy.shell.editor.messageActions.edit, Icon: Pencil },
                      { key: "agentTime", label: copy.shell.editor.messageActions.time, Icon: Clock3 },
                    ],
                  },
                ] as const
              ).map((group) => (
                <section className="preset-option-section" key={group.title}>
                  <h3>{group.title}</h3>
                  <div className="message-action-picker" role="group" aria-label={group.title}>
                    {group.items.map((item) => {
                      const active = messageActionActive(item.key);
                      return (
                        <button
                          key={item.key}
                          type="button"
                          className="message-action-choice"
                          data-active={active}
                          aria-pressed={active}
                          aria-label={item.label}
                          title={item.label}
                          onClick={() => onMessageActionChange(item.key, !active)}
                        >
                          <item.Icon size={14} />
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          ) : null}
            </>
          )}
          {galleryAfterOptions ? stateGallerySection : null}
        </div>
  );

  return (
    /*
     * No style-switch dialog here any more.
     *
     * It asked "确定切换为「手绘风」？" and warned that the style brings its own
     * components — a fair warning when the trigger was a bare swatch. The
     * picker is a card with an Apply button on it now, so the button is the
     * confirmation and the sheet asked the same question twice. See
     * `useStyleSwitch.applyStyle`; the `confirmTitle` / `confirmDescription` /
     * `cancel` strings stay in the copy for whatever next needs a confirm.
     */
    <div className="preset-nav" data-open={presetDrawerOpen} data-nav-section={navSection}>
      {brand}
      <div className="preset-columns">
      {/* Four destinations, not thirteen groups. The groups still exist — they
          moved one level down, into the Components destination — so nothing is
          unreachable, but the first decision is now four-wide instead of
          thirteen-wide. */}
      <aside className="preset-iconbar" aria-label={copy.shell.presetRail.title}>
        {navSections.map((section) => {
          const NavIcon = section.icon;
          const isActive = section.id === navSection;
          const label = section.label[locale];
          return (
            <button
              key={section.id}
              className="nav-section-tile"
              data-nav-section={section.id}
              data-active={isActive}
              type="button"
              aria-pressed={isActive}
              onClick={() => onNavSectionChange(section.id)}
            >
              <span className="nav-section-glyph" aria-hidden="true"><NavIcon size={16} /></span>
              <span className="nav-section-label">{label}</span>
            </button>
          );
        })}
      </aside>

      {/* Every destination keeps the group panel, with App.tsx pointing
          `selectedGroup` at the group each one owns. Reusing the panel rather
          than rebuilding it per destination is why provider settings still
          work.

          The layer list is a destination here again — 图层, the first icon in
          the column. It spent a round in the canvas's own panel on the right,
          which is where what it lists is; that side now holds the style and its
          palettes, which is a choice of starting point rather than an
          inventory, so the inventory came back to the column it is read beside.

          Theme is no longer a destination: its palettes went with the style.

          The project's name used to sit above this panel. It is beside the mark
          at the top of the card now — it names the thing being configured, and
          this panel is only one of the ways to configure it. */}
      <aside
        className="preset-panel"
        data-preset-group={selectedPresetGroup.id}
        data-nav-section={navSection}
        data-style-preset={visualStylePreset(selectedPresetStyle)}
        data-style-id={selectedPresetStyle}
        data-appearance={themeTokens[project.theme.preset].appearance}
        data-theme-preset={project.theme.preset}
        aria-label={translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}
      >
        {/* The group selector used to be column 1. With four destinations there,
            it moves in here — without it only whichever group happened to be
            selected was reachable and the other twelve were not. Grouped by the
            same `presetRailSections` as before, as a list because there is one
            column now rather than two. */}
      {/* The style cards were here, inside the Theme destination. They moved out
            to `StyleBar`, floating over the top of the canvas: picking a whole
            style is one of the product's two entry paths, and it was sitting
            three clicks inside the other one. Theme keeps the palettes, which
            is the narrower question it was always better at answering.

            `onStyleSwitchRequest` and `selectedPresetStyle` still arrive here —
            the confirm dialog below is still the rail's, because it is the
            column whose selections the switch replaces. */}
        {/* The group list, scoped to the destination. Structure and Components
            used to be two sections of one list; each is a destination now, so
            the list shows one section and the section label would only repeat
            the destination name. */}
        {navSection === "layers" ? layersPanel : null}
        {navSection === "structure" || navSection === "components" ? (
          <div
            className="group-list"
            // Locked until there is a conversation to show a stage in. Clicks
            // are intercepted rather than blocked with `pointer-events`, so the
            // rail can say why instead of going quiet.
            data-flow-locked={navSection === "components" && !eventFlowReady ? "true" : undefined}
            onClickCapture={
              navSection === "components" && !eventFlowReady
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onEventFlowLocked(event.clientX, event.clientY);
                  }
                : undefined
            }
          >
            {[groupsForNavSection(navSection)].map((groupIds, index) => {
              const groups = groupIds
                .map((id) => visiblePresetGroups.find((group) => group.id === id))
                .filter((group): group is (typeof visiblePresetGroups)[number] => Boolean(group));
              if (groups.length === 0) return null;
              return (
                <div className="group-list-section" key={index}>
                  <ul className="layers-list">
                    {groups.map((group) => {
                      const groupName = translatePresetGroupName(group.id, copy.shell.presetRail.groups[group.id].label, locale);
                      const isActive = group.id === selectedGroupId;
                      const expanded = isActive && collapsedGroupId !== group.id;
                      return (
                        <li key={group.id} data-expanded={expanded}>
                          <button
                            type="button"
                            className="layers-row group-row"
                            data-active={isActive}
                            aria-expanded={expanded}
                            title={copy.shell.presetRail.groups[group.id].description}
                            onClick={() => {
                              // Clicking the open group closes it; clicking any
                              // other opens it. Selecting and expanding are the
                              // same gesture — a selected-but-closed group would
                              // be a state with nothing to show for it.
                              if (isActive) {
                                setCollapsedGroupId(expanded ? group.id : null);
                                return;
                              }
                              setCollapsedGroupId(null);
                              onPresetGroupClick(group.id);
                            }}
                          >
                            {/* The axis and its ticks are gone, on request. They drew the
                                seven groups as a sequence with a progress state — and the
                                sequence is not one (审批 and 运行状态 end the run and
                                continue in the next), while "covered" answered a question
                                nobody asked: a group is not a task to complete. */}
                            <span className="group-row-chevron" aria-hidden="true">
                              <ChevronDown size={14} />
                            </span>
                            <span className="layers-row-name">{groupName}</span>
                            <GroupProgress locale={locale} {...(groupProgress.get(group.id) ?? { done: 0, total: 0 })} />
                          </button>
                          {expanded ? <div className="group-row-body">{panelBody}</div> : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : null}
        {/* Structure and Components nest the options under the group they
            belong to, so the panel is not a list up here and its detail down
            there. The other destinations have no group list, so the group name
            is the panel title. */}
        {nestsOptionsUnderGroups || navSection === "layers" ? null : (
          <>
            <div className="preset-panel-header">
              <span className="preset-panel-title">{translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}</span>
              <p className="preset-panel-desc">{copy.shell.presetRail.groups[selectedPresetGroup.id].description}</p>
            </div>
            {panelBody}
          </>
        )}
      </aside>
      </div>
    </div>
  );
}

const PROGRESS_COPY: Record<AppLocale, (done: number, total: number) => string> = {
  zh: (done, total) => (done >= total ? `已选全部 ${total} 项` : `已选 ${done} 项，还有 ${total - done} 项未选`),
  en: (done, total) => (done >= total ? `All ${total} chosen` : `${done} chosen, ${total - done} not yet`),
  ja: (done, total) => (done >= total ? `${total} 項目すべて選択済み` : `${done} 項目選択、残り ${total - done} 項目`),
};

/**
 * The count on a group row: how many of its choices are made.
 *
 * So a reader scanning 架构 or 组件 can see which groups still have something
 * left without opening each — "要不其实用户很容易遗漏". `done/total` rather than
 * a bare remainder, because a lone number cannot say which of the two it is.
 * A finished group trades the fraction for a tick; an untouched one stays
 * quiet so that the groups in progress are the ones that stand out.
 */
function GroupProgress({ done, total, locale }: { done: number; total: number; locale: AppLocale }) {
  if (total === 0) return null;
  const state = done === 0 ? "none" : done >= total ? "all" : "some";
  const label = (PROGRESS_COPY[locale] ?? PROGRESS_COPY.zh)(done, total);
  return (
    <span className="group-row-count" data-state={state} title={label} aria-label={label}>
      {state === "all" ? (
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true">
          <path d="M2.6 6.3 4.9 8.6 9.4 3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : null}
      <span aria-hidden="true">
        <b>{done}</b>/{total}
      </span>
    </span>
  );
}

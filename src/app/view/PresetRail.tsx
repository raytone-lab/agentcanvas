import { useEffect, useState } from "react";
import { ChevronDown, Clock3, Copy, GitMerge, Pencil, RotateCcw } from "lucide-react";

import { StateGallery, type StateCard } from "../../components/agentmatrix/StateGallery";
import { PresetOptionPreview } from "../../components/PresetOptionPreview";
import { ProviderSettingsPanel } from "../../components/ProviderSettingsPanel";
import { WelcomeSettingsPanel } from "../../components/WelcomeSettingsPanel";
import { WritingParamControls, hasWritingParams } from "../../components/agent-preview/WritingParamControls";
import { Dialog, DialogClose, DialogContent } from "../../components/ui/dialog";
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
  groupsForNavSection,
  navSections,
  presetStyleOptions,
  stateSectionTitle,
  type NavSectionId,
} from "../projection/presetRailData";
import { LayersPanel } from "./LayersPanel";
import type { SelectedComponentItem } from "../projection/selectedComponents";

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
  project,
  navSection,
  onNavSectionChange,
  selectedLayerId,
  onSelectLayer,
  selectedSlotId,
  onSelectSlot,
  onRenameProject,
  selectedComponentItems,
  pinnedOptionId,
  onPinnedOptionShown,
  presetDrawerOpen,
  visiblePresetGroups,
  selectedGroupId,
  selectedPresetGroup,
  selectedPresetStyle,
  styleSwitching,
  pendingStyle,
  pendingStyleLabel,
  onPendingStyleChange,
  onStyleSwitchRequest,
  onStyleSwitchConfirm,
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
  project: AgentFrontendProject;
  navSection: NavSectionId;
  onNavSectionChange: (section: NavSectionId) => void;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onRenameProject: (name: string) => void;
  selectedComponentItems: readonly SelectedComponentItem[];
  /** Set by the canvas toolbar's Edit: scroll this option in and flash it. */
  pinnedOptionId: string | null;
  onPinnedOptionShown: () => void;
  presetDrawerOpen: boolean;
  visiblePresetGroups: PresetGroup[];
  selectedGroupId: PresetGroupId;
  selectedPresetGroup: PresetGroup;
  selectedPresetStyle: PresetStyleId;
  styleSwitching: boolean;
  pendingStyle: PresetStyleId | null;
  pendingStyleLabel: string;
  onPendingStyleChange: (style: PresetStyleId | null) => void;
  onStyleSwitchRequest: (styleId: PresetStyleId, tabButton: HTMLButtonElement) => void;
  onStyleSwitchConfirm: () => void;
  onPresetGroupClick: (groupId: PresetGroupId) => void;
  stateCards: StateCard[];
  selectedStateCode: string | null;
  isStateCardSelected: (card: StateCard) => boolean;
  onStateCardToggle: (card: StateCard) => void;
  onStateCardPickIcon: (card: StateCard) => void;
  onStateCardDisable: (card: StateCard) => void;
  onToolActionsOverview: () => void;
  renderedPresetSections: { label: string; items: PresetOption[] }[];
  showPresetSectionLabels: boolean;
  onSelectPreset: (optionId: string) => void;
  onWritingParamChange: (key: WritingParamKey, value: number) => void;
  showDebugBadges: boolean;
  messageActionActive: (key: MessageActionKey) => boolean;
  onMessageActionChange: (key: MessageActionKey, enabled: boolean) => void;
  sessionKeys: Record<string, string>;
  providerControls: {
    onFetchModels: (provider: ProviderConnection, sessionKey?: string) => void;
    onSave: () => void;
    onSetDefaultProvider: (id: ProviderConnectionId) => void;
    onSessionKeyChange: (id: ProviderConnectionId, value: string) => void;
    onTestProvider: (provider: ProviderConnection, sessionKey?: string) => void;
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
          ) : selectedPresetStyle === "studio" ? (
            <div className="preset-panel-building">{copy.shell.editor.underConstruction}</div>
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
              />
            </section>
          ) : null}
          {stateCards.length && selectedPresetGroup.id !== "tool-calls" ? (
            <section className="preset-option-section">
              <h3>{stateSectionTitle(selectedPresetGroup.id, locale)}</h3>
              <StateGallery
                cards={stateCards}
                activeCode={selectedStateCode}
                isSelected={isStateCardSelected}
                onSelect={onStateCardToggle}
                onPickIcon={onStateCardPickIcon}
                onDeselect={onStateCardDisable}
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
          ) : null}
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
            {renderedPresetSections.map((section) => (
              <section className="preset-option-section" key={section.label}>
                {showPresetSectionLabels && section.label !== "Scaffold theme" ? (
                  <h3>{translatePresetSection(section.label, locale)}</h3>
                ) : null}
                <div className="preset-option-list">
                  {section.items.map((option) => {
                    const active = isPresetOptionActive(project, option.id);
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
                          <PresetOptionPreview optionId={option.id} />
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
        </div>
  );

  return (
    <div className="preset-nav" data-open={presetDrawerOpen} data-nav-section={navSection}>
      <Dialog
        open={pendingStyle !== null}
        onOpenChange={(open) => {
          if (!open) {
            onPendingStyleChange(null);
          }
        }}
      >
        {pendingStyle === "studio" ? (
          <DialogContent
            title={copy.shell.editor.styleSwitch.unbuiltTitle.replace("{style}", pendingStyleLabel)}
            description={copy.shell.editor.styleSwitch.unbuiltDescription}
            width={380}
          >
            <div className="style-switch-actions">
              <DialogClose className="primary-button">
                {copy.shell.editor.styleSwitch.gotIt}
              </DialogClose>
            </div>
          </DialogContent>
        ) : pendingStyle ? (
          <DialogContent
            title={copy.shell.editor.styleSwitch.confirmTitle.replace("{style}", pendingStyleLabel)}
            description={copy.shell.editor.styleSwitch.confirmDescription.replaceAll("{style}", pendingStyleLabel)}
            width={380}
          >
            <div className="style-switch-actions">
              <DialogClose className="secondary-button">
                {copy.shell.editor.styleSwitch.cancel}
              </DialogClose>
              <button type="button" className="primary-button" onClick={onStyleSwitchConfirm}>
                {copy.shell.editor.styleSwitch.confirm}
              </button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
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
              <span className="nav-section-glyph" aria-hidden="true"><NavIcon size={18} /></span>
              <span className="nav-section-label">{label}</span>
            </button>
          );
        })}
      </aside>

      {/* File shows the canvas structure as layers; the other three keep the
          group panel, with App.tsx pointing `selectedGroup` at the group each
          destination owns. Reusing the panel rather than rebuilding it per
          destination is why theme cards and provider settings still work. */}
      {navSection === "file" ? (
        <aside className="preset-panel" data-nav-section="file" aria-label={copy.shell.presetRail.layers.title}>
          <LayersPanel
            project={project}
            locale={locale}
            selectedLayerId={selectedLayerId}
            onSelectLayer={onSelectLayer}
            selectedSlotId={selectedSlotId}
            onSelectSlot={onSelectSlot}
            onRenameProject={onRenameProject}
            selectedComponentItems={selectedComponentItems}
            title={copy.shell.presetRail.layers.title}
            layersLabel={copy.shell.presetRail.layers.sectionTitle}
          />
        </aside>
      ) : (
      <aside
        className="preset-panel"
        data-preset-group={selectedPresetGroup.id}
        data-nav-section={navSection}
        data-style-preset={selectedPresetStyle}
        data-appearance={themeTokens[project.theme.preset].appearance}
        data-theme-preset={project.theme.preset}
        aria-label={translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}
      >
        {/* The group selector used to be column 1. With four destinations there,
            it moves in here — without it only whichever group happened to be
            selected was reachable and the other twelve were not. Grouped by the
            same `presetRailSections` as before, as a list because there is one
            column now rather than two. */}
      {/* Moved inside the Theme destination. Above the columns it had 304px to
            show 550px of cards, so the fourth style was off-screen entirely and
            the third was cut in half — measured, and already true at three
            cards. In one column it wraps instead of clipping. */}
          {navSection === "theme" ? (
        <div className="preset-style-cards" role="tablist" aria-label={copy.shell.editor.chooseStyle}>
          {presetStyleOptions.map((style) => (
            <button
              key={style.id}
              className="preset-style-card"
              type="button"
              role="tab"
              data-style={style.id}
              data-active={style.id === selectedPresetStyle}
              aria-selected={style.id === selectedPresetStyle}
              onClick={(event) => onStyleSwitchRequest(style.id, event.currentTarget)}
            >
              <span className="preset-style-card-swatch" aria-hidden="true" />
              <span className="preset-style-card-name">{style.label[locale]}</span>
            </button>
          ))}
        </div>
        ) : null}
        {/* The group list, scoped to the destination. Structure and Components
            used to be two sections of one list; each is a destination now, so
            the list shows one section and the section label would only repeat
            the destination name. */}
        {navSection === "structure" || navSection === "components" ? (
          <div className="group-list">
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
                            <span className="group-row-chevron" aria-hidden="true">
                              <ChevronDown size={14} />
                            </span>
                            <span className="layers-row-name">{groupName}</span>
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
        {nestsOptionsUnderGroups ? null : (
          <>
            <div className="preset-panel-header">
              <span className="preset-panel-title">{translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}</span>
              <p className="preset-panel-desc">{copy.shell.presetRail.groups[selectedPresetGroup.id].description}</p>
            </div>
            {panelBody}
          </>
        )}
      </aside>
      )}
      </div>
    </div>
  );
}

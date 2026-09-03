import { Clock3, Copy, GitMerge, Pencil, RotateCcw } from "lucide-react";

import { StateGallery, type StateCard } from "../../components/agentmatrix/StateGallery";
import { PresetOptionPreview } from "../../components/PresetOptionPreview";
import { ProviderSettingsPanel } from "../../components/ProviderSettingsPanel";
import { WelcomeSettingsPanel } from "../../components/WelcomeSettingsPanel";
import { WritingParamControls, hasWritingParams } from "../../components/agent-preview/WritingParamControls";
import { Dialog, DialogClose, DialogContent } from "../../components/ui/dialog";
import {
  translatePresetGroupName,
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
import { presetGroupIcons, presetRailSections, presetStyleOptions, stateSectionTitle } from "../projection/presetRailData";

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
  return (
    <div className="preset-nav" data-open={presetDrawerOpen}>
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
      <aside className="preset-iconbar" aria-label={copy.shell.presetRail.title}>
        {presetRailSections.map((section) => {
          const groups = section.groupIds
            .map((id) => visiblePresetGroups.find((group) => group.id === id))
            .filter((group): group is (typeof visiblePresetGroups)[number] => Boolean(group));
          if (groups.length === 0) return null;
          return (
            <div className="preset-iconbar-group" key={section.id}>
              {groups.map((group) => {
                const TabIcon = presetGroupIcons[group.id];
                const groupName = translatePresetGroupName(group.id, copy.shell.presetRail.groups[group.id].label, locale);
                const isActive = group.id === selectedGroupId;
                return (
                  <button
                    key={group.id}
                    className="preset-icon-tile"
                    data-preset-group={group.id}
                    data-active={isActive}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={groupName}
                    title={groupName}
                    onClick={() => onPresetGroupClick(group.id)}
                  >
                    <span className="preset-icon-glyph" aria-hidden="true"><TabIcon size={16} /></span>
                    <span className="preset-icon-label">{groupName}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </aside>

      <aside
        className="preset-panel"
        data-preset-group={selectedPresetGroup.id}
        data-style-preset={selectedPresetStyle}
        data-appearance={themeTokens[project.theme.preset].appearance}
        data-theme-preset={project.theme.preset}
        aria-label={translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}
      >
        <div className="preset-panel-header">
          <span className="preset-panel-title">{translatePresetGroupName(selectedPresetGroup.id, copy.shell.presetRail.groups[selectedPresetGroup.id].label, locale)}</span>
          <p className="preset-panel-desc">{copy.shell.presetRail.groups[selectedPresetGroup.id].description}</p>
        </div>
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
                    return (
                      <div className="preset-option-cell" key={option.id} data-option-id={option.id}>
                        <button
                          className="preset-option"
                          data-active={active}
                          aria-pressed={active}
                          aria-label={translatePresetOptionLabel(option.id, option.label, locale)}
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
                          <span>{translatePresetOptionLabel(option.id, option.label, locale)}</span>
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
      </aside>
      </div>
    </div>
  );
}

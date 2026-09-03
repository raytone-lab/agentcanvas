import {
  translatePresetGroupName,
  translatePresetOptionLabel,
  translatePresetSection,
} from "../../i18n/presetCopy";
import { previewCopy } from "../../i18n/copy/preview";
import { APP_LOCALES } from "../../i18n/locales";
import { uiCopy, type AppLocale, type UiCopy } from "../../i18n/uiCopy";
import { isPresetOptionActive } from "../../schema/presetActions";
import { presetGroupsForProject } from "../../schema/presets";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { MessageActionKey } from "../appTypes";
import { presetRailSections, stateSectionTitle } from "./presetRailData";

export type SelectedComponentItem = {
  id: string;
  group: string;
  label: string;
  section?: string;
};

const selectedComponentGroupIds = new Set<PresetGroupId>([
  "media-generation",
  "conversation",
  "sidebar",
  "ux-effects",
  "tool-calls",
  "blocks",
  "composer",
  "output",
]);

const selectedProviderComponentIds = new Set(["provider-settings-launcher"]);
const hiddenSelectedComponentOptionIds = new Set([
  "message-actions",
  "reasoning-public-summary",
  "error-collapse",
]);

/**
 * Built from the dictionary rather than carrying its own copy.
 *
 * These seven labels are the same strings the message-action preset cards show, which the
 * editor now reads from `shell.editor.messageActions`. Duplicating them inline meant every
 * new locale had to be added in two places and could disagree with itself.
 */
const selectedMessageActionComponents: Array<{
  key: MessageActionKey;
  label: Record<AppLocale, string>;
  section: Record<AppLocale, string>;
}> = (() => {
  const byLocale = <T,>(pick: (actions: UiCopy["shell"]["editor"]["messageActions"]) => T) =>
    Object.fromEntries(APP_LOCALES.map((locale) => [locale, pick(uiCopy[locale].shell.editor.messageActions)])) as Record<AppLocale, T>;

  const sentSection = byLocale((a) => a.sentTitle);
  const generatedSection = byLocale((a) => a.generatedTitle);
  const copyLabel = byLocale((a) => a.copy);
  const editLabel = byLocale((a) => a.edit);
  const timeLabel = byLocale((a) => a.time);
  const regenerateLabel = byLocale((a) => a.regenerate);

  return [
    { key: "userCopy", label: copyLabel, section: sentSection },
    { key: "userEdit", label: editLabel, section: sentSection },
    { key: "userTime", label: timeLabel, section: sentSection },
    { key: "agentCopy", label: copyLabel, section: generatedSection },
    { key: "agentRegenerate", label: regenerateLabel, section: generatedSection },
    { key: "agentEdit", label: editLabel, section: generatedSection },
    { key: "agentTime", label: timeLabel, section: generatedSection },
  ];
})();

export function componentSummaryLabel(count: number, locale: AppLocale): string {
  return uiCopy[locale].shell.editor.selectedComponentCount.replace("{count}", String(count));
}

function isEffectiveSelectedComponent(project: AgentFrontendProject, groupId: PresetGroupId, optionId: string): boolean {
  if (hiddenSelectedComponentOptionIds.has(optionId)) {
    return false;
  }
  if (!isPresetOptionActive(project, optionId)) {
    return false;
  }
  if (groupId === "sidebar" && optionId !== "sidebar-visible") {
    return isPresetOptionActive(project, "sidebar-visible");
  }
  if (groupId === "output" && optionId !== "output-visible") {
    return isPresetOptionActive(project, "output-visible");
  }
  return true;
}

function orderedSelectedComponentGroups(groups: ReturnType<typeof presetGroupsForProject>) {
  const groupsById = new Map(groups.map((group) => [group.id, group]));
  const seen = new Set<PresetGroupId>();
  const ordered: ReturnType<typeof presetGroupsForProject> = [];
  for (const groupId of presetRailSections.flatMap((section) => section.groupIds)) {
    const group = groupsById.get(groupId);
    if (!group) {
      continue;
    }
    ordered.push(group);
    seen.add(group.id);
  }
  for (const group of groups) {
    if (!seen.has(group.id)) {
      ordered.push(group);
    }
  }
  return ordered;
}

function selectedMessageActionActive(project: AgentFrontendProject, key: MessageActionKey): boolean {
  const actions = project.conversation.messageActions;
  if (key === "userCopy") return Boolean(actions.userCopy ?? actions.copy);
  if (key === "userEdit") return Boolean(actions.userEdit ?? actions.edit);
  if (key === "userTime") return Boolean(actions.userTime);
  if (key === "agentCopy") return Boolean(actions.agentCopy ?? actions.copy);
  if (key === "agentRegenerate") return Boolean(actions.agentRegenerate ?? actions.regenerate);
  if (key === "agentEdit") return Boolean(actions.agentEdit ?? actions.edit);
  if (key === "agentTime") return Boolean(actions.agentTime);
  return false;
}

export function selectedComponentItemsForProject(
  project: AgentFrontendProject,
  groups: ReturnType<typeof presetGroupsForProject>,
  locale: AppLocale,
): SelectedComponentItem[] {
  const items = new Map<string, SelectedComponentItem>();
  const c = previewCopy[locale];

  const addSelectedOption = (group: ReturnType<typeof presetGroupsForProject>[number], option: PresetOption) => {
    if (!isEffectiveSelectedComponent(project, group.id, option.id)) {
      return;
    }
    items.set(option.id, {
      id: option.id,
      group: translatePresetGroupName(group.id, group.label, locale),
      label: translatePresetOptionLabel(option.id, option.label, locale),
      section: option.section ? translatePresetSection(option.section, locale) : undefined,
    });
  };

  for (const group of orderedSelectedComponentGroups(groups)) {
    const includeGroup = selectedComponentGroupIds.has(group.id);
    const groupName = translatePresetGroupName(group.id, group.label, locale);

    if (group.id === "conversation") {
      const avatarSection = stateSectionTitle("conversation", locale);
      if (project.conversation.userAvatar) {
        items.set("state:author.user", {
          id: "state:author.user",
          group: groupName,
          label: c.avatarLabels.user,
          section: avatarSection,
        });
      }
      if (project.conversation.agentAvatar) {
        items.set("state:author.agent", {
          id: "state:author.agent",
          group: groupName,
          label: c.avatarLabels.agent,
          section: avatarSection,
        });
      }
      const speakerLabelsOption = group.options.find((option) => option.id === "speaker-labels");
      if (speakerLabelsOption) {
        addSelectedOption(group, speakerLabelsOption);
      }
    }

    for (const option of group.options) {
      if (!includeGroup && !selectedProviderComponentIds.has(option.id)) {
        continue;
      }
      if (group.id === "conversation" && option.id === "speaker-labels") {
        continue;
      }
      addSelectedOption(group, option);
    }

    if (group.id === "conversation") {
      for (const item of selectedMessageActionComponents) {
        if (!selectedMessageActionActive(project, item.key)) {
          continue;
        }
        const id = `message-action:${item.key}`;
        items.set(id, {
          id,
          group: groupName,
          label: item.label[locale],
          section: item.section[locale],
        });
      }
    }
  }

  return Array.from(items.values());
}

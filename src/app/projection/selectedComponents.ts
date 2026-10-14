import {
  translatePresetGroupName,
  translatePresetOptionLabel,
  translatePresetSection,
} from "../../i18n/presetCopy";
import { previewCopy } from "../../i18n/copy/preview";
import { APP_LOCALES } from "../../i18n/locales";
import { uiCopy, type AppLocale, type UiCopy } from "../../i18n/uiCopy";
import { applyPresetOption, isPresetOptionActive, togglePresetOption } from "../../schema/presetActions";
import { presetGroupsForProject } from "../../schema/presets";
import type { PresetGroupId, PresetOption } from "../../schema/presets";
import type { AgentFrontendProject, PresetStyleId, SlotConfig } from "../../schema/agentuxConfig";
import type { MessageActionKey } from "../appTypes";
import {
  PRESENCE_OPTION_IDS,
  groupPresetOptions,
  isOptionSelectedInRail,
  isOptionShownInRail,
  presetRailSections,
  stateSectionTitle,
} from "./presetRailData";

export type SelectedComponentItem = {
  id: string;
  /** Translated group name, for display. */
  group: string;
  /** The group itself, for callers that need to map it to a canvas region. */
  groupId: PresetGroupId;
  label: string;
  section?: string;
};

const selectedComponentGroupIds = new Set<PresetGroupId>([
  "media-generation",
  "conversation",
  "sidebar",
  "ux-effects",
  "thinking-done",
  "approval",
  "tool-calls",
  "blocks",
  "composer",
  "output",
  "delivery",
]);

const selectedProviderComponentIds = new Set(["provider-settings-launcher"]);
export const hiddenSelectedComponentOptionIds = new Set([
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
  // No presence gate here any more.
  //
  // These five clauses used to un-count an option whose component was not
  // shown — styling a conversation that is not on the canvas is not a selected
  // component. That was right when the presence toggle had to come first. It is
  // backwards now: picking a component's content is what *puts* it on the
  // canvas, so gating the pick on the component already being there meant
  // picking 名称标签 or 我的头像 did nothing at all.
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
      groupId: group.id,
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
          groupId: group.id,
          label: c.avatarLabels.user,
          section: avatarSection,
        });
      }
      if (project.conversation.agentAvatar) {
        items.set("state:author.agent", {
          id: "state:author.agent",
          group: groupName,
          groupId: group.id,
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
          groupId: group.id,
          label: item.label[locale],
          section: item.section[locale],
        });
      }
    }
  }

  return Array.from(items.values());
}

/**
 * How much of a group has been chosen: `done` of `total` choices.
 *
 * For the counts on the rail's group rows. Asked for directly: in 架构 and 组件
 * a reader could not tell which groups still had things left to pick without
 * opening each one — "要不其实用户很容易遗漏".
 *
 * A choice is what the reader can actually make, which is not the same as an
 * option card:
 *
 *   - a section of *variants* (four thinking motions, three loaders) is one
 *     choice — only one of them can be in force, so counting all four would
 *     show 1/4 for a section that is finished;
 *   - an *additive* option (upload, mic, 名称标签) is a choice of its own;
 *   - 对话区's two avatars and seven message actions are one each, the same
 *     units the selection island counts.
 *
 * Icon galleries are not counted: every slot always draws an icon, so a
 * gallery is never "not chosen". Done-ness reads `isOptionSelectedInRail`, the
 * rule the rail's own ticks use, so the count and the ticks cannot disagree.
 */
export function groupChoiceProgress(
  project: AgentFrontendProject,
  group: { id: PresetGroupId; options: readonly PresetOption[] },
  options: {
    stylePreset?: PresetStyleId;
    picked?: readonly string[];
    mounted?: ReadonlySet<SlotConfig["component"]>;
  } = {},
): { done: number; total: number } {
  const { stylePreset, picked = [], mounted } = options;
  let done = 0;
  let total = 0;
  const selected = (option: PresetOption) => isOptionSelectedInRail(project, option, group.id, picked, mounted);
  /*
   * Which options exclude each other: picking B turns A off. Tested pairwise on
   * the project as it stands rather than read off one option, because a
   * section can mix the two — 人机协作's 替我审批 is a toggle beside 内联审批 /
   * 外部审批, which are one choice. Each exclusive cluster is one choice; every
   * option outside one is a choice of its own.
   */
  const excludes = (a: PresetOption, b: PresetOption) => {
    if (PRESENCE_OPTION_IDS.has(a.id) || PRESENCE_OPTION_IDS.has(b.id)) return false;
    const withA = applyPresetOption(project, a.id);
    if (!isPresetOptionActive(withA, a.id)) return false;
    return !isPresetOptionActive(applyPresetOption(withA, b.id), a.id);
  };

  const shown = group.options.filter(
    (option) =>
      !hiddenSelectedComponentOptionIds.has(option.id) &&
      option.id !== "speaker-labels" &&
      isOptionShownInRail(option, stylePreset),
  );
  for (const section of groupPresetOptions(shown, "")) {
    const items = section.items;
    const cluster = items.map((_, index) => index);
    const root = (index: number): number => (cluster[index] === index ? index : (cluster[index] = root(cluster[index])));
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        if (excludes(items[i], items[j]) || excludes(items[j], items[i])) cluster[root(j)] = root(i);
      }
    }
    const clusters = new Map<number, PresetOption[]>();
    items.forEach((option, index) => clusters.set(root(index), [...(clusters.get(root(index)) ?? []), option]));
    for (const members of clusters.values()) {
      total += 1;
      if (members.some(selected)) done += 1;
    }
  }

  if (group.id === "conversation") {
    const extras = [
      Boolean(project.conversation.userAvatar),
      Boolean(project.conversation.agentAvatar),
      ...(group.options.some((option) => option.id === "speaker-labels")
        ? [isPresetOptionActive(project, "speaker-labels")]
        : []),
      ...selectedMessageActionComponents.map((item) => selectedMessageActionActive(project, item.key)),
    ];
    total += extras.length;
    done += extras.filter(Boolean).length;
  }
  return { done, total };
}

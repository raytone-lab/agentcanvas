import {
  createProviderConnection,
  defaultCodingAgentProject,
  enabledProviderConnections,
  providerCatalog,
  providerOptionForId,
  type AgentFrontendProject,
  type MediaGenerationAudioStyle,
  type MediaGenerationImageStyle,
  type MediaGenerationVideoStyle,
  type ProviderCatalogId,
} from "./agentuxConfig";
import { makeSkinId } from "../theme/skin";
import { withProjectSkin } from "../theme/skinEngine";
import {
  isThemePresetId,
  atlasThemePresetIds,
  gameThemePresetIds,
  minimalThemePresetIds,
  nativeThemePresetIds,
  pixelThemePresetIds,
  pixeldeskThemePresetIds,
  handdrawnThemePresetIds,
  inkwashThemePresetIds,
  techThemePresetIds,
  retroThemePresetIds,
  studioThemePresetIds,
  workbuddyThemePresetIds,
  zineThemePresetIds,
  type ThemePresetId,
} from "../theme/themeTokens";

export type PresetPatch = (project: AgentFrontendProject) => AgentFrontendProject;

function withOutputSurface(
  project: AgentFrontendProject,
  surface: AgentFrontendProject["output"]["surface"],
): AgentFrontendProject {
  return {
    ...project,
    layout: {
      ...project.layout,
      slots: project.layout.slots.map((slot) =>
        slot.component === "OutputFrame" ? { ...slot, region: surface } : slot,
      ),
    },
    output: { ...project.output, surface },
  };
}

function toggleSlotEnabled(
  project: AgentFrontendProject,
  component: AgentFrontendProject["layout"]["slots"][number]["component"],
): AgentFrontendProject {
  return {
    ...project,
    layout: {
      ...project.layout,
      slots: project.layout.slots.map((slot) =>
        slot.component === component ? { ...slot, enabled: !slot.enabled } : slot,
      ),
    },
  };
}

function slotEnabled(
  project: AgentFrontendProject,
  component: AgentFrontendProject["layout"]["slots"][number]["component"],
): boolean {
  return project.layout.slots.some((slot) => slot.component === component && slot.enabled);
}

function withProviderConnection(project: AgentFrontendProject, id: ProviderCatalogId): AgentFrontendProject {
  const option = providerOptionForId(id);
  const existingProvider = project.providers.connections.find((provider) => provider.id === option.connectionId);
  const isEnabling = !existingProvider?.enabled;
  const enabledCount = enabledProviderConnections(project).length;
  const connections = existingProvider
    ? project.providers.connections.map((provider) => {
      if (provider.id !== option.connectionId) {
        return provider;
      }

      if (provider.enabled && enabledCount <= 1) {
        return provider;
      }

      return { ...provider, enabled: !provider.enabled };
    })
    : [...project.providers.connections, createProviderConnection(id, true)];

  const nextEnabled = connections.filter((provider) => provider.enabled);
  const defaultProviderId = isEnabling
    ? option.connectionId
    : nextEnabled.some((provider) => provider.id === project.providers.defaultProviderId)
      ? project.providers.defaultProviderId
      : (nextEnabled[0]?.id ?? option.connectionId);

  return {
    ...project,
    providers: {
      ...project.providers,
      defaultProviderId,
      connections,
    },
  };
}

const providerPresetIds: Partial<Record<string, ProviderCatalogId>> = Object.fromEntries(
  providerCatalog.map((provider) => [`provider-${provider.id}`, provider.id]),
);

// Every style's ids, or that style's theme cards render but do nothing:
// `applyPresetOption` falls back to the identity patch for an id with no
// entry, so a missing style here is a silently inert set of cards.
const selectableThemePresetIds: readonly ThemePresetId[] = [
  ...nativeThemePresetIds,
  ...atlasThemePresetIds,
  ...minimalThemePresetIds,
  ...studioThemePresetIds,
  ...zineThemePresetIds,
  ...gameThemePresetIds,
  ...pixelThemePresetIds,
  ...pixeldeskThemePresetIds,
  ...retroThemePresetIds,
  // 手绘风's four were missing here too — adjacent to the line being added and
  // the same one-line omission, so left inert they would have been a second
  // set of cards that click and do nothing.
  ...handdrawnThemePresetIds,
  ...inkwashThemePresetIds,
  ...techThemePresetIds,
  ...workbuddyThemePresetIds,
];

const mediaGenerationPresetConfig = {
  "media-image-grid": { kind: "imageStyle", style: "grid" },
  "media-image-blur": { kind: "imageStyle", style: "blur" },
  "media-image-palette": { kind: "imageStyle", style: "palette" },
  "media-image-layers": { kind: "imageStyle", style: "layers" },
  "media-audio-skeleton": { kind: "audioStyle", style: "skeleton" },
  "media-audio-waveform": { kind: "audioStyle", style: "waveform" },
  "media-video-storyboard": { kind: "videoStyle", style: "storyboard" },
  "media-video-cinema": { kind: "videoStyle", style: "cinema" },
  "media-video-timeline": { kind: "videoStyle", style: "timeline" },
  "media-video-frames": { kind: "videoStyle", style: "frames" },
} as const satisfies Record<
  string,
  | { kind: "imageStyle"; style: MediaGenerationImageStyle }
  | { kind: "audioStyle"; style: MediaGenerationAudioStyle }
  | { kind: "videoStyle"; style: MediaGenerationVideoStyle }
>;

const mediaGenerationPresetPatches: Record<string, PresetPatch> = Object.fromEntries(
  Object.entries(mediaGenerationPresetConfig).map(([optionId, config]) => [
    optionId,
    (project: AgentFrontendProject) => ({
      ...project,
      mediaGeneration: {
        ...project.mediaGeneration,
        [config.kind]: config.style,
      },
    }),
  ]),
);

const setThemePreset = (preset: ThemePresetId): PresetPatch =>
  (project) => withProjectSkin(project, makeSkinId(project.theme.stylePreset, preset));

const themePresetPatches: Record<string, PresetPatch> = Object.fromEntries(
  selectableThemePresetIds.map((preset) => [preset, setThemePreset(preset)]),
);

const presetPatches: Record<string, PresetPatch> = {
  "writing-smooth": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "smooth-stream" } },
  }),
  "writing-typewriter": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "typewriter" } },
  }),
  "writing-chunked": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, writing: "chunked" } },
  }),
  "speaker-labels": (project) => ({
    ...project,
    conversation: { ...project.conversation, speakerLabels: !project.conversation.speakerLabels },
  }),
  "message-actions": (project) => {
    const enabled = !(
      project.conversation.messageActions.copy &&
      project.conversation.messageActions.regenerate &&
      project.conversation.messageActions.edit
    );
    /*
     * All four of the agent row's actions, not just the generic three.
     *
     * The per-role flags fall back to the generic ones
     * (`actions.agentCopy ?? actions.copy`), so copy / regenerate / edit lit up
     * on their own — but `agentTime` has no generic twin, so 时间 was the one
     * tile in 生成消息操作 that stayed off in every style. Asked for: 默认所有的
     * 风格里的这块都是选中的, and every style's kit takes this option (its
     * section has one member, so it is read as additive and taken whole).
     */
    return {
      ...project,
      conversation: {
        ...project.conversation,
        messageActions: {
          /*
           * Replaced, not spread — and that is load-bearing.
           *
           * The per-role flags are `boolean | undefined` and the row reads
           * `userCopy ?? copy`, so *absent* means "follow the generic one" while
           * `false` means "off". Spreading the old object kept `userCopy: false`
           * from the default project, which is not the same as leaving it out:
           * the fallback stopped applying and the reader's own row disappeared.
           * Caught by `renders conversation presets as message actions`.
           */
          copy: enabled,
          regenerate: enabled,
          edit: enabled,
          agentCopy: enabled,
          agentRegenerate: enabled,
          agentEdit: enabled,
          agentTime: enabled,
        },
      },
    };
  },
  "sidebar-visible": (project) => toggleSlotEnabled(project, "SessionSidebar"),
  "chat-visible": (project) => toggleSlotEnabled(project, "ChatFrame"),
  "composer-visible": (project) => toggleSlotEnabled(project, "ComposerFrame"),
  /*
   * Setters, not flips. `reasoning-done-timed` used to toggle between "timed"
   * and "label", which reads as a checkbox — but the title is one of four
   * values now, and a toggle in a four-way set gives no way to reach the other
   * two. Each of these just assigns its own value; the exclusivity falls out of
   * the field having one.
   *
   * None of them touches `doneRule` any more: the rule is its own option.
   */
  "reasoning-done-label": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneStyle: "label" },
  }),
  "reasoning-done-counted": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneStyle: "counted" },
  }),
  "reasoning-done-conclusion": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneStyle: "conclusion" },
  }),
  "reasoning-done-expandable": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneBody: "expandable" },
  }),
  "reasoning-done-title-only": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneBody: "title-only" },
  }),
  "reasoning-done-first-line": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneBody: "first-line" },
  }),
  "reasoning-done-rule": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, doneRule: !project.reasoning.doneRule },
  }),
  "reasoning-done-timed": (project) => ({
    ...project,
    reasoning: {
      ...project.reasoning,
      doneStyle: "timed",
    },
  }),
  "reasoning-writing-smooth": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, writing: "smooth-stream" },
  }),
  "reasoning-writing-typewriter": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, writing: "typewriter" },
  }),
  "reasoning-writing-chunked": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, writing: "chunked" },
  }),
  "sidebar-title": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, title: !project.sidebar.title },
  }),
  "sidebar-collapse": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, collapse: !project.sidebar.collapse },
  }),
  "sidebar-new-button": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, newButton: !project.sidebar.newButton },
  }),
  "sidebar-search": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, search: !project.sidebar.search },
  }),
  "sidebar-sessions": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, sessionList: !project.sidebar.sessionList },
  }),
  "sidebar-row-icon": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, rowIcon: !project.sidebar.rowIcon },
  }),
  "sidebar-grouping": (project) => ({
    ...project,
    sidebar: {
      ...project.sidebar,
      grouping: !project.sidebar.grouping,
      // Date headings head a list, so asking for them asks for the list. Both
      // cards tick and the canvas shows a grouped list — turning the grouping on
      // with no list would otherwise have been a pick that changed nothing.
      sessionList: project.sidebar.grouping ? project.sidebar.sessionList : true,
    },
  }),
  "sidebar-footer": (project) => ({
    ...project,
    sidebar: { ...project.sidebar, footer: !project.sidebar.footer },
  }),
  "thinking-wave": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "wave" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-pulse": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pulse" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-terminal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "terminal" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-minimal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "minimal" } },
    reasoning: { ...project.reasoning, show: "status", collapse: "auto" },
  }),
  "thinking-shimmer": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "shimmer" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  /*
   * Its own field, and a toggle rather than a motion assignment.
   *
   * It used to set `theme.motion.reasoning = "bars"`, which made it mutually
   * exclusive with every glyph: picking the dots and then the text cycle lost
   * the dots. They are not alternatives — one is the mark beside the words, the
   * other is what the words do — so it composes now. The glyph the reader
   * chose stays, and `reasoning-done-timed` can add the elapsed on top of
   * either.
   */
  "thinking-bars": (project) => ({
    ...project,
    reasoning: {
      ...project.reasoning,
      textCycle: !project.reasoning.textCycle,
      show: "summary",
    },
  }),
  "thinking-comic-halftone": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "comic-halftone" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-comic-inkblot": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "comic-inkblot" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-comic-bubble": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "comic-bubble" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-comic-flip": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "comic-flip" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-quest-torch": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "quest-torch" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-quest-rune": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "quest-rune" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-quest-coins": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "quest-coins" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-pixel-cursor": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pixel-cursor" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-pixel-bars": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pixel-bars" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-pixel-spin": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pixel-spin" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-sketch-bubble": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "sketch-bubble" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-sketch-pencil": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "sketch-pencil" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-sketch-blot": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "sketch-blot" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-sketch-page": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "sketch-page" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-tech-matrix": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "tech-matrix" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-tech-signal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "tech-signal" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-tech-scan": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "tech-scan" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-tech-segments": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "tech-segments" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-ink-drop": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "ink-drop" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-ink-stroke": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "ink-stroke" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-ink-ripple": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "ink-ripple" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-ink-seal": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "ink-seal" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-retro-watch": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "retro-watch" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-retro-record": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "retro-record" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-retro-metronome": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "retro-metronome" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-retro-telegraph": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "retro-telegraph" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-pixel-bricks": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "pixel-bricks" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-orbit": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orbit" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-orb-s1": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-s1" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-orb-b5": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-b5" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-orb-m2": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "orb-m2" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "thinking-hourglass": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, reasoning: "hourglass" } },
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  "summary-first": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "summary", collapse: "summary-first", expandable: true },
  }),
  "reasoning-auto-collapse": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, collapse: "auto", expandable: true },
  }),
  "reasoning-expanded": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "summary", collapse: "expanded", expandable: true },
  }),
  "reasoning-status-only": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "status", collapse: "auto" },
  }),
  "reasoning-public-summary": (project) => ({
    ...project,
    /* Visibility only. It used to set `collapse: "summary-first"` too, which is
       the one mode with no fold control — so choosing what the block *says*
       also decided that it could not be folded. */
    reasoning: { ...project.reasoning, show: "summary" },
  }),
  /**
   * The only option that sets `show: "thinking"`.
   *
   * The value existed in the schema and in `ReasoningBlock` from the start but nothing ever
   * selected it, so the branch was unreachable and live runs always fell back to the generic
   * summary. Opt-in rather than default: a provider's chain of thought is content the composer
   * should choose to surface, not something that appears because a key was pasted.
   */
  "reasoning-model-thinking": (project) => ({
    ...project,
    reasoning: { ...project.reasoning, show: "thinking" },
  }),
  "command-cards": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "card" } },
  }),
  "compact-chips": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "expanded" } },
  }),
  "timeline-rail": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, timelineRail: !project.toolCalls.timelineRail },
  }),
  "terminal-log": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: "drawer" } },
    output: { ...project.output, source: "console" },
  }),
  "tool-detail-full": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "full" },
  }),
  "tool-detail-output-only": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "output-only" },
  }),
  "tool-detail-summary": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, detail: "summary" },
  }),
  "tool-progress-icon": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, progress: "status-icon" },
  }),
  "tool-progress-bar": (project) => ({
    ...project,
    toolCalls: {
      ...project.toolCalls,
      progress: "bar",
    },
  }),
  "tool-approval-inline": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, approval: "inline" },
  }),
  "tool-approval-hidden": (project) => ({
    ...project,
    toolCalls: { ...project.toolCalls, approval: "hidden" },
  }),
  "code-diff": (project) => ({
    ...project,
    blocks: { ...project.blocks, codeDiff: !(project.blocks.codeDiff && project.output.artifactRenderer === "diff") },
    output: {
      ...project.output,
      source: "artifact",
      artifactRenderer: project.blocks.codeDiff && project.output.artifactRenderer === "diff" ? "auto" : "diff",
    },
  }),
  "error-collapse": (project) => ({
    ...project,
    /*
     * Error copy only, which is all this option claims to be ("user-safe error
     * copy with debug detail kept out of the main chat") and all
     * `isPresetOptionActive` reads back for it.
     *
     * It also wrote `reasoning.collapse: "summary-first"`, and because it is an
     * additive toggle the kit takes it for *every* style — so every style's
     * thinking block ended up in the one disclosure mode with no fold control,
     * however the Disclosure section had been set. That was the last of three
     * options writing this field from outside its own axis (the motions and the
     * visibility pair were the others).
     */
    blocks: { ...project.blocks, errorCollapse: !project.blocks.errorCollapse },
  }),
  "tool-log-tail": (project) => ({
    ...project,
    blocks: { ...project.blocks, toolLogTail: !project.blocks.toolLogTail },
  }),
  upload: (project) => ({
    ...project,
    composer: { ...project.composer, fileUpload: !project.composer.fileUpload },
  }),
  mic: (project) => ({
    ...project,
    composer: { ...project.composer, mic: !project.composer.mic },
  }),
  budget: (project) => ({
    ...project,
    composer: { ...project.composer, thinkingBudget: !project.composer.thinkingBudget },
  }),
  "model-config": (project) => ({
    ...project,
    composer: { ...project.composer, modelSwitcher: !project.composer.modelSwitcher },
  }),
  "model-tools": (project) => {
    const enabled = !project.composer.toolToggle;
    return {
      ...project,
      composer: { ...project.composer, toolToggle: enabled },
    };
  },
  "prompt-shortcuts": (project) => ({
    ...project,
    composer: { ...project.composer, promptShortcuts: !project.composer.promptShortcuts },
  }),
  "provider-settings-launcher": (project) => ({
    ...project,
    providers: { ...project.providers, settingsLauncher: !project.providers.settingsLauncher },
  }),
  "output-visible": (project) => toggleSlotEnabled(project, "OutputFrame"),
  "git-visible": (project) => toggleSlotEnabled(project, "GitFrame"),
  "output-source-artifact": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact" },
  }),
  "output-source-console": (project) => ({
    ...project,
    output: { ...project.output, source: "console" },
  }),
  /*
   * The three panel contents, and each one writes only its own field.
   *
   * Deliberately not touching `source` the way the two above do: the source is
   * which document the panel shows, and these sit beside the document. An
   * option that reset the source would have made ticking 任务列表 throw away the
   * reader's choice of renderer — the mistake this file has made four times
   * (see the motions, the visibility pair and `error-collapse`).
   */
  "task-list": (project) => ({
    ...project,
    output: { ...project.output, taskList: !project.output.taskList },
  }),
  "exec-progress": (project) => ({
    ...project,
    output: { ...project.output, execProgress: !project.output.execProgress },
  }),
  "workspace-files": (project) => ({
    ...project,
    output: { ...project.output, workspaceFiles: !project.output.workspaceFiles },
  }),
  "renderer-auto": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "auto" },
  }),
  "renderer-code": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "code" },
  }),
  "renderer-diff": (project) => ({
    ...project,
    blocks: { ...project.blocks, codeDiff: true },
    output: { ...project.output, source: "artifact", artifactRenderer: "diff" },
  }),
  "renderer-markdown": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "markdown" },
  }),
  "renderer-preview": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "preview" },
  }),
  "renderer-data": (project) => ({
    ...project,
    output: { ...project.output, source: "artifact", artifactRenderer: "data" },
  }),
  "surface-right-panel": (project) => ({
    ...withOutputSurface(project, "right-panel"),
  }),
  "surface-overlay": (project) => ({
    ...withOutputSurface(project, "overlay"),
  }),
  "branch-status": (project) => ({
    ...project,
    git: { ...project.git, showBranchStatus: !project.git.showBranchStatus },
  }),
  "changed-files": (project) => ({
    ...project,
    git: { ...project.git, showChangedFiles: !project.git.showChangedFiles },
  }),
  "diff-preview": (project) => ({
    ...project,
    git: { ...project.git, showDiff: !project.git.showDiff },
  }),
  "commit-message": (project) => ({
    ...project,
    git: { ...project.git, suggestCommitMessage: !project.git.suggestCommitMessage },
  }),
  "commit-action": (project) => ({
    ...project,
    git: { ...project.git, allowCommit: !project.git.allowCommit },
  }),
  ...mediaGenerationPresetPatches,
  ...themePresetPatches,
};

export function applyPresetOption(project: AgentFrontendProject, optionId: string): AgentFrontendProject {
  const providerId = providerPresetIds[optionId];
  if (providerId) {
    return withProviderConnection(project, providerId);
  }

  return (presetPatches[optionId] ?? ((current) => current))(project);
}

/**
 * Whether clicking this option would change the project at all.
 *
 * `applyPresetOption` falls back to the identity patch for an unknown id, so a
 * card with no entry here is silently inert — it looks like a choice and does
 * nothing. Tests use this to keep that from happening by accident, and to keep
 * `pending` cards genuinely unwired.
 */
export function hasPresetAction(optionId: string): boolean {
  return (
    optionId in presetPatches ||
    optionId in providerPresetIds ||
    isThemePresetId(optionId)
  );
}

// Cancelling a single-select option returns the field(s) it controls to the
// baseline default. (Boolean toggles are cancelled by re-applying their patch,
// which flips them off, so they need no entry here.)
const base = defaultCodingAgentProject;
const revertMotion = (key: "writing" | "reasoning" | "toolCall"): PresetPatch =>
  (project) => ({ ...project, theme: { ...project.theme, motion: { ...project.theme.motion, [key]: base.theme.motion[key] } } });
const revertReasoning = (key: "show" | "collapse" | "writing" | "doneStyle" | "doneBody"): PresetPatch =>
  (project) => ({ ...project, reasoning: { ...project.reasoning, [key]: base.reasoning[key] } });
const revertToolCalls = (key: "detail" | "progress" | "approval" | "timelineRail"): PresetPatch =>
  (project) => ({ ...project, toolCalls: { ...project.toolCalls, [key]: base.toolCalls[key] } });
const revertOutput = (patch: Partial<AgentFrontendProject["output"]>): PresetPatch =>
  (project) => ({ ...project, output: { ...project.output, ...patch } });
const revertMediaGeneration = (key: keyof AgentFrontendProject["mediaGeneration"]): PresetPatch =>
  (project) => ({ ...project, mediaGeneration: { ...project.mediaGeneration, [key]: base.mediaGeneration[key] } });
const themePresetDeactivators: Record<string, PresetPatch> = Object.fromEntries(
  selectableThemePresetIds.map((preset) => [preset, setThemePreset(base.theme.preset)]),
);
const mediaGenerationPresetDeactivators: Record<string, PresetPatch> = Object.fromEntries(
  Object.entries(mediaGenerationPresetConfig).map(([optionId, config]) => [optionId, revertMediaGeneration(config.kind)]),
);

const presetDeactivators: Record<string, PresetPatch> = {
  /* The settled-block axes. Each single-select value reverts its own field to
     the baseline, which is what makes a second click cancel it — the toggle
     audit checks exactly this, and without these entries "已思考 · 3 段" could
     be turned on and never off. `reasoning-done-rule` needs none: it is a
     boolean and its own patch already flips it. */
  "reasoning-done-timed": revertReasoning("doneStyle"),
  "reasoning-done-counted": revertReasoning("doneStyle"),
  "reasoning-done-conclusion": revertReasoning("doneStyle"),
  "reasoning-done-title-only": revertReasoning("doneBody"),
  "reasoning-done-first-line": revertReasoning("doneBody"),
  "writing-smooth": revertMotion("writing"),
  "writing-typewriter": revertMotion("writing"),
  "writing-chunked": revertMotion("writing"),
  "thinking-wave": revertMotion("reasoning"),
  "thinking-pulse": revertMotion("reasoning"),
  "thinking-terminal": revertMotion("reasoning"),
  "thinking-minimal": revertMotion("reasoning"),
  "thinking-shimmer": revertMotion("reasoning"),
  "thinking-orbit": revertMotion("reasoning"),
  "thinking-comic-halftone": revertMotion("reasoning"),
  "thinking-comic-inkblot": revertMotion("reasoning"),
  "thinking-comic-bubble": revertMotion("reasoning"),
  "thinking-comic-flip": revertMotion("reasoning"),
  "thinking-quest-torch": revertMotion("reasoning"),
  "thinking-quest-rune": revertMotion("reasoning"),
  "thinking-quest-coins": revertMotion("reasoning"),
  "thinking-pixel-cursor": revertMotion("reasoning"),
  "thinking-pixel-bars": revertMotion("reasoning"),
  "thinking-pixel-spin": revertMotion("reasoning"),
  "thinking-pixel-bricks": revertMotion("reasoning"),
  "thinking-sketch-bubble": revertMotion("reasoning"),
  "thinking-sketch-pencil": revertMotion("reasoning"),
  "thinking-sketch-blot": revertMotion("reasoning"),
  "thinking-sketch-page": revertMotion("reasoning"),
  "thinking-tech-matrix": revertMotion("reasoning"),
  "thinking-tech-signal": revertMotion("reasoning"),
  "thinking-tech-scan": revertMotion("reasoning"),
  "thinking-tech-segments": revertMotion("reasoning"),
  "thinking-ink-drop": revertMotion("reasoning"),
  "thinking-ink-stroke": revertMotion("reasoning"),
  "thinking-ink-ripple": revertMotion("reasoning"),
  "thinking-ink-seal": revertMotion("reasoning"),
  "thinking-retro-watch": revertMotion("reasoning"),
  "thinking-retro-record": revertMotion("reasoning"),
  "thinking-retro-metronome": revertMotion("reasoning"),
  "thinking-retro-telegraph": revertMotion("reasoning"),
  "thinking-orb-s1": revertMotion("reasoning"),
  "thinking-orb-b5": revertMotion("reasoning"),
  "thinking-orb-m2": revertMotion("reasoning"),
  "thinking-hourglass": revertMotion("reasoning"),
  "reasoning-writing-smooth": revertReasoning("writing"),
  "reasoning-writing-typewriter": revertReasoning("writing"),
  "reasoning-writing-chunked": revertReasoning("writing"),
  "summary-first": revertReasoning("collapse"),
  "reasoning-auto-collapse": revertReasoning("collapse"),
  "reasoning-expanded": revertReasoning("collapse"),
  "reasoning-status-only": revertReasoning("show"),
  "reasoning-public-summary": revertReasoning("show"),
  "reasoning-model-thinking": revertReasoning("show"),
  "command-cards": revertMotion("toolCall"),
  "compact-chips": revertMotion("toolCall"),
  "timeline-rail": revertToolCalls("timelineRail"),
  "terminal-log": (project) => ({
    ...project,
    theme: { ...project.theme, motion: { ...project.theme.motion, toolCall: base.theme.motion.toolCall } },
    output: { ...project.output, source: base.output.source },
  }),
  "tool-detail-full": revertToolCalls("detail"),
  "tool-detail-output-only": revertToolCalls("detail"),
  "tool-detail-summary": revertToolCalls("detail"),
  "tool-progress-icon": revertToolCalls("progress"),
  "tool-progress-bar": revertToolCalls("progress"),
  "tool-approval-inline": revertToolCalls("approval"),
  "tool-approval-hidden": revertToolCalls("approval"),
  "output-source-artifact": revertOutput({ source: base.output.source }),
  "output-source-console": revertOutput({ source: base.output.source }),
  "renderer-auto": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-code": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-diff": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-markdown": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-preview": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "renderer-data": revertOutput({ artifactRenderer: base.output.artifactRenderer }),
  "surface-right-panel": (project) => withOutputSurface(project, base.output.surface),
  "surface-overlay": (project) => withOutputSurface(project, base.output.surface),
  ...mediaGenerationPresetDeactivators,
  ...themePresetDeactivators,
};

/**
 * Unified select/cancel: click an inactive option to apply it, click the active
 * option again to cancel it. Single-select options revert to the baseline
 * default; boolean toggles flip off via their own patch.
 */
export function togglePresetOption(project: AgentFrontendProject, optionId: string): AgentFrontendProject {
  if (!isPresetOptionActive(project, optionId)) {
    return applyPresetOption(project, optionId);
  }
  const deactivate = presetDeactivators[optionId];
  return deactivate ? deactivate(project) : applyPresetOption(project, optionId);
}

export function isPresetOptionActive(project: AgentFrontendProject, optionId: string): boolean {
  const providerId = providerPresetIds[optionId];
  if (providerId) {
    const option = providerOptionForId(providerId);
    return project.providers.connections.some((provider) => provider.id === option.connectionId && provider.enabled);
  }
  if (isThemePresetId(optionId)) {
    return project.theme.preset === optionId;
  }

  switch (optionId) {
    case "writing-smooth":
      return project.theme.motion.writing === "smooth-stream";
    case "writing-typewriter":
      return project.theme.motion.writing === "typewriter";
    case "writing-chunked":
      return project.theme.motion.writing === "chunked";
    case "speaker-labels":
      return project.conversation.speakerLabels;
    case "message-actions":
      return project.conversation.messageActions.copy &&
        project.conversation.messageActions.regenerate &&
        project.conversation.messageActions.edit;
    case "sidebar-visible":
      return slotEnabled(project, "SessionSidebar");
    case "chat-visible":
      return slotEnabled(project, "ChatFrame");
    case "composer-visible":
      return slotEnabled(project, "ComposerFrame");
    case "output-visible":
      return slotEnabled(project, "OutputFrame");
    case "git-visible":
      return slotEnabled(project, "GitFrame");
    case "reasoning-done-timed":
      return project.reasoning.doneStyle === "timed";
    case "reasoning-done-label":
      return project.reasoning.doneStyle === "label";
    case "reasoning-done-counted":
      return project.reasoning.doneStyle === "counted";
    case "reasoning-done-conclusion":
      return project.reasoning.doneStyle === "conclusion";
    case "reasoning-done-expandable":
      return project.reasoning.doneBody === "expandable";
    case "reasoning-done-title-only":
      return project.reasoning.doneBody === "title-only";
    case "reasoning-done-first-line":
      return project.reasoning.doneBody === "first-line";
    case "reasoning-done-rule":
      return project.reasoning.doneRule;
    case "reasoning-writing-smooth":
      return project.reasoning.writing === "smooth-stream";
    case "reasoning-writing-typewriter":
      return project.reasoning.writing === "typewriter";
    case "reasoning-writing-chunked":
      return project.reasoning.writing === "chunked";
    case "sidebar-title":
      return project.sidebar.title;
    case "sidebar-collapse":
      return project.sidebar.collapse;
    case "sidebar-new-button":
      return project.sidebar.newButton;
    case "sidebar-search":
      return project.sidebar.search;
    case "sidebar-sessions":
      return project.sidebar.sessionList;
    case "sidebar-row-icon":
      return project.sidebar.rowIcon;
    case "sidebar-grouping":
      return project.sidebar.grouping;
    case "sidebar-footer":
      return project.sidebar.footer;
    case "thinking-wave":
      return project.theme.motion.reasoning === "wave";
    case "thinking-pulse":
      return project.theme.motion.reasoning === "pulse";
    case "thinking-terminal":
      return project.theme.motion.reasoning === "terminal";
    case "thinking-minimal":
      return project.theme.motion.reasoning === "minimal";
    case "thinking-shimmer":
      return project.theme.motion.reasoning === "shimmer";
    case "thinking-bars":
      return project.reasoning.textCycle;
    case "thinking-orbit":
      return project.theme.motion.reasoning === "orbit";
    case "thinking-comic-halftone":
      return project.theme.motion.reasoning === "comic-halftone";
    case "thinking-comic-inkblot":
      return project.theme.motion.reasoning === "comic-inkblot";
    case "thinking-comic-bubble":
      return project.theme.motion.reasoning === "comic-bubble";
    case "thinking-comic-flip":
      return project.theme.motion.reasoning === "comic-flip";
    case "thinking-quest-torch":
      return project.theme.motion.reasoning === "quest-torch";
    case "thinking-quest-rune":
      return project.theme.motion.reasoning === "quest-rune";
    case "thinking-quest-coins":
      return project.theme.motion.reasoning === "quest-coins";
    case "thinking-pixel-cursor":
      return project.theme.motion.reasoning === "pixel-cursor";
    case "thinking-pixel-bars":
      return project.theme.motion.reasoning === "pixel-bars";
    case "thinking-pixel-spin":
      return project.theme.motion.reasoning === "pixel-spin";
    case "thinking-pixel-bricks":
      return project.theme.motion.reasoning === "pixel-bricks";
    case "thinking-sketch-bubble":
      return project.theme.motion.reasoning === "sketch-bubble";
    case "thinking-sketch-pencil":
      return project.theme.motion.reasoning === "sketch-pencil";
    case "thinking-sketch-blot":
      return project.theme.motion.reasoning === "sketch-blot";
    case "thinking-sketch-page":
      return project.theme.motion.reasoning === "sketch-page";
    case "thinking-tech-matrix":
      return project.theme.motion.reasoning === "tech-matrix";
    case "thinking-tech-signal":
      return project.theme.motion.reasoning === "tech-signal";
    case "thinking-tech-scan":
      return project.theme.motion.reasoning === "tech-scan";
    case "thinking-tech-segments":
      return project.theme.motion.reasoning === "tech-segments";
    case "thinking-ink-drop":
      return project.theme.motion.reasoning === "ink-drop";
    case "thinking-ink-stroke":
      return project.theme.motion.reasoning === "ink-stroke";
    case "thinking-ink-ripple":
      return project.theme.motion.reasoning === "ink-ripple";
    case "thinking-ink-seal":
      return project.theme.motion.reasoning === "ink-seal";
    case "thinking-retro-watch":
      return project.theme.motion.reasoning === "retro-watch";
    case "thinking-retro-record":
      return project.theme.motion.reasoning === "retro-record";
    case "thinking-retro-metronome":
      return project.theme.motion.reasoning === "retro-metronome";
    case "thinking-retro-telegraph":
      return project.theme.motion.reasoning === "retro-telegraph";
    case "thinking-orb-s1":
      return project.theme.motion.reasoning === "orb-s1";
    case "thinking-orb-b5":
      return project.theme.motion.reasoning === "orb-b5";
    case "thinking-orb-m2":
      return project.theme.motion.reasoning === "orb-m2";
    case "thinking-hourglass":
      return project.theme.motion.reasoning === "hourglass";
    case "summary-first":
      return project.reasoning.collapse === "summary-first";
    case "reasoning-auto-collapse":
      return project.reasoning.collapse === "auto";
    case "reasoning-expanded":
      return project.reasoning.collapse === "expanded";
    case "reasoning-status-only":
      return project.reasoning.show === "status";
    case "reasoning-public-summary":
      return project.reasoning.show === "summary";
    case "reasoning-model-thinking":
      return project.reasoning.show === "thinking";
    case "command-cards":
      return project.theme.motion.toolCall === "card";
    case "compact-chips":
      return project.theme.motion.toolCall === "expanded";
    case "timeline-rail":
      return project.toolCalls.timelineRail;
    case "terminal-log":
      return project.theme.motion.toolCall === "drawer" || project.output.source === "console";
    case "tool-detail-full":
      return project.toolCalls.detail === "full";
    case "tool-detail-output-only":
      return project.toolCalls.detail === "output-only";
    case "tool-detail-summary":
      return project.toolCalls.detail === "summary";
    case "tool-progress-icon":
      return project.toolCalls.progress === "status-icon";
    case "tool-progress-bar":
      return project.toolCalls.progress === "bar";
    case "tool-approval-inline":
      return project.toolCalls.approval === "inline";
    case "tool-approval-hidden":
      return project.toolCalls.approval === "hidden";
    case "code-diff":
      return project.blocks.codeDiff && project.output.artifactRenderer === "diff";
    case "error-collapse":
      return project.blocks.errorCollapse;
    case "tool-log-tail":
      return project.blocks.toolLogTail;
    case "upload":
      return project.composer.fileUpload;
    case "mic":
      return project.composer.mic;
    case "budget":
      return project.composer.thinkingBudget;
    case "model-config":
      return project.composer.modelSwitcher;
    case "model-tools":
      return project.composer.toolToggle;
    case "prompt-shortcuts":
      return project.composer.promptShortcuts;
    case "provider-settings-launcher":
      return project.providers.settingsLauncher;
    case "output-source-artifact":
      return project.output.source === "artifact";
    case "output-source-console":
      return project.output.source === "console";
    case "task-list":
      return project.output.taskList;
    case "exec-progress":
      return project.output.execProgress;
    case "workspace-files":
      return project.output.workspaceFiles;
    case "renderer-auto":
      return project.output.source === "artifact" && project.output.artifactRenderer === "auto";
    case "renderer-code":
      return project.output.source === "artifact" && project.output.artifactRenderer === "code";
    case "renderer-diff":
      return project.output.source === "artifact" && project.output.artifactRenderer === "diff";
    case "renderer-markdown":
      return project.output.source === "artifact" && project.output.artifactRenderer === "markdown";
    case "renderer-preview":
      return project.output.source === "artifact" && project.output.artifactRenderer === "preview";
    case "renderer-data":
      return project.output.source === "artifact" && project.output.artifactRenderer === "data";
    case "surface-right-panel":
      return project.output.surface === "right-panel";
    case "surface-overlay":
      return project.output.surface === "overlay";
    case "media-image-grid":
      return project.mediaGeneration.imageStyle === "grid";
    case "media-image-blur":
      return project.mediaGeneration.imageStyle === "blur";
    case "media-image-palette":
      return project.mediaGeneration.imageStyle === "palette";
    case "media-image-layers":
      return project.mediaGeneration.imageStyle === "layers";
    case "media-audio-waveform":
      return project.mediaGeneration.audioStyle === "waveform";
    case "media-audio-skeleton":
      return project.mediaGeneration.audioStyle === "skeleton";
    case "media-video-storyboard":
      return project.mediaGeneration.videoStyle === "storyboard";
    case "media-video-cinema":
      return project.mediaGeneration.videoStyle === "cinema";
    case "media-video-timeline":
      return project.mediaGeneration.videoStyle === "timeline";
    case "media-video-frames":
      return project.mediaGeneration.videoStyle === "frames";
    case "branch-status":
      return project.git.showBranchStatus;
    case "changed-files":
      return project.git.showChangedFiles;
    case "diff-preview":
      return project.git.showDiff;
    case "commit-message":
      return project.git.suggestCommitMessage;
    case "commit-action":
      return project.git.allowCommit;
    default:
      return false;
  }
}

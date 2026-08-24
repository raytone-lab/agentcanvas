import {
  completeAgentCanvasExperience,
  defaultAgentCanvasExperience,
} from "./defaults.js";
import {
  type AgentCanvasExperienceV1,
  type AgentCanvasSlotComponent,
  type CompleteAgentCanvasExperienceV1,
  type ThemePresetId,
} from "./types.js";

export type ExperienceCapabilityFlags = {
  provider: boolean;
  liveRun: boolean;
  git: boolean;
  gitMutation: boolean;
  export: boolean;
  debug: boolean;
};

export const workspaceSafeCapabilities: ExperienceCapabilityFlags = {
  provider: false,
  liveRun: false,
  git: false,
  gitMutation: false,
  export: false,
  debug: false,
};

export type ExperiencePresetGroupId =
  | "layout"
  | "conversation"
  | "sidebar"
  | "ux-effects"
  | "tool-calls"
  | "blocks"
  | "composer"
  | "output"
  | "render"
  | "theme";

export type ExperiencePresetOption = {
  id: string;
  label: string;
  description: string;
  section?: string;
  capability?: keyof ExperienceCapabilityFlags;
};

export type ExperiencePresetGroup = {
  id: ExperiencePresetGroupId;
  label: string;
  options: ExperiencePresetOption[];
};

export const experiencePresetGroups: readonly ExperiencePresetGroup[] = [
  {
    id: "layout",
    label: "Layout",
    options: [
      option(
        "sidebar-visible",
        "Show sidebar",
        "Show session navigation beside the conversation.",
        "Regions",
      ),
      option(
        "output-visible",
        "Show output panel",
        "Show generated artifacts in a bounded output surface.",
        "Regions",
      ),
      option(
        "git-visible",
        "Git status",
        "Show review-only Git status in the output region.",
        "Regions",
        "git",
      ),
      option(
        "debug-visible",
        "Debug dock",
        "Show developer diagnostics below the main surface.",
        "Regions",
        "debug",
      ),
    ],
  },
  {
    id: "conversation",
    label: "Conversation",
    options: [
      option(
        "writing-smooth",
        "Smooth stream",
        "Reveal assistant text as a steady stream.",
        "Writing",
      ),
      option(
        "writing-typewriter",
        "Typewriter",
        "Use a measured character rhythm.",
        "Writing",
      ),
      option(
        "writing-chunked",
        "Chunked",
        "Reveal output in readable phrase chunks.",
        "Writing",
      ),
      option(
        "speaker-labels",
        "Speaker labels",
        "Show user and agent labels on turns.",
        "Message chrome",
      ),
      option(
        "message-actions",
        "Message actions",
        "Expose copy, regenerate, and edit controls.",
        "Recovery",
      ),
    ],
  },
  {
    id: "sidebar",
    label: "Sidebar",
    options: [
      option(
        "sidebar-new-button",
        "New chat button",
        "Show a new-session action.",
        "Content",
      ),
      option("sidebar-search", "Search box", "Show session search.", "Content"),
      option(
        "sidebar-grouping",
        "Group by date",
        "Group sessions under time headings.",
        "Content",
      ),
      option(
        "sidebar-footer",
        "Footer note",
        "Show the muted sidebar status line.",
        "Content",
      ),
    ],
  },
  {
    id: "ux-effects",
    label: "Thinking",
    options: [
      option("thinking-wave", "Dots", "Animated thinking dots.", "Motion"),
      option(
        "thinking-pulse",
        "Pulse scan",
        "A compact active-reasoning scan.",
        "Motion",
      ),
      option(
        "thinking-terminal",
        "Terminal cursor",
        "Console-style progress.",
        "Motion",
      ),
      option(
        "thinking-minimal",
        "Minimal line",
        "A quiet status line.",
        "Motion",
      ),
      option(
        "thinking-shimmer",
        "Shimmer text",
        "A light sweep across status text.",
        "Motion",
      ),
      option("thinking-bars", "Wave bars", "Small equalizer bars.", "Motion"),
      option(
        "thinking-orbit",
        "Orbit dot",
        "A compact orbit loader.",
        "Motion",
      ),
      option(
        "summary-first",
        "Summary before details",
        "Show a safe public summary before tool and code details.",
        "Disclosure",
      ),
      option(
        "reasoning-auto-collapse",
        "Auto collapse",
        "Keep completed reasoning compact.",
        "Disclosure",
      ),
      option(
        "reasoning-expanded",
        "Expanded by default",
        "Open safe reasoning summaries by default.",
        "Disclosure",
      ),
      option(
        "reasoning-status-only",
        "Status only",
        "Show only public execution state.",
        "Disclosure",
      ),
      option(
        "reasoning-public-summary",
        "Public summary",
        "Show a safe summary, never hidden chain-of-thought.",
        "Disclosure",
      ),
    ],
  },
  {
    id: "tool-calls",
    label: "Tool Calls",
    options: [
      option(
        "command-cards",
        "Command cards",
        "Expandable cards with lifecycle and safe detail.",
        "Layout",
      ),
      option(
        "compact-chips",
        "Compact chips",
        "Dense inline tool status.",
        "Layout",
      ),
      option(
        "timeline-rail",
        "Timeline rail",
        "Sequential tool activity rail.",
        "Layout",
      ),
      option(
        "terminal-log",
        "Terminal drawer",
        "Command output in a bounded drawer.",
        "Layout",
        "liveRun",
      ),
      option(
        "tool-detail-full",
        "Input and output",
        "Show safe arguments and visible results.",
        "Details",
      ),
      option(
        "tool-detail-output-only",
        "Output only",
        "Hide tool arguments.",
        "Details",
      ),
      option(
        "tool-detail-summary",
        "Summary only",
        "Keep only a compact preview.",
        "Details",
      ),
      option(
        "tool-progress-icon",
        "Status icon",
        "Use lifecycle icons.",
        "Lifecycle",
      ),
      option(
        "tool-progress-bar",
        "Progress bar",
        "Add a compact progress rail.",
        "Lifecycle",
      ),
      option(
        "tool-approval-inline",
        "Inline approval",
        "Show approval actions in the tool card.",
        "Lifecycle",
      ),
      option(
        "tool-approval-hidden",
        "External approval",
        "Keep approval actions outside tool detail.",
        "Lifecycle",
      ),
    ],
  },
  {
    id: "blocks",
    label: "Blocks",
    options: [
      option(
        "code-diff",
        "Code diffs",
        "Prefer a diff renderer for patch artifacts.",
        "Content",
      ),
      option(
        "tool-log-tail",
        "Log tails",
        "Show compact tails for long tool logs.",
        "Content",
      ),
      option(
        "error-collapse",
        "Error collapse",
        "Keep debug detail out of the primary transcript.",
        "Failure states",
      ),
    ],
  },
  {
    id: "composer",
    label: "Composer",
    options: [
      option(
        "upload",
        "Upload",
        "Allow file attachment affordances.",
        "Inputs",
      ),
      option("mic", "Mic", "Add optional voice input.", "Inputs"),
      option(
        "budget",
        "Thinking budget",
        "Show reasoning budget controls.",
        "Run controls",
      ),
      option(
        "model-tools",
        "Model and tools",
        "Show model and tool controls without credentials.",
        "Run controls",
        "provider",
      ),
      option(
        "prompt-shortcuts",
        "Prompt chips",
        "Offer reusable prompt shortcuts.",
        "Shortcuts",
      ),
    ],
  },
  {
    id: "output",
    label: "Output",
    options: [
      option(
        "output-source-artifact",
        "Latest artifact",
        "Use the newest artifact as output.",
        "Source",
      ),
      option(
        "output-source-console",
        "Console logs",
        "Use visible run and tool output.",
        "Source",
        "liveRun",
      ),
      option(
        "surface-right-panel",
        "Right panel",
        "Keep output in a bounded side panel.",
        "Surface",
      ),
      option(
        "surface-overlay",
        "Overlay",
        "Open output as a focused overlay.",
        "Surface",
      ),
    ],
  },
  {
    id: "render",
    label: "Render",
    options: [
      option(
        "renderer-auto",
        "Auto renderer",
        "Choose from artifact metadata.",
        "Artifact renderer",
      ),
      option(
        "renderer-code",
        "Code",
        "Render source code.",
        "Artifact renderer",
      ),
      option(
        "renderer-diff",
        "Diff",
        "Render patches with stable gutters.",
        "Artifact renderer",
      ),
      option(
        "renderer-markdown",
        "Markdown",
        "Render structured documents.",
        "Artifact renderer",
      ),
      option(
        "renderer-preview",
        "HTML / app preview",
        "Render visual output.",
        "Artifact renderer",
      ),
      option(
        "renderer-data",
        "Data / form",
        "Render structured data.",
        "Artifact renderer",
      ),
    ],
  },
  {
    id: "theme",
    label: "Theme",
    options: [
      option(
        "console-light",
        "Console light",
        "Neutral light product surface.",
        "Preset",
      ),
      option(
        "graphite",
        "Graphite mono",
        "Dark operational surface.",
        "Preset",
      ),
      option(
        "oxide",
        "Oxide workbench",
        "Warm surface with grounded actions.",
        "Preset",
      ),
      option(
        "studio-neutral",
        "Studio neutral",
        "Cool neutral product surface.",
        "Preset",
      ),
      option(
        "paper-trail",
        "Paper trail",
        "Editorial paper-toned surface.",
        "Preset",
      ),
      option(
        "terminal-green",
        "Terminal green",
        "Dark console surface.",
        "Preset",
      ),
    ],
  },
] as const;

export function experiencePresetGroupsForCapabilities(
  capabilities: Partial<ExperienceCapabilityFlags> = workspaceSafeCapabilities,
): ExperiencePresetGroup[] {
  const resolved = { ...workspaceSafeCapabilities, ...capabilities };
  return experiencePresetGroups
    .map((group) => ({
      ...group,
      options: group.options.filter(
        (entry) => !entry.capability || resolved[entry.capability],
      ),
    }))
    .filter((group) => group.options.length > 0);
}

export function experiencePresetGroupsForExperience(
  input: AgentCanvasExperienceV1,
  capabilities: Partial<ExperienceCapabilityFlags> = workspaceSafeCapabilities,
): ExperiencePresetGroup[] {
  const value = completeAgentCanvasExperience(input);
  return experiencePresetGroupsForCapabilities(capabilities)
    .map((group) => ({
      ...group,
      options: group.options.filter((entry) =>
        isPresetOptionSupportedByExperience(value, entry.id),
      ),
    }))
    .filter((group) => group.options.length > 0);
}

export function applyExperiencePresetOption(
  input: AgentCanvasExperienceV1,
  optionId: string,
): CompleteAgentCanvasExperienceV1 {
  const value = completeAgentCanvasExperience(input);
  const setMotion = (key: "writing" | "reasoning" | "toolCall", next: string) =>
    ({
      ...value,
      theme: { ...value.theme, motion: { ...value.theme.motion, [key]: next } },
    }) as CompleteAgentCanvasExperienceV1;
  const setSlot = (component: AgentCanvasSlotComponent) => {
    const existing = value.layout.slots.filter(
      (slot) => slot.component === component,
    );
    const fallback = defaultAgentCanvasExperience.layout.slots.find(
      (slot) => slot.component === component,
    );
    if (existing.length === 0 && !fallback) {
      throw new Error(`Unsupported AgentCanvas slot component: ${component}`);
    }
    const nextEnabled = !existing.some((slot) => slot.enabled);
    return {
      ...value,
      layout: {
        ...value.layout,
        slots:
          existing.length > 0
            ? value.layout.slots.map((slot) =>
                slot.component === component
                  ? { ...slot, enabled: nextEnabled }
                  : slot,
              )
            : [...value.layout.slots, { ...fallback!, enabled: true }],
      },
    };
  };

  switch (optionId) {
    case "sidebar-visible":
      return setSlot("SessionSidebar");
    case "output-visible":
      return setSlot("OutputFrame");
    case "git-visible":
      return setSlot("GitFrame");
    case "debug-visible":
      return setSlot("DebugDock");
    case "writing-smooth":
      return setMotion("writing", "smooth-stream");
    case "writing-typewriter":
      return setMotion("writing", "typewriter");
    case "writing-chunked":
      return setMotion("writing", "chunked");
    case "thinking-wave":
      return withReasoningMotion(value, "wave", "summary", "summary-first");
    case "thinking-pulse":
      return withReasoningMotion(value, "pulse", "summary", "summary-first");
    case "thinking-terminal":
      return withReasoningMotion(value, "terminal", "summary", "expanded");
    case "thinking-minimal":
      return withReasoningMotion(value, "minimal", "status", "auto");
    case "thinking-shimmer":
      return withReasoningMotion(value, "shimmer", "summary", "summary-first");
    case "thinking-bars":
      return withReasoningMotion(value, "bars", "summary", "summary-first");
    case "thinking-orbit":
      return withReasoningMotion(value, "orbit", "summary", "summary-first");
    case "summary-first":
      return {
        ...value,
        reasoning: {
          ...value.reasoning,
          show: "summary",
          collapse: "summary-first",
          expandable: true,
        },
      };
    case "reasoning-status-only":
      return {
        ...value,
        reasoning: { ...value.reasoning, show: "status", collapse: "auto" },
      };
    case "reasoning-public-summary":
      return {
        ...value,
        reasoning: { ...value.reasoning, show: "summary", expandable: true },
      };
    case "reasoning-auto-collapse":
      return {
        ...value,
        reasoning: { ...value.reasoning, collapse: "auto", expandable: true },
      };
    case "reasoning-expanded":
      return {
        ...value,
        reasoning: {
          ...value.reasoning,
          show: "summary",
          collapse: "expanded",
          expandable: true,
        },
      };
    case "command-cards":
      return withToolLayout(value, "card", "full");
    case "compact-chips":
      return withToolLayout(value, "inline", "summary");
    case "timeline-rail":
      return withToolLayout(value, "timeline", "full");
    case "terminal-log":
      return {
        ...withToolLayout(value, "drawer", "full"),
        output: { ...value.output, source: "console" },
      };
    case "tool-detail-full":
      return { ...value, toolCalls: { ...value.toolCalls, detail: "full" } };
    case "tool-detail-output-only":
      return {
        ...value,
        toolCalls: { ...value.toolCalls, detail: "output-only" },
      };
    case "tool-detail-summary":
      return { ...value, toolCalls: { ...value.toolCalls, detail: "summary" } };
    case "tool-progress-icon":
      return {
        ...value,
        toolCalls: { ...value.toolCalls, progress: "status-icon" },
      };
    case "tool-progress-bar":
      return { ...value, toolCalls: { ...value.toolCalls, progress: "bar" } };
    case "tool-approval-inline":
      return {
        ...value,
        toolCalls: { ...value.toolCalls, approval: "inline" },
      };
    case "tool-approval-hidden":
      return {
        ...value,
        toolCalls: { ...value.toolCalls, approval: "hidden" },
      };
    case "code-diff": {
      const enabled =
        value.blocks.codeDiff && value.output.artifactRenderer === "diff";
      if (!enabled) assertRendererSupported(value, "diff");
      return {
        ...value,
        blocks: { ...value.blocks, codeDiff: !enabled },
        output: {
          ...value.output,
          source: "artifact",
          artifactRenderer: enabled ? "auto" : "diff",
        },
      };
    }
    case "error-collapse":
      return {
        ...value,
        blocks: { ...value.blocks, errorCollapse: !value.blocks.errorCollapse },
        reasoning: {
          ...value.reasoning,
          collapse: "summary-first",
          expandable: true,
        },
      };
    case "tool-log-tail": {
      const enabled = !value.blocks.toolLogTail;
      return {
        ...value,
        blocks: { ...value.blocks, toolLogTail: enabled },
        theme: {
          ...value.theme,
          motion: {
            ...value.theme.motion,
            toolCall: enabled
              ? "drawer"
              : value.theme.motion.toolCall === "drawer"
                ? "card"
                : value.theme.motion.toolCall,
          },
        },
      };
    }
    case "speaker-labels":
      return {
        ...value,
        conversation: {
          ...value.conversation,
          speakerLabels: !value.conversation.speakerLabels,
        },
      };
    case "message-actions": {
      const enabled = !(
        value.conversation.messageActions.copy &&
        value.conversation.messageActions.regenerate &&
        value.conversation.messageActions.edit
      );
      return {
        ...value,
        conversation: {
          ...value.conversation,
          messageActions: { copy: enabled, regenerate: enabled, edit: enabled },
        },
      };
    }
    case "sidebar-new-button":
      return {
        ...value,
        sidebar: { ...value.sidebar, newButton: !value.sidebar.newButton },
      };
    case "sidebar-search":
      return {
        ...value,
        sidebar: { ...value.sidebar, search: !value.sidebar.search },
      };
    case "sidebar-grouping":
      return {
        ...value,
        sidebar: { ...value.sidebar, grouping: !value.sidebar.grouping },
      };
    case "sidebar-footer":
      return {
        ...value,
        sidebar: { ...value.sidebar, footer: !value.sidebar.footer },
      };
    case "upload":
      return {
        ...value,
        composer: { ...value.composer, fileUpload: !value.composer.fileUpload },
      };
    case "mic":
      return {
        ...value,
        composer: { ...value.composer, mic: !value.composer.mic },
      };
    case "budget":
      return {
        ...value,
        composer: {
          ...value.composer,
          thinkingBudget: !value.composer.thinkingBudget,
        },
      };
    case "model-tools": {
      const enabled = !(
        value.composer.modelSwitcher && value.composer.toolToggle
      );
      return {
        ...value,
        composer: {
          ...value.composer,
          modelSwitcher: enabled,
          toolToggle: enabled,
        },
      };
    }
    case "prompt-shortcuts":
      return {
        ...value,
        composer: {
          ...value.composer,
          promptShortcuts: !value.composer.promptShortcuts,
        },
      };
    case "output-source-artifact":
      return { ...value, output: { ...value.output, source: "artifact" } };
    case "output-source-console":
      return { ...value, output: { ...value.output, source: "console" } };
    case "surface-right-panel":
      return withOutputSurface(value, "right-panel");
    case "surface-overlay":
      return withOutputSurface(value, "overlay");
    case "renderer-auto":
      return withRenderer(value, "auto");
    case "renderer-code":
      return withRenderer(value, "code");
    case "renderer-diff":
      return {
        ...withRenderer(value, "diff"),
        blocks: { ...value.blocks, codeDiff: true },
      };
    case "renderer-markdown":
      return withRenderer(value, "markdown");
    case "renderer-preview":
      return withRenderer(value, "preview");
    case "renderer-data":
      return withRenderer(value, "data");
    case "console-light":
    case "graphite":
    case "oxide":
    case "studio-neutral":
    case "paper-trail":
    case "terminal-green":
      return {
        ...value,
        theme: { ...value.theme, preset: optionId as ThemePresetId },
      };
    default:
      throw new Error(`Unsupported AgentCanvas preset option: ${optionId}`);
  }
}

export function isExperiencePresetOptionActive(
  input: AgentCanvasExperienceV1,
  optionId: string,
): boolean {
  const value = completeAgentCanvasExperience(input);
  const slotEnabled = (component: AgentCanvasSlotComponent) =>
    value.layout.slots.some(
      (slot) => slot.component === component && slot.enabled,
    );
  const direct: Record<string, boolean> = {
    "sidebar-visible": slotEnabled("SessionSidebar"),
    "output-visible": slotEnabled("OutputFrame"),
    "git-visible": slotEnabled("GitFrame"),
    "debug-visible": slotEnabled("DebugDock"),
    "speaker-labels": value.conversation.speakerLabels,
    "message-actions":
      value.conversation.messageActions.copy &&
      value.conversation.messageActions.regenerate &&
      value.conversation.messageActions.edit,
    "sidebar-new-button": value.sidebar.newButton,
    "sidebar-search": value.sidebar.search,
    "sidebar-grouping": value.sidebar.grouping,
    "sidebar-footer": value.sidebar.footer,
    upload: value.composer.fileUpload,
    mic: value.composer.mic,
    budget: value.composer.thinkingBudget,
    "model-tools": value.composer.modelSwitcher && value.composer.toolToggle,
    "prompt-shortcuts": value.composer.promptShortcuts,
    "error-collapse": value.blocks.errorCollapse,
    "tool-log-tail": value.blocks.toolLogTail,
    "code-diff":
      value.blocks.codeDiff && value.output.artifactRenderer === "diff",
    "reasoning-status-only": value.reasoning.show === "status",
    "reasoning-public-summary": value.reasoning.show === "summary",
    "summary-first": value.reasoning.collapse === "summary-first",
    "reasoning-auto-collapse": value.reasoning.collapse === "auto",
    "reasoning-expanded": value.reasoning.collapse === "expanded",
    "tool-detail-full": value.toolCalls.detail === "full",
    "tool-detail-output-only": value.toolCalls.detail === "output-only",
    "tool-detail-summary": value.toolCalls.detail === "summary",
    "tool-progress-icon": value.toolCalls.progress === "status-icon",
    "tool-progress-bar": value.toolCalls.progress === "bar",
    "tool-approval-inline": value.toolCalls.approval === "inline",
    "tool-approval-hidden": value.toolCalls.approval === "hidden",
    "output-source-artifact": value.output.source === "artifact",
    "output-source-console": value.output.source === "console",
    "surface-right-panel": value.output.surface === "right-panel",
    "surface-overlay": value.output.surface === "overlay",
  };
  if (Object.hasOwn(direct, optionId)) return direct[optionId];
  const writing: Record<string, typeof value.theme.motion.writing> = {
    "writing-smooth": "smooth-stream",
    "writing-typewriter": "typewriter",
    "writing-chunked": "chunked",
  };
  if (Object.hasOwn(writing, optionId))
    return value.theme.motion.writing === writing[optionId];
  const thinking: Record<string, typeof value.theme.motion.reasoning> = {
    "thinking-wave": "wave",
    "thinking-pulse": "pulse",
    "thinking-terminal": "terminal",
    "thinking-minimal": "minimal",
    "thinking-shimmer": "shimmer",
    "thinking-bars": "bars",
    "thinking-orbit": "orbit",
  };
  if (Object.hasOwn(thinking, optionId))
    return value.theme.motion.reasoning === thinking[optionId];
  const tools: Record<string, typeof value.theme.motion.toolCall> = {
    "command-cards": "card",
    "compact-chips": "inline",
    "timeline-rail": "timeline",
  };
  if (Object.hasOwn(tools, optionId))
    return value.theme.motion.toolCall === tools[optionId];
  if (optionId === "terminal-log")
    return (
      value.theme.motion.toolCall === "drawer" &&
      value.output.source === "console"
    );
  const renderer = optionId.startsWith("renderer-")
    ? optionId.slice("renderer-".length)
    : "";
  if (
    ["auto", "code", "diff", "markdown", "preview", "data"].includes(renderer)
  )
    return (
      value.output.source === "artifact" &&
      value.output.artifactRenderer === renderer
    );
  return themeIds.has(optionId) ? value.theme.preset === optionId : false;
}

export function toggleExperiencePresetOption(
  input: AgentCanvasExperienceV1,
  optionId: string,
): CompleteAgentCanvasExperienceV1 {
  if (!isExperiencePresetOptionActive(input, optionId))
    return applyExperiencePresetOption(input, optionId);
  const value = completeAgentCanvasExperience(input);
  const defaults = defaultAgentCanvasExperience;
  const booleanOptions = new Set([
    "sidebar-visible",
    "output-visible",
    "git-visible",
    "debug-visible",
    "speaker-labels",
    "message-actions",
    "sidebar-new-button",
    "sidebar-search",
    "sidebar-grouping",
    "sidebar-footer",
    "upload",
    "mic",
    "budget",
    "model-tools",
    "prompt-shortcuts",
    "error-collapse",
    "tool-log-tail",
    "code-diff",
  ]);
  if (booleanOptions.has(optionId))
    return applyExperiencePresetOption(value, optionId);
  if (optionId.startsWith("writing-"))
    return {
      ...value,
      theme: {
        ...value.theme,
        motion: {
          ...value.theme.motion,
          writing: defaults.theme.motion.writing,
        },
      },
    };
  if (optionId.startsWith("thinking-"))
    return {
      ...value,
      theme: {
        ...value.theme,
        motion: {
          ...value.theme.motion,
          reasoning: defaults.theme.motion.reasoning,
        },
      },
    };
  if (
    ["summary-first", "reasoning-auto-collapse", "reasoning-expanded"].includes(
      optionId,
    )
  )
    return {
      ...value,
      reasoning: { ...value.reasoning, collapse: defaults.reasoning.collapse },
    };
  if (["reasoning-status-only", "reasoning-public-summary"].includes(optionId))
    return {
      ...value,
      reasoning: { ...value.reasoning, show: defaults.reasoning.show },
    };
  if (["command-cards", "compact-chips", "timeline-rail"].includes(optionId))
    return {
      ...value,
      theme: {
        ...value.theme,
        motion: {
          ...value.theme.motion,
          toolCall: defaults.theme.motion.toolCall,
        },
      },
    };
  if (optionId === "terminal-log")
    return {
      ...value,
      theme: {
        ...value.theme,
        motion: {
          ...value.theme.motion,
          toolCall: defaults.theme.motion.toolCall,
        },
      },
      output: { ...value.output, source: defaults.output.source },
    };
  if (
    [
      "tool-detail-full",
      "tool-detail-output-only",
      "tool-detail-summary",
    ].includes(optionId)
  )
    return {
      ...value,
      toolCalls: { ...value.toolCalls, detail: defaults.toolCalls.detail },
    };
  if (["tool-progress-icon", "tool-progress-bar"].includes(optionId))
    return {
      ...value,
      toolCalls: { ...value.toolCalls, progress: defaults.toolCalls.progress },
    };
  if (["tool-approval-inline", "tool-approval-hidden"].includes(optionId))
    return {
      ...value,
      toolCalls: { ...value.toolCalls, approval: defaults.toolCalls.approval },
    };
  if (["output-source-artifact", "output-source-console"].includes(optionId))
    return {
      ...value,
      output: { ...value.output, source: defaults.output.source },
    };
  if (optionId.startsWith("renderer-"))
    return {
      ...value,
      output: {
        ...value.output,
        artifactRenderer: defaults.output.artifactRenderer,
      },
    };
  if (["surface-right-panel", "surface-overlay"].includes(optionId))
    return withOutputSurface(value, defaults.output.surface);
  if (themeIds.has(optionId))
    return {
      ...value,
      theme: { ...value.theme, preset: defaults.theme.preset },
    };
  return value;
}

function option(
  id: string,
  label: string,
  description: string,
  section?: string,
  capability?: keyof ExperienceCapabilityFlags,
): ExperiencePresetOption {
  return { id, label, description, section, capability };
}

function withReasoningMotion(
  value: CompleteAgentCanvasExperienceV1,
  reasoning: CompleteAgentCanvasExperienceV1["theme"]["motion"]["reasoning"],
  show: CompleteAgentCanvasExperienceV1["reasoning"]["show"],
  collapse: CompleteAgentCanvasExperienceV1["reasoning"]["collapse"],
): CompleteAgentCanvasExperienceV1 {
  return {
    ...value,
    theme: { ...value.theme, motion: { ...value.theme.motion, reasoning } },
    reasoning: { ...value.reasoning, show, collapse },
  };
}

function withToolLayout(
  value: CompleteAgentCanvasExperienceV1,
  toolCall: CompleteAgentCanvasExperienceV1["theme"]["motion"]["toolCall"],
  detail: CompleteAgentCanvasExperienceV1["toolCalls"]["detail"],
): CompleteAgentCanvasExperienceV1 {
  return {
    ...value,
    theme: { ...value.theme, motion: { ...value.theme.motion, toolCall } },
    toolCalls: { ...value.toolCalls, detail },
  };
}

function withOutputSurface(
  value: CompleteAgentCanvasExperienceV1,
  surface: CompleteAgentCanvasExperienceV1["output"]["surface"],
): CompleteAgentCanvasExperienceV1 {
  return {
    ...value,
    layout: {
      ...value.layout,
      slots: value.layout.slots.map((slot) =>
        slot.component === "OutputFrame" ? { ...slot, region: surface } : slot,
      ),
    },
    output: { ...value.output, surface },
  };
}

function withRenderer(
  value: CompleteAgentCanvasExperienceV1,
  artifactRenderer: CompleteAgentCanvasExperienceV1["output"]["artifactRenderer"],
): CompleteAgentCanvasExperienceV1 {
  if (artifactRenderer !== "auto") {
    assertRendererSupported(value, artifactRenderer);
  }
  return {
    ...value,
    output: { ...value.output, source: "artifact", artifactRenderer },
  };
}

function isPresetOptionSupportedByExperience(
  value: CompleteAgentCanvasExperienceV1,
  optionId: string,
): boolean {
  const renderer = rendererRequiredByPresetOption(optionId);
  return (
    renderer === undefined ||
    value.output.supportedArtifactRenderers.includes(renderer)
  );
}

function rendererRequiredByPresetOption(
  optionId: string,
):
  | Exclude<
      CompleteAgentCanvasExperienceV1["output"]["artifactRenderer"],
      "auto"
    >
  | undefined {
  if (optionId === "code-diff") return "diff";
  const renderer = optionId.startsWith("renderer-")
    ? optionId.slice("renderer-".length)
    : "";
  return ["code", "diff", "markdown", "preview", "data"].includes(renderer)
    ? (renderer as Exclude<
        CompleteAgentCanvasExperienceV1["output"]["artifactRenderer"],
        "auto"
      >)
    : undefined;
}

function assertRendererSupported(
  value: CompleteAgentCanvasExperienceV1,
  renderer: Exclude<
    CompleteAgentCanvasExperienceV1["output"]["artifactRenderer"],
    "auto"
  >,
): void {
  if (!value.output.supportedArtifactRenderers.includes(renderer)) {
    throw new Error(
      `Unsupported AgentCanvas artifact renderer for this Experience: ${renderer}`,
    );
  }
}

const themeIds = new Set<string>([
  "console-light",
  "graphite",
  "oxide",
  "studio-neutral",
  "paper-trail",
  "terminal-green",
]);

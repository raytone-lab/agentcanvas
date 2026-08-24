import {
  AGENTCANVAS_EXPERIENCE_V1,
  AGENTCANVAS_EXPERIENCE_V2,
  type AgentCanvasExperienceV1,
  type AgentCanvasExperienceV2,
  type CompleteAgentCanvasExperienceV1,
  type CompleteAgentCanvasExperienceV2,
} from "./types.js";

export const defaultAgentCanvasExperience: CompleteAgentCanvasExperienceV1 = {
  contractVersion: AGENTCANVAS_EXPERIENCE_V1,
  template: "coding",
  layout: {
    regions: [
      "sidebar",
      "main",
      "composer",
      "right-panel",
      "bottom-dock",
      "overlay",
    ],
    mainSize: 68,
    rightPanelSize: 32,
    bottomDockSize: 28,
    slots: [
      {
        id: "sessions",
        region: "sidebar",
        component: "SessionSidebar",
        enabled: true,
      },
      { id: "chat", region: "main", component: "ChatFrame", enabled: true },
      {
        id: "composer",
        region: "composer",
        component: "ComposerFrame",
        enabled: true,
      },
      {
        id: "output",
        region: "right-panel",
        component: "OutputFrame",
        enabled: true,
      },
      {
        id: "capabilities",
        region: "bottom-dock",
        component: "CapabilityTray",
        enabled: false,
      },
      {
        id: "git",
        region: "right-panel",
        component: "GitFrame",
        enabled: true,
      },
      {
        id: "debug",
        region: "bottom-dock",
        component: "DebugDock",
        enabled: true,
      },
    ],
  },
  theme: {
    preset: "console-light",
    density: "compact",
    radius: 8,
    motion: {
      reasoning: "wave",
      writing: "smooth-stream",
      toolCall: "card",
      writingParams: {
        streamWps: 40,
        typeCps: 24,
        chunkSize: 4,
        chunkIntervalMs: 220,
      },
    },
  },
  composer: {
    fileUpload: true,
    mic: false,
    thinkingBudget: true,
    modelSwitcher: true,
    toolToggle: true,
    promptShortcuts: false,
  },
  conversation: {
    speakerLabels: true,
    userAvatar: true,
    agentAvatar: true,
    messageActions: { copy: false, regenerate: false, edit: false },
    emptyState: "minimal",
  },
  sidebar: { newButton: true, search: true, grouping: true, footer: true },
  context: { attachmentChips: true },
  toolCalls: { detail: "full", progress: "status-icon", approval: "inline" },
  reasoning: { show: "summary", collapse: "summary-first", expandable: true },
  blocks: { codeDiff: true, errorCollapse: false, toolLogTail: false },
  output: {
    source: "artifact",
    artifactRenderer: "auto",
    surface: "right-panel",
    supportedArtifactRenderers: ["code", "diff", "markdown", "preview", "data"],
  },
  export: { target: "vite-react", includeHarnessAdapter: true },
};

export function completeAgentCanvasExperience(
  value: AgentCanvasExperienceV1,
): CompleteAgentCanvasExperienceV1 {
  const defaults = defaultAgentCanvasExperience;
  const layout = mergeDefined(defaults.layout, value.layout);
  const theme = mergeDefined(defaults.theme, value.theme);
  const motion = mergeDefined(defaults.theme.motion, value.theme?.motion);
  const output = mergeDefined(defaults.output, value.output);
  return {
    ...mergeDefined(defaults, value),
    contractVersion: value.contractVersion ?? defaults.contractVersion,
    template: value.template ?? defaults.template,
    layout: {
      ...layout,
      regions: [...layout.regions],
      slots: layout.slots.map((slot) => ({
        ...slot,
      })),
    },
    theme: {
      ...theme,
      motion: {
        ...motion,
        writingParams: mergeDefined(
          defaults.theme.motion.writingParams,
          value.theme?.motion?.writingParams,
        ),
      },
    },
    composer: mergeDefined(defaults.composer, value.composer),
    conversation: {
      ...mergeDefined(defaults.conversation, value.conversation),
      messageActions: mergeDefined(
        defaults.conversation.messageActions,
        value.conversation?.messageActions,
      ),
    },
    sidebar: mergeDefined(defaults.sidebar, value.sidebar),
    context: mergeDefined(defaults.context, value.context),
    toolCalls: mergeDefined(defaults.toolCalls, value.toolCalls),
    reasoning: mergeDefined(defaults.reasoning, value.reasoning),
    blocks: mergeDefined(defaults.blocks, value.blocks),
    output: {
      ...output,
      supportedArtifactRenderers: [...output.supportedArtifactRenderers],
    },
    export: mergeDefined(defaults.export, value.export),
  };
}

/**
 * The v2 product default deliberately inherits the current Canvas visual
 * language. Brand and design overrides are neutral until a host/user elects
 * to customize them, so adopting v2 cannot restyle the existing Canvas UI by
 * accident.
 */
export const defaultAgentCanvasExperienceV2: CompleteAgentCanvasExperienceV2 = {
  contractVersion: AGENTCANVAS_EXPERIENCE_V2,
  surface: { mode: "agentcanvas" },
  brand: {
    displayName: "Agent app",
    mark: { kind: "builtin", id: "sparkles" },
    accent: { kind: "theme" },
    corners: "theme",
    showPoweredBy: true,
  },
  welcome: {
    headline: "How can I help?",
    supportingText: "Start with a task or choose a suggested prompt.",
    suggestedPrompts: [],
    showSuggestedPrompts: false,
  },
  canvas: canvasFromCompleteV1(defaultAgentCanvasExperience),
  design: {},
  extensions: { stylesheets: [] },
};

export function createDefaultAgentCanvasExperienceV2(input?: {
  displayName?: string;
  welcomeHeadline?: string;
  welcomeSupportingText?: string;
}): CompleteAgentCanvasExperienceV2 {
  const value = clone(defaultAgentCanvasExperienceV2);
  if (input?.displayName) value.brand.displayName = input.displayName;
  if (input?.welcomeHeadline) value.welcome.headline = input.welcomeHeadline;
  if (input?.welcomeSupportingText !== undefined)
    value.welcome.supportingText = input.welcomeSupportingText;
  return value;
}

export function completeAgentCanvasExperienceV2(
  value: AgentCanvasExperienceV2,
): CompleteAgentCanvasExperienceV2 {
  const defaults = defaultAgentCanvasExperienceV2;
  const canvas = completeAgentCanvasExperience({
    contractVersion: AGENTCANVAS_EXPERIENCE_V1,
    ...value.canvas,
  });
  return {
    contractVersion: AGENTCANVAS_EXPERIENCE_V2,
    surface: mergeDefined(defaults.surface, value.surface),
    brand: {
      ...mergeDefined(defaults.brand, value.brand),
      mark: clone(value.brand.mark),
      accent: clone(value.brand.accent),
    },
    welcome: {
      ...mergeDefined(defaults.welcome, value.welcome),
      suggestedPrompts: [...value.welcome.suggestedPrompts],
    },
    canvas: canvasFromCompleteV1(canvas),
    design: clone(value.design ?? defaults.design),
    extensions: {
      stylesheets: (value.extensions?.stylesheets ?? []).map((stylesheet) => ({
        ...stylesheet,
      })),
    },
  };
}

export function canvasExperienceFromExperience(
  value: AgentCanvasExperienceV1 | AgentCanvasExperienceV2,
): AgentCanvasExperienceV1 {
  if (value.contractVersion === AGENTCANVAS_EXPERIENCE_V1) return clone(value);
  return {
    contractVersion: AGENTCANVAS_EXPERIENCE_V1,
    ...clone(value.canvas),
  };
}

export function withCanvasExperience<
  T extends AgentCanvasExperienceV1 | AgentCanvasExperienceV2,
>(value: T, canvas: AgentCanvasExperienceV1): T {
  if (value.contractVersion === AGENTCANVAS_EXPERIENCE_V1)
    return clone(canvas) as T;
  const { contractVersion: _contractVersion, ...configuration } = clone(canvas);
  return { ...clone(value), canvas: configuration } as T;
}

function canvasFromCompleteV1(
  value: CompleteAgentCanvasExperienceV1,
): CompleteAgentCanvasExperienceV2["canvas"] {
  const { contractVersion: _contractVersion, ...canvas } = clone(value);
  return canvas;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Merge a partial public value without allowing explicit `undefined` to
 * erase a required default. This matters for values assembled by forms before
 * they have crossed a JSON boundary. */
function mergeDefined<T extends object>(base: T, patch?: object): T {
  const result = { ...base };
  if (!patch) return result;

  for (const [key, next] of Object.entries(patch)) {
    if (next !== undefined) Object.assign(result, { [key]: next });
  }
  return result;
}

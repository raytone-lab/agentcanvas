import {
  AGENTCANVAS_EXPERIENCE_V2,
  completeAgentCanvasExperienceV2,
  createDefaultAgentCanvasExperienceV2,
  defaultAgentCanvasExperienceV2,
  type AgentCanvasExperienceV2,
  type CompleteAgentCanvasExperienceV2,
} from "@agentmatrix/agentcanvas-contract";
import type { ThemePresetId } from "../theme/themeTokens";

export const allowedRegions = [
  "sidebar",
  "main",
  "composer",
  "right-panel",
  "bottom-dock",
  "overlay",
] as const;

export type AgentCanvasRegion = typeof allowedRegions[number];

export type AgentCanvasTemplate =
  | "chat"
  | "coding"
  | "research"
  | "artifact"
  | "tool-heavy"
  | "multi-provider";

export type BuiltinProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "z-ai"
  | "moonshot"
  | "local";
export type ProviderCatalogId = BuiltinProviderId | "custom";
export type ProviderConnectionId = BuiltinProviderId | "custom-provider" | (string & {});
export type ProviderProtocol = "openai-compatible" | "anthropic" | "gemini" | "ollama-native";
export type ProviderAuth =
  | { mode: "env"; envVar: string }
  | { mode: "session"; envVar?: string }
  | { mode: "none"; envVar?: string };
export type OutputSource = "artifact" | "console";
export type ArtifactRenderer = "auto" | "code" | "diff" | "markdown" | "preview" | "data";
export type OutputSurface = "right-panel" | "overlay";
export type MediaGenerationImageStyle = "grid" | "blur" | "palette" | "layers";
export type MediaGenerationAudioStyle = "skeleton" | "waveform";
export type MediaGenerationVideoStyle = "storyboard" | "cinema" | "timeline" | "frames";

export type ProviderOption = {
  id: ProviderCatalogId;
  connectionId: ProviderConnectionId;
  kind: "builtin" | "custom";
  label: string;
  description: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  auth: ProviderAuth;
  modelOptions: readonly [string, ...string[]];
};

export type ProviderConnection = {
  id: ProviderConnectionId;
  kind: "builtin" | "custom";
  label: string;
  description: string;
  protocol: ProviderProtocol;
  baseUrl: string;
  auth: ProviderAuth;
  defaultModel: string;
  models: string[];
  enabled: boolean;
};

export const providerCatalog = [
  {
    id: "openai",
    connectionId: "openai",
    kind: "builtin",
    label: "OpenAI",
    description: "Default GPT-family hosted provider for general coding agents.",
    protocol: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    auth: { mode: "env", envVar: "OPENAI_API_KEY" },
    modelOptions: ["gpt-4o", "gpt-4o-mini"],
  },
  {
    id: "anthropic",
    connectionId: "anthropic",
    kind: "builtin",
    label: "Anthropic",
    description: "Claude-family provider for long-context coding and review workflows.",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    auth: { mode: "env", envVar: "ANTHROPIC_API_KEY" },
    modelOptions: ["claude-sonnet-4", "claude-haiku"],
  },
  {
    id: "gemini",
    connectionId: "gemini",
    kind: "builtin",
    label: "Gemini",
    description: "Google Gemini provider for multimodal and broad-context agent flows.",
    protocol: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/",
    auth: { mode: "env", envVar: "GEMINI_API_KEY" },
    modelOptions: ["gemini-2.5-pro", "gemini-2.5-flash"],
  },
  {
    id: "openrouter",
    connectionId: "openrouter",
    kind: "builtin",
    label: "OpenRouter",
    description: "Router provider for switching across hosted model families.",
    protocol: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    auth: { mode: "env", envVar: "OPENROUTER_API_KEY" },
    modelOptions: ["anthropic/claude-sonnet-4", "openai/gpt-4o"],
  },
  {
    id: "deepseek",
    connectionId: "deepseek",
    kind: "builtin",
    label: "DeepSeek",
    description: "DeepSeek chat and reasoning provider presets.",
    protocol: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    auth: { mode: "env", envVar: "DEEPSEEK_API_KEY" },
    modelOptions: ["deepseek-chat", "deepseek-reasoner"],
  },
  {
    id: "z-ai",
    connectionId: "z-ai",
    kind: "builtin",
    label: "Z.ai",
    description: "GLM-family provider presets for Z.ai compatible adapters.",
    protocol: "openai-compatible",
    baseUrl: "https://api.z.ai/api/paas/v4/",
    auth: { mode: "env", envVar: "ZAI_API_KEY" },
    modelOptions: ["glm-5.1", "glm-4.5", "glm-4.5-air"],
  },
  {
    id: "moonshot",
    connectionId: "moonshot",
    kind: "builtin",
    label: "MoonShot",
    description: "Kimi and Moonshot provider presets for Chinese and long-context agents.",
    protocol: "openai-compatible",
    baseUrl: "https://api.moonshot.cn/v1",
    auth: { mode: "env", envVar: "MOONSHOT_API_KEY" },
    modelOptions: ["kimi-k2", "moonshot-v1-128k"],
  },
  {
    id: "local",
    connectionId: "local",
    kind: "builtin",
    label: "Local models",
    description: "OpenAI-compatible local runtime presets for Ollama, LM Studio, and similar tools.",
    protocol: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    auth: { mode: "none" },
    modelOptions: ["ollama/qwen3-coder", "lmstudio/local-model", "local-model"],
  },
  {
    id: "custom",
    connectionId: "custom-provider",
    kind: "custom",
    label: "Custom provider",
    description: "Bring any OpenAI-compatible gateway, private endpoint, or hosted model proxy.",
    protocol: "openai-compatible",
    baseUrl: "https://api.example.com/v1",
    auth: { mode: "env", envVar: "CUSTOM_PROVIDER_API_KEY" },
    modelOptions: ["custom-model"],
  },
] as const satisfies readonly ProviderOption[];

export function providerOptionForId(id: ProviderCatalogId | ProviderConnectionId): ProviderOption {
  return providerCatalog.find((provider) => provider.id === id || provider.connectionId === id) ?? providerCatalog[0];
}

export function createProviderConnection(id: ProviderCatalogId | ProviderConnectionId, enabled = false): ProviderConnection {
  const option = providerOptionForId(id);
  return {
    id: option.connectionId,
    kind: option.kind,
    label: option.label,
    description: option.description,
    protocol: option.protocol,
    baseUrl: option.baseUrl,
    auth: option.auth,
    defaultModel: option.modelOptions[0],
    models: [...option.modelOptions],
    enabled,
  };
}

const PROVIDER_CREDENTIAL_ENV_VAR = /^[A-Z][A-Z0-9_]{0,47}_(?:(?:API_)?KEY|TOKEN|SECRET|CREDENTIALS?)$/;

/** Project files may store only symbolic credential names, never credential values. */
export function isSafeProviderEnvVarName(value: string): boolean {
  return PROVIDER_CREDENTIAL_ENV_VAR.test(value.trim());
}

export function safeProviderEnvVarName(provider: Pick<ProviderConnection, "id" | "auth">): string {
  if (provider.auth.mode === "env" && isSafeProviderEnvVarName(provider.auth.envVar)) {
    return provider.auth.envVar.trim();
  }
  const catalogAuth = providerOptionForId(provider.id).auth;
  if (catalogAuth.mode === "env" && isSafeProviderEnvVarName(catalogAuth.envVar)) {
    return catalogAuth.envVar;
  }
  const prefix = String(provider.id).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "PROVIDER";
  return `${prefix}_API_KEY`;
}

/** Authoritative export-boundary scrubber for legacy or malformed project state. */
export function sanitizeProjectCredentials(project: AgentFrontendProject): AgentFrontendProject {
  let changed = false;
  const connections = project.providers.connections.map((provider) => {
    if (provider.auth.mode === "env") {
      const envVar = safeProviderEnvVarName(provider);
      if (envVar === provider.auth.envVar) return provider;
      changed = true;
      return { ...provider, auth: { ...provider.auth, envVar } };
    }
    if (provider.auth.envVar === undefined) return provider;
    changed = true;
    return { ...provider, auth: { mode: provider.auth.mode } };
  });
  if (!changed) return project;
  return { ...project, providers: { ...project.providers, connections } };
}

export function modelOptionsForProvider(id: ProviderCatalogId | ProviderConnectionId): readonly string[] {
  return providerOptionForId(id).modelOptions;
}

export function defaultModelForProvider(id: ProviderCatalogId | ProviderConnectionId): string {
  return providerOptionForId(id).modelOptions[0];
}

export function enabledProviderConnections(project: AgentFrontendProject): ProviderConnection[] {
  return project.providers.connections.filter((provider) => provider.enabled);
}

export function defaultProviderConnection(project: AgentFrontendProject): ProviderConnection {
  return (
    project.providers.connections.find((provider) => provider.enabled && provider.id === project.providers.defaultProviderId) ??
    enabledProviderConnections(project)[0] ??
    project.providers.connections[0] ??
    createProviderConnection("openai", true)
  );
}

export function modelOptionsForProject(project: AgentFrontendProject): readonly string[] {
  return defaultProviderConnection(project).models;
}

export type SlotConfig = {
  id: string;
  region: AgentCanvasRegion;
  component:
    | "SessionSidebar"
    | "ChatFrame"
    | "ComposerFrame"
    | "OutputFrame"
    | "GitFrame"
    | "ExportFrame"
    | "DebugDock"
    | "CapabilityTray";
  enabled: boolean;
};

/**
 * Visual style preset. Each style owns its own theme set and its own branch of
 * `app.css` (via the `data-style-preset` attribute), so this has to travel with
 * the project — the exported scaffold reads it to render the same style the
 * configurator previewed. "studio" is still under construction.
 */
export type PresetStyleId = "native" | "illustrated" | "studio" | "workbuddy";

export const presetStyleIds: readonly PresetStyleId[] = ["native", "illustrated", "studio", "workbuddy"];

export type AgentProductInterface = Pick<
  CompleteAgentCanvasExperienceV2,
  "surface" | "brand" | "welcome" | "design" | "extensions"
>;

export type AgentFrontendProject = {
  id: string;
  name: string;
  product: AgentProductInterface;
  template: AgentCanvasTemplate;
  runtime: {
    transport: "replay" | "mock" | "sse";
    harness: "agentux" | "codex" | "opencode" | "claude" | "pi" | "custom";
  };
  providers: {
    defaultProviderId: ProviderConnectionId;
    settingsLauncher: boolean;
    connections: ProviderConnection[];
  };
  layout: {
    regions: AgentCanvasRegion[];
    slots: SlotConfig[];
    mainSize: number;
    rightPanelSize: number;
    bottomDockSize: number;
  };
  theme: {
    preset: ThemePresetId;
    /** Drives `data-style-preset`; 168 rules in app.css branch on it. */
    stylePreset: PresetStyleId;
    density: "compact" | "comfortable";
    radius: number;
    motion: {
      reasoning:
        | "minimal"
        | "pulse"
        | "wave"
        | "terminal"
        | "shimmer"
        | "bars"
        | "orbit"
        | "orb-s1"
        | "orb-b5"
        | "orb-m2";
      writing: "smooth-stream" | "typewriter" | "chunked";
      toolCall: "card" | "expanded" | "inline" | "drawer";
      /** Per-mode timing for the writing animation. */
      writingParams: {
        /** smooth-stream: words revealed per second. */
        streamWps: number;
        /** typewriter: characters typed per second. */
        typeCps: number;
        /** chunked: words revealed per chunk. */
        chunkSize: number;
        /** chunked: pause between chunks, in ms. */
        chunkIntervalMs: number;
      };
    };
  };
  composer: {
    fileUpload: boolean;
    mic: boolean;
    thinkingBudget: boolean;
    modelSwitcher: boolean;
    toolToggle: boolean;
    promptShortcuts: boolean;
  };
  conversation: {
    speakerLabels: boolean;
    userAvatar: boolean;
    agentAvatar: boolean;
    messageActions: {
      copy: boolean;
      regenerate: boolean;
      edit: boolean;
      userCopy?: boolean;
      userEdit?: boolean;
      userTime?: boolean;
      agentCopy?: boolean;
      agentRegenerate?: boolean;
      agentEdit?: boolean;
      agentTime?: boolean;
    };
    emptyState: "minimal" | "suggested-prompts" | "capability-hints";
  };
  sidebar: {
    /** The project name at the top of the column. */
    title: boolean;
    /** The control that collapses the column. */
    collapse: boolean;
    newButton: boolean;
    search: boolean;
    /** The conversation rows themselves. */
    sessionList: boolean;
    grouping: boolean;
    footer: boolean;
  };
  welcome: {
    greeting: string;
  };
  context: {
    attachmentChips: boolean;
  };
  toolCalls: {
    detail: "full" | "output-only" | "summary";
    progress: "status-icon" | "bar";
    approval: "inline" | "hidden";
    timelineRail: boolean;
  };
  reasoning: {
    show: "status" | "summary" | "thinking";
    collapse: "auto" | "manual" | "summary-first" | "expanded";
    expandable: boolean;
    /**
     * How the block presents itself once the span has closed. `label` is the
     * plain title; `timed` names the wait it replaced — 已思考（用时 11 秒）—
     * and rules the body off down its left edge. More to come; this is the
     * first of the set.
     */
    doneStyle: "label" | "timed";
    /** How the reasoning text arrives, the way `theme.motion.writing` does for the answer. */
    writing: "smooth-stream" | "typewriter" | "chunked";
  };
  blocks: {
    codeDiff: boolean;
    errorCollapse: boolean;
    toolLogTail: boolean;
  };
  output: {
    source: OutputSource;
    artifactRenderer: ArtifactRenderer;
    surface: OutputSurface;
    supportedArtifactRenderers: Exclude<ArtifactRenderer, "auto">[];
  };
  mediaGeneration: {
    imageStyle: MediaGenerationImageStyle;
    audioStyle: MediaGenerationAudioStyle;
    videoStyle: MediaGenerationVideoStyle;
  };
  git: {
    showBranchStatus: boolean;
    showChangedFiles: boolean;
    showDiff: boolean;
    suggestCommitMessage: boolean;
    allowCommit: boolean;
    allowPush: boolean;
  };
  export: {
    target: "vite-react";
    includeFixtures: boolean;
    includeHarnessAdapter: boolean;
  };
};

const defaultProductInterface = createDefaultAgentCanvasExperienceV2({
  displayName: "Coding Agent",
  welcomeHeadline: "What would you like to build?",
  welcomeSupportingText:
    "Describe a task, inspect the workspace, or start with a suggested prompt.",
});
defaultProductInterface.welcome = {
  ...defaultProductInterface.welcome,
  showSuggestedPrompts: true,
  suggestedPrompts: [
    "Inspect this project and propose the smallest safe change.",
    "Fix the failing test and explain the root cause.",
    "Review the latest changes for correctness and accessibility.",
  ],
};

export const defaultCodingAgentProject: AgentFrontendProject = {
  id: "agentcanvas-default",
  name: "Coding Agent Scaffold",
  product: {
    surface: defaultProductInterface.surface,
    brand: defaultProductInterface.brand,
    welcome: defaultProductInterface.welcome,
    design: defaultProductInterface.design,
    extensions: defaultProductInterface.extensions,
  },
  template: "coding",
  runtime: {
    transport: "replay",
    harness: "agentux",
  },
  providers: {
    defaultProviderId: "openai",
    settingsLauncher: false,
    connections: providerCatalog.map((provider) => createProviderConnection(provider.id, provider.id === "openai")),
  },
  layout: {
    regions: ["sidebar", "main", "composer", "right-panel", "bottom-dock", "overlay"],
    mainSize: 68,
    rightPanelSize: 32,
    bottomDockSize: 28,
    slots: [
      { id: "sessions", region: "sidebar", component: "SessionSidebar", enabled: true },
      { id: "chat", region: "main", component: "ChatFrame", enabled: true },
      { id: "composer", region: "composer", component: "ComposerFrame", enabled: true },
      { id: "output", region: "right-panel", component: "OutputFrame", enabled: true },
      { id: "capabilities", region: "bottom-dock", component: "CapabilityTray", enabled: false },
      { id: "git", region: "right-panel", component: "GitFrame", enabled: true },
      { id: "debug", region: "bottom-dock", component: "DebugDock", enabled: true },
    ],
  },
  theme: {
    preset: "soft-glass",
    stylePreset: "native",
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
    messageActions: {
      copy: false,
      regenerate: false,
      edit: false,
      userCopy: false,
      userEdit: false,
      userTime: false,
      agentCopy: false,
      agentRegenerate: false,
      agentEdit: false,
      agentTime: false,
    },
    emptyState: "minimal",
  },
  sidebar: {
    title: true,
    collapse: true,
    newButton: true,
    search: true,
    sessionList: true,
    grouping: true,
    footer: true,
  },
  welcome: {
    greeting: "Meet My Agent ~",
  },
  context: {
    attachmentChips: true,
  },
  toolCalls: {
    detail: "full",
    progress: "status-icon",
    approval: "inline",
    timelineRail: false,
  },
  reasoning: {
    show: "summary",
    collapse: "summary-first",
    expandable: true,
    doneStyle: "label",
    writing: "smooth-stream",
  },
  blocks: {
    codeDiff: true,
    errorCollapse: false,
    toolLogTail: false,
  },
  output: {
    source: "artifact",
    artifactRenderer: "auto",
    surface: "right-panel",
    supportedArtifactRenderers: ["code", "diff", "markdown", "preview", "data"],
  },
  mediaGeneration: {
    imageStyle: "grid",
    audioStyle: "waveform",
    videoStyle: "storyboard",
  },
  git: {
    showBranchStatus: true,
    showChangedFiles: true,
    showDiff: true,
    suggestCommitMessage: true,
    allowCommit: true,
    allowPush: false,
  },
  export: {
    target: "vite-react",
    includeFixtures: true,
    includeHarnessAdapter: true,
  },
};

/**
 * What the editor opens on: the three canvas regions declared, nothing in them.
 *
 * The canvas shows whatever is currently configured, so an empty configuration
 * is what makes it open on an empty three-column skeleton rather than on a
 * fully-populated agent. Regions are declared and slots are all disabled —
 * `layout.regions` is the structure, `layout.slots` is its contents.
 *
 * Separate from `defaultCodingAgentProject` rather than a change to it:
 * 29 files reference that one (tests, fixtures, the export pipeline), and it is
 * also the shape a generated project ships with. An export that produced an
 * empty app would be a regression, not a redesign.
 *
 * `bottom-dock` and `overlay` are left out — they hold the debug dock and the
 * approval overlay, which are not part of the three-column structure and would
 * otherwise show as two more empty layers with nothing to put in them.
 */
/**
 * The slots a new project opens with.
 *
 * `sessions` and `output` are the side columns' presence toggles: having them
 * on is what puts the left and right columns on the canvas. Neither mounts its
 * component — see `PRESENCE_MOUNTS_COMPONENT` — so those columns open empty.
 *
 * `composer` is different: an agent frontend without a way to type is not one,
 * so it is there from the start, in its plainest form — a field and a send
 * control, with none of its 功能 options picked. Its toggle is hidden from the
 * rail for the same reason the side columns' are: a control that can only ever
 * be on is not a choice.
 *
 * `chat` stays off. A conversation is content, and content is the reader's to
 * pick.
 */
const OPENING_SLOT_IDS = ["sessions", "composer", "output"];

export const emptyStructureProject: AgentFrontendProject = {
  ...defaultCodingAgentProject,
  // The name the canvas shows as the product's brand, and the name the Layers
  // panel edits — one value, so renaming in the rail renames on the canvas.
  // A real default rather than a placeholder: an unnamed project would put
  // "未命名" on the canvas, which is not a name anyone would ship.
  name: "My Agent",
  layout: {
    ...defaultCodingAgentProject.layout,
    regions: ["sidebar", "main", "composer", "right-panel"],
    // Each column's presence toggle is on, everything else is off: the three
    // columns are there to be configured, and what goes *in* them is the
    // reader's to pick. Git, the capability tray and the debug dock are
    // components you add, not columns you start with.
    slots: defaultCodingAgentProject.layout.slots.map((slot) => ({
      ...slot,
      enabled: OPENING_SLOT_IDS.includes(slot.id),
    })),
  },
  // Nothing is picked yet, in any column. The canvas opens as three empty
  // frames in the project's theme and fills in as components are chosen —
  // which is what makes it what-you-see-is-what-you-get rather than a demo
  // that happens to be editable.
  //
  // Only the additive options appear here. The mutually exclusive ones (a
  // motion curve, a media placeholder style, the output source) have no "off"
  // state to set; `isAddedContentOption` keeps them from counting as content.
  // Every part of the column, down to its title and the list itself. The three
  // that are not toggles of their own — the brand, the collapse control and the
  // conversation rows — used to arrive with the component, so picking 搜索功能
  // put four things on the canvas and the reader had asked for one.
  sidebar: {
    title: false,
    collapse: false,
    newButton: false,
    search: false,
    sessionList: false,
    grouping: false,
    footer: false,
  },
  conversation: {
    ...defaultCodingAgentProject.conversation,
    speakerLabels: false,
    userAvatar: false,
    agentAvatar: false,
  },
  composer: {
    ...defaultCodingAgentProject.composer,
    fileUpload: false,
    thinkingBudget: false,
    modelSwitcher: false,
    toolToggle: false,
  },
  git: {
    ...defaultCodingAgentProject.git,
    showBranchStatus: false,
    showChangedFiles: false,
    showDiff: false,
    suggestCommitMessage: false,
    allowCommit: false,
    allowPush: false,
  },
};

/** Project the branch-owned Canvas model into the portable v2 product contract. */
export function projectExperienceV2(
  project: AgentFrontendProject,
): CompleteAgentCanvasExperienceV2 {
  const contractCanvas = defaultAgentCanvasExperienceV2.canvas;
  return {
    contractVersion: AGENTCANVAS_EXPERIENCE_V2,
    ...project.product,
    canvas: {
      ...contractCanvas,
      template: project.template,
      layout: project.layout,
      composer: project.composer,
      conversation: {
        ...contractCanvas.conversation,
        speakerLabels: project.conversation.speakerLabels,
        userAvatar: project.conversation.userAvatar,
        agentAvatar: project.conversation.agentAvatar,
        messageActions: {
          copy: project.conversation.messageActions.copy,
          regenerate: project.conversation.messageActions.regenerate,
          edit: project.conversation.messageActions.edit,
        },
        emptyState: project.conversation.emptyState,
      },
      sidebar: project.sidebar,
      context: project.context,
      toolCalls: {
        detail: project.toolCalls.detail,
        progress: project.toolCalls.progress,
        approval: project.toolCalls.approval,
      },
      reasoning: project.reasoning,
      blocks: project.blocks,
      output: project.output,
      export: {
        target: project.export.target,
        includeHarnessAdapter: project.export.includeHarnessAdapter,
      },
    },
  };
}

/** Apply v2 product presentation without replacing branch-specific Canvas settings. */
export function withProjectExperienceV2(
  project: AgentFrontendProject,
  experienceInput: AgentCanvasExperienceV2,
): AgentFrontendProject {
  const experience = completeAgentCanvasExperienceV2(experienceInput);
  return {
    ...project,
    product: {
      surface: experience.surface,
      brand: experience.brand,
      welcome: experience.welcome,
      design: experience.design,
      extensions: experience.extensions,
    },
  };
}

export function assertValidProject(project: AgentFrontendProject): void {
  const allowed = new Set<string>(allowedRegions);
  const seenSlotIds = new Set<string>();

  if (!presetStyleIds.includes(project.theme.stylePreset)) {
    throw new Error(`Unsupported style preset: ${project.theme.stylePreset}`);
  }

  for (const region of project.layout.regions) {
    if (!allowed.has(region)) {
      throw new Error(`Unsupported layout region: ${region}`);
    }
  }

  for (const slot of project.layout.slots) {
    if (seenSlotIds.has(slot.id)) {
      throw new Error(`Duplicate slot id: ${slot.id}`);
    }
    seenSlotIds.add(slot.id);

    if (!allowed.has(slot.region)) {
      throw new Error(`Slot ${slot.id} uses unsupported region: ${slot.region}`);
    }
  }

  if (
    project.output.artifactRenderer !== "auto" &&
    !project.output.supportedArtifactRenderers.includes(project.output.artifactRenderer)
  ) {
    throw new Error(`Artifact renderer is not supported: ${project.output.artifactRenderer}`);
  }

  if (!["grid", "blur", "palette", "layers"].includes(project.mediaGeneration.imageStyle)) {
    throw new Error(`Unsupported image generation style: ${project.mediaGeneration.imageStyle}`);
  }
  if (!["skeleton", "waveform"].includes(project.mediaGeneration.audioStyle)) {
    throw new Error(`Unsupported audio generation style: ${project.mediaGeneration.audioStyle}`);
  }
  if (!["storyboard", "cinema", "timeline", "frames"].includes(project.mediaGeneration.videoStyle)) {
    throw new Error(`Unsupported video generation style: ${project.mediaGeneration.videoStyle}`);
  }

  const seenProviderIds = new Set<string>();
  for (const provider of project.providers.connections) {
    if (seenProviderIds.has(provider.id)) {
      throw new Error(`Duplicate provider id: ${provider.id}`);
    }
    seenProviderIds.add(provider.id);
  }

  if (enabledProviderConnections(project).length === 0) {
    throw new Error("At least one provider must be enabled.");
  }

  if (!enabledProviderConnections(project).some((provider) => provider.id === project.providers.defaultProviderId)) {
    throw new Error(`Default provider is not enabled: ${project.providers.defaultProviderId}`);
  }

  if (project.layout.mainSize <= 0 || project.layout.rightPanelSize <= 0 || project.layout.bottomDockSize <= 0) {
    throw new Error("Layout sizes must be positive.");
  }
}

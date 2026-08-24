export const AGENTCANVAS_EXPERIENCE_V1 = "agentcanvas-experience-v1" as const;
export const AGENTCANVAS_EXPERIENCE_V2 = "agentcanvas-experience-v2" as const;

export const agentCanvasTemplates = [
  "chat",
  "coding",
  "research",
  "artifact",
  "tool-heavy",
  "multi-provider",
] as const;
export type AgentCanvasTemplate = (typeof agentCanvasTemplates)[number];

export const agentCanvasRegions = [
  "sidebar",
  "main",
  "composer",
  "right-panel",
  "bottom-dock",
  "overlay",
] as const;
export type AgentCanvasRegion = (typeof agentCanvasRegions)[number];

export const agentCanvasSlotComponents = [
  "SessionSidebar",
  "ChatFrame",
  "ComposerFrame",
  "OutputFrame",
  "GitFrame",
  "ExportFrame",
  "DebugDock",
  "CapabilityTray",
] as const;
export type AgentCanvasSlotComponent =
  (typeof agentCanvasSlotComponents)[number];

export const themePresetIds = [
  "console-light",
  "graphite",
  "oxide",
  "studio-neutral",
  "paper-trail",
  "terminal-green",
] as const;
export type ThemePresetId = (typeof themePresetIds)[number];

export type AgentCanvasSlot = {
  id: string;
  region: AgentCanvasRegion;
  component: AgentCanvasSlotComponent;
  enabled: boolean;
};

export type AgentCanvasExperienceV1 = {
  contractVersion: typeof AGENTCANVAS_EXPERIENCE_V1;
  template: AgentCanvasTemplate;
  layout?: {
    regions?: AgentCanvasRegion[];
    slots?: AgentCanvasSlot[];
    mainSize?: number;
    rightPanelSize?: number;
    bottomDockSize?: number;
  };
  theme?: {
    preset?: ThemePresetId;
    density?: "compact" | "comfortable";
    radius?: number;
    motion?: {
      reasoning?:
        | "minimal"
        | "pulse"
        | "wave"
        | "terminal"
        | "shimmer"
        | "bars"
        | "orbit";
      writing?: "smooth-stream" | "typewriter" | "chunked";
      toolCall?: "card" | "timeline" | "inline" | "drawer";
      writingParams?: {
        streamWps?: number;
        typeCps?: number;
        chunkSize?: number;
        chunkIntervalMs?: number;
      };
    };
  };
  composer?: {
    fileUpload?: boolean;
    mic?: boolean;
    thinkingBudget?: boolean;
    modelSwitcher?: boolean;
    toolToggle?: boolean;
    promptShortcuts?: boolean;
  };
  conversation?: {
    speakerLabels?: boolean;
    userAvatar?: boolean;
    agentAvatar?: boolean;
    messageActions?: {
      copy?: boolean;
      regenerate?: boolean;
      edit?: boolean;
    };
    emptyState?: "minimal" | "suggested-prompts" | "capability-hints";
  };
  sidebar?: {
    newButton?: boolean;
    search?: boolean;
    grouping?: boolean;
    footer?: boolean;
  };
  context?: {
    attachmentChips?: boolean;
  };
  toolCalls?: {
    detail?: "full" | "output-only" | "summary";
    progress?: "status-icon" | "bar";
    approval?: "inline" | "hidden";
  };
  reasoning?: {
    show?: "status" | "summary" | "thinking";
    collapse?: "auto" | "manual" | "summary-first" | "expanded";
    expandable?: boolean;
  };
  blocks?: {
    codeDiff?: boolean;
    errorCollapse?: boolean;
    toolLogTail?: boolean;
  };
  output?: {
    source?: "artifact" | "console";
    artifactRenderer?:
      | "auto"
      | "code"
      | "diff"
      | "markdown"
      | "preview"
      | "data";
    surface?: "right-panel" | "overlay";
    supportedArtifactRenderers?: Array<
      "code" | "diff" | "markdown" | "preview" | "data"
    >;
  };
  export?: {
    target?: "vite-react";
    includeHarnessAdapter?: boolean;
  };
};

export type CompleteAgentCanvasExperienceV1 = {
  contractVersion: typeof AGENTCANVAS_EXPERIENCE_V1;
  template: AgentCanvasTemplate;
  layout: Required<NonNullable<AgentCanvasExperienceV1["layout"]>>;
  theme: Omit<
    Required<NonNullable<AgentCanvasExperienceV1["theme"]>>,
    "motion"
  > & {
    motion: Omit<
      Required<
        NonNullable<NonNullable<AgentCanvasExperienceV1["theme"]>["motion"]>
      >,
      "writingParams"
    > & {
      writingParams: Required<
        NonNullable<
          NonNullable<
            NonNullable<AgentCanvasExperienceV1["theme"]>["motion"]
          >["writingParams"]
        >
      >;
    };
  };
  composer: Required<NonNullable<AgentCanvasExperienceV1["composer"]>>;
  conversation: Omit<
    Required<NonNullable<AgentCanvasExperienceV1["conversation"]>>,
    "messageActions"
  > & {
    messageActions: Required<
      NonNullable<
        NonNullable<AgentCanvasExperienceV1["conversation"]>["messageActions"]
      >
    >;
  };
  sidebar: Required<NonNullable<AgentCanvasExperienceV1["sidebar"]>>;
  context: Required<NonNullable<AgentCanvasExperienceV1["context"]>>;
  toolCalls: Required<NonNullable<AgentCanvasExperienceV1["toolCalls"]>>;
  reasoning: Required<NonNullable<AgentCanvasExperienceV1["reasoning"]>>;
  blocks: Required<NonNullable<AgentCanvasExperienceV1["blocks"]>>;
  output: Required<NonNullable<AgentCanvasExperienceV1["output"]>>;
  export: Required<NonNullable<AgentCanvasExperienceV1["export"]>>;
};

export const agentCanvasSurfaceModes = ["agentcanvas", "custom"] as const;
export type AgentCanvasSurfaceMode = (typeof agentCanvasSurfaceModes)[number];

export const agentCanvasBuiltinMarks = [
  "sparkles",
  "messages-square",
  "bot",
  "terminal",
  "search",
  "chart",
] as const;
export type AgentCanvasBuiltinMark = (typeof agentCanvasBuiltinMarks)[number];

export const agentCanvasStylesheetLayers = [
  "base",
  "theme",
  "overrides",
] as const;
export type AgentCanvasStylesheetLayer =
  (typeof agentCanvasStylesheetLayers)[number];

export const agentCanvasColorModes = [
  "theme",
  "light",
  "dark",
  "system",
] as const;
export type AgentCanvasColorMode = (typeof agentCanvasColorModes)[number];

export type AgentCanvasBrandMarkV2 =
  | { kind: "builtin"; id: AgentCanvasBuiltinMark }
  | { kind: "asset"; assetId: string };

export type AgentCanvasBrandAccentV2 =
  | { kind: "theme" }
  | { kind: "custom"; color: string };

export type AgentCanvasDesignTokensV2 = {
  colorMode?: AgentCanvasColorMode;
  colors?: {
    canvas?: string;
    panel?: string;
    raised?: string;
    inset?: string;
    hover?: string;
    text?: string;
    textSecondary?: string;
    textMuted?: string;
    border?: string;
    borderStrong?: string;
    action?: string;
    actionText?: string;
    success?: string;
    warning?: string;
    danger?: string;
    focus?: string;
  };
  typography?: {
    fontUi?: string;
    fontDisplay?: string;
    fontMono?: string;
    baseSize?: number;
    headingScale?: number;
  };
  geometry?: {
    spacingScale?: number;
    radiusScale?: number;
    borderScale?: number;
  };
};

export type AgentCanvasExperienceV2 = {
  contractVersion: typeof AGENTCANVAS_EXPERIENCE_V2;
  surface: { mode: AgentCanvasSurfaceMode };
  brand: {
    displayName: string;
    mark: AgentCanvasBrandMarkV2;
    accent: AgentCanvasBrandAccentV2;
    corners: "theme" | "rounded" | "square";
    showPoweredBy: boolean;
  };
  welcome: {
    headline: string;
    supportingText: string;
    suggestedPrompts: string[];
    showSuggestedPrompts: boolean;
  };
  canvas: Omit<AgentCanvasExperienceV1, "contractVersion">;
  design?: AgentCanvasDesignTokensV2;
  extensions?: {
    stylesheets?: Array<{
      assetId: string;
      layer: AgentCanvasStylesheetLayer;
    }>;
  };
};

export type CompleteAgentCanvasExperienceV2 = Omit<
  AgentCanvasExperienceV2,
  "canvas" | "design" | "extensions"
> & {
  canvas: Omit<CompleteAgentCanvasExperienceV1, "contractVersion">;
  design: AgentCanvasDesignTokensV2;
  extensions: {
    stylesheets: Array<{
      assetId: string;
      layer: AgentCanvasStylesheetLayer;
    }>;
  };
};

export type AgentCanvasExperience =
  | AgentCanvasExperienceV1
  | AgentCanvasExperienceV2;

export type ThemeTokens = {
  id: ThemePresetId;
  name: string;
  font: { ui: string; display: string; mono: string };
  surface: {
    canvas: string;
    panel: string;
    raised: string;
    inset: string;
    hover: string;
  };
  text: { primary: string; secondary: string; muted: string; inverse: string };
  border: { subtle: string; strong: string };
  accent: { action: string; hover: string; soft: string };
  status: { success: string; warning: string; danger: string; info: string };
};

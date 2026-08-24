import type {
  AgentCanvasExperience,
  AgentCanvasExperienceV1,
  AgentCanvasExperienceV2,
  ExperienceCapabilityFlags,
} from "@agentmatrix/agentcanvas-contract";
import type { CSSProperties, ReactNode } from "react";

export type AgentCanvasLocale = "en" | "zh-CN";

export type AgentCanvasSemanticTokens = {
  canvas: string;
  panel: string;
  raised: string;
  inset: string;
  hover: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  action: string;
  actionText: string;
  success: string;
  warning: string;
  danger: string;
  focus: string;
  fontUi: string;
  fontDisplay: string;
  fontMono: string;
  baseSize: string;
  headingScale: string;
  spacingScale: string;
  radiusScale: string;
  borderScale: string;
};

export type AgentCanvasV2Change = AgentCanvasExperienceV2;

export type ExperiencePreviewFixture = {
  title?: string;
  welcomeTitle?: string;
  welcomeDescription?: string;
  sessions?: string[];
  messages?: Array<{
    id: string;
    role: "user" | "agent";
    text: string;
  }>;
  toolCall?: {
    name: string;
    summary: string;
    status: "running" | "succeeded" | "failed" | "approval-required";
  };
  artifact?: {
    name: string;
    kind: "code" | "diff" | "markdown" | "preview" | "data";
    content: string;
  };
  suggestedPrompts?: string[];
};

export type ExperiencePreviewPresentation = {
  displayName: string;
  mark?: ReactNode;
  showPoweredBy: boolean;
  showSuggestedPrompts?: boolean;
  colorMode?: "theme" | "light" | "dark" | "system";
};

export type AgentCanvasEmbedCommonProps = {
  value: AgentCanvasExperienceV1;
  locale?: AgentCanvasLocale;
  semanticTokens?: Partial<AgentCanvasSemanticTokens>;
  capabilities?: Partial<ExperienceCapabilityFlags>;
  className?: string;
  style?: CSSProperties;
  loading?: boolean;
  error?: ReactNode;
  migrationRequired?: boolean;
};

export type ExperienceConfiguratorProps = AgentCanvasEmbedCommonProps & {
  onChange: (value: AgentCanvasExperienceV1) => void;
  disabled?: boolean;
  readOnly?: boolean;
  previewFixture?: ExperiencePreviewFixture;
  showPreview?: boolean;
};

export type ExperienceStudioScenario = "completed" | "welcome" | "approval";

export type ExperienceStudioViewport = "desktop" | "tablet" | "mobile";

export type ExperienceStudioProps = AgentCanvasEmbedCommonProps & {
  onChange: (value: AgentCanvasExperienceV1) => void;
  disabled?: boolean;
  readOnly?: boolean;
  previewFixture?: ExperiencePreviewFixture;
  initialScenario?: ExperienceStudioScenario;
  initialViewport?: ExperienceStudioViewport;
  previewPresentation?: ExperiencePreviewPresentation;
  previewSemanticTokens?: Partial<AgentCanvasSemanticTokens>;
};

export type ExperiencePreviewProps = AgentCanvasEmbedCommonProps & {
  fixture?: ExperiencePreviewFixture;
  label?: string;
  presentation?: ExperiencePreviewPresentation;
};

export type ProductInterfacePreviewProps = Omit<
  AgentCanvasEmbedCommonProps,
  "value"
> & {
  value: AgentCanvasExperience;
  fixture?: ExperiencePreviewFixture;
  label?: string;
  resolveBrandAsset?: (assetId: string) => ReactNode;
};

export type ProductInterfaceContractAdapterProps = {
  value: AgentCanvasExperienceV2;
  children: (input: {
    canvasValue: AgentCanvasExperienceV1;
    onCanvasChange: (value: AgentCanvasExperienceV1) => void;
  }) => ReactNode;
  onChange: (value: AgentCanvasV2Change) => void;
};

export type ProductInterfaceStudioProps = Omit<
  AgentCanvasEmbedCommonProps,
  "value"
> & {
  value: AgentCanvasExperienceV2;
  onChange: (value: AgentCanvasExperienceV2) => void;
  disabled?: boolean;
  readOnly?: boolean;
  previewFixture?: ExperiencePreviewFixture;
  initialScenario?: ExperienceStudioScenario;
  initialViewport?: ExperienceStudioViewport;
  resolveBrandAsset?: (assetId: string) => ReactNode;
  resetValue?: AgentCanvasExperienceV2;
};

export type ExperiencePresetOptionPreviewProps = ExperiencePreviewProps & {
  optionId: string;
};

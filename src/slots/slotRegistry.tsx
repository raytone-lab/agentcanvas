import { Fragment, type ReactNode } from "react";
import type { AgentUXEvent } from "@agent-ux/protocol";
import type { AgentUXViewModel } from "@agent-ux/render-core";

import { CapabilityTray } from "../components/agent-preview/CapabilityTray";
import { ChatFrame } from "../components/agent-preview/ChatFrame";
import type { ApprovalDecision } from "../components/agent-preview/ToolCallCard";
import { ComposerFrame, type ComposerSubmitContext } from "../components/agent-preview/ComposerFrame";
import { ExportFrame } from "../components/agent-preview/ExportFrame";
import { GitFrame } from "../components/agent-preview/GitFrame";
import { OutputFrame, type OutputPanelItem, type OutputPanelOpenRequest } from "../components/agent-preview/OutputFrame";
import { SessionSidebar } from "../components/agent-preview/SessionSidebar";
import { DebugDock } from "../components/debug-dock/DebugDock";
import type { ScaffoldExportSnapshot } from "../export/scaffoldManifest";
import type { GitPreviewState } from "../preview-runner/PreviewRunner";
import type { Admission } from "../runtime/admissionReport";
import type { AgentCanvasTemplate, AgentFrontendProject, OutputSource, ProviderConnectionId, SlotConfig } from "../schema/agentuxConfig";
import { templateSupportsGit } from "../schema/presets";

export type SlotRenderContext = {
  project: AgentFrontendProject;
  viewModel: AgentUXViewModel;
  events: readonly AgentUXEvent[];
  /**
   * What the admission layer accepted, held back, derived and rewrote for this stream. Only
   * the debug dock reads it; product components see the admitted events and nothing else.
   */
  admission?: Admission;
  exportSnapshot?: ScaffoldExportSnapshot;
  showDebugBadges: boolean;
  previewPrompt?: string;
  previewPrompts?: readonly string[];
  writingReplayKey?: number;
  forceToolsOpen?: boolean;
  toolCollapseSignal?: number;
  gitPreviewState?: GitPreviewState;
  modelOptions: readonly string[];
  isRunning: boolean;
  onSubmit: (prompt: string, context?: ComposerSubmitContext) => void;
  onStop: () => void;
  onExport: () => void;
  onGitCommit: () => void;
  onProviderChange: (providerId: ProviderConnectionId) => void;
  onModelChange: (model: string) => void;
  onCollapseLeft?: () => void;
  onCollapseRight?: () => void;
  activeSessionPrompt?: string;
  sessionPrompts?: readonly string[];
  onSelectSession?: (prompt: string) => void;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  outputPanelItems?: readonly OutputPanelItem[];
  activeOutputPanelItemId?: string;
  onSelectOutputPanelItem?: (id: string) => void;
  onCloseOutputPanelItem?: (id: string) => void;
  onOutputSourceChange?: (source: OutputSource) => void;
  onNewSession?: () => void;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
  welcomeGreeting?: string;
  isWelcome?: boolean;
  providerSettingsControl?: ReactNode;
  externalApprovalPlacement?: "timeline" | "overlay";
};

export type SlotComponent = NonNullable<SlotConfig["component"]>;
export type SlotRenderer = (context: SlotRenderContext) => ReactNode;

export const slotComponentRegistry: Record<SlotComponent, SlotRenderer> = {
  SessionSidebar: ({ project, onCollapseLeft, activeSessionPrompt, sessionPrompts, onSelectSession, onNewSession }) => (
    <SessionSidebar
      project={project}
      onCollapse={onCollapseLeft}
      activePrompt={activeSessionPrompt}
      sessionPrompts={sessionPrompts}
      onSelectSession={onSelectSession}
      onNewSession={onNewSession}
    />
  ),
  ChatFrame: ({ project, viewModel, showDebugBadges, previewPrompt, previewPrompts, writingReplayKey, forceToolsOpen, toolCollapseSignal, onOpenArtifact, onApprovalDecision, externalApprovalPlacement }) => (
    <ChatFrame
      project={project}
      viewModel={viewModel}
      showDebugBadges={showDebugBadges}
      previewPrompt={previewPrompt}
      previewPrompts={previewPrompts}
      writingReplayKey={writingReplayKey}
      forceToolsOpen={forceToolsOpen}
      toolCollapseSignal={toolCollapseSignal}
      onOpenArtifact={onOpenArtifact}
      onApprovalDecision={onApprovalDecision}
      externalApprovalPlacement={externalApprovalPlacement}
    />
  ),
  ComposerFrame: ({ project, modelOptions, isRunning, onSubmit, onStop, onProviderChange, onModelChange, providerSettingsControl, welcomeGreeting, isWelcome }) => (
    <ComposerFrame
      project={project}
      modelOptions={modelOptions}
      isRunning={isRunning}
      providerSettingsControl={providerSettingsControl}
      welcomeGreeting={welcomeGreeting}
      isWelcome={isWelcome}
      onSubmit={onSubmit}
      onStop={onStop}
      onProviderChange={onProviderChange}
      onModelChange={onModelChange}
    />
  ),
  OutputFrame: ({ project, viewModel, onCollapseRight, outputPanelItems, activeOutputPanelItemId, onSelectOutputPanelItem, onCloseOutputPanelItem, onOutputSourceChange }) => (
    <OutputFrame
      project={project}
      viewModel={viewModel}
      onCollapse={onCollapseRight}
      openItems={outputPanelItems}
      activeOpenItemId={activeOutputPanelItemId}
      onSelectOpenItem={onSelectOutputPanelItem}
      onCloseOpenItem={onCloseOutputPanelItem}
      onSourceChange={onOutputSourceChange}
    />
  ),
  GitFrame: ({ project, gitPreviewState, onGitCommit }) => <GitFrame project={project} gitState={gitPreviewState} onCommit={onGitCommit} />,
  ExportFrame: ({ exportSnapshot, onExport }) => <ExportFrame snapshot={exportSnapshot} onExport={onExport} />,
  DebugDock: ({ events, viewModel, admission }) => <DebugDock events={events} viewModel={viewModel} admission={admission} />,
  CapabilityTray: ({ viewModel }) => <CapabilityTray viewModel={viewModel} />,
};

export function slotsForTemplate(
  slots: readonly SlotConfig[],
  template: AgentCanvasTemplate,
): SlotConfig[] {
  return slots.filter((slot) => slot.component !== "GitFrame" || templateSupportsGit(template));
}

export function renderSlots(
  slots: readonly SlotConfig[],
  region: SlotConfig["region"],
  context: SlotRenderContext,
): ReactNode[] {
  return slots
    .filter((slot) => slot.enabled && slot.region === region)
    .map((slot) => {
      const render = slotComponentRegistry[slot.component];
      return <Fragment key={slot.id}>{render(context)}</Fragment>;
    });
}

import type { AgentUXTimelineItem, AgentUXToolTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import type { ReactElement } from "react";

import { StateIcon, errorDomainSlot, incidentSlot, runtimeOpSlot, useIconSet, type IconSlot } from "../../agentmatrix";
import { useCopy } from "../../i18n/LocaleContext";
import type { UiCopy } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { ArtifactLaunchCard } from "./chatframe/ArtifactLaunch";
import { ExternalApprovalSurface, isPendingApprovalTool } from "./chatframe/approval";
import { MessageActions } from "./chatframe/MessageActions";
import type { OutputPanelOpenRequest } from "./OutputFrame";
import { ReasoningBlock } from "./ReasoningBlock";
import { ToolCallCard, type ApprovalDecision } from "./ToolCallCard";
import { WritingText } from "./WritingText";

// The approval surfaces stay re-exported from this module: both the editor and the generated
// agent-shell import them from "./components/agent-preview/ChatFrame", and the scaffold export
// asserts on that path.
export { InlineApprovalPrompt, InlineApprovalSurface, ExternalApprovalSurface } from "./chatframe/approval";
export type { InlineApprovalPromptOption } from "./chatframe/approval";

export function ChatFrame({
  project,
  viewModel,
  showDebugBadges = false,
  previewPrompt = "Add validation to the search input and show a loading state while results are fetched.",
  previewPrompts,
  writingReplayKey = 0,
  onOpenArtifact,
  // Defaults to the placement the editor previews. It used to default to "timeline", which
  // only the editor was safe from because `App.tsx` passes "overlay" explicitly: the exported
  // app never set the prop, so a real run there put the permission card *inside* the
  // transcript, where it scrolls away from the field the user answers it with. Nothing asks
  // for the timeline placement, so the fallback is now the correct one and it stays opt-in.
  externalApprovalPlacement = "overlay",
  forceToolsOpen = false,
  toolCollapseSignal = 0,
  onApprovalDecision,
}: {
  project: AgentFrontendProject;
  viewModel: AgentUXViewModel;
  showDebugBadges?: boolean;
  previewPrompt?: string;
  previewPrompts?: readonly string[];
  writingReplayKey?: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement?: "timeline" | "overlay";
  forceToolsOpen?: boolean;
  toolCollapseSignal?: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const promptHistory = previewPrompts?.filter((prompt) => prompt.trim().length > 0);

  return (
    <section
      className="chat-frame"
      data-preview-anchor="chat"
      data-reasoning-motion={project.theme.motion.reasoning}
      data-tool-style={project.theme.motion.toolCall}
      data-writing-motion={project.theme.motion.writing}
    >
      <header className="frame-header">
        <div>
          <h2>{copy.chat.frame.title}</h2>
          <p>{viewModel.title ?? copy.chat.frame.fallbackConversationTitle} · {copy.chat.frame.subtitleSuffix}</p>
        </div>
      </header>
      <div className="timeline-list">
        {viewModel.timeline.length === 0 ? (
          <ConversationEmptyState project={project} />
        ) : (
          renderConversation(
            buildConversationEntries(viewModel.timeline, promptHistory, previewPrompt),
            project,
            showDebugBadges,
            writingReplayKey,
            onOpenArtifact,
            externalApprovalPlacement,
            forceToolsOpen,
            toolCollapseSignal,
            onApprovalDecision,
          )
        )}
      </div>
    </section>
  );
}

type ConversationEntry =
  | { kind: "user"; id: string; prompt: string }
  | { kind: "item"; item: AgentUXTimelineItem };

/**
 * Flatten the timeline into an ordered list of user prompts and assistant-side
 * items. When prompt history is available each assistant message is preceded by
 * the prompt that produced it; otherwise the single preview prompt opens the run.
 */
function buildConversationEntries(
  timeline: readonly AgentUXTimelineItem[],
  promptHistory: readonly string[] | undefined,
  previewPrompt: string,
): ConversationEntry[] {
  const entries: ConversationEntry[] = [];

  if (promptHistory?.length) {
    let assistantMessageIndex = 0;
    for (const item of timeline) {
      if (item.kind === "message" && item.role === "assistant") {
        const prompt = promptHistory[assistantMessageIndex];
        assistantMessageIndex += 1;
        if (prompt) {
          entries.push({ kind: "user", id: `prompt:${item.id}`, prompt });
        }
      }
      entries.push({ kind: "item", item });
    }
    return entries;
  }

  if (previewPrompt.trim()) {
    entries.push({ kind: "user", id: "preview-prompt", prompt: previewPrompt });
  }
  for (const item of timeline) {
    entries.push({ kind: "item", item });
  }
  return entries;
}

/**
 * Group consecutive assistant-side items into a single turn that shares one
 * avatar lane. A user message breaks the current turn and renders as its own row.
 */
function renderConversation(
  entries: ConversationEntry[],
  project: AgentFrontendProject,
  showDebugBadges: boolean,
  writingReplayKey: number,
  onOpenArtifact: ((artifact: OutputPanelOpenRequest) => void) | undefined,
  externalApprovalPlacement: "timeline" | "overlay",
  forceToolsOpen: boolean,
  toolCollapseSignal: number,
  onApprovalDecision: ((toolCallId: string, decision: ApprovalDecision) => void | Promise<void>) | undefined,
): ReactElement[] {
  const rows: ReactElement[] = [];
  let lane: AgentUXTimelineItem[] = [];
  let turnIndex = 0;

  const flushLane = () => {
    if (lane.length === 0) {
      return;
    }
    const laneItems = lane;
    lane = [];
    rows.push(
      <AssistantTurn
        key={`turn:${turnIndex}`}
        project={project}
        items={laneItems}
        showDebugBadges={showDebugBadges}
        writingReplayKey={writingReplayKey}
        onOpenArtifact={onOpenArtifact}
        externalApprovalPlacement={externalApprovalPlacement}
        forceToolsOpen={forceToolsOpen}
        toolCollapseSignal={toolCollapseSignal}
        onApprovalDecision={onApprovalDecision}
      />,
    );
    turnIndex += 1;
  };

  for (const entry of entries) {
    if (entry.kind === "user") {
      flushLane();
      rows.push(<UserPromptBubble key={entry.id} project={project} prompt={entry.prompt} />);
      continue;
    }
    if (entry.item.kind === "message" && entry.item.role === "user") {
      flushLane();
      rows.push(<UserPromptBubble key={`msg:${entry.item.id}`} project={project} prompt={entry.item.text || ""} />);
      continue;
    }
    lane.push(entry.item);
  }
  flushLane();

  return rows;
}

function AssistantTurn({
  project,
  items,
  showDebugBadges,
  writingReplayKey,
  onOpenArtifact,
  externalApprovalPlacement,
  forceToolsOpen,
  toolCollapseSignal,
  onApprovalDecision,
}: {
  project: AgentFrontendProject;
  items: readonly AgentUXTimelineItem[];
  showDebugBadges: boolean;
  writingReplayKey: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement: "timeline" | "overlay";
  forceToolsOpen: boolean;
  toolCollapseSignal: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const orderedItems = displayOrderForAssistantTurn(items);
  const isSingleLineAssistantMessage =
    !project.conversation.speakerLabels
    && orderedItems.length === 1
    && orderedItems[0]?.kind === "message"
    && orderedItems[0].role === "assistant"
    && !orderedItems[0].text?.includes("\n");

  return (
    <div className="assistant-turn" data-single-line-message={isSingleLineAssistantMessage ? "true" : undefined}>
      {project.conversation.agentAvatar ? (
        <span className="msg-avatar" data-role="assistant" aria-hidden="true"><StateIcon slot="author.agent" size={15} /></span>
      ) : null}
      <div className="assistant-lane">
        {project.conversation.speakerLabels ? (
          <div className="assistant-turn-label" aria-label={copy.chat.speakers.agentOutputLabel}>{copy.chat.speakers.agent}</div>
        ) : null}
        {orderedItems.map((item) => (
          <TimelineItem
            key={`${item.kind}:${item.id}`}
            item={item}
            project={project}
            showDebugBadges={showDebugBadges}
            writingReplayKey={writingReplayKey}
            onOpenArtifact={onOpenArtifact}
            externalApprovalPlacement={externalApprovalPlacement}
            forceToolsOpen={forceToolsOpen}
            toolCollapseSignal={toolCollapseSignal}
            onApprovalDecision={onApprovalDecision}
          />
        ))}
      </div>
    </div>
  );
}

function displayOrderForAssistantTurn(items: readonly AgentUXTimelineItem[]): AgentUXTimelineItem[] {
  const ordered: AgentUXTimelineItem[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const current = items[index];
    const next = items[index + 1];
    if (current?.kind === "artifact" && next?.kind === "message" && next.role === "assistant") {
      ordered.push(next, current);
      index += 1;
      continue;
    }
    ordered.push(current);
  }
  return ordered;
}

function UserPromptBubble({ project, prompt }: { project: AgentFrontendProject; prompt: string }) {
  const copy = useCopy();
  return (
    <article className="message-item message-bubble" data-role="user" data-preview-anchor="conversation">
      {project.conversation.userAvatar ? (
        <span className="msg-avatar" data-role="user" aria-hidden="true"><StateIcon slot="author.user" size={16} /></span>
      ) : null}
      <div className="msg-stack">
        {project.conversation.speakerLabels ? <div className="message-role">{copy.chat.speakers.user}</div> : null}
        <div className="msg-surface"><p>{prompt}</p></div>
        <MessageActions project={project} role="user" />
      </div>
    </article>
  );
}

function TimelineItem({
  item,
  project,
  showDebugBadges,
  writingReplayKey,
  onOpenArtifact,
  externalApprovalPlacement,
  forceToolsOpen,
  toolCollapseSignal,
  onApprovalDecision,
}: {
  item: AgentUXTimelineItem;
  project: AgentFrontendProject;
  showDebugBadges: boolean;
  writingReplayKey: number;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  externalApprovalPlacement: "timeline" | "overlay";
  forceToolsOpen: boolean;
  toolCollapseSignal: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const { iconSet } = useIconSet();
  switch (item.kind) {
    case "message": {
      const isAssistant = item.role === "assistant";
      const text = item.text || copy.chat.message.streaming;
      return (
        <article className="message-bubble lane-message" data-role={item.role}>
          {project.conversation.speakerLabels ? <div className="message-role">{messageRoleLabel(item.role, copy)}</div> : null}
          <div className="msg-surface">
            {isAssistant ? <WritingText project={project} text={text} replayKey={writingReplayKey} /> : <p>{text}</p>}
          </div>
          <MessageActions project={project} role={isAssistant ? "assistant" : "user"} />
        </article>
      );
    }
    case "reasoning":
      return <ReasoningBlock project={project} reasoning={item} showDebugBadges={showDebugBadges} />;
    case "tool":
      if (isMediaGenerationTool(item)) {
        return null;
      }
      return (
        <>
          {project.toolCalls.approval === "hidden" && externalApprovalPlacement === "timeline" && isPendingApprovalTool(item) ? (
            <ExternalApprovalSurface
              tool={item}
              onConfirm={(decision) => onApprovalDecision?.(item.id, decision)}
            />
          ) : null}
          <ToolCallCard
            project={project}
            tool={item}
            showDebugBadges={showDebugBadges}
            onOpenArtifact={onOpenArtifact}
            forceOpen={forceToolsOpen}
            collapseSignal={toolCollapseSignal}
          />
        </>
      );
    case "artifact":
      return <ArtifactLaunchCard project={project} item={item} copy={copy} onOpenArtifact={onOpenArtifact} />;
    case "step": {
      const kind = item.stepKind ?? item.scope?.kind ?? "runtime";
      const spin = item.status === "running" || item.status === "started";
      return (
        <article className="step-item" data-status={item.status}>
          <span className="step-icon" data-anim={spin ? "spin" : "none"}>
            <StateIcon slot={stepIconSlot(kind, item.status)} size={14} />
          </span>
          <span className="step-kind">{kind}</span>
          <strong>{item.label}</strong>
          {item.summary ? <p>{item.summary}</p> : null}
        </article>
      );
    }
    case "error": {
      // Incident states (retrying / exhausted / terminal) show a readable,
      // state-matching title instead of the raw error code.
      const incidentTitle =
        item.category === "retrying"
          ? copy.chat.error.incident.retrying
          : item.category === "exhausted"
            ? copy.chat.error.incident.exhausted
            : item.category === "terminal"
              ? copy.chat.error.incident.terminal
              : item.code;
      return (
        <article className="error-item" data-collapse={project.blocks.errorCollapse} data-preview-anchor="error-block">
          <span className="error-icon" data-anim={errorIconAnimation(item.category, item.retryable, iconSet["incident.retrying"])}>
            <StateIcon slot={errorIconSlot(item.category, item.code)} size={15} />
          </span>
          <strong>{incidentTitle}</strong>
          <p>{project.blocks.errorCollapse ? item.userMessage ?? item.message : item.developerMessage ?? item.message}</p>
          {project.blocks.errorCollapse ? <small>{copy.chat.error.debugHidden}</small> : null}
        </article>
      );
    }
  }
}

function errorIconSlot(category: string | undefined, code: string): IconSlot {
  if (category === "retrying" || category === "exhausted" || category === "terminal") {
    return incidentSlot(category);
  }
  return errorDomainSlot(code);
}

function errorIconAnimation(category: string | undefined, retryable: boolean | undefined, retryingIconId: string | undefined) {
  if (category === "retrying") {
    if (retryingIconId === "timer") return "timer-hand";
    if (retryingIconId === "rotate") return "retry-rotate";
    if (retryingIconId === "hourglass") return "hourglass";
  }
  return retryable ? "spin" : "none";
}

function stepIconSlot(kind: string, status: string): IconSlot {
  if (kind === "model") return "surface.model_span";
  if (kind === "config") return "surface.config";
  if (kind === "session") return "surface.interrupt";
  return runtimeOpSlot(status);
}

function messageRoleLabel(role: string, copy: UiCopy): string {
  if (role === "assistant") {
    return copy.chat.speakers.agent;
  }
  if (role === "user") {
    return copy.chat.speakers.user;
  }
  return role;
}

function isMediaGenerationTool(item: AgentUXToolTimelineItem): boolean {
  return item.name.startsWith("preview.generate_");
}

function ConversationEmptyState({ project }: { project: AgentFrontendProject }) {
  const copy = useCopy();
  if (project.conversation.emptyState === "suggested-prompts") {
    return (
      <div className="empty-state starter-prompts">
        <button type="button">{copy.chat.emptyState.suggestedPrompts.inspectContext}</button>
        <button type="button">{copy.chat.emptyState.suggestedPrompts.draftResponse}</button>
        <button type="button">{copy.chat.emptyState.suggestedPrompts.summarizeWork}</button>
      </div>
    );
  }

  if (project.conversation.emptyState === "capability-hints") {
    return (
      <div className="empty-state capability-hints">
        <span>{copy.chat.emptyState.capabilityHints.files}</span>
        <span>{copy.chat.emptyState.capabilityHints.tools}</span>
        <span>{copy.chat.emptyState.capabilityHints.output}</span>
      </div>
    );
  }

  return <div className="empty-state">{copy.chat.emptyState.noEvents}</div>;
}

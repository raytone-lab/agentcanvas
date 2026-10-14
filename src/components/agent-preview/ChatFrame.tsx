import type { AgentUXTimelineItem, AgentUXToolTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import { TentTree } from "../../agentmatrix/uiIcons";
import { useEffect, useRef, useState, type ReactElement } from "react";

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

/**
 * Whether a scroller has content below the fold.
 *
 * The timeline's bottom fade exists so scrolled content dissolves before the
 * composer instead of cutting off hard. It was unconditional, which is a
 * different thing: with nothing to scroll, the mask still ate the last 28px of
 * the *last* row, so the final tool pill sat under a white wash that read as a
 * rendering fault rather than as "there is more". Asked about directly — "这张
 * 图上为什么有一个白色的渐变".
 *
 * A mask rather than a gradient overlay is still right: several styles paint
 * the conversation on a texture (halftone dots, paper tooth, a grid), and a
 * flat gradient in the surface colour would sit on top of that as a visible
 * band. So the fade stays a mask and this decides when it applies.
 *
 * Measured, not declared: `scrollHeight - scrollTop - clientHeight`. It
 * follows scrolling *and* resizing — the canvas is zoomable and the columns are
 * draggable, so "does this overflow" changes without anyone scrolling.
 */
function useMoreBelow(ref: { current: HTMLElement | null }): boolean {
  const [moreBelow, setMoreBelow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      // 1px of slack: fractional layout leaves a sub-pixel remainder at the
      // true bottom, which would keep the fade on forever.
      setMoreBelow(el.scrollHeight - el.scrollTop - el.clientHeight > 1);
    };
    read();
    el.addEventListener("scroll", read, { passive: true });
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(read);
    observer?.observe(el);
    // Rows arrive as the replay runs, so the content grows under a still
    // scroller — that changes the answer without a scroll or a resize of the
    // scroller itself.
    const children = typeof MutationObserver === "undefined" ? null : new MutationObserver(read);
    children?.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", read);
      observer?.disconnect();
      children?.disconnect();
    };
  }, [ref]);

  return moreBelow;
}

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
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const moreBelow = useMoreBelow(timelineRef);

  return (
    <section
      className="chat-frame"
      data-preview-anchor="chat"
      data-reasoning-motion={project.theme.motion.reasoning}
      data-tool-style={project.theme.motion.toolCall}
      data-writing-motion={project.theme.motion.writing}
    >
      {/* The conversation's own title, and only that, which is what a chat
          header says.

          It carried a "预设预览" subtitle under the title. That is a fact about
          the configurator, not about the conversation — the header of an
          exported app would have announced itself as a preview. Two labels ago
          it was "编码 Agent", a fixed product name the sidebar's brand already
          gives; the subtitle line was the same mistake in a smaller size. */}
      <header className="frame-header">
        {project.theme.stylePreset === "game" ? <TentTree className="game-camp-mark" aria-hidden="true" /> : null}
        <div>
          <h2>{viewModel.title ?? copy.chat.frame.fallbackConversationTitle}</h2>
        </div>
      </header>
      <div className="timeline-list" ref={timelineRef} data-more-below={moreBelow ? "true" : undefined}>
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
        {/*
         * Copy and regenerate belong to the *answer*, and the answer is the
         * whole turn: the words, the document it delivered, the image it
         * generated. They used to sit inside the message bubble, so on this
         * canvas they landed between the reply and the notes.md card — offering
         * "copy the response" halfway through it.
         *
         * Rendered once per turn rather than once per message, and only when
         * the turn actually said something: a turn that is nothing but tool
         * rows has no response to copy.
         */}
        {orderedItems.some((item) => item.kind === "message" && item.role === "assistant") ? (
          <MessageActions project={project} role="assistant" />
        ) : null}
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
          {/* The agent's row moved to the end of the turn — see `AssistantTurn`.
              A user message reaching the lane still carries its own, because a
              prompt is the whole of its turn. */}
          {isAssistant ? null : <MessageActions project={project} role="user" />}
        </article>
      );
    }
    case "reasoning":
      return (
        <ReasoningBlock
          /*
           * Keyed by the replay counter, so a replay re-mounts the block rather
           * than re-rendering it. Configuring the thinking is configuring
           * something that happens over time: the stage text cycles from 思考中,
           * the indicator runs, the body writes itself out. Only a mount plays
           * that from the start — a re-render leaves an animation mid-cycle and
           * a finished reveal finished, which is what made picking a card in
           * 思考中 look like it had changed nothing.
           */
          key={`reasoning:${item.id}:${writingReplayKey}`}
          project={project}
          reasoning={item}
          showDebugBadges={showDebugBadges}
          writingReplayKey={writingReplayKey}
        />
      );
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
      /*
       * A run the reader stopped is a *break in the stream*, not a message in
       * it — which is how every agent client draws it: a rule across the column
       * with the word on it. It used to be a row like the others, reading
       * `session 已被你中断 运行停在了这里…` with the internal kind name at the
       * front of a sentence.
       */
      if (kind === "session") {
        return (
          <div className="run-separator" data-status={item.status} role="separator" aria-label={item.label}>
            <span className="run-separator-label">
              {/* The glyph comes with it. Turning this row into a rule dropped
                  the icon, and 已中断 is a card in 运行状态 with four glyphs to
                  choose between — so the reader was picking a mark that had
                  nothing on the canvas to draw it. */}
              <StateIcon slot={stepIconSlot(kind, item.status)} size={13} />
              {item.label}
            </span>
          </div>
        );
      }
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
        /*
         * Three levels, three lines — the shape every agent client gives a
         * failure, and the one thing this row was not.
         *
         * It used to lay the state word, the sentence and a caption out on one
         * line, so a failure read as `重试中 写入超时，正在重试。 调试详情已隐藏
         * 于侧栏` — a status, a sentence and an explanation of the interface,
         * spliced together.
         *
         * The code moves with it. `E_WRITE_FILE` was the *title* whenever the
         * failure had no incident state, which puts a machine string where the
         * reader looks first and demotes the human sentence to a footnote; it
         * belongs under the sentence, set as code.
         *
         * And the caption is gone rather than relocated: "debug detail is in
         * the sidebar" describes the interface, and the panel it names is on
         * screen. A line of prose about where something *is not* is the kind of
         * text a real client does not carry.
         */
        /*
         * One card, one sentence.
         *
         * The card carried three fields — the state word, the sentence, and the
         * error code — and they say the same thing three ways: 重试中 /
         * 写入超时，正在重试（第 2 次）/ E_WRITE_FILE. The sentence already
         * contains the state, so the other two are restatements. Asked for
         * directly: 你就一句话展示就行.
         *
         * The state is still legible without the word: the glyph is chosen from
         * it (`errorIconSlot`), and it stays on the element as the accessible
         * name for anything that cannot see the glyph.
         */
        <article
          className="error-item"
          data-collapse={project.blocks.errorCollapse}
          data-preview-anchor="error-block"
          aria-label={incidentTitle}
        >
          {/*
            * No `data-anim` here, in any style.
            *
            * This mark used to spin a full turn every second whenever the
            * incident was retryable, and three more motions were layered on top
            * of it by which retrying icon the reader had picked — a
            * counter-rotation, a sweeping timer hand, and two sand dots falling
            * through an hourglass. Asked for directly: these icons take no
            * motion.
            *
            * The icons themselves are untouched and still selectable; only the
            * movement is gone. Worth knowing why it read badly: a 15px glyph
            * rotating continuously is never legible at any frame — the
            * screenshot that prompted this caught a cross and an hourglass
            * mid-turn and both looked like a different, broken shape. The row
            * already says 正在重试（第 2 次）in words.
            */}
          <span className="error-icon">
            <StateIcon slot={errorIconSlot(item.category, item.code)} size={15} />
          </span>
          <p>{project.blocks.errorCollapse ? item.userMessage ?? item.message : item.developerMessage ?? item.message}</p>
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

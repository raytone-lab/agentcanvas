import type { AgentUXTimelineItem, AgentUXViewModel } from "@agent-ux/render-core";
import agentuxConfig from "../../../agentux.config";
import { EmptyState } from "../conversation/EmptyState";
import { MessageActions } from "../conversation/MessageActions";
import { WritingStream } from "../conversation/WritingStream";
import { ToolCallCard } from "../tool-calls/ToolCallCard";

function SpeakerLabel({ children }: { children: string }) {
  if (!agentuxConfig.conversation.speakerLabels) {
    return null;
  }
  return <span data-speaker-label>{children}</span>;
}

function TimelineItem({ item }: { item: AgentUXTimelineItem }) {
  if (item.kind === "message") {
    const role = item.role === "assistant" ? "assistant" : "user";
    return (
      <article data-message-role={role}>
        <SpeakerLabel>{role === "assistant" ? "Agent" : "You"}</SpeakerLabel>
        <WritingStream text={item.text || "Streaming…"} />
        <MessageActions role={role} />
      </article>
    );
  }

  if (item.kind === "tool") {
    return (
      <ToolCallCard
        title={item.title ?? item.name}
        preview={item.preview ?? item.status}
        status={item.status}
        input={item.argsText ?? ""}
        output={typeof item.result === "string" ? item.result : JSON.stringify(item.result ?? "", null, 2)}
        awaitingApproval={item.status === "awaiting_approval"}
      />
    );
  }

  if (item.kind === "artifact") {
    return (
      <article data-artifact-inline>
        <strong>{item.title ?? item.id}</strong>
        <span data-artifact-status data-status={item.status}>{item.status}</span>
      </article>
    );
  }

  if (item.kind === "reasoning") {
    return (
      <article data-reasoning>
        <strong>{item.label ?? "Thinking"}</strong>
        <p>{item.summary ?? item.status}</p>
      </article>
    );
  }

  if (item.kind === "error") {
    return (
      <article data-error>
        <strong>{item.code}</strong>
        <p>{item.message}</p>
      </article>
    );
  }

  return (
    <article data-step>
      <strong>{item.label}</strong>
      <p>{item.summary}</p>
    </article>
  );
}

export function ChatFrame({ viewModel }: { viewModel: AgentUXViewModel }) {
  const timeline = viewModel.timeline;

  if (!timeline.length) {
    return (
      <section data-agent-region="main" data-empty="true">
        <EmptyState />
      </section>
    );
  }

  return (
    <section data-agent-region="main">
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </section>
  );
}

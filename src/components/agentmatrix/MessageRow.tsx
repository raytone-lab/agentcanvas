/**
 * Message content renderer. User vs Agent, text vs mixed content, streaming vs
 * durable, with optional usage disclosure. System/runtime/error facts never
 * reuse the agent avatar — those live in their own components.
 */

import { StateIcon } from "../../agentmatrix";
import type { MessageViewModel, ThinkingViewModel } from "../../agentmatrix";
import { ContentBlocks } from "./ContentBlocks";
import { ThinkingBlock } from "./ThinkingBlock";

export function MessageRow({ message }: { message: MessageViewModel }) {
  const isUser = message.author === "user";
  return (
    <div className="am-message" data-author={message.author} data-streaming={message.streaming}>
      <div className="am-avatar" data-author={message.author} aria-hidden="true">
        <StateIcon slot={isUser ? "author.user" : "author.agent"} size={15} />
      </div>
      <div className="am-message-body">
        <div className="am-message-head">
          <span className="am-message-author">{isUser ? "You" : "Agent"}</span>
          {message.streaming ? <span className="am-streaming-dot" aria-label="streaming" /> : null}
        </div>
        <ContentBlocks blocks={message.blocks} />
        {message.usage ? <Usageline usage={message.usage} /> : null}
      </div>
    </div>
  );
}

export function TranscriptItemView({
  item,
}: {
  item: MessageViewModel | ThinkingViewModel;
}) {
  if (item.kind === "thinking") return <ThinkingBlock thinking={item} />;
  return <MessageRow message={item} />;
}

function Usageline({ usage }: { usage: NonNullable<MessageViewModel["usage"]> }) {
  const parts: string[] = [];
  if (usage.input_tokens != null) parts.push(`in ${usage.input_tokens}`);
  if (usage.output_tokens != null) parts.push(`out ${usage.output_tokens}`);
  if (usage.cache_read_input_tokens != null) parts.push(`cache ${usage.cache_read_input_tokens}`);
  if (usage.total_cost_usd != null) parts.push(`$${usage.total_cost_usd}`);
  if (!parts.length) return null;
  return <div className="am-usage">{parts.join(" · ")}</div>;
}

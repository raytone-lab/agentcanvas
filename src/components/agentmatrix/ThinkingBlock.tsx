/**
 * Thinking block. Summary-first collapsible disclosure. Streaming indication
 * without implying durability. Renders only content the runtime supplied — it
 * never labels hidden reasoning as available.
 */

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { StateIcon, textOfBlocks } from "../../agentmatrix";
import type { ThinkingViewModel } from "../../agentmatrix";
import { ContentBlocks } from "./ContentBlocks";

export function ThinkingBlock({ thinking }: { thinking: ThinkingViewModel }) {
  const [open, setOpen] = useState(thinking.streaming);
  const summary = textOfBlocks(thinking.blocks).slice(0, 120);
  const hasContent = thinking.blocks.length > 0;

  return (
    <div className="am-thinking" data-streaming={thinking.streaming} data-open={open}>
      <button
        type="button"
        className="am-thinking-head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <StateIcon slot="content.thinking" size={14} className="am-thinking-icon" />
        <span className="am-thinking-label">
          {thinking.streaming ? "Thinking…" : "Thought process"}
        </span>
        {!open && summary ? <span className="am-thinking-summary">{summary}</span> : null}
        {hasContent ? <ChevronDown size={13} className="am-chevron" data-open={open} /> : null}
      </button>
      {open && hasContent ? (
        <div className="am-thinking-body">
          <ContentBlocks blocks={thinking.blocks} />
        </div>
      ) : null}
    </div>
  );
}

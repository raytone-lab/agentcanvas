import type { AgentUXEvent } from "../../agentux";
import type { StateCard } from "../../components/agentmatrix/StateGallery";
import { previewCopy } from "../../i18n/copy/preview";
import type { AppLocale } from "../../i18n/uiCopy";

type ToolActionDemoSpec = {
  name: string;
  title: string;
  args: Record<string, unknown>;
  result: unknown;
  resultPreview: string;
};

function toolActionDemoSpec(card: StateCard, locale: AppLocale): ToolActionDemoSpec {
  const c = previewCopy[locale].toolAction;
  switch (card.code) {
    case "tool: read_image":
      return {
        name: "read_image",
        title: c.readImage,
        args: { path: "assets/chart.png" },
        result: "image/png · 1280x720 · support volume trend",
        resultPreview: "1280x720 image",
      };
    case "tool: modify_file":
      return {
        name: "apply_patch",
        title: c.modifyFile,
        args: { path: "src/SearchInput.tsx" },
        result: { changed: true, insertions: 18, deletions: 4 },
        resultPreview: "+18 -4",
      };
    case "tool: edit_file":
      return {
        name: "edit_file",
        title: c.editFile,
        args: { path: "src/components/ComposerFrame.tsx" },
        result: { changed: true, insertions: 9, deletions: 9 },
        resultPreview: "+9 -9",
      };
    case "tool: validate":
      return {
        name: "validate",
        title: c.validate,
        args: { path: "src/SearchInput.test.tsx", cmd: "npm test -- SearchInput" },
        result: "SearchInput.test.tsx\n✓ validates short queries\n✓ shows loading state",
        resultPreview: "2 passed",
      };
    case "tool: search":
      return {
        name: "search",
        title: c.search,
        args: { pattern: "useSearch" },
        result: "src/SearchInput.tsx:42\nsrc/hooks/useSearch.ts:10",
        resultPreview: "2 locations",
      };
    case "tool: run_command":
      return {
        name: "run_command",
        title: c.runCommand,
        args: { cmd: "npm run build" },
        result: "> npm run build\n✓ built in 8.4s",
        resultPreview: "build passed",
      };
    case "tool: read_file":
    default:
      return {
        name: "read_file",
        title: c.readFile,
        args: { path: "src/SearchInput.tsx" },
        result: "import { useState } from \"react\";\n\nexport function SearchInput() {\n  const [query, setQuery] = useState(\"\");\n  return <input value={query} onChange={(event) => setQuery(event.target.value)} />;\n}",
        resultPreview: "7 lines",
      };
  }
}

export function toolActionsOverviewEvents(cards: readonly StateCard[], title: string, locale: AppLocale): AgentUXEvent[] {
  const c = previewCopy[locale];
  const runId = "tool-actions-overview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `tool_actions_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000100000 + seq,
      type,
      payload,
    };
  };

  const events: AgentUXEvent[] = [
    push("run.started", { title }),
    push("text.started", { textId: "user_tool_actions", role: "user", format: "plain" }, "message_user_tool_actions"),
    push("text.delta", {
      textId: "user_tool_actions",
      delta: c.toolActionsOverview.prompt,
    }, "message_user_tool_actions"),
    push("text.finished", { textId: "user_tool_actions" }, "message_user_tool_actions"),
  ];

  cards.forEach((card, index) => {
    const spec = toolActionDemoSpec(card, locale);
    const toolCallId = `tool_action_${index}_${card.code.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}`;
    events.push(
      push("tool.call.started", { toolCallId, name: spec.name, title: spec.title }),
      push("tool.call.running", { toolCallId, args: spec.args }),
      push("tool.call.result", { toolCallId, result: spec.result, resultPreview: spec.resultPreview }),
      push("tool.call.finished", { toolCallId, status: "success" }),
    );
  });

  events.push(
    push("text.started", { textId: "assistant_tool_actions_demo", role: "assistant", format: "plain" }, "message_assistant_tool_actions_demo"),
    push("text.delta", {
      textId: "assistant_tool_actions_demo",
      delta: c.toolActionsOverview.reply.join("\n"),
    }, "message_assistant_tool_actions_demo"),
    push("text.finished", { textId: "assistant_tool_actions_demo" }, "message_assistant_tool_actions_demo"),
  );

  events.push(push("run.finished", { status: "success" }));
  return events;
}

export function conversationWritingPreviewEvents(locale: AppLocale): AgentUXEvent[] {
  const c = previewCopy[locale];
  const runId = "conversation-writing-output-preview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `conversation_writing_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000200000 + seq,
      type,
      payload,
    };
  };

  return [
    push("run.started", { title: c.writing.runTitle }),
    push("text.started", { textId: "user_conversation_output_mode", role: "user", format: "plain" }, "message_user_conversation_output_mode"),
    push("text.delta", {
      textId: "user_conversation_output_mode",
      delta: c.writing.userPrompt,
    }, "message_user_conversation_output_mode"),
    push("text.finished", { textId: "user_conversation_output_mode" }, "message_user_conversation_output_mode"),
    push("text.started", { textId: "assistant_conversation_output_mode", role: "assistant", format: "plain" }, "message_assistant_conversation_output_mode"),
    push("text.delta", {
      textId: "assistant_conversation_output_mode",
      delta: c.writing.reply.join("\n"),
    }, "message_assistant_conversation_output_mode"),
    push("text.finished", { textId: "assistant_conversation_output_mode" }, "message_assistant_conversation_output_mode"),
    push("run.finished", { status: "success" }),
  ];
}

export function thinkingPreviewEvents(locale: AppLocale): AgentUXEvent[] {
  const runId = "thinking-motion-preview";
  let seq = 0;
  const push = (type: string, payload: Record<string, unknown>, messageId?: string): AgentUXEvent => {
    seq += 1;
    return {
      protocol: "agent-ux",
      version: "0.1",
      id: `thinking_preview_${seq}`,
      runId,
      messageId,
      seq,
      ts: 1760000300000 + seq,
      type,
      payload,
    };
  };
  const c = previewCopy[locale].thinking;

  return [
    push("run.started", { title: c.runTitle }),
    push("text.started", { textId: "user_thinking_preview", role: "user", format: "plain" }, "message_user_thinking_preview"),
    push("text.delta", { textId: "user_thinking_preview", delta: c.userPrompt }, "message_user_thinking_preview"),
    push("text.finished", { textId: "user_thinking_preview" }, "message_user_thinking_preview"),
    push("reasoning.status", { reasoningId: "thinking-preview", status: "planning", label: c.statusLabel }),
    push("reasoning.delta", { reasoningId: "thinking-preview", kind: "summary", delta: c.summary, format: "plain", open: false }),
  ];
}

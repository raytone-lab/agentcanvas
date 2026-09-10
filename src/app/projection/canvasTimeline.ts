import type { AgentUXEvent } from "../../agentux";
import type { AppLocale } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { presetGroups } from "../../schema/presets";
import type { PresetGroupId } from "../../schema/presets";
import { isAddedContentOption } from "./presetRailData";

/**
 * The conversation on the configurator canvas, composed from what has been
 * picked rather than replayed from a fixture.
 *
 * A fixture is all-or-nothing: picking a user avatar loaded a whole coding run
 * — reasoning, two tool cards, an artifact — and picking nothing loaded none of
 * it. Neither answers "show me what I chose". Here each turn and each block is
 * its own decision:
 *
 *   用户头像 / anything on the user's side  → the question
 *   Agent 头像 / anything on the agent side → the answer
 *   思考中                                  → the reasoning block
 *   工具调用                                → the tool cards
 *   交付                                    → the artifact
 *
 * Text is short on purpose. The canvas is here to show the layout and the
 * components in it; a paragraph about search-input validation is set dressing
 * that makes the thing being configured harder to see.
 */

const SAMPLE = {
  question: {
    en: "What can you help me with?",
    zh: "你都能帮我做什么呢？",
    ja: "何を手伝ってもらえますか？",
  },
  answer: {
    en: "I can read your project, run tools, and explain what I changed.",
    zh: "我可以读你的项目、调用工具，并说明我改了什么。",
    ja: "プロジェクトを読み、ツールを実行し、変更点を説明できます。",
  },
  thinking: {
    en: "Looking at what you asked for.",
    zh: "正在理解你的需求。",
    ja: "依頼内容を確認しています。",
  },
  toolTitle: { en: "Read file", zh: "读取文件", ja: "ファイルを読む" },
  artifactTitle: { en: "Notes.md", zh: "Notes.md", ja: "Notes.md" },
} satisfies Record<string, Record<AppLocale, string>>;

/** Groups whose content belongs to the reader's turn rather than the agent's. */
const USER_SIDE_GROUPS = new Set<PresetGroupId>(["composer"]);

/** Groups that only ever produce something on the agent's side. */
const AGENT_SIDE_GROUPS = new Set<PresetGroupId>([
  "ux-effects",
  "tool-calls",
  "blocks",
  "approval",
  "media-generation",
  "delivery",
]);

/**
 * Options that need both turns to make sense.
 *
 * Name labels caption both speakers, so showing one turn would show half the
 * thing being configured.
 */
const BOTH_SIDES_OPTION_IDS = new Set(["speaker-labels"]);

/** Option id to the group it belongs to, for reading clicks by group. */
const optionGroupIds = new Map(
  presetGroups.flatMap((group) => group.options.map((option) => [option.id, group.id] as const)),
);

let sequence = 0;
function event(type: string, payload: Record<string, unknown>, extra: Record<string, unknown> = {}): AgentUXEvent {
  sequence += 1;
  return {
    protocol: "agent-ux",
    version: "0.1",
    id: `evt_canvas_${sequence}`,
    runId: "run_canvas",
    seq: sequence,
    type,
    // Fixed rather than `Date.now()`: a timestamp that moves on every render
    // would remount the timeline under the reader's pointer.
    ts: 1760000000000 + sequence,
    payload,
    ...extra,
  } as AgentUXEvent;
}

export type CanvasTimelineInput = {
  project: AgentFrontendProject;
  items: readonly { id: string; groupId: PresetGroupId }[];
  /**
   * Options the reader has clicked. The blocks below cannot be read off the
   * project: their groups are mutually exclusive variants with no "off" value
   * in the schema, so one is always set and "was a thinking block asked for?"
   * has no answer in state.
   */
  picked?: readonly string[];
  locale: AppLocale;
};

/** Which parts of the conversation the current configuration asks for. */
export function canvasTimelineParts({
  project,
  items,
  picked = [],
}: Omit<CanvasTimelineInput, "locale">) {
  /**
   * Everything the reader has asked for, from either source.
   *
   * Two sources because one cannot cover both cases. Additive options are
   * readable from the project — a search box is on or it is not. Variants are
   * not: one of them is always set, so only the click says whether it was
   * asked for. Picking 波浪 has to produce an agent turn the same way picking
   * an avatar does, and reading only the project left 思考中 producing nothing
   * at all.
   */
  const asked: { id: string; groupId: PresetGroupId }[] = [
    ...items.filter((item) => isAddedContentOption(project, item.id)),
    ...picked.flatMap((id) => {
      const groupId = optionGroupIds.get(id);
      return groupId ? [{ id, groupId }] : [];
    }),
  ];
  const has = (predicate: (groupId: PresetGroupId, id: string) => boolean) =>
    asked.some((item) => predicate(item.groupId, item.id));
  const clickedIn = (groupId: PresetGroupId) => asked.some((item) => item.groupId === groupId);

  // Per side, not per group: the two avatars sit in the same group, so treating
  // the group as the trigger meant picking the reader's avatar also produced
  // the agent's reply.
  const userTurn =
    project.conversation.userAvatar ||
    has(
      (groupId, id) =>
        id === "state:author.user" ||
        id.startsWith("message-action:user") ||
        BOTH_SIDES_OPTION_IDS.has(id) ||
        USER_SIDE_GROUPS.has(groupId),
    );
  const agentTurn =
    project.conversation.agentAvatar ||
    has(
      (groupId, id) =>
        id === "state:author.agent" ||
        id.startsWith("message-action:agent") ||
        BOTH_SIDES_OPTION_IDS.has(id) ||
        AGENT_SIDE_GROUPS.has(groupId),
    );

  // The conversation's own toggle shows a plain exchange — what a conversation
  // with nothing configured inside it looks like.
  const plainExchange = project.layout.slots.some(
    (slot) => slot.component === "ChatFrame" && slot.enabled,
  );

  return {
    userTurn: userTurn || plainExchange,
    agentTurn: agentTurn || plainExchange,
    reasoning: clickedIn("ux-effects"),
    tools: clickedIn("tool-calls"),
    artifact: clickedIn("delivery"),
  };
}

export function canvasTimelineEvents({
  project,
  items,
  picked,
  locale,
}: CanvasTimelineInput): AgentUXEvent[] {
  const parts = canvasTimelineParts({ project, items, picked });
  if (!parts.userTurn && !parts.agentTurn) return [];

  sequence = 0;
  const events: AgentUXEvent[] = [event("run.started", { title: "Canvas" })];

  if (parts.userTurn) {
    const payload = { textId: "txt_user", role: "user", format: "markdown" };
    events.push(
      event("text.started", payload, { messageId: "msg_user" }),
      event("text.delta", { textId: "txt_user", delta: SAMPLE.question[locale] }, { messageId: "msg_user" }),
      event("text.finished", { textId: "txt_user" }, { messageId: "msg_user" }),
    );
  }

  if (parts.reasoning) {
    events.push(
      event("reasoning.status", { reasoningId: "rsn_canvas", status: "planning", label: "Thinking" }),
      event("reasoning.delta", {
        reasoningId: "rsn_canvas",
        kind: "summary",
        delta: SAMPLE.thinking[locale],
        format: "markdown",
      }),
      event("reasoning.finished", { reasoningId: "rsn_canvas", collapsedByDefault: true }),
    );
  }

  if (parts.tools) {
    events.push(
      event("tool.call.started", {
        toolCallId: "tool_canvas",
        name: "read_file",
        title: SAMPLE.toolTitle[locale],
      }),
      event("tool.call.running", { toolCallId: "tool_canvas", args: { path: "README.md" } }),
      event("tool.call.result", { toolCallId: "tool_canvas", result: "# Notes", resultPreview: "1 line" }),
      event("tool.call.finished", { toolCallId: "tool_canvas", status: "success" }),
    );
  }

  if (parts.artifact) {
    events.push(
      event("artifact.created", {
        artifactId: "art_canvas",
        kind: "markdown",
        title: SAMPLE.artifactTitle[locale],
        mimeType: "text/markdown",
      }),
      event("artifact.delta", { artifactId: "art_canvas", format: "text", delta: "# Notes\n" }),
      event("artifact.finished", { artifactId: "art_canvas" }),
    );
  }

  if (parts.agentTurn) {
    const payload = { textId: "txt_agent", role: "assistant", format: "markdown" };
    events.push(
      event("text.started", payload, { messageId: "msg_agent" }),
      event("text.delta", { textId: "txt_agent", delta: SAMPLE.answer[locale] }, { messageId: "msg_agent" }),
      event("text.finished", { textId: "txt_agent" }, { messageId: "msg_agent" }),
    );
  }

  events.push(event("run.finished", {}));
  return events;
}

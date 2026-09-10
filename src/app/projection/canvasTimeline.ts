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
  /**
   * The conversation's title, which the chat header shows.
   *
   * Named for what was asked rather than for the product: the exchange opens
   * with "what can you do", so this is the reader confirming what it can do.
   */
  title: {
    en: "Confirming capabilities",
    zh: "确认功能",
    ja: "できることの確認",
  },
  followUp: {
    en: "Take another look for me.",
    zh: "再帮我看一下。",
    ja: "もう一度見てもらえますか。",
  },
  toolTitle: { en: "Read file", zh: "读取文件", ja: "ファイルを読む" },
  artifactTitle: { en: "Notes.md", zh: "Notes.md", ja: "Notes.md" },
  errorMessage: {
    en: "Could not write the file.",
    zh: "文件写入失败。",
    ja: "ファイルを書き込めませんでした。",
  },
  mediaTitle: { en: "cover.png", zh: "cover.png", ja: "cover.png" },
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

/**
 * Options that can only be seen while a turn is still running.
 *
 * This is the whole reason the canvas shows more than one turn. The event flow
 * is a stretch of time, not a moment: a thinking animation and a delivered
 * artifact are two instants of the same turn, so freezing the canvas at one
 * instant makes the other pick invisible. A transcript does not have that
 * problem — history is complete and the tail is live — so persistent picks go
 * on a finished turn and these go on the running one.
 *
 * Matched by prefix rather than by the schema's section names: sections are
 * display strings, and "Tool approval" holds `model-tools`, which is a composer
 * switch rather than a moment in a run.
 */
const TRANSIENT_ID_PREFIXES = ["thinking-", "media-", "tool-approval-"];

function isTransientOption(optionId: string): boolean {
  return TRANSIENT_ID_PREFIXES.some((prefix) => optionId.startsWith(prefix));
}

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
    /**
     * A second, still-running turn, carrying the picks that only exist while a
     * turn runs. Without it, picking a thinking animation and then an artifact
     * renderer made the animation invisible — the turn was over.
     */
    liveTurn: asked.some((item) => isTransientOption(item.id)),
    liveReasoning: asked.some((item) => item.id.startsWith("thinking-")),
    /** A failed turn, from 结果报错. Rendered by `run.error`. */
    error: clickedIn("blocks"),
    /**
     * A media placeholder, from 生成中. There are no media events in the
     * protocol — the loaders key off an *artifact* whose mime type is an image,
     * audio or video — so this composes one and the style follows whichever
     * variant was picked.
     */
    media: clickedIn("media-generation"),
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
  const events: AgentUXEvent[] = [event("run.started", { title: SAMPLE.title[locale] })];

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

  if (parts.media) {
    const kind = project.mediaGeneration.videoStyle && false ? "video" : "image";
    events.push(
      event("artifact.created", {
        artifactId: "art_canvas_media",
        kind,
        title: SAMPLE.mediaTitle[locale],
        mimeType: "image/png",
      }),
    );
    // No `artifact.finished`: a finished image is a picture, and what 生成中
    // configures is the loader shown while it is still arriving.
  }

  if (parts.agentTurn) {
    const payload = { textId: "txt_agent", role: "assistant", format: "markdown" };
    events.push(
      event("text.started", payload, { messageId: "msg_agent" }),
      event("text.delta", { textId: "txt_agent", delta: SAMPLE.answer[locale] }, { messageId: "msg_agent" }),
      event("text.finished", { textId: "txt_agent" }, { messageId: "msg_agent" }),
    );
  }

  if (parts.error) {
    events.push(
      event("run.error", {
        code: "E_WRITE_FILE",
        category: "tool",
        retryable: true,
        userMessage: SAMPLE.errorMessage[locale],
      }),
    );
  }

  if (!parts.liveTurn) {
    events.push(event("run.finished", {}));
    return events;
  }

  // A second turn, left running. The reader's follow-up, then whatever was
  // picked that only shows mid-turn — and no `run.finished`, because the point
  // is that this turn has not ended.
  events.push(
    event("text.started", { textId: "txt_user2", role: "user", format: "markdown" }, { messageId: "msg_user2" }),
    event(
      "text.delta",
      { textId: "txt_user2", delta: SAMPLE.followUp[locale] },
      { messageId: "msg_user2" },
    ),
    event("text.finished", { textId: "txt_user2" }, { messageId: "msg_user2" }),
  );
  if (parts.liveReasoning) {
    events.push(
      event("reasoning.status", { reasoningId: "rsn_live", status: "thinking", label: "Thinking" }),
      event("reasoning.delta", {
        reasoningId: "rsn_live",
        kind: "summary",
        delta: SAMPLE.thinking[locale],
        format: "markdown",
      }),
    );
  }
  return events;
}

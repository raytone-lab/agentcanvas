import type { AgentUXEvent } from "../../agentux";
import type { AppLocale } from "../../i18n/uiCopy";

/**
 * The conversation on the configurator canvas: one complete turn, always the
 * same one, played out over time.
 *
 * It used to be assembled from what had been picked — a turn that grew a
 * reasoning block when you clicked in 思考中, a tool card when you clicked in
 * 工具调用 — and then rendered all at once, as the state an event stream ends
 * in. Two things were wrong with that.
 *
 * The turn was incomplete. What a reader is judging is a *reply*: how a wait
 * resolves into tool work, into a delivery, into words. Half a reply, missing
 * whichever groups had not been clicked yet, does not show that.
 *
 * And it had no time in it. The interesting part of a thinking block is the
 * thinking; of a tool card, that it was running and then was not. A finished
 * transcript shows none of it — every state that only exists mid-flight was
 * invisible unless a special case held the canvas in it, and several did.
 *
 * So the event list is fixed and `useCanvasReplay` reveals it one event at a
 * time, restarting on every change to the project: the reader wants to watch
 * their change take part in a whole reply, not find it in a still frame.
 *
 * Fixing the list costs nothing in configurability, because **the events are
 * the content and the project is the presentation**. Which glyph the wait uses,
 * how the tool card is laid out, which renderer draws the artifact, how the
 * text is written on — every one of those is read from the project by the
 * component rather than from the event. A fixed reply still shows every
 * variant.
 *
 * Text is short on purpose. The canvas is here to show the layout and the
 * components in it; a paragraph about search-input validation is set dressing
 * that makes the thing being configured harder to see.
 */

/*
 * Exported so the *Conclusion* option card can show the sentence the canvas
 * will actually put in the title. Derived from `SAMPLE.thinking` rather than
 * written twice: the block quotes that span's last line, so a card with its own
 * copy of the sentence would drift the moment the sample text changed.
 */
export function canvasConclusionSample(locale: keyof typeof SAMPLE.thinking): string {
  const lines = SAMPLE.thinking[locale].split("\n").map((line) => line.trim()).filter(Boolean);
  return lines[lines.length - 1] ?? "";
}

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
  /**
   * Two or three lines, not one.
   *
   * A single line reads as a status ("正在理解你的需求") — the same thing the
   * title already says. Reasoning is the reader's evidence that the agent
   * thought, so the sample shows the shape of it: what was asked, what to leave
   * out, what to answer with. The newlines are load-bearing (see
   * `.reasoning-body p { white-space: pre-line }`).
   */
  thinking: {
    en: "The question is what I can do, so the answer should name the range rather than list features.\nTwo things carry it: I can read the project, and I can call tools.\nKeep it to two sentences and offer to go deeper.",
    zh: "用户问的是我能做什么，所以要先说清能力范围，别一上来就罗列功能。\n两件事最能说明问题：能读你的项目，能调用工具。\n控制在两句话，再问一句要不要往下展开。",
    ja: "聞かれているのは「何ができるか」なので、機能の羅列ではなく範囲を示す。\n要点は二つ：プロジェクトを読める、ツールを呼べる。\n二文にまとめて、掘り下げるか尋ねる。",
  },
  /*
   * There is no label for the closed block here any more, on purpose.
   *
   * It used to carry a sample duration, and `ReasoningBlock` prefers a
   * producer's own label over the wait it measured — so the canvas reported a
   * made-up 11 秒 however long the block had actually been open. Now the wait
   * is real: the replay holds `reasoning.finished` back, the block's own clock
   * counts it, and with no label to override the closed title is whatever the
   * reader just watched elapse.
   */
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
  /*
   * The other three tool actions the product can show, so the canvas holds one
   * row of each: view, edit, search, run command. The titles are only a
   * fallback — `ToolCallCard` labels a row from the action it resolves
   * (`正在读取文件` / `正在编辑文件` / `正在搜索` / `正在运行命令`), which is
   * already localised in three languages. What the events carry is the *target*:
   * the file, the query, the command.
   */
  editTitle: { en: "Edit file", zh: "编辑文件", ja: "ファイルを編集" },
  searchTitle: { en: "Search files", zh: "搜索文件", ja: "ファイルを検索" },
  commandTitle: { en: "Run command", zh: "运行命令", ja: "コマンドを実行" },
  validateTitle: { en: "Validate", zh: "验证", ja: "検証" },
  validateTarget: { en: "SearchInput.test.tsx", zh: "SearchInput.test.tsx", ja: "SearchInput.test.tsx" },
  validateResult: { en: "12 checks passed", zh: "12 项检查通过", ja: "12 件パス" },
  searchQuery: { en: "SearchInput", zh: "SearchInput", ja: "SearchInput" },
  searchResult: { en: "3 matches", zh: "3 处匹配", ja: "3 件一致" },
  command: { en: "npm test", zh: "npm test", ja: "npm test" },
  commandResult: { en: "12 passed", zh: "12 passed", ja: "12 passed" },
  // Lower case, like the file the tool call reads. Nothing forces a capital on
  // this one — it is not README — so it just did not have to be there.
  artifactTitle: { en: "notes.md", zh: "notes.md", ja: "notes.md" },
  /*
   * What the delivered document holds.
   *
   * Four constructs and no more: a heading, a sentence, a two-item list and one
   * span of inline code. Enough for the markdown renderer to have something to
   * render, short enough that the panel is still showing layout rather than
   * prose.
   */
  artifactBody: {
    en: "# Notes\n\nTwo things about this project, from reading it.\n\n- It can read files and call tools\n- The reply explains what changed\n\nEntry point: `src/main.tsx`\n",
    zh: "# 记录\n\n读完项目后的两点。\n\n- 能读文件，也能调用工具\n- 回复会说明改了什么\n\n入口：`src/main.tsx`\n",
    ja: "# メモ\n\nプロジェクトを読んで分かった二点。\n\n- ファイルを読み、ツールを呼べる\n- 返信は変更点を説明する\n\nエントリ：`src/main.tsx`\n",
  },
  errorMessage: {
    en: "Could not write notes.md — the disk quota is full.",
    zh: "写入 notes.md 失败，磁盘配额已满。",
    ja: "notes.md を書き込めませんでした（ディスク容量不足）。",
  },
  mediaTitle: { en: "cover.png", zh: "cover.png", ja: "cover.png" },
  audioTitle: { en: "narration.wav", zh: "narration.wav", ja: "narration.wav" },
  videoTitle: { en: "teaser.mp4", zh: "teaser.mp4", ja: "teaser.mp4" },
  /*
   * The second question, and what the run state says under it.
   *
   * The run-state block used to hang off the *first* reply — a failure stapled
   * to a turn that had just delivered a document, which is not a run that could
   * happen. Asked to be its own exchange instead: the reader asks again, and
   * that turn is where 运行状态 shows its specimens.
   */
  question2: {
    en: "Try writing it to the repo.",
    zh: "那你试着写回仓库吧。",
    ja: "リポジトリに書き戻してみて。",
  },
  cancelledTitle: { en: "Write file", zh: "写入文件", ja: "ファイルを書き込む" },
  retryMessage: {
    en: "The write timed out, retrying (attempt 2).",
    zh: "写入超时，正在重试（第 2 次）。",
    ja: "書き込みがタイムアウトし、再試行中（2 回目）。",
  },
  exhaustedMessage: {
    en: "Three attempts timed out, so the write was abandoned.",
    zh: "重试三次均超时，已放弃写入。",
    ja: "3 回すべてタイムアウトし、書き込みを中止しました。",
  },
  terminalMessage: {
    en: "The sandbox closed, so the run cannot continue.",
    zh: "沙箱已关闭，这次运行无法继续。",
    ja: "サンドボックスが閉じたため、実行を続行できません。",
  },
  interruptLabel: { en: "Stopped by you", zh: "已被你中断", ja: "あなたが停止" },
  interruptSummary: {
    en: "The run stopped where it was; nothing after this was sent.",
    zh: "运行停在了这里，后面的都没有发出去。",
    ja: "実行はここで停止し、以降は送信されていません。",
  },
} satisfies Record<string, Record<AppLocale, string>>;

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
  locale: AppLocale;
};

/**
 * One complete reply, as events, in the order they would arrive.
 *
 * Every block is here unconditionally. Nothing is read from the picks, and
 * nothing needs to be: a block's *presence* is what this list decides, and a
 * block's *appearance* is decided by the project, which the components read for
 * themselves. So there is no argument for the composition left to make — which
 * is why `canvasTimelineParts` and the six flags it returned are gone, along
 * with the special cases they existed to serve (a thinking-only turn, a turn
 * held open so an animation stayed visible, a closed-or-open decision taken
 * from the last card clicked). The replay makes every one of those states
 * happen on its own, in sequence, and then move on.
 *
 * Order matters and is the order of a real reply: the question, the wait, the
 * tool work that resolved it, what was delivered, and then the words about it.
 */
export function canvasTimelineEvents({ locale }: CanvasTimelineInput): AgentUXEvent[] {
  sequence = 0;
  const events: AgentUXEvent[] = [event("run.started", { title: SAMPLE.title[locale] })];

  const userText = { textId: "txt_user", role: "user", format: "markdown" };
  events.push(
    event("text.started", userText, { messageId: "msg_user" }),
    event("text.delta", { textId: "txt_user", delta: SAMPLE.question[locale] }, { messageId: "msg_user" }),
    event("text.finished", { textId: "txt_user" }, { messageId: "msg_user" }),
  );

  /*
   * The wait. Neither event carries a label, and both omissions matter.
   *
   * The block prefers a producer's label over the duration it measured, and the
   * duration is the point here: the replay holds `reasoning.finished` back, the
   * block's clock counts the hold, and the closed title reports what the reader
   * watched elapse.
   *
   * `reasoning.status` had one too — `label: "Thinking"` — and it is the same
   * field. It used to be harmless because the finished event overwrote it with
   * a sample duration; with that gone it surfaced, and the settled block read
   * 思考中 instead of 已思考5秒. Measured, not reasoned about: the block showed
   * `data-status="done"` and `data-done-style="timed"` while its title said
   * 思考中, which only the label branch can produce.
   */
  events.push(
    event("reasoning.status", { reasoningId: "rsn_canvas", status: "thinking" }),
    event("reasoning.delta", {
      reasoningId: "rsn_canvas",
      kind: "summary",
      delta: SAMPLE.thinking[locale],
      format: "markdown",
    }),
    event("reasoning.finished", { reasoningId: "rsn_canvas", collapsedByDefault: true }),
  );

  events.push(
    event("tool.call.started", {
      toolCallId: "tool_canvas",
      name: "read_file",
      title: SAMPLE.toolTitle[locale],
    }),
    /*
     * `notes.md`, lower case, and it used to be `README.md`.
     *
     * The row reads as a sentence — "read notes.md 1 line" — and a filename in
     * caps put a shout in the middle of it. README is the one file whose name
     * is capitalised by convention, so it could not simply be lowercased; the
     * sample changes instead. It is the same file the artifact card below names,
     * which it was not before: the run read one file and delivered another.
     */
    event("tool.call.running", { toolCallId: "tool_canvas", args: { path: "notes.md" } }),
    event("tool.call.result", { toolCallId: "tool_canvas", result: "# Notes", resultPreview: "1 line" }),
    event("tool.call.finished", { toolCallId: "tool_canvas", status: "success" }),
  );

  /*
   * One call per tool action, so the canvas shows a row for each: view, edit,
   * validate, search, run command. Four calls rather than one card with four invented
   * rows — a row here is a real call, it opens its own target, and each one
   * draws the icon the reader picked for *that* action in 工具调用. Four
   * separate calls also collapse into four rows on their own, because a tool
   * card carries no frame in this product.
   *
   * Fixed sample data on purpose: this canvas is an illustration, so the four
   * are always present rather than appearing only when a run happens to use
   * them.
   */
  events.push(
    event("tool.call.started", {
      toolCallId: "tool_canvas_edit",
      name: "edit_file",
      title: SAMPLE.editTitle[locale],
    }),
    event("tool.call.running", { toolCallId: "tool_canvas_edit", args: { path: "notes.md" } }),
    event("tool.call.result", {
      toolCallId: "tool_canvas_edit",
      result: "# Notes\n\n- reviewed",
      resultPreview: "+1 line",
    }),
    event("tool.call.finished", { toolCallId: "tool_canvas_edit", status: "success" }),

    /* 验证 — the fifth action, and the one the canvas was missing: the rail
       offers a gallery for it (`tool.validate`, 验证) and there was no call to
       draw it. Placed between edit and search so the rows read in the rail's
       own order. */
    event("tool.call.started", {
      toolCallId: "tool_canvas_validate",
      name: "validate_types",
      title: SAMPLE.validateTitle[locale],
    }),
    event("tool.call.running", {
      toolCallId: "tool_canvas_validate",
      args: { path: SAMPLE.validateTarget[locale] },
    }),
    event("tool.call.result", {
      toolCallId: "tool_canvas_validate",
      result: SAMPLE.validateResult[locale],
      resultPreview: SAMPLE.validateResult[locale],
    }),
    event("tool.call.finished", { toolCallId: "tool_canvas_validate", status: "success" }),

    event("tool.call.started", {
      toolCallId: "tool_canvas_search",
      name: "search_files",
      title: SAMPLE.searchTitle[locale],
    }),
    event("tool.call.running", {
      toolCallId: "tool_canvas_search",
      args: { query: SAMPLE.searchQuery[locale] },
    }),
    event("tool.call.result", {
      toolCallId: "tool_canvas_search",
      result: SAMPLE.searchResult[locale],
      resultPreview: SAMPLE.searchResult[locale],
    }),
    event("tool.call.finished", { toolCallId: "tool_canvas_search", status: "success" }),

    event("tool.call.started", {
      toolCallId: "tool_canvas_command",
      name: "run_command",
      title: SAMPLE.commandTitle[locale],
    }),
    event("tool.call.running", {
      toolCallId: "tool_canvas_command",
      args: { command: SAMPLE.command[locale] },
    }),
    event("tool.call.result", {
      toolCallId: "tool_canvas_command",
      result: SAMPLE.commandResult[locale],
      resultPreview: SAMPLE.commandResult[locale],
    }),
    event("tool.call.finished", { toolCallId: "tool_canvas_command", status: "success" }),
  );

  events.push(
    event("artifact.created", {
      artifactId: "art_canvas",
      kind: "markdown",
      title: SAMPLE.artifactTitle[locale],
      mimeType: "text/markdown",
    }),
    /*
     * A body with something in it. It was `# Notes` — one heading, which opened
     * as a single bold word in a panel the size of a column, and showed nothing
     * about how the renderer handles a real document. This is still short on
     * purpose (the canvas is here to show the layout), but it exercises a
     * heading, a paragraph, a list and inline code, which is what the markdown
     * renderer is being configured for.
     */
    event("artifact.delta", {
      artifactId: "art_canvas",
      format: "text",
      delta: SAMPLE.artifactBody[locale],
    }),
    event("artifact.finished", { artifactId: "art_canvas" }),
  );

  const agentText = { textId: "txt_agent", role: "assistant", format: "markdown" };
  events.push(
    event("text.started", agentText, { messageId: "msg_agent" }),
    event("text.delta", { textId: "txt_agent", delta: SAMPLE.answer[locale] }, { messageId: "msg_agent" }),
    event("text.finished", { textId: "txt_agent" }, { messageId: "msg_agent" }),
  );

  /*
   * A media artifact with no `artifact.finished`, which is what the image
   * loaders key off: a finished image is a picture, and the loader is what shows
   * while one is still arriving. There are no media events in the protocol, so
   * this composes one and the style follows whichever variant was picked.
   */
  events.push(
    event("artifact.created", {
      artifactId: "art_canvas_media",
      kind: "image",
      title: SAMPLE.mediaTitle[locale],
      mimeType: "image/png",
    }),
    /*
     * Marks it as *the* generated image, so opening its tab shows the same
     * picture the conversation does rather than one picked by hashing the file
     * name. `media-generation:image` is the existing marker for that —
     * `isGeneratedMediaItem` reads it, and both sides resolve to the same asset.
     *
     * A delta, not a `finished`: the loaders key off the artifact never
     * finishing, which is what keeps the placeholder animation on the canvas.
     */
    event("artifact.delta", {
      artifactId: "art_canvas_media",
      format: "text",
      delta: "media-generation:image\n",
    }),
  );

  /*
   * The audio and video loaders, built the same way and for the same reason.
   *
   * 进度 → 音频加载 / 视频加载 offered six variants and none of them reached
   * the canvas: this reply only ever delivered an image, so there was no
   * audio or video block for the variant to restyle, and picking one changed
   * nothing on screen (measured: identical DOM and identical pixels before and
   * after). `ArtifactLaunchCard` already draws both kinds through
   * `MediaLoadingReveal` and reads the variant from `project.mediaGeneration`;
   * it just had nothing to draw.
   *
   * Unfinished, like the image, so the loader is what stays on screen.
   */
  for (const [artifactId, kind, title, mimeType] of [
    ["art_canvas_audio", "audio", SAMPLE.audioTitle[locale], "audio/wav"],
    ["art_canvas_video", "video", SAMPLE.videoTitle[locale], "video/mp4"],
  ] as const) {
    events.push(
      event("artifact.created", { artifactId, kind, title, mimeType }),
      event("artifact.delta", { artifactId, format: "text", delta: `media-generation:${kind}\n` }),
    );
  }

  /*
   * A second exchange, and it is where 运行状态 lives.
   *
   * The error block used to sit at the end of the first reply: a failure
   * stapled to a turn that had just delivered a document and then talked about
   * it. That is not a run that can happen, and it read as noise rather than as
   * a specimen — which is what was reported. So the reader asks again, and this
   * turn shows the group's states in the order a failing run produces them:
   * a call that was cancelled, a retry, the retries running out, the session
   * terminating, the error itself, and the reader stopping it.
   *
   * All five come from two shapes only, which is worth knowing before adding to
   * this list: `run.error` carries the four incident rows (its `category`
   * chooses both the icon slot and the title — `retrying` / `exhausted` /
   * `terminal`, anything else falls to the error domain), and `step.started`
   * with `stepKind: "session"` is the interrupt row. See `errorIconSlot` and
   * `stepIconSlot` in `ChatFrame`.
   */
  const userText2 = { textId: "txt_user_2", role: "user", format: "markdown" };
  events.push(
    event("text.started", userText2, { messageId: "msg_user_2" }),
    event("text.delta", { textId: "txt_user_2", delta: SAMPLE.question2[locale] }, { messageId: "msg_user_2" }),
    event("text.finished", { textId: "txt_user_2" }, { messageId: "msg_user_2" }),
  );

  events.push(
    /*
     * No tool rows in this turn, on reflection — and the reflection is worth
     * keeping.
     *
     * 完成 / 失败 / 已取消 were given a call each here so their rail cards had
     * something to point at. But the states were already on the canvas by other
     * means: a run that retries and gives up *is* the failure, the reader
     * pressing stop *is* the cancellation, and the first turn delivering a
     * document *is* completion. Three invented calls to illustrate three things
     * the canvas already said.
     */
    /* What went wrong, first: with no tool row above it this card is the turn's
       opening statement rather than a footnote to a row. */
    event("run.error", {
      /*
       * A code from the real vocabulary, because this is the one error row
       * whose glyph is chosen *by code*: the other three carry a `category`
       * (retrying / exhausted / terminal) and `errorIconSlot` reads that
       * instead. `E_WRITE_FILE` was invented for this demo and matches nothing
       * in `errorDomainSlot`, so the row fell through to `error.unknown` and
       * drew a question mark beside "磁盘配额已满" — reported as 图标是不是用错了.
       * The sentence says the quota is full, and that is a named domain.
       */
      code: "resource_quota_exceeded_error",
      category: "tool",
      retryable: true,
      userMessage: SAMPLE.errorMessage[locale],
    }),

    /* 重试中 → 重试耗尽 → 终止: the three incident categories, in order. */
    event("run.error", {
      code: "E_WRITE_FILE",
      category: "retrying",
      retryable: true,
      userMessage: SAMPLE.retryMessage[locale],
    }),
    event("run.error", {
      code: "E_WRITE_FILE",
      category: "exhausted",
      retryable: false,
      userMessage: SAMPLE.exhaustedMessage[locale],
    }),
    event("run.error", {
      code: "E_SANDBOX",
      category: "terminal",
      retryable: false,
      userMessage: SAMPLE.terminalMessage[locale],
    }),



    /* 已中断 — a step row rather than an error row. */
    event("step.started", {
      stepId: "step_canvas_interrupt",
      stepKind: "session",
      label: SAMPLE.interruptLabel[locale],
      summary: SAMPLE.interruptSummary[locale],
    }),
    event("step.finished", { stepId: "step_canvas_interrupt", status: "stopped" }),
  );

  events.push(event("run.finished", {}));
  return events;
}

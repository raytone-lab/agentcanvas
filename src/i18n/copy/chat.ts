// Chat domain copy: ChatFrame, ReasoningBlock, ToolCallCard, message actions, empty states.
// en is the source of truth; every other locale must mirror its shape exactly — the
// `satisfies` at the bottom is what enforces that.

import type { AppLocale } from "../locales";

const en = {
  reasoning: {
    thinking: "Thinking",
    reasoned: "Thinking",
    reasonedPlain: "Thought",
    reasonedFor: "Thought for {seconds}s",
    /** Past a minute, seconds alone stop being readable. */
    reasonedForLong: "Thought for {minutes}m {seconds}s",
    /**
     * The settled title when it counts passes instead of seconds.
     *
     * A whole phrase per locale rather than a unit appended to `reasonedPlain`:
     * the count sits in the middle in Japanese and the unit word differs by
     * language, so assembling it from parts would read as translated English.
     */
    reasonedCount: "Thought · {count} passes",
    /** While the span is still open and the clock is running. */
    /**
     * Appended to whatever the running title says, rather than a phrase of its
     * own: the title may be a cycling stage name ("Reading files"), and
     * "Thinking for 12s" cannot compose with that.
     */
    elapsedSuffix: "{seconds}s",
    elapsedSuffixLong: "{minutes}m {seconds}s",
    /**
     * What the indicator says while the span is open, in order.
     *
     * A front-end sequence for now: the protocol carries no stage names, and
     * the reasoning events only open, append and close. When the producer
     * starts sending steps (`STEP_STARTED`) these become the fallback for a
     * run that names none.
     */
    thinkingStages: ["Thinking", "Reading the request", "Planning the reply"],
    visibility: {
      statusOnly: "status only",
      thinkingSummary: "thinking summary",
      publicSummary: "public summary",
    },
    disclosure: {
      summaryFirst: "summary first",
      expanded: "expanded",
      manual: "manual",
      auto: "auto",
    },
  },
  frame: {
    title: "Coding Agent",
    fallbackConversationTitle: "Mock conversation",
  },
  status: {
    running: "running",
    finished: "finished",
    idle: "idle",
    awaitingInput: "awaiting input",
    error: "error",
    success: "success",
    started: "started",
  },
  speakers: {
    user: "You",
    agent: "Agent",
    agentOutputLabel: "Agent output",
  },
  message: {
    streaming: "Streaming...",
    actions: {
      userActionsLabel: "User message actions",
      agentActionsLabel: "Agent message actions",
      copyPrompt: "Copy prompt",
      editPromptAndRerun: "Edit prompt and rerun",
      promptTime: "Show prompt time",
      copyResponse: "Copy response",
      regenerateResponse: "Regenerate response",
      editResponse: "Edit response",
      responseTime: "Show response time",
    },
  },
  emptyState: {
    suggestedPrompts: {
      inspectContext: "Inspect current context",
      draftResponse: "Draft a response",
      summarizeWork: "Summarize recent work",
    },
    capabilityHints: {
      files: "Files",
      tools: "Tools",
      output: "Output",
    },
    noEvents: "No replay events loaded",
  },
  error: {
    debugHidden: "Debug detail hidden in dock",
    // State-matching titles for incident blocks (retrying / exhausted / terminal).
    incident: {
      retrying: "Retrying",
      exhausted: "Retries exhausted",
      terminal: "Session terminated",
    },
  },
  approval: {
    externalLabel: "External tool approval",
    /**
     * Asked when the backend supplies no prompt of its own — which is the normal case for a real
     * run. A backend must not have to author UI prose: `piAdapter` doing exactly that put an
     * English sentence in the middle of a Chinese screen, because an adapter has no locale.
     */
    promptFallback: "Approve this tool call?",
    actionsLabel: "Tool approval actions",
    yes: "Yes",
    always: "Always",
    no: "No",
    cancel: "Cancel",
    decision: {
      yes: "Approved",
      always: "Always allowed",
      no: "Denied",
    },
    undo: "Undo",
    hints: {
      yes: "Allow once",
      always: "Do not ask again for this project",
      no: "Deny this time",
    },
    permissionRequired: "Permission required",
    chooseHint: "Use Tab / arrow keys to choose, Enter to confirm",
    confirm: "Confirm",
    noOutput: "No output.",
  },
  artifactLaunch: {
    open: "Open",
    openWith: "Open with",
    kindImage: "Generated image",
    kindAudio: "Audio loading",
    kindVideo: "Generated video",
    kindWebsite: "Website",
    /** Anything that is not a page or a media file: a script, a document, a config. */
    kindFile: "File",
  },
  toolCard: {
    fallbackTitle: "Tool call",
    inputTitle: "Input",
    outputTitle: "Output",
    /** Titles the card generates while a tool is mid-flight, keyed by action. */
    runningAction: {
      readFile: "Reading file",
      readImage: "Reading image",
      modifyFile: "Modifying file",
      editFile: "Editing file",
      validate: "Validating",
      search: "Searching",
      runCommand: "Running command",
    },
    /*
     * What the header says once the call is over rather than mid-flight.
     *
     * The card used to name the action whatever the status, so a call the run
     * had given up on still read "Modifying file" — "正在修改文件", present
     * tense, on a row whose icon is a cancel mark. The action is still in the
     * event for anyone who wants it; what the header reports now is the
     * outcome, because that is what the reader is being told.
     */
    outcome: {
      cancelled: "Cancelled",
      failed: "Failed",
    },
    /** Per-file row status: the last row is still active, earlier ones are done. */
    /*
     * Lower case. The row reads as one sentence — "read notes.md 1 line" —
     * with the file name and the count either side of this word, and a capital
     * in the middle of it started a sentence that the row does not contain.
     * The other two locales have no case to set.
     */
    fileRow: {
      readActive: "reading",
      readDone: "read",
      editActive: "editing",
      editDone: "edited",
      modifyActive: "modifying",
      modifyDone: "modified",
    },
  },
};

const zh: typeof en = {
  reasoning: {
    thinking: "思考中",
    reasoned: "思考过程",
    reasonedPlain: "已思考",
    reasonedFor: "已思考{seconds}秒",
    reasonedForLong: "已思考{minutes}分{seconds}秒",
    reasonedCount: "已思考 · {count} 段",
    elapsedSuffix: "{seconds}秒",
    elapsedSuffixLong: "{minutes}分{seconds}秒",
    thinkingStages: ["思考中", "推理需求", "规划回复"],
    visibility: {
      statusOnly: "仅状态",
      thinkingSummary: "思考摘要",
      publicSummary: "公开摘要",
    },
    disclosure: {
      summaryFirst: "摘要优先",
      expanded: "展开",
      manual: "手动",
      auto: "自动",
    },
  },
  frame: {
    title: "编码 Agent",
    fallbackConversationTitle: "模拟对话",
  },
  status: {
    running: "运行中",
    finished: "完成",
    idle: "空闲",
    awaitingInput: "等待输入",
    error: "错误",
    success: "成功",
    started: "已开始",
  },
  speakers: {
    user: "我",
    agent: "Agent",
    agentOutputLabel: "Agent 输出",
  },
  message: {
    streaming: "正在生成…",
    actions: {
      userActionsLabel: "用户消息操作",
      agentActionsLabel: "Agent 消息操作",
      copyPrompt: "复制提示词",
      editPromptAndRerun: "编辑提示词并重跑",
      promptTime: "显示发送时间",
      copyResponse: "复制回复",
      regenerateResponse: "重新生成回复",
      editResponse: "修改回复",
      responseTime: "显示生成时间",
    },
  },
  emptyState: {
    suggestedPrompts: {
      inspectContext: "查看当前上下文",
      draftResponse: "起草回复",
      summarizeWork: "总结近期工作",
    },
    capabilityHints: {
      files: "文件",
      tools: "工具",
      output: "输出",
    },
    noEvents: "未加载回放事件",
  },
  error: {
    debugHidden: "调试详情已隐藏于侧栏",
    incident: {
      retrying: "重试中",
      exhausted: "重试耗尽",
      terminal: "会话已终止",
    },
  },
  approval: {
    externalLabel: "外部工具审批",
    promptFallback: "批准此工具调用？",
    actionsLabel: "工具审批操作",
    yes: "允许",
    always: "始终允许",
    no: "拒绝",
    cancel: "取消",
    decision: {
      yes: "已允许",
      always: "已始终允许",
      no: "已拒绝",
    },
    undo: "撤销",
    hints: {
      yes: "仅允许这一次",
      always: "后续相同命令不再询问",
      no: "这次先拒绝",
    },
    permissionRequired: "需要权限",
    chooseHint: "使用 Tab / 上下键选择，回车确认",
    confirm: "确认",
    noOutput: "没有输出。",
  },
  artifactLaunch: {
    open: "打开",
    openWith: "打开方式",
    kindImage: "生成图片",
    kindAudio: "音频加载",
    kindVideo: "生成视频",
    kindWebsite: "网站",
    kindFile: "文件",
  },
  toolCard: {
    fallbackTitle: "工具调用",
    inputTitle: "输入",
    outputTitle: "输出",
    runningAction: {
      readFile: "正在读取文件",
      readImage: "正在读取图片",
      modifyFile: "正在修改文件",
      editFile: "正在编辑文件",
      validate: "正在验证",
      search: "正在搜索",
      runCommand: "正在运行命令",
    },
    /* See the English block: the header reports the outcome once the call is
       over, not the action it was in the middle of. */
    outcome: {
      cancelled: "已取消",
      failed: "失败",
    },
    fileRow: {
      readActive: "正在读取",
      readDone: "已读取",
      editActive: "正在编辑",
      editDone: "已编辑",
      modifyActive: "正在修改",
      modifyDone: "已修改",
    },
  },
};

/** PENDING NATIVE REVIEW — see the note in ./shell.ts for the conventions used. */
const ja: typeof en = {
  reasoning: {
    thinking: "思考中",
    reasoned: "思考プロセス",
    reasonedPlain: "考えました",
    reasonedFor: "{seconds} 秒 考えました",
    reasonedForLong: "{minutes} 分 {seconds} 秒 考えました",
    reasonedCount: "{count} 段階 考えました",
    elapsedSuffix: "{seconds}秒",
    elapsedSuffixLong: "{minutes}分{seconds}秒",
    thinkingStages: ["思考中", "要望を読み解く", "返答を組み立てる"],
    visibility: {
      statusOnly: "ステータスのみ",
      thinkingSummary: "思考の要約",
      publicSummary: "公開用の要約",
    },
    disclosure: {
      summaryFirst: "要約を先に",
      expanded: "展開",
      manual: "手動",
      auto: "自動",
    },
  },
  frame: {
    title: "コーディング Agent",
    fallbackConversationTitle: "モック会話",
  },
  status: {
    running: "実行中",
    finished: "完了",
    idle: "待機中",
    awaitingInput: "入力待ち",
    error: "エラー",
    success: "成功",
    started: "開始",
  },
  speakers: {
    user: "あなた",
    agent: "Agent",
    agentOutputLabel: "Agent の出力",
  },
  message: {
    streaming: "生成中…",
    actions: {
      userActionsLabel: "ユーザーメッセージの操作",
      agentActionsLabel: "Agent メッセージの操作",
      copyPrompt: "プロンプトをコピー",
      editPromptAndRerun: "プロンプトを編集して再実行",
      promptTime: "送信時刻を表示",
      copyResponse: "応答をコピー",
      regenerateResponse: "応答を再生成",
      editResponse: "応答を編集",
      responseTime: "生成時刻を表示",
    },
  },
  emptyState: {
    suggestedPrompts: {
      inspectContext: "現在のコンテキストを確認",
      draftResponse: "返信の下書きを作成",
      summarizeWork: "最近の作業を要約",
    },
    capabilityHints: {
      files: "ファイル",
      tools: "ツール",
      output: "出力",
    },
    noEvents: "リプレイイベントが読み込まれていません",
  },
  error: {
    debugHidden: "デバッグ詳細はドックに格納されています",
    incident: {
      retrying: "リトライ中",
      exhausted: "リトライ上限に達しました",
      terminal: "セッションが終了しました",
    },
  },
  approval: {
    externalLabel: "外部ツールの承認",
    promptFallback: "このツール呼び出しを承認しますか？",
    actionsLabel: "ツール承認の操作",
    yes: "許可",
    always: "常に許可",
    no: "拒否",
    cancel: "キャンセル",
    decision: {
      yes: "許可しました",
      always: "常に許可に設定しました",
      no: "拒否しました",
    },
    undo: "取り消す",
    hints: {
      yes: "今回だけ許可",
      always: "このプロジェクトでは今後確認しない",
      no: "今回は拒否",
    },
    permissionRequired: "権限が必要です",
    chooseHint: "Tab / 矢印キーで選択、Enter で確定",
    confirm: "確定",
    noOutput: "出力はありません。",
  },
  artifactLaunch: {
    open: "開く",
    openWith: "開き方",
    kindImage: "生成された画像",
    kindAudio: "音声の読み込み",
    kindVideo: "生成された動画",
    kindWebsite: "ウェブサイト",
    kindFile: "ファイル",
  },
  toolCard: {
    fallbackTitle: "ツール呼び出し",
    inputTitle: "入力",
    outputTitle: "出力",
    runningAction: {
      readFile: "ファイルを読み取り中",
      readImage: "画像を読み取り中",
      modifyFile: "ファイルを変更中",
      editFile: "ファイルを編集中",
      validate: "検証中",
      search: "検索中",
      runCommand: "コマンドを実行中",
    },
    /* See the English block. */
    outcome: {
      cancelled: "キャンセル",
      failed: "失敗",
    },
    fileRow: {
      readActive: "読み取り中",
      readDone: "読み取り済み",
      editActive: "編集中",
      editDone: "編集済み",
      modifyActive: "変更中",
      modifyDone: "変更済み",
    },
  },
};

/** Read off `en`, so every other locale is checked against it rather than trusted. */
export type ChatCopy = typeof en;

export const chatCopy = { en, zh, ja } satisfies Record<AppLocale, ChatCopy>;

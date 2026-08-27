// Chat domain copy: ChatFrame, ReasoningBlock, ToolCallCard, message actions, empty states.
// en is the source of truth; every other locale must mirror its shape exactly — the
// `satisfies` at the bottom is what enforces that.

import type { AppLocale } from "../locales";

const en = {
  reasoning: {
    thinking: "Thinking",
    reasoned: "Reasoned",
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
    subtitleSuffix: "preset preview",
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
    externalPrompt: "Approve this tool call?",
    inlinePrompt: "Awaiting tool approval",
    actionsLabel: "Tool approval actions",
    yes: "Yes",
    always: "Always",
    no: "No",
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
    openWith: "Open with",
    kindImage: "Generated image",
    kindAudio: "Audio loading",
    kindVideo: "Generated video",
    kindWebsite: "Website",
  },
  demoSite: {
    subtitle: "Website",
    body: "Compose, preview, and export agent frontend components.",
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
    /** Per-file row status: the last row is still active, earlier ones are done. */
    fileRow: {
      readActive: "Reading",
      readDone: "Read",
      editActive: "Editing",
      editDone: "Edited",
      modifyActive: "Modifying",
      modifyDone: "Modified",
    },
  },
};

const zh: typeof en = {
  reasoning: {
    thinking: "思考中",
    reasoned: "已完成思考",
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
    subtitleSuffix: "预设预览",
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
    externalPrompt: "批准此工具调用？",
    inlinePrompt: "等待工具审批",
    actionsLabel: "工具审批操作",
    yes: "允许",
    always: "始终允许",
    no: "拒绝",
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
    openWith: "打开方式",
    kindImage: "生成图片",
    kindAudio: "音频加载",
    kindVideo: "生成视频",
    kindWebsite: "网站",
  },
  demoSite: {
    subtitle: "网站",
    body: "用于组合、预览并导出 Agent 前端组件。",
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
    reasoned: "思考完了",
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
    subtitleSuffix: "プリセットプレビュー",
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
    externalPrompt: "このツール呼び出しを承認しますか？",
    inlinePrompt: "ツールの承認待ち",
    actionsLabel: "ツール承認の操作",
    yes: "許可",
    always: "常に許可",
    no: "拒否",
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
    openWith: "開き方",
    kindImage: "生成された画像",
    kindAudio: "音声の読み込み",
    kindVideo: "生成された動画",
    kindWebsite: "ウェブサイト",
  },
  demoSite: {
    subtitle: "ウェブサイト",
    body: "Agent フロントエンドのコンポーネントを組み立て、プレビューし、エクスポートします。",
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

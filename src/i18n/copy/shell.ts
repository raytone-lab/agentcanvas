// Shell domain copy: topbar, preset rail, run status, command menu, toasts.
// en is the source of truth; every other locale must mirror its shape exactly — the
// `satisfies` at the bottom is what enforces that.

import type { AppLocale } from "../locales";

const en = {
  brand: {
    title: "AgentCanvas",
    subtitleBuilder: "Schema-driven AgentUX scaffold configurator",
    subtitleSavedPreview: "Saved Agent frontend run preview",
  },
  topbar: {
    workspaceViewAria: "Workspace view",
    viewPreview: "Preview",
    viewDebug: "Debug",
    editUiUx: "Edit UI/UX",
    runModeLabel: "Run mode",
    runModeReplay: "Replay mock",
    runModeLive: "Live LLM",
    scenarioLabel: "Scenario",
    save: "Save",
    run: "Run",
    stop: "Stop",
    exportScaffold: "Download Agent",
    languageSwitchAria: "Switch language",
    languageEn: "EN",
    languageZh: "中文",
    /**
     * Keyed by locale so the switcher can map over APP_LOCALES instead of growing a hardcoded
     * button per language. Each label is written in its own language, which is the convention
     * language pickers follow — a reader who cannot read the current UI language still finds
     * their own.
     */
    languageLabels: {
      en: "EN",
      zh: "中文",
      ja: "日本語",
    },
  },
  presetRail: {
    title: "UX Presets",
    defaultSection: "Options",
    activeBadge: "active",
    groups: {
      conversation: {
        label: "Chat",
        description: "Writing rhythm, message recovery actions, and first-run state.",
      },
      "media-generation": {
        label: "Loaders",
        description: "Generated image, audio, and video loading components.",
      },
      sidebar: {
        label: "Left rail",
        description: "Left conversation-history rail: visibility, new chat, search, grouping, version.",
      },
      "ux-effects": {
        label: "Thinking",
        description: "Reasoning motion, summary order, and collapse behavior.",
      },
      "tool-calls": {
        label: "Tools",
        description: "Tool actions such as reading files, editing, validating, searching, and running commands.",
      },
      approval: {
        label: "Permissions",
        description: "Composer approval access and pending approval placement.",
      },
      blocks: {
        label: "Status",
        description: "Result and incident states such as completed, failed, cancelled, retrying, exhausted, and terminal.",
      },
      composer: {
        label: "Input",
        description: "Input controls for files, budget, models, tools, and prompts.",
      },
      provider: {
        label: "Model",
        description: "Hosted and local model provider defaults for the scaffold.",
      },
      output: {
        label: "Output",
        description: "Output source and panel behavior.",
      },
      render: {
        label: "Render",
        description: "Artifact renderer defaults for generated output.",
      },
      git: {
        label: "Git",
        description: "Branch status, changed files, diff review, and commit controls.",
      },
      theme: {
        label: "Theme",
        description: "Font and color systems for the generated AgentUX scaffold.",
      },
    },
  },
  /** Editor chrome that used to be inline ternaries in App.tsx. */
  editor: {
    noSelectedComponents: "No selected components yet",
    selectedComponentCount: "{count} selected components",
    chooseStyle: "Choose style",
    underConstruction: "Under construction…",
    expandSidebar: "Expand sidebar",
    expandPanel: "Expand panel",
    // Dev-only event-stream picker in the exported shell.
    eventStreamLabel: "Event stream (dev)",
    eventStreamAria: "Select event stream",
    eventStreamWelcome: "Welcome (no events)",
    styleSwitch: {
      gotIt: "Got it",
      cancel: "Cancel",
      confirm: "Switch",
      unbuiltTitle: "{style} is under construction",
      unbuiltDescription: "This style is still being built and can't be switched to yet.",
      confirmTitle: "Switch to {style}?",
      confirmDescription:
        "Your configuration and functionality stay intact — only the visual style changes to {style}.",
    },
    messageActions: {
      sentTitle: "Sent message actions",
      generatedTitle: "Generated message actions",
      copy: "Copy",
      edit: "Edit",
      time: "Time",
      regenerate: "Regenerate",
    },
  },
  runMode: {
    replayLabel: "Replay mock",
    replayDetail: "local fixture",
    harnessDetail: "adapter not wired",
    // English reads the raw state name, which is what the previous inline branch returned.
    liveState: {
      idle: "idle",
      streaming: "streaming",
      finished: "finished",
      stopped: "stopped",
      error: "error",
    },
  },
  welcomePanel: {
    title: "Welcome",
    greetingLabel: "Greeting text",
    greetingPlaceholder: "Meet My Agent ~",
    hint: "Shown above the input when a new chat starts. Click New chat in the sidebar to preview it.",
  },
  commandMenu: {
    placeholder: "Switch fixture or jump to a surface...",
    empty: "No command found.",
    replayFixtures: "Replay fixtures",
  },
  toast: {
    replayFixtureLoaded: "Replay fixture loaded",
    providerSettingsSaved: "Provider settings saved to scaffold config",
    uiUxSaved: "UI/UX saved. Run preview ready.",
    saveBeforeLocalPreview: "Save UI/UX before running the local preview.",
    pureFrontendComplete: "Pure front-end preview run complete",
    saveBeforeLiveLlm: "Save UI/UX before running Live LLM.",
    liveLlmStopped: "Live LLM request stopped",
    liveLlmFailed: "Live LLM preview failed",
    enterDevSessionKeyBeforeTesting: "Enter a dev session key for {provider} before testing.",
    providerKeyWorks: "{provider} key works",
    modelsCountSuffix: "models",
    providerTestFailed: "{provider} test failed: {message}",
    enterDevSessionKeyBeforeFetchingModels: "Enter a dev session key for {provider} before fetching models.",
    providerReturnedNoModels: "{provider} returned no models.",
    fetchedModelsForProvider: "Fetched {count} models for {provider}",
    providerModelFetchFailed: "{provider} model fetch failed: {message}",
    liveLlmResponseReceived: "{provider} Live LLM response received",
    unknownError: "unknown error",
    runGitDiffBeforeCommit: "Run the Git diff preview scenario before committing.",
    mockCommitRecorded: "Mock commit recorded locally",
    exportDownloaded: "Export downloaded for {name}",
    scaffoldExportFailed: "Scaffold export failed",
  },
};

const zh: typeof en = {
  brand: {
    title: "AgentCanvas",
    subtitleBuilder: "Schema 驱动的 AgentUX 脚手架配置器",
    subtitleSavedPreview: "已保存的 Agent 前端运行预览",
  },
  topbar: {
    workspaceViewAria: "工作区视图",
    viewPreview: "预览",
    viewDebug: "调试",
    editUiUx: "编辑 UI/UX",
    runModeLabel: "运行模式",
    runModeReplay: "回放模拟",
    runModeLive: "实时 LLM",
    scenarioLabel: "场景",
    save: "保存",
    run: "运行",
    stop: "停止",
    exportScaffold: "下载 Agent",
    languageSwitchAria: "切换语言",
    languageEn: "EN",
    languageZh: "中文",
    languageLabels: {
      en: "EN",
      zh: "中文",
      ja: "日本語",
    },
  },
  presetRail: {
    title: "UX 预设",
    defaultSection: "选项",
    activeBadge: "已启用",
    groups: {
      conversation: {
        label: "对话",
        description: "书写节奏、消息恢复操作以及首次运行状态。",
      },
      "media-generation": {
        label: "加载器",
        description: "图片、音频和视频的加载组件。",
      },
      sidebar: {
        label: "左侧栏",
        description: "左侧会话历史栏：显示与否、新建对话、搜索、分组、版本号。",
      },
      "ux-effects": {
        label: "思考",
        description: "推理动效、摘要顺序以及折叠行为。",
      },
      "tool-calls": {
        label: "工具调用",
        description: "读取文件、编辑、验证、搜索和运行命令等工具动作。",
      },
      approval: {
        label: "权限",
        description: "输入区审批入口，以及待审批操作在卡片内或对话流中的位置。",
      },
      blocks: {
        label: "状态",
        description: "完成、失败、已取消、重试、耗尽和终止等结果与异常状态。",
      },
      composer: {
        label: "输入框",
        description: "文件、预算、模型、工具与提示的输入控件。",
      },
      provider: {
        label: "提供方",
        description: "脚手架的托管与本地模型提供方默认值。",
      },
      output: {
        label: "输出",
        description: "输出来源与面板行为。",
      },
      render: {
        label: "渲染",
        description: "生成输出的产物渲染器默认值。",
      },
      git: {
        label: "Git",
        description: "分支状态、变更文件、diff 审查与提交控件。",
      },
      theme: {
        label: "主题",
        description: "生成的 AgentUX 脚手架的字体与配色系统。",
      },
    },
  },
  editor: {
    noSelectedComponents: "还没有选择组件",
    selectedComponentCount: "已选组件 {count} 套",
    chooseStyle: "选择风格",
    underConstruction: "正在搭建中…",
    expandSidebar: "展开侧边栏",
    expandPanel: "展开右侧面板",
    eventStreamLabel: "事件流(仅开发)",
    eventStreamAria: "选择事件流",
    eventStreamWelcome: "欢迎页(无事件)",
    styleSwitch: {
      gotIt: "知道了",
      cancel: "取消",
      confirm: "确认更换",
      unbuiltTitle: "「{style}」正在搭建中",
      unbuiltDescription: "该风格还在搭建中,暂时无法切换,敬请期待。",
      confirmTitle: "确定切换为「{style}」?",
      confirmDescription: "切换后不影响任何功能和已有配置,只有界面视觉风格会变为「{style}」。",
    },
    messageActions: {
      sentTitle: "发送内容操作",
      generatedTitle: "生成消息操作",
      copy: "复制",
      edit: "修改",
      time: "时间",
      regenerate: "重新生成",
    },
  },
  runMode: {
    replayLabel: "回放模拟",
    replayDetail: "本地 fixture",
    harnessDetail: "adapter 未接入",
    liveState: {
      idle: "空闲",
      streaming: "生成中",
      finished: "完成",
      stopped: "已停止",
      error: "错误",
    },
  },
  welcomePanel: {
    title: "欢迎语",
    greetingLabel: "问候语文本",
    greetingPlaceholder: "Meet My Agent ~",
    hint: "新建对话时显示在输入框上方。点侧边栏「新建对话」即可预览效果。",
  },
  commandMenu: {
    placeholder: "切换 fixture 或跳转到某个界面...",
    empty: "未找到命令。",
    replayFixtures: "回放 fixture",
  },
  toast: {
    replayFixtureLoaded: "回放 fixture 已加载",
    providerSettingsSaved: "提供方设置已保存到脚手架配置",
    uiUxSaved: "UI/UX 已保存，运行预览就绪。",
    saveBeforeLocalPreview: "运行本地预览前请先保存 UI/UX。",
    pureFrontendComplete: "纯前端预览运行完成",
    saveBeforeLiveLlm: "运行实时 LLM 前请先保存 UI/UX。",
    liveLlmStopped: "实时 LLM 请求已停止",
    liveLlmFailed: "实时 LLM 预览失败",
    enterDevSessionKeyBeforeTesting: "测试 {provider} 前请先输入开发会话密钥。",
    providerKeyWorks: "{provider} 密钥可用",
    modelsCountSuffix: "个模型",
    providerTestFailed: "{provider} 测试失败：{message}",
    enterDevSessionKeyBeforeFetchingModels: "获取 {provider} 模型前请先输入开发会话密钥。",
    providerReturnedNoModels: "{provider} 未返回模型。",
    fetchedModelsForProvider: "已为 {provider} 获取 {count} 个模型",
    providerModelFetchFailed: "{provider} 模型获取失败：{message}",
    liveLlmResponseReceived: "{provider} Live LLM 响应已收到",
    unknownError: "未知错误",
    runGitDiffBeforeCommit: "提交前请先运行 Git diff 预览场景。",
    mockCommitRecorded: "模拟提交已在本地记录",
    exportDownloaded: "{name} 已导出",
    scaffoldExportFailed: "脚手架导出失败",
  },
};

/**
 * PENDING NATIVE REVIEW. Written to the conventions in docs, not verified by a Japanese
 * speaker: katakana for settled dev loanwords (ツール / ストリーム / プレビュー), sentences in
 * です・ます, labels and buttons in noun form, and product nouns left untranslated
 * (AgentCanvas / AgentUX / Agent / Git / MCP / Vite / SSE / fixture).
 *
 * Chinese kanji that misread in Japanese are deliberately not carried over: 工具 → ツール,
 * 运行 → 実行, 产物 → アーティファクト, 输入框 → 入力欄.
 */
const ja: typeof en = {
  brand: {
    title: "AgentCanvas",
    subtitleBuilder: "スキーマ駆動の AgentUX スキャフォールド構成ツール",
    subtitleSavedPreview: "保存済み Agent フロントエンドの実行プレビュー",
  },
  topbar: {
    workspaceViewAria: "ワークスペース表示",
    viewPreview: "プレビュー",
    viewDebug: "デバッグ",
    editUiUx: "UI/UX を編集",
    runModeLabel: "実行モード",
    runModeReplay: "リプレイモック",
    runModeLive: "ライブ LLM",
    scenarioLabel: "シナリオ",
    save: "保存",
    run: "実行",
    stop: "停止",
    exportScaffold: "Agent をダウンロード",
    languageSwitchAria: "言語を切り替える",
    languageEn: "EN",
    languageZh: "中文",
    languageLabels: {
      en: "EN",
      zh: "中文",
      ja: "日本語",
    },
  },
  presetRail: {
    title: "UX プリセット",
    defaultSection: "オプション",
    activeBadge: "有効",
    groups: {
      conversation: {
        label: "チャット",
        description: "文章の出力リズム、メッセージ操作、初回表示の状態。",
      },
      "media-generation": {
        label: "ローダー",
        description: "画像・音声・動画の生成中に表示するローディングコンポーネント。",
      },
      sidebar: {
        label: "左レール",
        description: "左側の会話履歴：表示の有無、新規チャット、検索、グループ化、バージョン表記。",
      },
      "ux-effects": {
        label: "思考",
        description: "推論のモーション、要約の表示順、折りたたみの挙動。",
      },
      "tool-calls": {
        label: "ツール",
        description: "ファイルの読み取り・編集・検証・検索・コマンド実行などのツール動作。",
      },
      approval: {
        label: "権限",
        description: "入力欄からの承認導線と、承認待ち操作をカード内か会話中のどこに置くか。",
      },
      blocks: {
        label: "ステータス",
        description: "完了・失敗・キャンセル・リトライ・リトライ上限・停止といった結果と障害の状態。",
      },
      composer: {
        label: "入力欄",
        description: "ファイル、思考予算、モデル、ツール、プロンプトの入力コントロール。",
      },
      provider: {
        label: "モデル",
        description: "スキャフォールドが使うホスト型およびローカルのモデルプロバイダー既定値。",
      },
      output: {
        label: "出力",
        description: "出力のソースとパネルの挙動。",
      },
      render: {
        label: "レンダリング",
        description: "生成された出力に使うアーティファクトレンダラーの既定値。",
      },
      git: {
        label: "Git",
        description: "ブランチの状態、変更ファイル、差分レビュー、コミット操作。",
      },
      theme: {
        label: "テーマ",
        description: "生成される AgentUX スキャフォールドのフォントと配色システム。",
      },
    },
  },
  editor: {
    noSelectedComponents: "コンポーネントが選択されていません",
    selectedComponentCount: "選択中のコンポーネント {count} 件",
    chooseStyle: "スタイルを選ぶ",
    underConstruction: "準備中…",
    expandSidebar: "サイドバーを開く",
    expandPanel: "右パネルを開く",
    eventStreamLabel: "イベントストリーム（開発用）",
    eventStreamAria: "イベントストリームを選択",
    eventStreamWelcome: "ウェルカム（イベントなし）",
    styleSwitch: {
      gotIt: "了解",
      cancel: "キャンセル",
      confirm: "切り替える",
      unbuiltTitle: "「{style}」は準備中です",
      unbuiltDescription: "このスタイルはまだ準備中のため、切り替えられません。",
      confirmTitle: "「{style}」に切り替えますか？",
      confirmDescription: "設定や機能はそのまま保たれ、変わるのは見た目のスタイルだけです（「{style}」になります）。",
    },
    messageActions: {
      sentTitle: "送信メッセージの操作",
      generatedTitle: "生成メッセージの操作",
      copy: "コピー",
      edit: "編集",
      time: "時刻",
      regenerate: "再生成",
    },
  },
  runMode: {
    replayLabel: "リプレイモック",
    replayDetail: "ローカル fixture",
    harnessDetail: "adapter 未接続",
    liveState: {
      idle: "待機中",
      streaming: "生成中",
      finished: "完了",
      stopped: "停止",
      error: "エラー",
    },
  },
  welcomePanel: {
    title: "ウェルカム",
    greetingLabel: "あいさつ文",
    greetingPlaceholder: "Meet My Agent ~",
    hint: "新しいチャットを始めたときに入力欄の上に表示されます。サイドバーの「新規チャット」で確認できます。",
  },
  commandMenu: {
    placeholder: "fixture を切り替える、または画面へ移動…",
    empty: "コマンドが見つかりません。",
    replayFixtures: "リプレイ fixture",
  },
  toast: {
    replayFixtureLoaded: "リプレイ fixture を読み込みました",
    providerSettingsSaved: "プロバイダー設定をスキャフォールド構成に保存しました",
    uiUxSaved: "UI/UX を保存しました。実行プレビューの準備ができています。",
    saveBeforeLocalPreview: "ローカルプレビューを実行する前に UI/UX を保存してください。",
    pureFrontendComplete: "フロントエンドのみのプレビュー実行が完了しました",
    saveBeforeLiveLlm: "ライブ LLM を実行する前に UI/UX を保存してください。",
    liveLlmStopped: "ライブ LLM のリクエストを停止しました",
    liveLlmFailed: "ライブ LLM のプレビューに失敗しました",
    enterDevSessionKeyBeforeTesting: "{provider} をテストする前に開発用セッションキーを入力してください。",
    providerKeyWorks: "{provider} のキーは有効です",
    modelsCountSuffix: "件のモデル",
    providerTestFailed: "{provider} のテストに失敗しました：{message}",
    enterDevSessionKeyBeforeFetchingModels: "{provider} のモデルを取得する前に開発用セッションキーを入力してください。",
    providerReturnedNoModels: "{provider} からモデルが返されませんでした。",
    fetchedModelsForProvider: "{provider} のモデルを {count} 件取得しました",
    providerModelFetchFailed: "{provider} のモデル取得に失敗しました：{message}",
    liveLlmResponseReceived: "{provider} のライブ LLM 応答を受信しました",
    unknownError: "不明なエラー",
    runGitDiffBeforeCommit: "コミットする前に Git 差分プレビューのシナリオを実行してください。",
    mockCommitRecorded: "モックコミットをローカルに記録しました",
    exportDownloaded: "{name} をエクスポートしました",
    scaffoldExportFailed: "スキャフォールドのエクスポートに失敗しました",
  },
};

/** Read off `en`, so every other locale is checked against it rather than trusted. */
export type ShellCopy = typeof en;

export const shellCopy = { en, zh, ja } satisfies Record<AppLocale, ShellCopy>;

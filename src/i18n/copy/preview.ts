// Preview domain copy: the demo transcripts, tool-action titles, approval prose and state-card
// headings that the configurator's canvas replays.
//
// Separate from shell.ts on purpose. shell.ts is chrome — topbar, rail, toasts — while
// everything here is *content* the fake agent produces. They change for different reasons: a
// rail label changes when the product's vocabulary changes, this changes when someone wants a
// more convincing demo. Keeping them apart also keeps shell.ts scannable.
//
// These strings previously lived as inline `locale === "zh" ? … : …` ternaries in App.tsx,
// which is why adding a third locale was a code change rather than a translation.
//
// en is the source of truth; every other locale must mirror its shape exactly — the
// `satisfies` at the bottom is what enforces that.

import type { AppLocale } from "../locales";

const en = {
  /** Fallback heading for a state-card group with no title of its own. */
  stateCardFallbackTitle: "States",

  /** Tool-action demo card titles, keyed by the card's `code`. */
  toolAction: {
    readImage: "Reading image",
    modifyFile: "Modifying file",
    editFile: "Editing file",
    validate: "Validating SearchInput.test.tsx",
    search: "Searching useSearch",
    runCommand: "Running command npm run build",
    readFile: "Reading file",
  },

  /** The prompt that opens the all-tool-actions overview run, and the reply it streams. */
  toolActionsOverview: {
    prompt: "Show the default style for all tool actions.",
    // Joined with "\n" at the call site; kept as lines so a translator sees the structure.
    reply: [
      "I will condense key steps into short results so you can quickly judge progress.",
      "When you need detail, expand an action to inspect inputs, outputs, and linked files.",
      "When work is done, reviewable artifacts will appear here for copying, retrying, or adjusting.",
    ],
  },

  /** The writing/message-output preview run. */
  writing: {
    runTitle: "Message output mode",
    userPrompt: "What can you do?",
    reply: [
      "I can answer questions, summarize information, and draft clear content.",
      "I can inspect files, explain code, and help plan or apply changes.",
      "I can track tasks, surface errors, and show outputs or artifacts when work is done.",
    ],
  },

  /** Avatar rows in the selected-components summary. */
  avatarLabels: {
    user: "My avatar",
    agent: "Agent avatar",
  },

  /** The reasoning-only preview shown when the Thinking group is open. */
  thinking: {
    runTitle: "Thinking preview",
    userPrompt: "Help me think through what needs to change first.",
    statusLabel: "Thinking",
    summary:
      "Reviewing the user goal, canvas state, and component links so this preview only shows thinking content.",
  },

  /** The composer's external-approval demo card. */
  approvalDemo: {
    toolTitle: "Read project instructions",
    prompt: "Allow reading AGENTS.md before editing?",
  },

  /** The inline approval panel: a multiple-choice question the agent asks mid-run. */
  inlineApproval: {
    ariaLabel: "Inline approval",
    kicker: "Icon too large",
    question:
      "I found that native avatar containers are 40px, but Bot fills 40px while Sparkles is only 15px. How should I adjust it?",
    hint: "Use Tab / arrow keys to choose, Enter or Space to select",
    ignore: "Ignore",
    continueLabel: "Continue",
    options: [
      {
        title: "Normalize to 28px",
        body: "Avatar containers become 28x28px, linear icons stay around 16px centered, and custom avatars fill 28px.",
      },
      {
        title: "Normalize to 30px",
        body: "Avatar containers become 30x30px, with icon scale adjusted proportionally.",
      },
      {
        title: "Keep 40px, fix consistency",
        body: "Container size stays, while Bot / Sparkles and similar line icons share one centered size.",
      },
      {
        title: "Type your answer...",
        body: "",
      },
    ],
  },

  /** Prompts that open the generated-media loader demos. */
  mediaPrompt: {
    image: "Generate a launch hero image.",
    audio: "Generate a product intro narration.",
    video: "Generate a feature demo video.",
  },

  /**
   * The generated-media runs. `{prompt}` is substituted with what the user typed; a locale
   * that reads better without quoting the prompt back can simply omit the token.
   */
  mediaGeneration: {
    image: {
      runTitle: "Image generation event-flow preview",
      reasoningLabel: "Analyzing projector product visual",
      reasoningDelta:
        'For "{prompt}", keep the white portable projector as the focal point with the lens highlight and gold handle as signature cues.',
      reasoningSummary:
        "During loading, preserve the centered silhouette, warm fabric backdrop, and soft light before revealing the complete product hero visual.",
      toolTitle: "Generating image GeneratedMoodboard.png",
      resultPreview: "4 candidates · animated loading",
    },
    audio: {
      runTitle: "Audio generation event-flow preview",
      reasoningLabel: "Designing audio loading",
      reasoningDelta:
        'For "{prompt}", show an audio skeleton or waveform loader first, then reveal an audio player demo. ',
      reasoningSummary:
        "Audio generation keeps two modes: skeleton loading and animated waveform, then resolves into a wider, shorter playback control.",
      toolTitle: "Generating audio NarrationMix.wav",
      resultPreview: "18s audio · playback demo",
    },
    video: {
      runTitle: "Video generation event-flow preview",
      reasoningLabel: "Designing video loading",
      reasoningDelta:
        'For "{prompt}", reuse the image loading visual first, then reveal a video player demo. ',
      reasoningSummary:
        "Video generation keeps loader visuals consistent, then resolves into a video frame with play and progress affordances.",
      toolTitle: "Generating video LaunchTeaser.mp4",
      resultPreview: "8s video · playback demo",
    },
  },

  /** Label passed to the cancelled-state demo. */
  cancelledLabel: "Cancelled",
};

/** Read off `en`, so every other locale is checked against it rather than trusted. */
export type PreviewCopy = typeof en;

const zh: PreviewCopy = {
  stateCardFallbackTitle: "状态",

  toolAction: {
    readImage: "正在读取图片",
    modifyFile: "正在修改文件",
    editFile: "正在编辑文件",
    validate: "正在验证 SearchInput.test.tsx",
    search: "正在搜索 useSearch",
    runCommand: "正在运行命令 npm run build",
    readFile: "正在读取文件",
  },

  toolActionsOverview: {
    prompt: "展示所有工具动作的默认样式。",
    reply: [
      "我会把关键步骤收拢成简短结果，方便你快速判断进展。",
      "需要细看时，可以展开对应动作查看输入、输出和关联文件。",
      "完成后我会把可审核的产物放到这里，继续复制、重试或调整。",
    ],
  },

  writing: {
    runTitle: "消息输出模式",
    userPrompt: "你都有什么功能?",
    reply: [
      "我可以回答问题、总结信息，并起草清晰内容。",
      "我可以查看文件、解释代码，并协助规划或应用修改。",
      "我可以跟踪任务、提示错误，并在完成后展示输出或产物。",
    ],
  },

  avatarLabels: {
    user: "我的头像",
    agent: "Agent 头像",
  },

  thinking: {
    runTitle: "思考预览",
    userPrompt: "先帮我梳理一下这次要改什么。",
    statusLabel: "思考中",
    summary: "正在梳理用户目标、界面状态和组件联动，确认这次只调整思考展示，不切到工具或消息内容。",
  },

  approvalDemo: {
    toolTitle: "读取项目说明",
    prompt: "允许编辑前读取 AGENTS.md？",
  },

  inlineApproval: {
    ariaLabel: "内联审批",
    kicker: "icon 太大",
    question:
      "我诊断发现：native 风格下头像容器是 40px，但 Bot（默认）被撑满到 40px，Sparkles 却只有 15px，尺寸严重不一致且偏大。你希望我怎么调？",
    hint: "使用 Tab / 上下键选择，回车或空格选中",
    ignore: "忽略",
    continueLabel: "继续",
    options: [
      {
        title: "统一缩小为 28px",
        body: "头像容器统一 28x28px，线性图标保持约 16px 居中，自定义大头像填满 28px。与整体紧凑密度一致。",
      },
      {
        title: "统一缩小为 30px",
        body: "头像容器 30x30px，图标按比例调整，保留一点呼吸感。",
      },
      {
        title: "保持 40px 但修一致性",
        body: "容器不变，只把 Bot / Sparkles 等线性图标统一成相同小尺寸居中，自定义大头像继续填满。",
      },
      {
        title: "输入你的答案...",
        body: "",
      },
    ],
  },

  mediaPrompt: {
    image: "生成一张产品发布会主视觉。",
    audio: "生成一段产品介绍旁白音频。",
    video: "生成一段功能演示短视频。",
  },

  mediaGeneration: {
    image: {
      runTitle: "图片生成事件流预览",
      reasoningLabel: "分析投影仪产品主视觉",
      reasoningDelta: "识别到白色便携投影仪是视觉中心，镜头高光和金色提手建立产品记忆点。",
      reasoningSummary: "加载阶段保留居中产品轮廓、米金布料背景和柔和光线，完成后显影为完整产品主视觉。",
      toolTitle: "正在生成图片 GeneratedMoodboard.png",
      resultPreview: "4 张候选图 · 动态加载",
    },
    audio: {
      runTitle: "音频生成事件流预览",
      reasoningLabel: "设计音频加载",
      reasoningDelta: "为「{prompt}」生成音频时，先展示音频骨架或波形加载，再进入音频播放 demo。",
      reasoningSummary: "音频生成场景保留骨架加载和动态波形两种模式，完成后呈现更宽更矮的播放控件。",
      toolTitle: "正在生成音频 NarrationMix.wav",
      resultPreview: "18 秒音频 · 播放 demo",
    },
    video: {
      runTitle: "视频生成事件流预览",
      reasoningLabel: "设计视频加载",
      reasoningDelta: "为「{prompt}」生成视频时，先复用图片加载视觉，再进入视频播放 demo。",
      reasoningSummary: "视频生成场景保持加载器一致性，完成后呈现带播放按钮和进度条的视频画面。",
      toolTitle: "正在生成视频 LaunchTeaser.mp4",
      resultPreview: "8 秒视频 · 播放 demo",
    },
  },

  cancelledLabel: "已取消",
};

/** PENDING NATIVE REVIEW — see the note in ./shell.ts for the conventions used. */
const ja: PreviewCopy = {
  stateCardFallbackTitle: "ステータス",

  toolAction: {
    readImage: "画像を読み取り中",
    modifyFile: "ファイルを変更中",
    editFile: "ファイルを編集中",
    validate: "SearchInput.test.tsx を検証中",
    search: "useSearch を検索中",
    runCommand: "コマンド npm run build を実行中",
    readFile: "ファイルを読み取り中",
  },

  toolActionsOverview: {
    prompt: "すべてのツール動作の既定スタイルを見せてください。",
    reply: [
      "重要な手順を短い結果にまとめるので、進み具合をすぐ判断できます。",
      "詳しく見たいときは、該当の動作を展開して入力・出力・関連ファイルを確認してください。",
      "作業が終わると、レビューできるアーティファクトがここに表示されます。コピー・再実行・調整ができます。",
    ],
  },

  writing: {
    runTitle: "メッセージ出力モード",
    userPrompt: "何ができますか？",
    reply: [
      "質問への回答、情報の要約、分かりやすい文章の作成ができます。",
      "ファイルの確認、コードの説明、変更の計画や適用の支援ができます。",
      "タスクの追跡、エラーの提示、完了後の出力やアーティファクトの表示ができます。",
    ],
  },

  avatarLabels: {
    user: "自分のアバター",
    agent: "Agent のアバター",
  },

  thinking: {
    runTitle: "思考のプレビュー",
    userPrompt: "まず今回何を変えるべきか整理させてください。",
    statusLabel: "思考中",
    summary:
      "ユーザーの目的、画面の状態、コンポーネントの連動を整理し、今回は思考の表示だけを調整してツールやメッセージには触れないことを確認しています。",
  },

  approvalDemo: {
    toolTitle: "プロジェクトの説明を読む",
    prompt: "編集の前に AGENTS.md を読んでよいですか？",
  },

  inlineApproval: {
    ariaLabel: "インライン承認",
    kicker: "アイコンが大きすぎる",
    question:
      "native スタイルではアバターの器が 40px ですが、Bot は 40px いっぱいに広がる一方で Sparkles は 15px しかなく、サイズが揃っていません。どう調整しますか？",
    hint: "Tab / 矢印キーで選択、Enter または Space で決定",
    ignore: "無視",
    continueLabel: "続ける",
    options: [
      {
        title: "28px に統一",
        body: "アバターの器を 28x28px にし、線アイコンは 16px 前後で中央に置き、カスタムアバターは 28px いっぱいに広げます。",
      },
      {
        title: "30px に統一",
        body: "アバターの器を 30x30px にし、アイコンの倍率も比例して調整します。",
      },
      {
        title: "40px のまま揃えを直す",
        body: "器の大きさは変えず、Bot / Sparkles などの線アイコンを同じサイズで中央に揃えます。",
      },
      {
        title: "回答を入力…",
        body: "",
      },
    ],
  },

  mediaPrompt: {
    image: "製品発表会のメインビジュアルを 1 枚生成してください。",
    audio: "製品紹介のナレーション音声を生成してください。",
    video: "機能紹介のショート動画を生成してください。",
  },

  mediaGeneration: {
    image: {
      runTitle: "画像生成イベントフローのプレビュー",
      reasoningLabel: "プロジェクターのメインビジュアルを分析中",
      reasoningDelta:
        "「{prompt}」では、白いポータブルプロジェクターを視覚の中心に置き、レンズのハイライトと金色のハンドルを印象の手がかりにします。",
      reasoningSummary:
        "読み込み中は中央の製品シルエット、暖色の布の背景、柔らかな光を保ち、完了後に製品のメインビジュアル全体を表示します。",
      toolTitle: "画像 GeneratedMoodboard.png を生成中",
      resultPreview: "候補 4 枚 · アニメーション付き読み込み",
    },
    audio: {
      runTitle: "音声生成イベントフローのプレビュー",
      reasoningLabel: "音声の読み込み表現を設計中",
      reasoningDelta:
        "「{prompt}」では、まず音声のスケルトンか波形のローダーを見せ、その後に再生プレイヤーのデモを表示します。",
      reasoningSummary:
        "音声生成ではスケルトン読み込みとアニメーション波形の 2 つのモードを保ち、完了後は横に広く高さの低い再生コントロールになります。",
      toolTitle: "音声 NarrationMix.wav を生成中",
      resultPreview: "18 秒の音声 · 再生デモ",
    },
    video: {
      runTitle: "動画生成イベントフローのプレビュー",
      reasoningLabel: "動画の読み込み表現を設計中",
      reasoningDelta:
        "「{prompt}」では、まず画像の読み込み表現を再利用し、その後に動画プレイヤーのデモを表示します。",
      reasoningSummary:
        "動画生成ではローダーの見た目を揃えたまま、完了後に再生ボタンと進行バーを備えた動画フレームになります。",
      toolTitle: "動画 LaunchTeaser.mp4 を生成中",
      resultPreview: "8 秒の動画 · 再生デモ",
    },
  },

  cancelledLabel: "キャンセル",
};

export const previewCopy = { en, zh, ja } satisfies Record<AppLocale, PreviewCopy>;

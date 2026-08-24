// Shell domain copy: topbar, preset rail, run status, command menu, toasts.
// en is the source of truth; zh must mirror its shape exactly.

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

export const shellCopy = { en, zh };

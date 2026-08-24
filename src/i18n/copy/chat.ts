// Chat domain copy: ChatFrame, ReasoningBlock, ToolCallCard, message actions, empty states.
// en is the source of truth; zh must mirror its shape exactly.

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
  },
  toolCard: {
    fallbackTitle: "Tool call",
    inputTitle: "Input",
    outputTitle: "Output",
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
  },
  toolCard: {
    fallbackTitle: "工具调用",
    inputTitle: "输入",
    outputTitle: "输出",
  },
};

export const chatCopy = { en, zh };

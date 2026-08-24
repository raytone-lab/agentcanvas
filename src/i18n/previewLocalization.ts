/**
 * Chinese localization for the bundled demo fixtures.
 *
 * The shipped fixtures are authored in English; when the UI locale is zh the preview
 * view model is rewritten through this dictionary. It lives here (rather than inline in
 * App.tsx) so the exported scaffold localizes identically — `i18n/**` is part of the
 * export closure, App.tsx is not.
 */
import type { AppLocale } from "./uiCopy";

const previewTextZh: Record<string, string> = {
  "Thinking": "思考中",
  "Normal turn": "普通回合",
  "Streaming thinking + message": "流式思考 + 消息",
  "Tool approval + completion": "工具审批 + 完成",
  "MCP success + interrupt": "MCP 成功 + 打断",
  "Runtime boot + sync": "Runtime 启动 + 同步",
  "Retrying incident": "重试中的事件",
  "Exhausted incident": "重试耗尽事件",
  "Terminal incident": "终止事件",
  "Config, spans, deletion": "配置、span、删除",
  "What can you do?": "你都有什么功能？",
  "I can answer questions, summarize information, and draft clear content.\nI can inspect files, explain code, and help plan or apply changes.\nI can track tasks, surface errors, and show outputs or artifacts when work is done.": "我可以回答问题、总结信息，并起草清晰内容。\n我可以查看文件、解释代码，并协助规划或应用修改。\n我可以跟踪任务、提示错误，并在完成后展示输出或产物。",
  "Create a dashboard summary file.": "创建仪表盘摘要文件。",
  "Write dashboard file": "写入仪表板文件",
  "The dashboard summary file is ready.": "仪表盘摘要文件已准备好。已整理今日核心指标、异常趋势和待跟进事项，方便快速浏览支持团队的当前状态。下一步可以直接打开输出面板核对文件结构。",
  "The dashboard summary file is ready. It now includes the key support signals, owner notes, and follow-up items for the operations review. The structure is intentionally short so the output panel can preview it without hiding the main conversation.": "仪表盘摘要文件已准备好。已整理今日核心指标、异常趋势和待跟进事项，方便快速浏览支持团队的当前状态。下一步可以直接打开输出面板核对文件结构。",
  "# Support dashboard": "# 支持仪表板",
  "Support dashboard": "支持仪表板",
  "Summarize the attached support report.": "总结附加的支持报告。",
  "Quarterly support report": "季度支持报告",
  "The largest issue is login failure, followed by billing confusion and delayed exports.": "最大的问题是登录失败，其次是账单困惑和导出延迟。",
  "Compare the three proposals.": "比较三个方案。",
  "I compared price, implementation risk, and support coverage.": "我比较了价格、实施风险和支持覆盖。",
  "Proposal B has the best balance of cost and delivery risk.": "方案 B 在成本和交付风险之间最平衡。",
  "Run the release checks.": "运行发布检查。",
  "Run release checks · release-tools (MCP)": "运行发布检查 · release-tools (MCP)",
  "Patch SearchInput.tsx.": "修改 SearchInput.tsx。",
  "Patch SearchInput.tsx": "修改 SearchInput.tsx",
  "Read SearchInput.tsx": "读取 SearchInput.tsx",
  "Inspect SearchInput.tsx.": "检查 SearchInput.tsx。",
  "Reading file": "正在读取文件",
  "Inspect the uploaded chart image.": "查看上传的图表图片。",
  "Reading image": "正在读取图片",
  "Modify SearchInput.tsx.": "修改 SearchInput.tsx。",
  "Edit SearchInput.tsx.": "编辑 SearchInput.tsx。",
  "Modifying file": "正在修改文件",
  "Editing file": "正在编辑文件",
  "Validate SearchInput behavior.": "验证 SearchInput 行为。",
  "Validating": "正在验证",
  "Find references to useSearch.": "查找 useSearch 的引用。",
  "Searching": "正在搜索",
  "Run the SearchInput test suite.": "运行 SearchInput 测试集。",
  "Running command": "正在运行命令",
  "Run the build command.": "运行构建命令。",
  "Cancelled running command npm run build": "取消运行命令 npm run build",
  "Inspect the project instructions before editing.": "编辑前先查看项目说明。",
  "Read project instructions": "读取项目说明",
  "Allow reading AGENTS.md before editing?": "允许编辑前读取 AGENTS.md？",
  "This session was deleted.": "此 Session 已删除。",
  "Session deleted": "Session 已删除",
  "Context compacted": "上下文已压缩",
  "Dispatch became active": "调度已激活",
  "Automatic retry scheduled": "已安排自动重试",
  "Session entered a terminal state": "Session 进入终止状态",
  "Waiting for your action": "等待你的操作",
  "Writing dashboard file": "正在写入仪表板文件",
  "Checking command safety": "检查命令安全性",
  "Checking failure state": "检查失败状态",
  "Checking git preview": "检查 Git 预览",
  "Remove temp cache": "移除临时缓存",
  "Remove .agent/tmp-cache recursively?": "递归移除 .agent/tmp-cache？",
  "Approve or reject the simulated tool call in the preview UI.": "在预览 UI 中批准或拒绝模拟工具调用。",
  "Continue after approval": "审批后继续",
  "Error state UI preview": "错误状态 UI 预览",
  "Preview fixture could not be loaded.": "预览 fixture 无法加载。",
  "The preview runner hit a simulated local error.": "预览运行器遇到模拟本地错误。",
  "Mock preview runner intentionally emitted an error state.": "模拟预览运行器有意输出错误状态。",
  "Pure frontend error-state scenario completed without external IO.": "纯前端错误状态场景已完成，没有外部 IO。",
  "Inspect saved UI/UX config": "检查已保存的 UI/UX 配置",
  "Reads the saved AgentCanvas schema in memory.": "从内存读取已保存的 AgentCanvas schema。",
  "local config only": "仅本地配置",
  "No harness/provider call": "没有 harness/provider 调用",
  "Used saved UI/UX config": "使用已保存的 UI/UX 配置",
  "Pure frontend preview completed.": "纯前端预览已完成。",
  "Long reasoning preview completed.": "长思考预览已完成。",
  "Git diff preview completed.": "Git diff 预览已完成。",
  "Reviewing the saved layout regions, composer controls, and output surface. ": "正在检查已保存的布局区域、输入区控件和输出界面。",
  "Checking how collapsed reasoning, summary order, and long text wrapping behave. ": "正在检查推理折叠、摘要顺序和长文本换行表现。",
  "Long reasoning preview finished after multiple local reasoning updates.": "多段本地推理更新后，长思考预览已完成。",
  "Preparing a mock diff artifact for the Git and output panels. No repository operation is executed.": "正在为 Git 和输出面板准备模拟 diff 产物，不会执行仓库操作。",
  // Live LLM simulated tool calls (`preview-runner/liveToolSimulator.ts`).
  "Approve the simulated tool call? Live LLM preview does not execute tools.": "允许这次模拟工具调用？Live LLM 预览不会真正执行工具。",
  "Live LLM chat preview completed. Tool calls were simulated, not executed.": "Live LLM 对话预览已完成。工具调用为模拟，未真正执行。",
  "The model sent tool arguments that could not be read.": "模型发送的工具参数无法解析。",
  "This tool has no simulated result in live preview.": "该工具在实时预览中没有对应的模拟结果。",
  "The model asked to run a command but did not provide one.": "模型请求执行命令，但没有提供命令内容。",
  // Deliberately no entries for `resultPreview` values ("6 lines", "2 locations") or for the
  // simulated result bodies. `localizePreviewText` rewrites substrings across every entry, so a
  // short generic word added here would be swapped inside unrelated copy. The replay fixtures
  // leave the same previews in English, so this matches rather than regresses them.
};

export type LocalizePreviewOptions = {
  /**
   * Whether assistant message text goes through the dictionary.
   *
   * The dictionary is a substring rewriter over fixture copy, which is exactly right for the
   * bundled demo and wrong for a live model's prose: a reply that happens to contain "Thinking"
   * or "lines" would get those words swapped mid-sentence. Live preview therefore localizes the
   * chrome the configurator authored — tool titles, approval prompts, previews, error copy —
   * and leaves the model's own words alone.
   */
  localizeMessageText?: boolean;
};

const AUTHORED_TEXT_KEYS = [
  "title",
  "summary",
  "label",
  "preview",
  "argsText",
  "message",
  "userMessage",
  "developerMessage",
] as const;

const MESSAGE_TEXT_KEYS = ["text", "content"] as const;

export function localizePreviewText(value: string | undefined, locale: AppLocale): string | undefined {
  if (!value || locale === "en") {
    return value;
  }
  let localized = previewTextZh[value] ?? value;
  for (const [source, target] of Object.entries(previewTextZh)) {
    if (localized.includes(source)) {
      localized = localized.split(source).join(target);
    }
  }
  return localized;
}

export function localizeTimelineItem(
  item: unknown,
  locale: AppLocale,
  options: LocalizePreviewOptions = {},
): unknown {
  if (locale === "en" || !item || typeof item !== "object" || Array.isArray(item)) {
    return item;
  }
  const localizeMessageText = options.localizeMessageText ?? true;
  const keys = localizeMessageText
    ? [...AUTHORED_TEXT_KEYS, ...MESSAGE_TEXT_KEYS]
    : AUTHORED_TEXT_KEYS;
  const next: Record<string, unknown> = { ...(item as Record<string, unknown>) };
  for (const key of keys) {
    if (typeof next[key] === "string") {
      next[key] = localizePreviewText(next[key] as string, locale);
    }
  }
  if (next.approval && typeof next.approval === "object") {
    const approval = next.approval as Record<string, unknown>;
    next.approval = {
      ...approval,
      prompt: typeof approval.prompt === "string" ? localizePreviewText(approval.prompt, locale) : approval.prompt,
    };
  }
  return next;
}

export function localizePreviewViewModel<T extends { title?: string; timeline: readonly unknown[] }>(
  viewModel: T,
  locale: AppLocale,
  options: LocalizePreviewOptions = {},
): T {
  if (locale === "en") {
    return viewModel;
  }
  return {
    ...viewModel,
    title: localizePreviewText(viewModel.title, locale),
    timeline: viewModel.timeline.map((item) => localizeTimelineItem(item, locale, options)),
  } as T;
}

import type { ExperiencePresetGroup } from "@agentmatrix/agentcanvas-contract";

import type { AgentCanvasLocale } from "./types.js";

type PresetTranslation = { label: string; description: string };

const groupLabels: Record<string, string> = {
  layout: "布局",
  conversation: "对话",
  sidebar: "侧边栏",
  "ux-effects": "思考",
  "tool-calls": "工具调用",
  blocks: "内容块",
  composer: "输入框",
  output: "输出",
  render: "渲染",
  theme: "主题",
};

const optionCopy: Record<string, PresetTranslation> = {
  "sidebar-visible": {
    label: "显示侧边栏",
    description: "在对话旁显示会话导航。",
  },
  "output-visible": {
    label: "显示输出面板",
    description: "在受限区域展示生成的产物。",
  },
  "git-visible": {
    label: "Git 状态",
    description: "在输出区域显示只读 Git 状态。",
  },
  "debug-visible": {
    label: "调试面板",
    description: "在主界面下方显示开发诊断。",
  },
  "writing-smooth": {
    label: "平滑输出",
    description: "以稳定节奏呈现 Agent 文本。",
  },
  "writing-typewriter": {
    label: "打字机",
    description: "按字符节奏呈现文本。",
  },
  "writing-chunked": { label: "分块输出", description: "按易读短语分块呈现。" },
  "speaker-labels": {
    label: "说话者标签",
    description: "显示用户和 Agent 标签。",
  },
  "message-actions": {
    label: "消息操作",
    description: "显示复制、重新生成和编辑操作。",
  },
  "sidebar-new-button": {
    label: "新建会话按钮",
    description: "显示新建会话入口。",
  },
  "sidebar-search": { label: "搜索框", description: "显示会话搜索。" },
  "sidebar-grouping": {
    label: "按日期分组",
    description: "按时间对会话分组。",
  },
  "sidebar-footer": {
    label: "底部状态",
    description: "显示弱化的侧边栏状态。",
  },
  "thinking-wave": {
    label: "动态圆点",
    description: "使用动态圆点表示正在思考。",
  },
  "thinking-pulse": {
    label: "脉冲扫描",
    description: "使用紧凑的思考扫描效果。",
  },
  "thinking-terminal": {
    label: "终端光标",
    description: "使用控制台风格的进度。",
  },
  "thinking-minimal": {
    label: "极简状态",
    description: "显示安静的单行状态。",
  },
  "thinking-shimmer": {
    label: "微光文字",
    description: "在状态文字上显示轻微扫光。",
  },
  "thinking-bars": { label: "波形条", description: "显示小型动态波形。" },
  "thinking-orbit": {
    label: "环绕圆点",
    description: "显示紧凑的环绕加载效果。",
  },
  "summary-first": {
    label: "摘要优先",
    description: "先显示安全摘要，再显示工具和代码详情。",
  },
  "reasoning-auto-collapse": {
    label: "自动折叠",
    description: "完成后保持思考摘要紧凑。",
  },
  "reasoning-expanded": {
    label: "默认展开",
    description: "默认展开安全的思考摘要。",
  },
  "reasoning-status-only": {
    label: "仅状态",
    description: "只显示公开执行状态。",
  },
  "reasoning-public-summary": {
    label: "公开摘要",
    description: "显示安全摘要，不展示隐藏思维链。",
  },
  "command-cards": {
    label: "命令卡片",
    description: "使用可展开卡片显示生命周期和安全详情。",
  },
  "compact-chips": {
    label: "紧凑标签",
    description: "以内联标签显示工具状态。",
  },
  "timeline-rail": { label: "时间线", description: "按顺序显示工具活动。" },
  "terminal-log": {
    label: "终端抽屉",
    description: "在受限抽屉中显示命令输出。",
  },
  "tool-detail-full": {
    label: "输入和输出",
    description: "显示安全参数和可见结果。",
  },
  "tool-detail-output-only": { label: "仅输出", description: "隐藏工具参数。" },
  "tool-detail-summary": { label: "仅摘要", description: "只保留紧凑预览。" },
  "tool-progress-icon": {
    label: "状态图标",
    description: "使用生命周期图标。",
  },
  "tool-progress-bar": { label: "进度条", description: "显示紧凑的进度条。" },
  "tool-approval-inline": {
    label: "内联审批",
    description: "在工具卡片内显示审批操作。",
  },
  "tool-approval-hidden": {
    label: "外部审批",
    description: "在工具详情之外处理审批。",
  },
  "code-diff": {
    label: "代码差异",
    description: "优先使用差异渲染器显示补丁。",
  },
  "tool-log-tail": {
    label: "日志尾部",
    description: "显示长工具日志的紧凑尾部。",
  },
  "error-collapse": {
    label: "折叠错误",
    description: "将调试详情移出主对话。",
  },
  upload: { label: "上传", description: "允许添加文件附件。" },
  mic: { label: "语音", description: "添加可选语音输入。" },
  budget: { label: "思考预算", description: "显示思考预算控制。" },
  "model-tools": {
    label: "模型和工具",
    description: "显示不含凭据的模型与工具控制。",
  },
  "prompt-shortcuts": {
    label: "提示词快捷项",
    description: "提供可复用的提示词快捷项。",
  },
  "output-source-artifact": {
    label: "最新产物",
    description: "使用最新产物作为输出。",
  },
  "output-source-console": {
    label: "控制台日志",
    description: "使用可见的运行和工具输出。",
  },
  "surface-right-panel": {
    label: "右侧面板",
    description: "在受限右侧面板中显示输出。",
  },
  "surface-overlay": { label: "浮层", description: "在聚焦浮层中打开输出。" },
  "renderer-auto": {
    label: "自动渲染",
    description: "根据产物元数据选择渲染器。",
  },
  "renderer-code": { label: "代码", description: "渲染源代码。" },
  "renderer-diff": { label: "差异", description: "使用稳定行号渲染补丁。" },
  "renderer-markdown": {
    label: "Markdown 文档",
    description: "渲染结构化文档。",
  },
  "renderer-preview": {
    label: "HTML / 应用预览",
    description: "渲染可视化输出。",
  },
  "renderer-data": { label: "数据 / 表单", description: "渲染结构化数据。" },
  "console-light": { label: "明亮控制台", description: "中性的明亮产品界面。" },
  graphite: { label: "石墨灰", description: "深色运维界面。" },
  oxide: { label: "暖色工作台", description: "带稳重操作色的暖色界面。" },
  "studio-neutral": { label: "冷灰工作室", description: "冷色中性产品界面。" },
  "paper-trail": { label: "纸张质感", description: "编辑式纸张色调界面。" },
  "terminal-green": { label: "终端绿", description: "深色控制台界面。" },
};

export function localizedPresetGroups(
  groups: ExperiencePresetGroup[],
  locale: AgentCanvasLocale,
): ExperiencePresetGroup[] {
  if (locale !== "zh-CN") return groups;
  return groups.map((group) => ({
    ...group,
    label: groupLabels[group.id] ?? group.label,
    options: group.options.map((option) => ({
      ...option,
      ...(optionCopy[option.id] ?? {}),
    })),
  }));
}

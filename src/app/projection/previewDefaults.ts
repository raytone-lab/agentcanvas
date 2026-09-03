import type { Scenario, ScenarioId } from "../../agentmatrix";
import type { AppLocale } from "../../i18n/uiCopy";
import type { GitPreviewState, PreviewScenarioId } from "../../preview-runner/PreviewRunner";

const defaultPreviewPrompt = {
  en: "Add validation to the search input and show a loading state while results are fetched.",
  zh: "给搜索框加校验，并在获取结果时显示加载状态。",
  ja: "検索欄にバリデーションを追加し、結果の取得中はローディング状態を表示してください。",
} satisfies Record<AppLocale, string>;

export const livePreviewFallbackPrompt = {
  en: "Test this AgentCanvas UI/UX.",
  zh: "测试这个 AgentCanvas UI/UX。",
  ja: "この AgentCanvas の UI/UX をテストします。",
} satisfies Record<AppLocale, string>;

export const piConfigurationFailureCopy = {
  en: "Pi could not start the selected model. Reopen model settings and check the API key, Base URL, and model name.",
  zh: "Pi 无法启动所选模型。请重新打开模型设置，检查 API Key、Base URL 和模型名称。",
  ja: "Pi は選択したモデルを起動できませんでした。モデル設定を開き、API キー、Base URL、モデル名を確認してください。",
} satisfies Record<AppLocale, string>;

const standardScenarioCopy: Record<ScenarioId, { title: Record<AppLocale, string>; summary: Record<AppLocale, string> }> = {
  "normal-turn": {
    title: { en: "Normal turn", zh: "普通回合", ja: "通常のターン" },
    summary: { en: "User message with a file reference and one final agent answer.", zh: "用户消息包含文件引用，Agent 给出最终回答。", ja: "ファイル参照を含むユーザーメッセージと、Agent の最終回答が 1 件。" },
  },
  "streamed-message": {
    title: { en: "Streaming thinking + message", zh: "流式思考 + 消息", ja: "ストリーミング思考 + メッセージ" },
    summary: { en: "Live deltas preview a thinking block and message, then durable Events replace them.", zh: "实时增量预览思考块和消息，随后由持久事件替换。", ja: "ライブの差分が思考ブロックとメッセージを先に見せ、その後に永続イベントが置き換えます。" },
  },
  "tool-approval": {
    title: { en: "Tool approval + completion", zh: "工具审批 + 完成", ja: "ツールの承認 + 完了" },
    summary: { en: "A native write pauses for confirmation, is allowed once, and completes with a diff.", zh: "原生写入暂停等待确认，允许一次后完成并生成 diff。", ja: "ネイティブの書き込みが確認のため一旦止まり、今回だけ許可され、差分付きで完了します。" },
  },
  "mcp-and-interrupt": {
    title: { en: "MCP success + interrupt", zh: "MCP 成功 + 打断", ja: "MCP 成功 + 中断" },
    summary: { en: "An MCP call returns a terminal reference; a later pending call is interrupted.", zh: "MCP 调用返回终端引用，后续待处理调用被打断。", ja: "MCP 呼び出しが終端の参照を返し、その後の保留中の呼び出しが中断されます。" },
  },
  "runtime-lifecycle": {
    title: { en: "Runtime boot + sync", zh: "Runtime 启动 + 同步", ja: "Runtime 起動 + 同期" },
    summary: { en: "Runtime status and one folded progress operation, plus an optional-resource warning.", zh: "Runtime 状态、折叠进度操作，以及可选资源 warning。", ja: "ランタイムの状態と折りたたまれた進行中の操作 1 件、加えて任意リソースの警告。" },
  },
  "retrying-incident": {
    title: { en: "Retrying incident", zh: "重试中的事件", ja: "リトライ中の障害" },
    summary: { en: "A rate-limit error auto-reschedules; the incident resolves on recovery.", zh: "限流错误自动重新调度，恢复后事件解决。", ja: "レート制限のエラーが自動で再スケジュールされ、復旧すると障害は解消します。" },
  },
  "exhausted-incident": {
    title: { en: "Exhausted incident", zh: "重试耗尽事件", ja: "リトライ上限の障害" },
    summary: { en: "Retries exhausted but the Session stays usable for a new turn.", zh: "重试耗尽，但 Session 仍可用于新回合。", ja: "リトライ上限に達しても、セッションは次のターンに使えるままです。" },
  },
  "terminal-incident": {
    title: { en: "Terminal incident", zh: "终止事件", ja: "停止した障害" },
    summary: { en: "An unrecoverable runtime resume terminates the Session; composer is read-only.", zh: "不可恢复的 runtime 恢复错误会终止 Session，输入区只读。", ja: "回復不能なランタイム再開でセッションが終了し、入力欄は読み取り専用になります。" },
  },
  "diagnostics-and-update": {
    title: { en: "Config, spans, deletion", zh: "配置、span、删除", ja: "設定・span・削除" },
    summary: { en: "Configuration audit, compaction, paired model spans, and session deletion.", zh: "配置审计、上下文压缩、模型 span 配对和 Session 删除。", ja: "設定の監査、コンパクション、対になるモデル span、セッションの削除。" },
  },
};

const previewScenarioLabels: Record<PreviewScenarioId, Record<AppLocale, string>> = {
  "simple-chat": { en: "Simple chat", zh: "简单对话", ja: "シンプルなチャット" },
  "coding-with-artifact": { en: "Coding with artifact", zh: "编码 + 产物", ja: "コーディング + アーティファクト" },
  "image-generation": { en: "Image generation", zh: "生成图片", ja: "画像生成" },
  "audio-generation": { en: "Audio generation", zh: "生成音频", ja: "音声生成" },
  "video-generation": { en: "Video generation", zh: "生成视频", ja: "動画生成" },
  "tool-approval": { en: "Tool approval", zh: "工具审批", ja: "ツールの承認" },
  "error-state": { en: "Error state", zh: "错误状态", ja: "エラー状態" },
  "long-reasoning": { en: "Long reasoning", zh: "长思考", ja: "長い推論" },
  "git-diff-preview": { en: "Git diff preview", zh: "Git diff 预览", ja: "Git 差分のプレビュー" },
};

export function defaultPreviewPromptForLocale(locale: AppLocale): string {
  return defaultPreviewPrompt[locale];
}

export function standardScenarioTitle(scenario: Scenario, locale: AppLocale): string {
  return standardScenarioCopy[scenario.id]?.title[locale] ?? scenario.title;
}

export function standardScenarioSummary(scenario: Scenario, locale: AppLocale): string {
  return standardScenarioCopy[scenario.id]?.summary[locale] ?? scenario.summary;
}

export function previewScenarioLabel(scenario: { id: PreviewScenarioId; label: string }, locale: AppLocale): string {
  return previewScenarioLabels[scenario.id]?.[locale] ?? scenario.label;
}

export function formatCopy(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export const liveLlmGitPreviewState: GitPreviewState = {
  branch: "live-llm-chat",
  status: "committed",
  ahead: 0,
  changedFiles: [],
  changedFileCount: 0,
  diffTitle: "LiveLlmChat.diff",
  suggestedCommitMessage: "No git changes in Live LLM chat",
  mockOnly: true,
  pushEnabled: false,
};

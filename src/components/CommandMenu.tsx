import { Command } from "cmdk";
import { Search } from "lucide-react";

import { useCopy, useLocale } from "../i18n/LocaleContext";
import type { AppLocale } from "../i18n/uiCopy";
import type { PreviewFixtureId } from "../preview/fixtures";
import { previewFixtures } from "../preview/fixtures";

const fixtureCopy: Record<PreviewFixtureId, { label: Record<AppLocale, string>; description: Record<AppLocale, string> }> = {
  "coding-agent": {
    label: { en: "Coding Agent", zh: "编码 Agent", ja: "コーディング Agent" },
    description: { en: "Completed coding run with reasoning, tools, artifact, and final output.", zh: "包含推理、工具、产物和最终输出的完整编码运行。", ja: "推論・ツール・アーティファクト・最終出力を含む、完了したコーディング実行。" },
  },
  "basic-text": {
    label: { en: "Basic text", zh: "基础文本", ja: "基本テキスト" },
    description: { en: "Minimal assistant text run.", zh: "最简单的助手文本运行。", ja: "最小構成のアシスタントテキスト実行。" },
  },
  "reasoning-kinds": {
    label: { en: "Reasoning kinds", zh: "推理类型", ja: "推論の種類" },
    description: { en: "Public summary, provider thinking, and private reasoning policy.", zh: "公开摘要、provider thinking 与私有推理策略。", ja: "公開用の要約、provider thinking、非公開の推論ポリシー。" },
  },
  "tool-approval": {
    label: { en: "Tool approval", zh: "工具审批", ja: "ツールの承認" },
    description: { en: "rm approval plus fetch lifecycle states.", zh: "rm 审批以及 fetch 生命周期状态。", ja: "rm の承認と fetch のライフサイクル状態。" },
  },
  "block-error": {
    label: { en: "Error block", zh: "错误区块", ja: "エラーブロック" },
    description: { en: "Recoverable run error with collapsed debug detail.", zh: "带折叠调试详情的可恢复运行错误。", ja: "デバッグ詳細を折りたたんだ、回復可能な実行エラー。" },
  },
  "artifact-action": {
    label: { en: "Artifact action", zh: "产物操作", ja: "アーティファクトの操作" },
    description: { en: "Artifact creation and action correlation.", zh: "产物创建与操作关联。", ja: "アーティファクトの生成と操作の対応付け。" },
  },
  "capability-filesystem": {
    label: { en: "Capability tray", zh: "能力托盘", ja: "ケイパビリティトレイ" },
    description: { en: "Capability attached event for the utility panel.", zh: "工具面板中的能力附加事件。", ja: "ユーティリティパネル向けのケイパビリティ付与イベント。" },
  },
};

function fixtureLabel(fixture: { id: PreviewFixtureId; label: string }, locale: AppLocale): string {
  return fixtureCopy[fixture.id]?.label[locale] ?? fixture.label;
}

function fixtureDescription(fixture: { id: PreviewFixtureId; description: string }, locale: AppLocale): string {
  return fixtureCopy[fixture.id]?.description[locale] ?? fixture.description;
}

export function CommandMenu({
  open,
  onOpenChange,
  onSelectFixture,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectFixture: (fixture: PreviewFixtureId) => void;
}) {
  const copy = useCopy();
  const { locale } = useLocale();

  if (!open) {
    return null;
  }

  return (
    <div className="command-backdrop" onMouseDown={() => onOpenChange(false)}>
      <Command className="command-menu" onMouseDown={(event) => event.stopPropagation()}>
        <div className="command-input-row">
          <Search size={16} />
          <Command.Input autoFocus placeholder={copy.shell.commandMenu.placeholder} />
        </div>
        <Command.List>
          <Command.Empty>{copy.shell.commandMenu.empty}</Command.Empty>
          <Command.Group heading={copy.shell.commandMenu.replayFixtures}>
            {previewFixtures.map((fixture) => {
              const label = fixtureLabel(fixture, locale);
              return (
                <Command.Item
                  key={fixture.id}
                  value={label}
                  onSelect={() => {
                    onSelectFixture(fixture.id);
                    onOpenChange(false);
                  }}
                >
                  <span>{label}</span>
                  <small>{fixtureDescription(fixture, locale)}</small>
                </Command.Item>
              );
            })}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}

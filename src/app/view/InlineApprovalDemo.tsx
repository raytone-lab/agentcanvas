import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";

import { InlineApprovalPrompt } from "../../components/agent-preview/ChatFrame";
import { previewCopy } from "../../i18n/copy/preview";
import type { AppLocale } from "../../i18n/uiCopy";

export function findPendingApprovalTool(timeline: readonly unknown[]): AgentUXToolTimelineItem | undefined {
  return timeline.find((item): item is AgentUXToolTimelineItem => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const record = item as Record<string, unknown>;
    return record.kind === "tool" && record.status === "awaiting_approval" && Boolean(record.approval);
  });
}

export function demoApprovalTool(locale: AppLocale): AgentUXToolTimelineItem {
  return {
    kind: "tool",
    id: "composer-external-approval-demo",
    name: "read_file",
    title: previewCopy[locale].approvalDemo.toolTitle,
    status: "awaiting_approval",
    approval: {
      prompt: previewCopy[locale].approvalDemo.prompt,
      argsPreview: { path: "AGENTS.md" },
    },
  } as AgentUXToolTimelineItem;
}

export function InlineApprovalDemo({ locale, onDismiss }: { locale: AppLocale; onDismiss: () => void }) {
  const c = previewCopy[locale].inlineApproval;
  return (
    <InlineApprovalPrompt
      ariaLabel={c.ariaLabel}
      kicker={c.kicker}
      question={c.question}
      options={c.options.map((option, index) => ({
        id: `${index}:${option.title}`,
        title: option.title,
        body: option.body,
        answerPlaceholder: index === c.options.length - 1,
      }))}
      hint={c.hint}
      secondaryLabel={c.ignore}
      primaryLabel={c.continueLabel}
      onSecondary={onDismiss}
      onPrimary={onDismiss}
    />
  );
}

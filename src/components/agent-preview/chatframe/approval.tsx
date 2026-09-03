import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";
import { useState } from "react";

import { StateIcon, type IconSlot } from "../../../agentmatrix";
import { useCopy } from "../../../i18n/LocaleContext";
import type { UiCopy } from "../../../i18n/uiCopy";
import type { ApprovalDecision } from "../ToolCallCard";

export type InlineApprovalPromptOption = {
  id: string;
  title: string;
  body?: string;
  answerPlaceholder?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
};

export function InlineApprovalPrompt({
  ariaLabel,
  kicker,
  question,
  options,
  hint,
  secondaryLabel,
  primaryLabel,
  pending = false,
  approvalSurface,
  onSecondary,
  onPrimary,
}: {
  ariaLabel: string;
  kicker: string;
  question: string;
  options: readonly InlineApprovalPromptOption[];
  hint: string;
  secondaryLabel: string;
  primaryLabel: string;
  pending?: boolean;
  approvalSurface?: "inline";
  onSecondary?: () => void;
  onPrimary?: () => void;
}) {
  const [answer, setAnswer] = useState("");

  return (
    <aside
      className="inline-approval-panel"
      data-approval-surface={approvalSurface}
      data-preview-anchor="external-approval"
      aria-label={ariaLabel}
      aria-busy={pending}
    >
      <div className="inline-approval-head">
        <div>
          <span>{kicker}</span>
          <strong>{question}</strong>
        </div>
      </div>

      <ol className="inline-approval-options">
        {options.map((option, index) => (
          <li
            key={option.id}
            data-placeholder={option.answerPlaceholder ? "true" : undefined}
            data-interactive={option.onSelect ? "true" : undefined}
          >
            <span className="inline-approval-option-index">{index + 1}.</span>
            {option.answerPlaceholder ? (
              <input
                className="inline-approval-answer"
                type="text"
                value={answer}
                placeholder={option.title}
                aria-label={option.title}
                onChange={(event) => setAnswer(event.target.value)}
              />
            ) : option.onSelect ? (
              <button
                type="button"
                className="inline-approval-option-button"
                data-approval-action={option.id}
                disabled={pending || option.disabled}
                onClick={option.onSelect}
              >
                <strong>{option.title}</strong>
                {option.body ? <span>{option.body}</span> : null}
              </button>
            ) : (
              <div>
                <strong>{option.title}</strong>
                {option.body ? <span>{option.body}</span> : null}
              </div>
            )}
          </li>
        ))}
      </ol>

      <footer className="inline-approval-footer">
        <span>
          <span className="inline-approval-info" aria-hidden="true">i</span>
          {hint}
        </span>
        <div>
          <button
            type="button"
            className="inline-approval-secondary"
            disabled={pending}
            onClick={onSecondary}
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            className="inline-approval-primary"
            disabled={pending}
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
        </div>
      </footer>
    </aside>
  );
}

export function InlineApprovalSurface({
  tool,
  onConfirm,
}: {
  tool: AgentUXToolTimelineItem;
  onConfirm?: (decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const [pending, setPending] = useState(false);
  const choices = approvalChoices(copy);
  const prompt = tool.approval?.prompt ?? copy.chat.approval.promptFallback;

  async function confirm(decision: ApprovalChoice) {
    if (pending) return;
    setPending(true);
    try {
      await onConfirm?.(decision);
    } catch {
      // The owner reports transport failures. Leave the prompt mounted and enabled for retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <InlineApprovalPrompt
      ariaLabel={copy.chat.approval.actionsLabel}
      kicker={copy.chat.approval.permissionRequired}
      question={prompt}
      options={choices.map((choice) => ({
        id: choice.id,
        title: choice.label,
        body: choice.hint,
        onSelect: () => void confirm(choice.id),
      }))}
      hint={copy.chat.approval.chooseHint}
      secondaryLabel={copy.chat.approval.no}
      primaryLabel={copy.chat.approval.yes}
      pending={pending}
      approvalSurface="inline"
      onSecondary={() => void confirm("no")}
      onPrimary={() => void confirm("yes")}
    />
  );
}

export function ExternalApprovalSurface({
  tool,
  approvalIconSlot,
  onConfirm,
}: {
  tool: AgentUXToolTimelineItem;
  approvalIconSlot?: IconSlot;
  onConfirm?: (decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const [selected, setSelected] = useState<ApprovalChoice>("yes");
  const choices = approvalChoices(copy);
  // Same precedence as the inline card: the backend's own question, else the dictionary's.
  const prompt = tool.approval?.prompt ?? copy.chat.approval.promptFallback;
  return (
    <aside
      className="external-approval-panel"
      data-approval-surface="external"
      data-preview-anchor="external-approval"
      aria-label={copy.chat.approval.externalLabel}
    >
      <div className="external-approval-head">
        <div>
          <span className="external-approval-title-row">
            {approvalIconSlot ? (
              <span className="external-approval-title-icon" aria-hidden="true">
                <StateIcon slot={approvalIconSlot} size={15} />
              </span>
            ) : null}
            <strong>{copy.chat.approval.permissionRequired}</strong>
          </span>
        </div>
        <small>{tool.title ?? tool.name}</small>
      </div>

      <p className="external-approval-prompt">{prompt}</p>

      <div className="external-approval-command">
        <code>{formatApprovalCommand(tool)}</code>
        <span>{copy.chat.approval.noOutput}</span>
      </div>

      <div className="external-approval-options" aria-label={copy.chat.approval.actionsLabel}>
        {choices.map((choice, index) => (
          <button
            key={choice.id}
            type="button"
            data-approval-action={choice.id}
            data-selected={selected === choice.id}
            onClick={() => setSelected(choice.id)}
          >
            <span className="external-approval-index">{index + 1}.</span>
            <span className="external-approval-option-copy">
              <strong>{choice.label}</strong>
              <span>{choice.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="external-approval-footer">
        <span>
          {copy.chat.approval.chooseHint}
        </span>
        <button
          type="button"
          className="external-approval-confirm"
          onClick={() => void Promise.resolve(onConfirm?.(selected)).catch(() => undefined)}
        >
          {copy.chat.approval.confirm}
        </button>
      </div>
    </aside>
  );
}

export function isPendingApprovalTool(item: AgentUXToolTimelineItem): item is AgentUXToolTimelineItem {
  return item.status === "awaiting_approval" && Boolean(item.approval);
}

type ApprovalChoice = ApprovalDecision;

function approvalChoices(copy: UiCopy): Array<{ id: ApprovalChoice; label: string; hint: string }> {
  return [
    {
      id: "yes",
      label: copy.chat.approval.yes,
      hint: copy.chat.approval.hints.yes,
    },
    {
      id: "always",
      label: copy.chat.approval.always,
      hint: copy.chat.approval.hints.always,
    },
    {
      id: "no",
      label: copy.chat.approval.no,
      hint: copy.chat.approval.hints.no,
    },
  ];
}

function formatApprovalCommand(tool: AgentUXToolTimelineItem): string {
  const args = toPlainRecord(tool.approval?.argsPreview);
  const command = stringFromRecord(args, "cmd") || stringFromRecord(args, "command");
  if (command) {
    return `$ ${command}`;
  }

  if ((tool.name === "rm" || tool.name === "filesystem.rm") && args) {
    const path = stringFromRecord(args, "path");
    const recursive = args.recursive === true;
    const force = args.force === true;
    const flags = `${recursive ? "r" : ""}${force ? "f" : ""}`;
    return `$ rm ${flags ? `-${flags} ` : ""}${path || ""}`.trim();
  }

  if (tool.argsText) {
    return `$ ${tool.argsText}`;
  }

  if (args) {
    return JSON.stringify(args, null, 2);
  }

  return `$ ${tool.name}`;
}

function toPlainRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function stringFromRecord(value: Record<string, unknown> | undefined, key: string): string {
  const item = value?.[key];
  return typeof item === "string" ? item : "";
}

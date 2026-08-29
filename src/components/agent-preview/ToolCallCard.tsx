import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";

import { StateIcon, type IconSlot } from "../../agentmatrix";
import { useCopy, useLocale } from "../../i18n/LocaleContext";
import { chatCopy } from "../../i18n/copy/chat";
import { APP_LOCALES, type AppLocale } from "../../i18n/locales";
import { buildToolDisplaySpec, type DisplayBlock } from "../../runtime/toolDisplaySpec";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { deriveDisclosureOpen } from "./disclosureState";
import type { OutputPanelItem, OutputPanelOpenRequest } from "./OutputFrame";

export function ToolCallCard({
  project,
  tool,
  showDebugBadges = false,
  onOpenArtifact,
  forceOpen = false,
  collapseSignal = 0,
  onApprovalDecision,
}: {
  project: AgentFrontendProject;
  tool: AgentUXToolTimelineItem;
  showDebugBadges?: boolean;
  onOpenArtifact?: (artifact: OutputPanelOpenRequest) => void;
  forceOpen?: boolean;
  collapseSignal?: number;
  onApprovalDecision?: (toolCallId: string, decision: ApprovalDecision) => void | Promise<void>;
}) {
  const copy = useCopy();
  const { locale } = useLocale();
  const desiredOpen = tool.open || tool.status === "running" || tool.status === "awaiting_approval";
  const [open, setOpen] = useState(desiredOpen);
  const userToggledRef = useRef(false);
  const spec = useMemo(() => buildToolDisplaySpec(tool), [tool]);
  const pendingApproval = tool.status === "awaiting_approval" ? tool.approval : undefined;
  const toolStyle = project.theme.motion.toolCall;
  const hasTimelineRail = project.toolCalls.timelineRail;
  const detailMode = project.toolCalls.detail;
  const titleParts = splitToolTitle(tool.title ?? tool.name, pathFromTool(tool));
  const toolAction = resolveToolAction(tool);
  const runningAction = toolAction;
  const fileAction = resolveToolFileAction(tool, titleParts);
  const fileReferences = fileAction ? buildToolFileReferences(tool, fileAction, locale, titleParts) : [];
  const hasFileReferences = fileReferences.length > 0;
  const inputBlock = !hasFileReferences && detailMode === "full" ? spec.inputBlock : undefined;
  const outputBlock = !hasFileReferences && (detailMode === "full" || detailMode === "output-only") ? spec.outputBlock : undefined;
  const approval = project.toolCalls.approval === "inline" ? pendingApproval : undefined;
  const showApproval = Boolean(approval);
  const shouldForceOpen = forceOpen || toolStyle === "expanded" || hasTimelineRail;
  const hideDisclosure = toolStyle === "expanded";
  const bodyHasContent = detailMode !== "summary" && Boolean(inputBlock || outputBlock || showApproval || hasFileReferences);
  const renderedOpen = shouldForceOpen || open;
  const showProgress = project.toolCalls.progress === "bar";
  const hasExplicitRunningTitle = Boolean(tool.title && isExplicitRunningToolTitle(tool.title));
  const hasActiveRunningTitle = Boolean(tool.title && isActiveRunningToolTitle(tool.title));
  const showHeaderPreview = !hasFileReferences && !hasExplicitRunningTitle;
  const headerPreview = tool.status === "awaiting_approval" && spec.inputBlock
    ? displayBlockSummary(spec.inputBlock, copy.chat.toolCard.fallbackTitle)
    : toolAction
      ? toolActionPreview(tool, toolAction)
    : tool.preview ?? tool.argsText ?? copy.chat.toolCard.fallbackTitle;
  const headerTitle = hasExplicitRunningTitle && tool.title
    ? tool.title
    : runningAction
      ? runningToolActionLabel(runningAction, locale)
    : fileAction
      ? tool.title ?? fileActionHeaderLabel(fileAction, locale)
      : tool.title ?? tool.name;

  useEffect(() => {
    userToggledRef.current = false;
    setOpen(desiredOpen);
  }, [tool.id, desiredOpen]);

  useEffect(() => {
    setOpen((currentOpen) =>
      deriveDisclosureOpen({
        desiredOpen,
        currentOpen,
        userToggled: userToggledRef.current,
      }),
    );
  }, [desiredOpen]);

  useEffect(() => {
    if (forceOpen) {
      userToggledRef.current = false;
      setOpen(true);
    }
  }, [forceOpen, tool.id]);

  useEffect(() => {
    if (collapseSignal > 0) {
      userToggledRef.current = true;
      setOpen(false);
    }
  }, [collapseSignal, tool.id]);

  function toggleOpen() {
    if (!bodyHasContent) {
      return;
    }
    userToggledRef.current = true;
    setOpen((value) => !value);
  }

  function openArtifact(event: MouseEvent<HTMLButtonElement>, file: ToolFileReference) {
    event.stopPropagation();
    onOpenArtifact?.({
      id: `file:${file.filePath ?? file.fileName}`,
      kind: "file",
      title: file.fileName,
      subtitle: file.filePath ?? file.fileName,
      language: file.language,
      body: file.content,
      imageSrc: file.imageSrc,
    });
  }

  return (
    <section
      className="tool-card"
      data-preview-anchor="tool-call"
      data-detail={detailMode}
      data-progress={project.toolCalls.progress}
      data-status={tool.status}
      data-style={toolStyle}
      data-timeline-rail={hasTimelineRail}
      data-action={toolAction}
      data-file-tool={hasFileReferences}
      data-running-title={hasActiveRunningTitle || undefined}
    >
      <div
        className="tool-card-header"
        data-clickable={bodyHasContent && !hideDisclosure}
        onClick={bodyHasContent && !hideDisclosure ? toggleOpen : undefined}
      >
        <span className="tool-status-icon" data-status={tool.status} aria-hidden="true">
          <ToolStatusIcon status={tool.status} action={toolAction} />
        </span>
        <span className="tool-title" data-has-file-link={hasFileReferences}>{headerTitle}</span>
        {showHeaderPreview ? <span className="tool-preview">{headerPreview}</span> : null}
        {showDebugBadges ? <span className="tool-style-badge">{toolStyle}</span> : null}
        {bodyHasContent && !hideDisclosure ? (
          <button
            className="tool-disclosure-button"
            type="button"
            aria-label={renderedOpen ? "Collapse tool" : "Expand tool"}
            aria-expanded={renderedOpen}
            onClick={(event) => {
              event.stopPropagation();
              toggleOpen();
            }}
          >
            <ChevronDown size={14} className="chevron" data-open={renderedOpen} />
          </button>
        ) : null}
      </div>
      {showProgress ? <ToolProgress status={tool.status} /> : null}
      <AnimatePresence initial={false}>
        {renderedOpen && bodyHasContent ? (
          <motion.div
            key="tool-card-body"
            className="tool-card-body"
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {showApproval ? (
              <div className="approval-box" data-approval-surface="inline">
                <div className="approval-copy">
                  <Clock3 size={14} />
                  <span>{approval?.prompt ?? copy.chat.approval.inlinePrompt}</span>
                </div>
                <ApprovalDecisionActions
                  onDecision={(decision) => onApprovalDecision?.(tool.id, decision)}
                />
              </div>
            ) : null}
            {hasFileReferences ? (
              <ToolFileReferenceList
                files={fileReferences}
                onOpenArtifact={(event, file) => openArtifact(event, file)}
              />
            ) : null}
            {inputBlock ? <DisplayBlockView title={copy.chat.toolCard.inputTitle} block={inputBlock} /> : null}
            {outputBlock ? <DisplayBlockView title={copy.chat.toolCard.outputTitle} block={outputBlock} tail={project.blocks.toolLogTail} /> : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

type ToolFileAction = "read" | "modify" | "edit";

type RunningToolAction =
  | "read-file"
  | "read-image"
  | "modify-file"
  | "edit-file"
  | "validate"
  | "search"
  | "run-command";

type ToolFileReference = {
  fileName: string;
  filePath?: string;
  language: string;
  /**
   * Optional on purpose. A tool that has not returned yet has no body to show, and the row
   * renders without one rather than filling it with a plausible-looking placeholder.
   */
  content?: string;
  imageSrc?: string;
  meta?: string;
  statusText: string;
  active: boolean;
};

export function outputPanelItemsFromTool(tool: AgentUXToolTimelineItem, locale: AppLocale = "en"): OutputPanelItem[] {
  if (tool.status === "error" || tool.status === "cancelled" || tool.status === "awaiting_approval") {
    return [];
  }
  const titleParts = splitToolTitle(tool.title ?? tool.name, pathFromTool(tool));
  const action = resolveToolFileAction(tool, titleParts);
  if (!action) {
    return [];
  }
  return buildToolFileReferences(tool, action, locale, titleParts).map((file) => ({
    id: `file:${file.filePath ?? file.fileName}`,
    kind: "file",
    title: file.fileName,
    subtitle: file.filePath ?? file.fileName,
    language: file.language,
    body: file.content,
    imageSrc: file.imageSrc,
  }));
}

function ToolFileReferenceList({
  files,
  onOpenArtifact,
}: {
  files: ToolFileReference[];
  onOpenArtifact: (event: MouseEvent<HTMLButtonElement>, file: ToolFileReference) => void;
}) {
  return (
    <div className="tool-file-list">
      {files.map((file) => (
        <div className="tool-file-row" key={file.filePath ?? file.fileName}>
          <span className="tool-file-row-status" data-active={file.active}>{file.statusText}</span>
          <button
            className="tool-title-file tool-file-row-name"
            type="button"
            data-artifact-ref={file.filePath ?? file.fileName}
            onClick={(event) => onOpenArtifact(event, file)}
          >
            {file.fileName}
          </button>
          {file.meta ? <span className="tool-file-row-meta">{file.meta}</span> : null}
        </div>
      ))}
    </div>
  );
}

export type ApprovalDecision = "yes" | "always" | "no";

export function ApprovalDecisionActions({
  onDecision,
}: {
  onDecision?: (decision: ApprovalDecision) => void | Promise<void>;
} = {}) {
  const copy = useCopy();
  const [decision, setDecision] = useState<ApprovalDecision | null>(null);
  const [pending, setPending] = useState(false);

  async function decide(next: ApprovalDecision) {
    if (pending) return;
    setPending(true);
    try {
      await onDecision?.(next);
      setDecision(next);
    } catch {
      // The owner surfaces transport failures (the editor uses a toast). Keep the controls
      // available so the user can retry instead of producing an unhandled rejected promise.
    } finally {
      setPending(false);
    }
  }

  if (decision) {
    return (
      <div className="approval-actions" aria-label={copy.chat.approval.actionsLabel} data-decided={decision}>
        <span className="approval-decision" role="status" data-decision={decision}>
          {decision === "no" ? <StateIcon slot="permission.deny" size={14} /> : <StateIcon slot="permission.allow" size={14} />}
          <span>{copy.chat.approval.decision[decision]}</span>
        </span>
        <button type="button" className="approval-undo" onClick={() => setDecision(null)}>
          {copy.chat.approval.undo}
        </button>
      </div>
    );
  }

  return (
    <div className="approval-actions" aria-label={copy.chat.approval.actionsLabel}>
      <button type="button" disabled={pending} data-approval-action="yes" onClick={() => void decide("yes")}>{copy.chat.approval.yes}</button>
      <button type="button" disabled={pending} data-approval-action="always" onClick={() => void decide("always")}>{copy.chat.approval.always}</button>
      <button type="button" disabled={pending} data-approval-action="no" onClick={() => void decide("no")}>{copy.chat.approval.no}</button>
    </div>
  );
}

function isMcpTool(tool: AgentUXToolTimelineItem): boolean {
  return /\(mcp\)/i.test(tool.title ?? "") || /mcp/i.test(tool.name ?? "");
}

function ToolProgress({ status }: { status: AgentUXToolTimelineItem["status"] }) {
  const progress = status === "running" || status === "args_streaming" ? 58 : status === "awaiting_approval" ? 36 : 100;

  return (
    <div className="tool-progress" aria-hidden="true" data-status={status}>
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

function ToolStatusIcon({
  status,
  action,
}: {
  status: AgentUXToolTimelineItem["status"];
  action?: RunningToolAction;
}) {
  if ((status === "running" || status === "args_streaming" || status === "success") && action) {
    return <StateIcon slot={toolActionIconSlot(action)} size={13} />;
  }
  if (status === "error") {
    return <StateIcon slot="tool.failed" size={15} />;
  }
  if (status === "cancelled") {
    return <StateIcon slot="tool.cancelled" size={15} />;
  }
  if (status === "awaiting_approval") {
    return <StateIcon slot="tool.pending_approval" size={15} />;
  }
  return <StateIcon slot="tool.completed" size={15} />;
}

function isRunningToolStatus(status: AgentUXToolTimelineItem["status"]): boolean {
  return status === "running" || status === "args_streaming";
}

function resolveToolAction(tool: AgentUXToolTimelineItem): RunningToolAction | undefined {
  const name = (tool.name ?? "").toLowerCase();
  const title = (tool.title ?? "").toLowerCase();
  const text = `${name} ${title}`;

  if (/read[_-]?image|image/.test(text)) {
    return "read-image";
  }
  if (/read[_-]?file|open[_-]?file|scan[_-]?file/.test(text)) {
    return "read-file";
  }
  if (/edit[_-]?file/.test(text)) {
    return "edit-file";
  }
  if (/apply[_-]?patch|modify[_-]?file|write[_-]?file|append[_-]?file|patch/.test(text)) {
    return "modify-file";
  }
  if (isShellToolName(name) || /run[_-]?command|terminal|bash|shell/.test(text)) {
    return "run-command";
  }
  if (/validate|test|check|verify/.test(text)) {
    return "validate";
  }
  if (/search|grep|ripgrep|rg/.test(text)) {
    return "search";
  }
  return undefined;
}

function isShellToolName(name: string): boolean {
  return name === "bash" || name === "run_command" || name === "start_server" || name === "shell.exec";
}

function runningToolActionLabel(action: RunningToolAction, locale: AppLocale): string {
  const c = chatCopy[locale].toolCard.runningAction;
  switch (action) {
    case "read-file":
      return c.readFile;
    case "read-image":
      return c.readImage;
    case "modify-file":
      return c.modifyFile;
    case "edit-file":
      return c.editFile;
    case "validate":
      return c.validate;
    case "search":
      return c.search;
    case "run-command":
      return c.runCommand;
  }
}

/**
 * Every running-tool title we generate, in every locale we ship.
 *
 * Derived from the dictionaries rather than hardcoded, because the previous version tested
 * `title.startsWith("正在")` plus an English gerund regex — a third language matched neither
 * branch and its tool cards silently lost their running//settled classification.
 */
const RUNNING_TITLE_LABELS: readonly string[] = APP_LOCALES.flatMap((locale) =>
  Object.values(chatCopy[locale].toolCard.runningAction),
);

const startsWithRunningLabel = (title: string) =>
  RUNNING_TITLE_LABELS.some((label) => title.startsWith(label));

/**
 * The original prefix tests are kept alongside the dictionary lookup rather than replaced.
 *
 * They are deliberately a superset: the English regex matches a bare verb ("Validating
 * SearchInput.test.tsx"), where a dictionary label is the whole phrase, and fixture titles
 * reach this function from `previewLocalization` too — which rewrites prose the dictionaries
 * here never see. Dropping them to look tidy would change which cards read as in-flight.
 */
function isExplicitRunningToolTitle(title: string): boolean {
  return (
    startsWithRunningLabel(title) ||
    title.startsWith("正在") ||
    title.startsWith("取消") ||
    /^(Reading|Modifying|Editing|Validating|Searching|Running|Cancelled)\b/.test(title)
  );
}

function isActiveRunningToolTitle(title: string): boolean {
  return (
    startsWithRunningLabel(title) ||
    title.startsWith("正在") ||
    /^(Reading|Modifying|Editing|Validating|Searching|Running)\b/.test(title)
  );
}

function toolActionIconSlot(action?: RunningToolAction): IconSlot {
  switch (action) {
    case "read-file":
      return "tool.file_read";
    case "read-image":
      return "content.image";
    case "modify-file":
      return "tool.file_modified";
    case "edit-file":
      return "tool.file_edit";
    case "search":
      return "tool.search";
    case "run-command":
      return "content.terminal";
    case "validate":
    default:
      return "tool.validate";
  }
}

function toolActionPreview(tool: AgentUXToolTimelineItem, action: RunningToolAction): string {
  const args = toRecord(tool.args) ?? tryParseRecord(tool.argsText ?? "") ?? toRecord(tool.approval?.argsPreview);
  const path = getString(args, "path") || getString(args, "file") || getString(args, "filename");
  const command = getString(args, "cmd") || getString(args, "command");
  const pattern = getString(args, "pattern") || getString(args, "query");

  switch (action) {
    case "read-file":
    case "read-image":
    case "modify-file":
    case "edit-file":
      return path || tool.preview || tool.argsText || tool.name;
    case "validate":
    case "run-command":
      return command || tool.preview || tool.argsText || tool.name;
    case "search":
      return pattern || tool.preview || tool.argsText || tool.name;
  }
}

function displayBlockSummary(block: DisplayBlock, fallbackTitle: string): string {
  if (block.kind === "diff") {
    return block.path ?? "Patch";
  }

  const text = block.kind === "code" ? block.code : block.text;
  return text.split(/\r?\n/)[0] || fallbackTitle;
}

type ToolTitleParts = {
  action: string;
  fileName: string;
  filePath?: string;
  suffix: string;
};

const FILE_TOKEN_PATTERN = /(.+?)([\w@./-]+\.(?:tsx?|jsx?|mjs|cjs|json|mdx?|css|scss|html?|py|sh|ya?ml|toml|txt|diff|patch))(.*)$/i;

function resolveToolFileAction(tool: AgentUXToolTimelineItem, titleParts?: ToolTitleParts): ToolFileAction | undefined {
  if (!titleParts) {
    return undefined;
  }

  const text = `${tool.name ?? ""} ${tool.title ?? ""} ${titleParts.action}`.toLowerCase();
  if (/(read|读取|查看|scan|open)/i.test(text)) {
    return "read";
  }
  if (/(edit|编辑)/i.test(text)) {
    return "edit";
  }
  if (/(write|patch|modify|update|create|append|修改|写入|更新|创建)/i.test(text)) {
    return "modify";
  }
  return undefined;
}

function fileActionHeaderLabel(action: ToolFileAction, locale: AppLocale): string {
  const c = chatCopy[locale].toolCard.runningAction;
  if (action === "read") {
    return c.readFile;
  }
  if (action === "edit") {
    return c.editFile;
  }
  return c.modifyFile;
}

function fileActionRowLabel(action: ToolFileAction, locale: AppLocale, active: boolean): string {
  const c = chatCopy[locale].toolCard.fileRow;
  if (action === "read") {
    return active ? c.readActive : c.readDone;
  }
  if (action === "edit") {
    return active ? c.editActive : c.editDone;
  }
  return active ? c.modifyActive : c.modifyDone;
}

function buildToolFileReferences(
  tool: AgentUXToolTimelineItem,
  action: ToolFileAction,
  locale: AppLocale,
  titleParts?: ToolTitleParts,
): ToolFileReference[] {
  if (!titleParts) {
    return [];
  }

  // Images the tool result actually listed. Every field here comes from the result; a row with
  // no meta simply shows none rather than borrowing a number from somewhere else.
  const uploadedImages = action === "read" && resolveToolAction(tool) === "read-image"
    ? explicitImageFileReferences(tool)
    : [];
  if (uploadedImages.length > 0) {
    return uploadedImages.map((file, index, files) => ({
      fileName: file.fileName,
      filePath: file.filePath ?? file.fileName,
      language: languageFromFileName(file.fileName),
      content: "image preview",
      imageSrc: file.imageSrc,
      meta: file.meta ?? (index === 0 ? tool.preview : undefined),
      statusText: fileActionRowLabel(action, locale, index === files.length - 1),
      active: index === files.length - 1,
    }));
  }

  // Exactly one row: the file the agent actually named.
  //
  // This used to fabricate two siblings from the real filename (`X.test.html`, `X.types.html`)
  // and give them hardcoded diff stats (`+8 -2`, `+3 -1`). A live run that edited one file
  // rendered three rows and opened three artifact tabs, two of which named files that do not
  // exist — with no content, because there was nothing to show. Absent data renders as absent.
  const spec = buildToolDisplaySpec(tool);
  const body = spec.outputBlock?.kind === "plain"
    ? spec.outputBlock.text
    : spec.outputBlock?.kind === "code"
      ? spec.outputBlock.code
      : spec.inputBlock?.kind === "code"
        ? spec.inputBlock.code
        : undefined;

  // In progress vs finished, from the tool's own status — the same test the header uses. The
  // row label and the `active` flag must agree, or a completed read is captioned "reading".
  const inProgress =
    tool.status === "running" || tool.status === "args_streaming" || tool.status === "awaiting_approval";

  return [{
    fileName: titleParts.fileName,
    filePath: titleParts.filePath ?? titleParts.fileName,
    language: action === "read" ? languageFromFileName(titleParts.fileName) : "diff",
    content: body,
    // `tool.preview` is the backend's own summary. No fallback: inventing a line count or a
    // diff stat is the same class of lie as inventing the file.
    meta: tool.preview,
    statusText: fileActionRowLabel(action, locale, inProgress),
    active: inProgress,
  }];
}

type ExplicitImageFileReference = {
  fileName: string;
  filePath?: string;
  imageSrc?: string;
  meta?: string;
};

function explicitImageFileReferences(tool: AgentUXToolTimelineItem): ExplicitImageFileReference[] {
  const result = toRecord(tool.result);
  const images = Array.isArray(result?.images) ? result.images : [];
  return images
    .map((image) => toRecord(image))
    .filter((image): image is Record<string, unknown> => Boolean(image))
    .map((image) => {
      const filePath = getString(image, "path") || getString(image, "file") || getString(image, "name");
      const fileName = filePath.split("/").filter(Boolean).pop() ?? filePath;
      return {
        fileName,
        filePath,
        imageSrc: getString(image, "src") || getString(image, "imageSrc") || getString(image, "dataUrl") || getString(image, "uri") || undefined,
        meta: getString(image, "meta") || undefined,
      };
    })
    .filter((image) => Boolean(image.fileName));
}







function languageFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "ts" || ext === "tsx") {
    return "typescript";
  }
  if (ext === "js" || ext === "jsx") {
    return "javascript";
  }
  return ext || "text";
}

function splitToolTitle(title: string, filePath?: string): ToolTitleParts | undefined {
  const fileNameFromPath = filePath?.split("/").filter(Boolean).pop();
  if (fileNameFromPath) {
    const index = title.indexOf(fileNameFromPath);
    if (index >= 0) {
      return {
        action: title.slice(0, index),
        fileName: fileNameFromPath,
        filePath,
        suffix: title.slice(index + fileNameFromPath.length),
      };
    }
    return {
      action: title ? `${title} ` : "",
      fileName: fileNameFromPath,
      filePath,
      suffix: "",
    };
  }

  const match = title.match(FILE_TOKEN_PATTERN);
  if (!match) {
    return undefined;
  }

  return {
    action: match[1],
    fileName: match[2].split("/").filter(Boolean).pop() ?? match[2],
    filePath: filePath ?? match[2],
    suffix: match[3] ?? "",
  };
}

function pathFromTool(tool: AgentUXToolTimelineItem): string | undefined {
  const args = toRecord(tool.args) ?? tryParseRecord(tool.argsText ?? "");
  const path = getString(args, "path") || getString(args, "file") || getString(args, "filename");
  return path || undefined;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function tryParseRecord(value: string): Record<string, unknown> | undefined {
  try {
    return toRecord(JSON.parse(value));
  } catch {
    return undefined;
  }
}

function getString(obj: Record<string, unknown> | undefined, key: string): string {
  const value = obj?.[key];
  return typeof value === "string" ? value : "";
}

function DisplayBlockView({ title, block, tail = false }: { title: string; block: DisplayBlock; tail?: boolean }) {
  if (block.kind === "diff") {
    return (
      <div className="display-block">
        <span>{title}</span>
        <pre>{`--- ${block.path ?? "before"}\n+++ ${block.path ?? "after"}\n${block.oldCode}\n---\n${block.newCode}`}</pre>
      </div>
    );
  }

  return (
    <div className="display-block">
      <span>{title}</span>
      <pre data-language={block.kind === "code" ? block.lang : "plain"}>
        {tail ? tailText(block.kind === "code" ? block.code : block.text) : block.kind === "code" ? block.code : block.text}
      </pre>
    </div>
  );
}

function tailText(text: string, lineCount = 3): string {
  const lines = text.split(/\r?\n/);
  return lines.length > lineCount ? lines.slice(-lineCount).join("\n") : text;
}

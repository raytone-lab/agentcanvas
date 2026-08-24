import {
  completeAgentCanvasExperience,
  themeTokens,
  workspaceSafeCapabilities,
  type AgentCanvasSlotComponent,
  type CompleteAgentCanvasExperienceV1,
} from "@agentmatrix/agentcanvas-contract";
import type { CSSProperties, ReactNode } from "react";

import { copy, EmbedRoot, localeValue, statusContent } from "./shared.js";
import type {
  AgentCanvasSemanticTokens,
  ExperiencePreviewFixture,
  ExperiencePreviewProps,
} from "./types.js";

const defaultFixture: Required<ExperiencePreviewFixture> = {
  title: "Support issues dashboard",
  welcomeTitle: "Start a conversation",
  welcomeDescription: "Ask the agent to summarize files or build a dashboard.",
  sessions: [
    "Support issues dashboard",
    "Competitor research",
    "Weekly summary",
  ],
  messages: [
    {
      id: "message-user",
      role: "user",
      text: "Turn these support issues into a concise dashboard.",
    },
    {
      id: "message-agent",
      role: "agent",
      text: "I grouped the issues by severity and prepared the dashboard artifact.",
    },
  ],
  toolCall: {
    name: "analyze_issues",
    summary: "Grouped 48 issues",
    status: "approval-required",
  },
  artifact: {
    name: "support-dashboard.md",
    kind: "markdown",
    content: "# Support dashboard\n\n48 issues grouped by severity.",
  },
  suggestedPrompts: [],
};

export function ExperiencePreview({
  value,
  locale: localeProp,
  semanticTokens,
  capabilities,
  className,
  style,
  loading,
  error,
  migrationRequired,
  fixture: fixtureInput,
  label,
  presentation,
}: ExperiencePreviewProps) {
  const locale = localeValue(localeProp);
  const messages = copy[locale];
  const status = statusContent(locale, loading, migrationRequired, error);
  const experience = completeAgentCanvasExperience(value);
  const resolvedCapabilities = {
    ...workspaceSafeCapabilities,
    ...capabilities,
  };
  const fixture = mergeFixture(fixtureInput);
  const visible = (component: AgentCanvasSlotComponent) =>
    experience.layout.slots.some(
      (slot) => slot.component === component && slot.enabled,
    );
  const showSidebar = visible("SessionSidebar");
  const showChat = visible("ChatFrame");
  const showComposer = visible("ComposerFrame");
  const showOutput = visible("OutputFrame");
  const showGit = resolvedCapabilities.git && visible("GitFrame");
  const showDebug = resolvedCapabilities.debug && visible("DebugDock");
  const outputSource =
    experience.output.source === "console" && !resolvedCapabilities.liveRun
      ? "artifact"
      : experience.output.source;
  const utilityPlacement = (component: AgentCanvasSlotComponent) =>
    experience.layout.slots.find(
      (slot) => slot.component === component && slot.enabled,
    )?.region === "bottom-dock"
      ? "bottom-dock"
      : "right-panel";
  const outputPlacement = showOutput
    ? utilityPlacement("OutputFrame")
    : undefined;
  const gitPlacement = showGit ? utilityPlacement("GitFrame") : undefined;
  const debugPlacement = showDebug ? utilityPlacement("DebugDock") : undefined;
  const layoutStyle = {
    borderRadius: experience.theme.radius,
    "--agentcanvas-main-size": experience.layout.mainSize,
    "--agentcanvas-right-panel-size": experience.layout.rightPanelSize,
    "--agentcanvas-bottom-dock-size": `${experience.layout.bottomDockSize}%`,
  } as CSSProperties;
  const renderUtility = (
    placement: "right-panel" | "bottom-dock",
  ): ReactNode => {
    const renderOutput = outputPlacement === placement;
    const renderGit = gitPlacement === placement;
    const renderDebug = debugPlacement === placement;
    if (!renderOutput && !renderGit && !renderDebug) return null;
    const utilityLabel = [
      renderOutput ? messages.output : undefined,
      renderGit ? messages.gitChanges : undefined,
      renderDebug ? messages.debugDiagnostics : undefined,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <aside
        className="agentcanvas-preview__utility"
        data-region={placement}
        aria-label={utilityLabel}
      >
        {renderOutput ? (
          <section
            className="agentcanvas-preview__output"
            aria-label={messages.output}
            data-source={outputSource}
            data-renderer={experience.output.artifactRenderer}
          >
            <div>
              <strong>
                {outputSource === "console"
                  ? messages.console
                  : fixture.artifact.name}
              </strong>
              <span>
                {outputSource === "console"
                  ? messages.liveOutput
                  : experience.output.artifactRenderer}
              </span>
            </div>
            <pre>
              {outputSource === "console"
                ? "$ analyze_issues\n✓ Grouped 48 issues"
                : fixture.artifact.content}
            </pre>
            <div className="agentcanvas-preview__block-flags">
              {experience.blocks.codeDiff ? <span>{messages.diff}</span> : null}
              {experience.blocks.errorCollapse ? (
                <span>{messages.errorsCollapsed}</span>
              ) : null}
            </div>
          </section>
        ) : null}
        {renderGit ? (
          <section className="agentcanvas-preview__git">
            {messages.changedFilesReviewOnly}
          </section>
        ) : null}
        {renderDebug ? (
          <section className="agentcanvas-preview__debug">
            {messages.eventDiagnostics}
          </section>
        ) : null}
      </aside>
    );
  };

  return (
    <EmbedRoot
      className={className}
      style={style}
      semanticTokens={{
        ...semanticTokensForExperience(experience),
        ...semanticTokens,
      }}
    >
      <section
        className={`agentcanvas-preview agentcanvas-preview--${experience.theme.density}`}
        aria-label={label ?? messages.preview}
        data-theme={experience.theme.preset}
        data-agentcanvas-contract={
          presentation
            ? "agentcanvas-experience-v2"
            : "agentcanvas-experience-v1"
        }
        data-agentcanvas-surface="agentcanvas"
        data-agentcanvas-color-mode={presentation?.colorMode}
      >
        <div className="agentcanvas-preview__bar">
          {presentation?.mark ?? (
            <span className="agentcanvas-preview__signal" aria-hidden="true" />
          )}
          <strong>{presentation?.displayName ?? fixture.title}</strong>
          <span>{themeTokens[experience.theme.preset].name}</span>
        </div>
        {status ?? (
          <div
            className={`agentcanvas-preview__surface agentcanvas-preview__surface--${experience.output.surface}`}
            style={layoutStyle}
            data-agentcanvas-region="application"
          >
            {showSidebar ? (
              <aside
                className="agentcanvas-preview__sidebar"
                aria-label={messages.sessions}
                data-agentcanvas-region="sidebar"
              >
                <strong>{messages.sessions}</strong>
                {experience.sidebar.newButton ? (
                  <button type="button" disabled>
                    {messages.newSession}
                  </button>
                ) : null}
                {experience.sidebar.search ? (
                  <div
                    className="agentcanvas-preview__search"
                    aria-label={messages.search}
                  >
                    ⌕ {messages.search}
                  </div>
                ) : null}
                {experience.sidebar.grouping ? (
                  <small className="agentcanvas-preview__group">
                    {messages.today}
                  </small>
                ) : null}
                <ul>
                  {fixture.sessions.map((session, index) => (
                    <li key={session} data-active={index === 0 || undefined}>
                      {session}
                    </li>
                  ))}
                </ul>
                {experience.sidebar.footer ? (
                  <small className="agentcanvas-preview__footer">
                    {presentation?.showPoweredBy
                      ? "Powered by AgentMatrix"
                      : messages.synced}
                  </small>
                ) : null}
              </aside>
            ) : null}
            <div className="agentcanvas-preview__workspace">
              <div className="agentcanvas-preview__primary">
                {showChat || showComposer ? (
                  <div className="agentcanvas-preview__conversation">
                    {showChat ? (
                      <div
                        className="agentcanvas-preview__messages"
                        data-writing={experience.theme.motion.writing}
                        data-agentcanvas-region="conversation"
                      >
                        {fixture.messages.length === 0 ? (
                          <EmptyState
                            value={experience}
                            fixture={fixture}
                            locale={locale}
                            showSuggestedPrompts={
                              presentation?.showSuggestedPrompts
                            }
                          />
                        ) : (
                          <>
                            {fixture.messages.map((message, index) => (
                              <article
                                key={message.id}
                                className={`agentcanvas-message agentcanvas-message--${message.role}`}
                              >
                                <div className="agentcanvas-message__identity">
                                  {(message.role === "user"
                                    ? experience.conversation.userAvatar
                                    : experience.conversation.agentAvatar) && (
                                    <span
                                      className="agentcanvas-message__avatar"
                                      aria-hidden="true"
                                    />
                                  )}
                                  {experience.conversation.speakerLabels ? (
                                    <span>
                                      {message.role === "user"
                                        ? messages.user
                                        : (presentation?.displayName ??
                                          messages.agent)}
                                    </span>
                                  ) : null}
                                </div>
                                {message.role === "agent" && index > 0 ? (
                                  <Reasoning
                                    value={experience}
                                    locale={locale}
                                  />
                                ) : null}
                                <p>{message.text}</p>
                                <MessageActions
                                  value={experience}
                                  locale={locale}
                                />
                              </article>
                            ))}
                            <ToolCall
                              value={experience}
                              fixture={fixture}
                              locale={locale}
                            />
                          </>
                        )}
                      </div>
                    ) : null}
                    {showComposer ? (
                      <Composer
                        value={experience}
                        locale={locale}
                        providerEnabled={resolvedCapabilities.provider}
                      />
                    ) : null}
                  </div>
                ) : null}
                {renderUtility("right-panel")}
              </div>
              {renderUtility("bottom-dock")}
            </div>
          </div>
        )}
      </section>
    </EmbedRoot>
  );
}

function EmptyState({
  value,
  fixture,
  locale,
  showSuggestedPrompts,
}: {
  value: CompleteAgentCanvasExperienceV1;
  fixture: Required<ExperiencePreviewFixture>;
  locale: "en" | "zh-CN";
  showSuggestedPrompts?: boolean;
}) {
  const messages = copy[locale];
  return (
    <div
      className="agentcanvas-preview__empty"
      data-empty-state={value.conversation.emptyState}
    >
      <strong>{fixture.welcomeTitle || messages.startConversation}</strong>
      <p>{fixture.welcomeDescription}</p>
      {(showSuggestedPrompts ??
      value.conversation.emptyState === "suggested-prompts") ? (
        <div>
          {(fixture.suggestedPrompts.length > 0
            ? fixture.suggestedPrompts
            : [messages.summarize, messages.buildDashboard]
          ).map((prompt) => (
            <span key={prompt}>{prompt}</span>
          ))}
        </div>
      ) : null}
      {value.conversation.emptyState === "capability-hints" ? (
        <p>{messages.capabilityHint}</p>
      ) : null}
    </div>
  );
}

function Reasoning({
  value,
  locale,
}: {
  value: CompleteAgentCanvasExperienceV1;
  locale: "en" | "zh-CN";
}) {
  const messages = copy[locale];
  const label =
    value.reasoning.show === "status"
      ? messages.working
      : value.reasoning.show === "summary"
        ? messages.reasoningSummary
        : messages.thinkingSummary;
  const summaryContent = (
    <>
      <span className="agentcanvas-reasoning__indicator" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {label}
    </>
  );
  const commonProps = {
    className: "agentcanvas-reasoning",
    "data-motion": value.theme.motion.reasoning,
    "data-collapse": value.reasoning.collapse,
  };
  if (!value.reasoning.expandable) {
    return (
      <div {...commonProps} data-expandable="false">
        <div className="agentcanvas-reasoning__summary">{summaryContent}</div>
      </div>
    );
  }
  return (
    <details
      {...commonProps}
      data-expandable="true"
      open={value.reasoning.collapse === "expanded"}
    >
      <summary>{summaryContent}</summary>
      <p>
        {value.reasoning.show === "thinking"
          ? messages.thinkingDetail
          : messages.thinkingSummary}
      </p>
    </details>
  );
}

function MessageActions({
  value,
  locale,
}: {
  value: CompleteAgentCanvasExperienceV1;
  locale: "en" | "zh-CN";
}) {
  const messages = copy[locale];
  const actions = value.conversation.messageActions;
  if (!actions.copy && !actions.regenerate && !actions.edit) return null;
  return (
    <div
      className="agentcanvas-message__actions"
      aria-label={messages.messageActions}
    >
      {actions.copy ? <span>{messages.copyAction}</span> : null}
      {actions.regenerate ? <span>{messages.regenerateAction}</span> : null}
      {actions.edit ? <span>{messages.editAction}</span> : null}
    </div>
  );
}

function ToolCall({
  value,
  fixture,
  locale,
}: {
  value: CompleteAgentCanvasExperienceV1;
  fixture: Required<ExperiencePreviewFixture>;
  locale: "en" | "zh-CN";
}) {
  const messages = copy[locale];
  const progress =
    value.toolCalls.progress === "bar" ? (
      <span
        className="agentcanvas-tool__progress"
        aria-label={messages.toolProgress}
      />
    ) : (
      <span aria-hidden="true">✓</span>
    );
  if (
    value.toolCalls.detail === "summary" ||
    value.theme.motion.toolCall === "inline"
  ) {
    return (
      <div className="agentcanvas-tool agentcanvas-tool--inline">
        {progress}
        {fixture.toolCall.name} · {fixture.toolCall.summary}
      </div>
    );
  }
  return (
    <details
      className={`agentcanvas-tool agentcanvas-tool--${value.theme.motion.toolCall}`}
      open={value.toolCalls.detail === "full"}
    >
      <summary>
        {progress}
        <strong>{fixture.toolCall.name}</strong>
        <span>{localizedToolStatus(fixture.toolCall.status, locale)}</span>
      </summary>
      <p>{fixture.toolCall.summary}</p>
      {value.blocks.toolLogTail ? (
        <code className="agentcanvas-tool__log">
          {messages.recordsProcessed}
        </code>
      ) : null}
      {value.toolCalls.approval === "inline" &&
      fixture.toolCall.status === "approval-required" ? (
        <div className="agentcanvas-tool__approval">
          <button type="button" disabled>
            {messages.approve}
          </button>
          <button type="button" disabled>
            {messages.deny}
          </button>
        </div>
      ) : null}
    </details>
  );
}

function Composer({
  value,
  locale,
  providerEnabled,
}: {
  value: CompleteAgentCanvasExperienceV1;
  locale: "en" | "zh-CN";
  providerEnabled: boolean;
}) {
  const messages = copy[locale];
  return (
    <div className="agentcanvas-preview__composer">
      {value.composer.promptShortcuts ? (
        <div className="agentcanvas-preview__shortcuts">
          <span>{messages.summarize}</span>
          <span>{messages.buildDashboard}</span>
        </div>
      ) : null}
      {value.context.attachmentChips ? (
        <span className="agentcanvas-chip">context.md</span>
      ) : null}
      <div className="agentcanvas-preview__composer-row">
        <div className="agentcanvas-preview__input" aria-hidden="true" />
        <button type="button" disabled>
          {messages.send}
        </button>
      </div>
      <div className="agentcanvas-preview__composer-tools">
        {value.composer.fileUpload ? <span>＋ {messages.upload}</span> : null}
        {value.composer.mic ? <span>◉ {messages.mic}</span> : null}
        {value.composer.thinkingBudget ? (
          <span>{messages.budget}: 8k</span>
        ) : null}
        {providerEnabled && value.composer.modelSwitcher ? (
          <span>
            {messages.agent} {messages.model}⌄
          </span>
        ) : null}
        {providerEnabled && value.composer.toolToggle ? (
          <span>
            {messages.tools}: {messages.on}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function localizedToolStatus(
  status: Required<ExperiencePreviewFixture>["toolCall"]["status"],
  locale: "en" | "zh-CN",
): string {
  const messages = copy[locale];
  return {
    running: messages.toolRunning,
    succeeded: messages.toolSucceeded,
    failed: messages.toolFailed,
    "approval-required": messages.toolApprovalRequired,
  }[status];
}

function semanticTokensForExperience(
  value: CompleteAgentCanvasExperienceV1,
): AgentCanvasSemanticTokens {
  const tokens = themeTokens[value.theme.preset];
  return {
    canvas: tokens.surface.canvas,
    panel: tokens.surface.panel,
    raised: tokens.surface.raised,
    inset: tokens.surface.inset,
    hover: tokens.surface.hover,
    text: tokens.text.primary,
    textSecondary: tokens.text.secondary,
    textMuted: tokens.text.muted,
    border: tokens.border.subtle,
    borderStrong: tokens.border.strong,
    action: tokens.accent.action,
    actionText: tokens.text.inverse,
    success: tokens.status.success,
    warning: tokens.status.warning,
    danger: tokens.status.danger,
    focus: tokens.status.info,
    fontUi: tokens.font.ui,
    fontDisplay: tokens.font.display,
    fontMono: tokens.font.mono,
    baseSize: "0.875rem",
    headingScale: "1",
    spacingScale: "1",
    radiusScale: "1",
    borderScale: "1",
  };
}

function mergeFixture(
  value?: ExperiencePreviewFixture,
): Required<ExperiencePreviewFixture> {
  return {
    ...defaultFixture,
    ...value,
    sessions: value?.sessions ?? defaultFixture.sessions,
    messages: value?.messages ?? defaultFixture.messages,
    toolCall: { ...defaultFixture.toolCall, ...value?.toolCall },
    artifact: { ...defaultFixture.artifact, ...value?.artifact },
    suggestedPrompts:
      value?.suggestedPrompts ?? defaultFixture.suggestedPrompts,
  };
}

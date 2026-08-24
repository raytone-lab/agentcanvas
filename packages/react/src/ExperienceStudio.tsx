import {
  completeAgentCanvasExperience,
  experiencePresetGroupsForExperience,
  isExperiencePresetOptionActive,
  toggleExperiencePresetOption,
  type ExperiencePresetGroupId,
} from "@agentmatrix/agentcanvas-contract";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ExperiencePreview } from "./ExperiencePreview.js";
import { localizedPresetGroups } from "./presetLocale.js";
import { copy, EmbedRoot, localeValue, statusContent } from "./shared.js";
import type {
  ExperiencePreviewFixture,
  ExperienceStudioProps,
  ExperienceStudioScenario,
  ExperienceStudioViewport,
} from "./types.js";

type StudioIconName =
  | "layout"
  | "conversation"
  | "sidebar"
  | "thinking"
  | "terminal"
  | "blocks"
  | "composer"
  | "output"
  | "render"
  | "theme"
  | "desktop"
  | "tablet"
  | "mobile"
  | "external";

const groupIcons: Partial<Record<ExperiencePresetGroupId, StudioIconName>> = {
  layout: "layout",
  conversation: "conversation",
  sidebar: "sidebar",
  "ux-effects": "thinking",
  "tool-calls": "terminal",
  blocks: "blocks",
  composer: "composer",
  output: "output",
  render: "render",
  theme: "theme",
};

const viewports: ExperienceStudioViewport[] = ["desktop", "tablet", "mobile"];
const scenarios: ExperienceStudioScenario[] = [
  "completed",
  "welcome",
  "approval",
];

export function ExperienceStudio({
  value,
  onChange,
  locale: localeProp,
  semanticTokens,
  capabilities,
  className,
  style,
  disabled = false,
  readOnly = false,
  loading,
  error,
  migrationRequired,
  previewFixture,
  initialScenario = "completed",
  initialViewport = "desktop",
  previewPresentation,
  previewSemanticTokens,
}: ExperienceStudioProps) {
  const locale = localeValue(localeProp);
  const messages = copy[locale];
  const complete = completeAgentCanvasExperience(value);
  const groups = localizedPresetGroups(
    experiencePresetGroupsForExperience(complete, capabilities),
    locale,
  );
  const [selectedGroup, setSelectedGroup] = useState<ExperiencePresetGroupId>(
    groups[0]?.id ?? "conversation",
  );
  const [scenario, setScenario] =
    useState<ExperienceStudioScenario>(initialScenario);
  const [viewport, setViewport] =
    useState<ExperienceStudioViewport>(initialViewport);
  const status = statusContent(locale, loading, migrationRequired, error);
  const locked =
    disabled || readOnly || loading || migrationRequired || Boolean(error);
  const currentGroup =
    groups.find((group) => group.id === selectedGroup) ?? groups[0];
  const fixture = useMemo(
    () => fixtureForScenario(previewFixture, scenario, locale),
    [locale, previewFixture, scenario],
  );

  useEffect(() => {
    if (groups.some((group) => group.id === selectedGroup)) return;
    const first = groups[0];
    if (first) setSelectedGroup(first.id);
  }, [groups, selectedGroup]);

  return (
    <EmbedRoot
      className={className}
      style={style}
      semanticTokens={semanticTokens}
    >
      <section
        className="agentcanvas-studio"
        aria-label={messages.configure}
        aria-busy={loading || undefined}
      >
        {readOnly && status ? (
          <span className="agentcanvas-studio__status-badge agentcanvas-badge">
            {messages.readOnly}
          </span>
        ) : null}
        {status ?? (
          <div className="agentcanvas-studio__body">
            <nav
              className="agentcanvas-studio__groups"
              aria-label={messages.configure}
            >
              <div className="agentcanvas-studio__rail-header">
                <strong>{messages.appUi}</strong>
                {readOnly ? (
                  <span className="agentcanvas-badge">{messages.readOnly}</span>
                ) : null}
              </div>
              <span className="agentcanvas-studio__rail-heading">
                {messages.uiUx}
              </span>
              {groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  aria-pressed={currentGroup?.id === group.id}
                  className="agentcanvas-studio__group"
                  onClick={() => setSelectedGroup(group.id)}
                >
                  <span
                    className="agentcanvas-studio__group-icon"
                    data-tone={group.id}
                    aria-hidden="true"
                  >
                    <StudioIcon name={groupIcons[group.id] ?? "layout"} />
                  </span>
                  <span>{group.label}</span>
                </button>
              ))}
            </nav>

            <aside
              className="agentcanvas-studio__options"
              aria-label={currentGroup?.label}
            >
              {currentGroup ? (
                <>
                  <header className="agentcanvas-studio__option-header">
                    <div>
                      <span>{messages.agentCanvasPresets}</span>
                      <h3>{currentGroup.label}</h3>
                    </div>
                    <span>
                      {currentGroup.options.length} {messages.controls}
                    </span>
                  </header>
                  <div className="agentcanvas-studio__option-scroll">
                    {[
                      ...new Set(
                        currentGroup.options.map((option) => option.section),
                      ),
                    ].map((section) => (
                      <section
                        key={section}
                        className="agentcanvas-studio__option-section"
                      >
                        <h4>{section}</h4>
                        {currentGroup.options
                          .filter((option) => option.section === section)
                          .map((option) => {
                            const active = isExperiencePresetOptionActive(
                              complete,
                              option.id,
                            );
                            return (
                              <button
                                key={option.id}
                                type="button"
                                className="agentcanvas-studio__option"
                                aria-pressed={active}
                                disabled={locked}
                                onClick={() =>
                                  onChange(
                                    toggleExperiencePresetOption(
                                      complete,
                                      option.id,
                                    ),
                                  )
                                }
                              >
                                <OptionThumbnail groupId={currentGroup.id} />
                                <span>
                                  <strong>{option.label}</strong>
                                  <small>{option.description}</small>
                                </span>
                                <span
                                  className="agentcanvas-studio__option-marker"
                                  aria-hidden="true"
                                >
                                  {active ? "✓" : ""}
                                </span>
                              </button>
                            );
                          })}
                      </section>
                    ))}
                  </div>
                  <footer className="agentcanvas-studio__option-footer">
                    <span aria-hidden="true">◇</span>
                    AgentCanvas · {currentGroup.id}
                  </footer>
                </>
              ) : null}
            </aside>

            <section
              className="agentcanvas-studio__stage"
              aria-label={messages.livePreview}
            >
              <div className="agentcanvas-studio__toolbar">
                <div className="agentcanvas-studio__scenario">
                  <span className="agentcanvas-studio__live-dot" />
                  <strong>{messages.livePreview}</strong>
                  <div
                    className="agentcanvas-studio__scenario-options"
                    role="group"
                    aria-label={messages.livePreview}
                  >
                    {scenarios.map((candidate) => (
                      <button
                        key={candidate}
                        type="button"
                        aria-pressed={scenario === candidate}
                        onClick={() => setScenario(candidate)}
                      >
                        {scenarioLabel(candidate, locale)}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="agentcanvas-studio__viewports"
                  role="group"
                  aria-label={messages.appPreview}
                >
                  {viewports.map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      aria-label={viewportLabel(candidate, locale)}
                      aria-pressed={viewport === candidate}
                      onClick={() => setViewport(candidate)}
                    >
                      <StudioIcon name={candidate} />
                    </button>
                  ))}
                </div>
              </div>
              <div
                className="agentcanvas-studio__canvas"
                data-viewport={viewport}
              >
                <div className="agentcanvas-studio__browser">
                  <div className="agentcanvas-studio__browser-bar">
                    <span className="agentcanvas-studio__browser-dots">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{messages.browserAddress}</span>
                    <button
                      type="button"
                      aria-label={messages.openPreview}
                      disabled
                    >
                      <StudioIcon name="external" />
                    </button>
                  </div>
                  {scenario === "welcome" ? (
                    <ExperiencePreview
                      value={value}
                      fixture={{
                        ...fixture,
                        messages: [],
                        welcomeTitle:
                          fixture.welcomeTitle ?? messages.welcomeTitle,
                        welcomeDescription:
                          fixture.welcomeDescription ??
                          messages.welcomeDescription,
                      }}
                      locale={locale}
                      capabilities={capabilities}
                      label={messages.appPreview}
                      presentation={previewPresentation}
                      semanticTokens={previewSemanticTokens}
                    />
                  ) : (
                    <ExperiencePreview
                      value={value}
                      fixture={fixture}
                      locale={locale}
                      capabilities={capabilities}
                      label={messages.appPreview}
                      presentation={previewPresentation}
                      semanticTokens={previewSemanticTokens}
                    />
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </section>
    </EmbedRoot>
  );
}

function OptionThumbnail({ groupId }: { groupId: ExperiencePresetGroupId }) {
  return (
    <span
      className="agentcanvas-studio__option-thumbnail"
      data-group={groupId}
      aria-hidden="true"
    >
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function StudioIcon({ name }: { name: StudioIconName }) {
  const paths: Record<StudioIconName, ReactNode> = {
    layout: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M9 9h12" />
      </>
    ),
    conversation: (
      <>
        <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
        <path d="M8 9h8M8 13h5" />
      </>
    ),
    sidebar: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 3v18M5.5 8h1M5.5 12h1" />
      </>
    ),
    thinking: (
      <>
        <path d="M9.5 4.5A3 3 0 0 0 5 7a3 3 0 0 0 .5 5.5A3 3 0 0 0 9 17v2" />
        <path d="M14.5 4.5A3 3 0 0 1 19 7a3 3 0 0 1-.5 5.5A3 3 0 0 1 15 17v2M9.5 4.5A3 3 0 0 1 12 3a3 3 0 0 1 2.5 1.5M9 19h6M12 7v8" />
      </>
    ),
    terminal: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="m7 9 3 3-3 3M13 15h4" />
      </>
    ),
    blocks: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    composer: (
      <>
        <path d="M4 4h16v16H4zM8 8h8M8 12h5M15 16h1" />
      </>
    ),
    output: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M15 3v18M18 8h.01M18 12h.01" />
      </>
    ),
    render: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M3 9h18M8 4v5" />
      </>
    ),
    theme: (
      <path d="M12 3a9 9 0 1 0 9 9c0-1.2-.8-2-2-2h-2.5a2.5 2.5 0 0 1-2.5-2.5V5c0-1.2-.8-2-2-2zM7.5 11h.01M9.5 7.5h.01M14.5 16h.01" />
    ),
    desktop: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 22h8M12 18v4" />
      </>
    ),
    tablet: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
    mobile: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
    external: (
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function fixtureForScenario(
  fixture: ExperiencePreviewFixture | undefined,
  scenario: ExperienceStudioScenario,
  locale: "en" | "zh-CN",
): ExperiencePreviewFixture {
  if (scenario !== "approval") return fixture ?? {};
  const messages = copy[locale];
  return {
    ...fixture,
    toolCall: {
      name: fixture?.toolCall?.name ?? "analyze_files",
      summary: messages.approvalPrompt,
      status: "approval-required",
    },
  };
}

function scenarioLabel(
  scenario: ExperienceStudioScenario,
  locale: "en" | "zh-CN",
): string {
  const messages = copy[locale];
  return {
    completed: messages.completedRun,
    welcome: messages.welcomeScreen,
    approval: messages.approvalNeeded,
  }[scenario];
}

function viewportLabel(
  viewport: ExperienceStudioViewport,
  locale: "en" | "zh-CN",
): string {
  const messages = copy[locale];
  return {
    desktop: messages.desktopPreview,
    tablet: messages.tabletPreview,
    mobile: messages.mobilePreview,
  }[viewport];
}

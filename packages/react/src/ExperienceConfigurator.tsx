import {
  completeAgentCanvasExperience,
  experiencePresetGroupsForExperience,
  isExperiencePresetOptionActive,
  toggleExperiencePresetOption,
  type ExperiencePresetGroupId,
} from "@agentmatrix/agentcanvas-contract";
import { useId, useState, type KeyboardEvent } from "react";

import { ExperiencePreview } from "./ExperiencePreview.js";
import { localizedPresetGroups } from "./presetLocale.js";
import { copy, EmbedRoot, localeValue, statusContent } from "./shared.js";
import type { ExperienceConfiguratorProps } from "./types.js";

export function ExperienceConfigurator({
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
  showPreview = true,
}: ExperienceConfiguratorProps) {
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
  const currentGroup =
    groups.find((group) => group.id === selectedGroup) ?? groups[0];
  const headingId = useId();
  const status = statusContent(locale, loading, migrationRequired, error);
  const locked =
    disabled || readOnly || loading || migrationRequired || Boolean(error);
  const selectTabFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight" || event.key === "ArrowDown")
      nextIndex = (index + 1) % groups.length;
    if (event.key === "ArrowLeft" || event.key === "ArrowUp")
      nextIndex = (index - 1 + groups.length) % groups.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = groups.length - 1;
    if (nextIndex === undefined) return;
    event.preventDefault();
    const nextGroup = groups[nextIndex];
    if (!nextGroup) return;
    setSelectedGroup(nextGroup.id);
    const tabs =
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
        "[role='tab']",
      );
    tabs?.[nextIndex]?.focus();
  };

  return (
    <EmbedRoot
      className={className}
      style={style}
      semanticTokens={semanticTokens}
    >
      <section
        className="agentcanvas-configurator"
        aria-labelledby={headingId}
        aria-busy={loading || undefined}
      >
        <header className="agentcanvas-configurator__header">
          <div>
            <h2 id={headingId}>{messages.configure}</h2>
            <p>{messages.configureHint}</p>
          </div>
          {readOnly ? (
            <span className="agentcanvas-badge">{messages.readOnly}</span>
          ) : null}
        </header>
        {status ?? (
          <div
            className={
              showPreview
                ? "agentcanvas-configurator__body"
                : "agentcanvas-configurator__body agentcanvas-configurator__body--single"
            }
          >
            <div className="agentcanvas-controls">
              <div
                className="agentcanvas-tabs"
                role="tablist"
                aria-label={messages.configure}
              >
                {groups.map((group, index) => (
                  <button
                    key={group.id}
                    type="button"
                    role="tab"
                    aria-selected={currentGroup?.id === group.id}
                    tabIndex={currentGroup?.id === group.id ? 0 : -1}
                    onClick={() => setSelectedGroup(group.id)}
                    onKeyDown={(event) => selectTabFromKeyboard(event, index)}
                    className="agentcanvas-tab"
                  >
                    {group.label}
                  </button>
                ))}
              </div>
              {currentGroup ? (
                <div
                  className="agentcanvas-options"
                  role="tabpanel"
                  aria-label={currentGroup.label}
                  tabIndex={0}
                >
                  {currentGroup.options.map((option) => {
                    const active = isExperiencePresetOptionActive(
                      complete,
                      option.id,
                    );
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className="agentcanvas-option"
                        aria-pressed={active}
                        disabled={locked}
                        onClick={() =>
                          onChange(
                            toggleExperiencePresetOption(complete, option.id),
                          )
                        }
                      >
                        <span
                          className="agentcanvas-option__marker"
                          aria-hidden="true"
                        >
                          {active ? "✓" : ""}
                        </span>
                        <span className="agentcanvas-option__copy">
                          <span className="agentcanvas-option__label">
                            {option.label}
                          </span>
                          <span className="agentcanvas-option__description">
                            {option.description}
                          </span>
                        </span>
                        {active ? (
                          <span className="agentcanvas-option__selected">
                            {messages.selected}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            {showPreview ? (
              <ExperiencePreview
                value={complete}
                locale={locale}
                capabilities={capabilities}
                fixture={previewFixture}
                label={messages.preview}
              />
            ) : null}
          </div>
        )}
      </section>
    </EmbedRoot>
  );
}

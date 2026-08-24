import { useCopy } from "../i18n/LocaleContext";
import { Textarea } from "./ui";

/**
 * "Welcome greeting" section rendered inside the Input (composer) preset group,
 * below the prompt-shortcuts section. Edits project.welcome.greeting — the line
 * shown above the centered composer when a new chat is started.
 */
export function WelcomeSettingsPanel({
  greeting,
  onChange,
  onActivate,
}: {
  greeting: string;
  onChange: (value: string) => void;
  onActivate?: () => void;
}) {
  const copy = useCopy().shell.welcomePanel;
  return (
    <section className="preset-option-section welcome-settings">
      <h3>{copy.title}</h3>
      <label className="welcome-field">
        <Textarea
          autoGrow
          rows={2}
          value={greeting}
          placeholder={copy.greetingPlaceholder}
          onFocus={onActivate}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="preset-option-name">{copy.greetingLabel}</span>
      </label>
    </section>
  );
}

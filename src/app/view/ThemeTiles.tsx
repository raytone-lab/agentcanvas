import { PresetOptionPreview } from "../../components/PresetOptionPreview";
import { translatePresetOptionLabel } from "../../i18n/presetCopy";
import type { AppLocale } from "../../i18n/uiCopy";
import { isPresetOptionActive } from "../../schema/presetActions";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { PresetOption } from "../../schema/presets";

/**
 * The palettes, under the style they recolour (pure view).
 *
 * Theme was a destination in the left rail, which put "which skin" and "which
 * colours of that skin" on opposite sides of the window — two halves of one
 * decision, and the narrower half was the one with a whole destination to
 * itself. They are one panel now: the style tiles above, these under them.
 *
 * Deliberately the same markup as the rail's option list —
 * `.preset-option-cell` / `.preset-option` / `PresetOptionPreview` — rather
 * than a second set of classes. The palette cards already have per-style rules
 * hanging off `data-theme-style` in app.css, and a parallel vocabulary here
 * would mean maintaining them twice and watching them drift.
 *
 * Only the palettes of the *current* style arrive here: `presetGroupsForProject`
 * projects the theme group for the project it is given, so switching skins
 * changes the list without this view knowing there is such a thing as a skin.
 */
export function ThemeTiles({
  project,
  locale,
  options,
  onSelect,
}: {
  project: AgentFrontendProject;
  locale: AppLocale;
  options: readonly PresetOption[];
  onSelect: (optionId: string) => void;
}) {
  if (options.length === 0) return null;

  return (
    <div className="preset-option-list">
      {options.map((option) => {
        const active = isPresetOptionActive(project, option.id);
        const label = translatePresetOptionLabel(option.id, option.label, locale);
        return (
          <div
            className="preset-option-cell"
            key={option.id}
            data-option-id={option.id}
            data-theme-style={option.themeStyle}
          >
            <button
              className="preset-option"
              data-active={active}
              aria-pressed={active}
              aria-label={label}
              type="button"
              onClick={() => onSelect(option.id)}
            >
              <PresetOptionPreview optionId={option.id} projectName={project.name} />
            </button>
            <span className="preset-option-name">
              <span>{label}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

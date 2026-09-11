import { Dialog, DialogContent } from "../../components/ui/dialog";
import { APP_LOCALES, type UiCopy, type AppLocale } from "../../i18n/uiCopy";
import { CANVAS_BACKGROUNDS, type CanvasBackgroundId } from "./canvasBackgrounds";

/**
 * Preferences: how the editor is read, and what it is read against.
 *
 * The language switch used to be a picker of its own next to the wordmark. It
 * moved here because it is set once and then never touched, and a permanent
 * control for a once-a-session decision was the second-widest thing in the
 * chrome. The canvas backdrop joins it for the same reason.
 *
 * Both apply on click — no confirm step. Nothing here can be got wrong in a way
 * that needs guarding: the next click puts it back.
 */
export function PreferencesDialog({
  copy,
  locale,
  onLocaleChange,
  background,
  onBackgroundChange,
  open,
  onOpenChange,
}: {
  copy: UiCopy;
  locale: AppLocale;
  onLocaleChange: (locale: AppLocale) => void;
  background: CanvasBackgroundId;
  onBackgroundChange: (background: CanvasBackgroundId) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const c = copy.shell.preferences;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={c.title} width={420}>
        <div className="pref-sections">
          <section className="pref-section">
            <h3 className="pref-section-title">{c.language}</h3>
            <div className="pref-choices" role="radiogroup" aria-label={c.language}>
              {APP_LOCALES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="pref-choice"
                  role="radio"
                  aria-checked={locale === option}
                  data-active={locale === option}
                  onClick={() => onLocaleChange(option)}
                >
                  {copy.shell.topbar.languageLabels[option]}
                </button>
              ))}
            </div>
          </section>

          <section className="pref-section">
            <h3 className="pref-section-title">{c.background}</h3>
            {/* Swatch and name together: the name alone does not say what 雾蓝
                looks like, and the swatch alone gives the reader nothing to say
                back to anyone about it. */}
            <div className="pref-choices" role="radiogroup" aria-label={c.background}>
              {CANVAS_BACKGROUNDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="pref-choice pref-swatch-choice"
                  role="radio"
                  aria-checked={background === option.id}
                  data-active={background === option.id}
                  onClick={() => onBackgroundChange(option.id)}
                >
                  <span
                    className="pref-swatch"
                    style={{
                      backgroundColor: option.color,
                      // A smaller tile for the swatch: the canvas's 16px dot
                      // grid would put one dot in an 18px square.
                      backgroundImage: option.texture?.image,
                      backgroundSize: option.texture?.swatchSize,
                    }}
                    aria-hidden="true"
                  />
                  {option.label[locale]}
                </button>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

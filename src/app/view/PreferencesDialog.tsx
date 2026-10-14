import { Check } from "lucide-react";
import type { CSSProperties } from "react";

import { Dialog, DialogContent } from "../../components/ui/dialog";
import { APP_LOCALES, type UiCopy, type AppLocale } from "../../i18n/uiCopy";
import { CANVAS_BACKGROUNDS, type CanvasBackground, type CanvasBackgroundId } from "./canvasBackgrounds";

/**
 * Preferences: how the editor is read, and what it is read against.
 *
 * Both settings apply on the click, so the dialog is built to let the page
 * behind it show the result: a light veil rather than the modal dim (which
 * hid the very canvas a backdrop choice repaints), and each backdrop drawn as
 * a small canvas — the backdrop with a frame resting on it — rather than an
 * 18px chip with a name beside it, so the choice can be judged before it is
 * made as well as after.
 *
 * Settings are laid out as rows, the label and a line of help on the left and
 * the control on the right, the way a settings sheet reads; the language is a
 * segmented control, one of three; the backdrops are tiles in two groups,
 * plain and patterned. "In force" is a ring and a check, in the editor's
 * selection colour — not an orange fill, which read as a warning.
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
  const localeIndex = Math.max(0, APP_LOCALES.indexOf(locale));
  const plain = CANVAS_BACKGROUNDS.filter((option) => !option.texture);
  const patterned = CANVAS_BACKGROUNDS.filter((option) => option.texture);

  const tiles = (options: readonly CanvasBackground[], label: string) => (
    <div className="pref-tiles" role="radiogroup" aria-label={`${c.background} · ${label}`}>
      {options.map((option) => {
        const active = background === option.id;
        return (
          <button
            key={option.id}
            type="button"
            className="pref-tile"
            role="radio"
            aria-checked={active}
            data-active={active || undefined}
            onClick={() => onBackgroundChange(option.id)}
          >
            {/* The backdrop at preview scale, with a frame resting on it —
                what the canvas will look like, not just its colour. */}
            <span
              className="pref-tile-art"
              style={{
                backgroundColor: option.color,
                backgroundImage: option.texture?.image,
                backgroundSize: option.texture?.swatchSize,
              } as CSSProperties}
              aria-hidden="true"
            >
              <span className="pref-tile-frame">
                <span className="pref-tile-frame-side" />
                <span className="pref-tile-frame-lines">
                  <span />
                  <span />
                </span>
              </span>
              <span className="pref-tile-check">
                <Check size={10} strokeWidth={3} />
              </span>
            </span>
            <span className="pref-tile-label">{option.label[locale]}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={c.title}
        description={c.description}
        width={480}
        className="pref-dialog"
        overlayClassName="pref-dialog-overlay"
      >
        <div className="pref-sections">
          <section className="pref-row">
            <div className="pref-row-text">
              <h3 className="pref-row-title">{c.language}</h3>
              <p className="pref-row-hint">{c.languageHint}</p>
            </div>
            {/* One of three, so a segmented control: the thumb slides to the
                one in force rather than three chips each lighting up. */}
            <div
              className="pref-segmented"
              role="radiogroup"
              aria-label={c.language}
              style={{ "--pref-seg-index": localeIndex, "--pref-seg-count": APP_LOCALES.length } as CSSProperties}
            >
              <span className="pref-segmented-thumb" aria-hidden="true" />
              {APP_LOCALES.map((option) => (
                <button
                  key={option}
                  type="button"
                  className="pref-segment"
                  role="radio"
                  aria-checked={locale === option}
                  data-active={locale === option || undefined}
                  onClick={() => onLocaleChange(option)}
                >
                  {copy.shell.topbar.languageLabels[option]}
                </button>
              ))}
            </div>
          </section>

          <section className="pref-block">
            <div className="pref-row-text">
              <h3 className="pref-row-title">{c.background}</h3>
              <p className="pref-row-hint">{c.backgroundHint}</p>
            </div>
            <div className="pref-group">
              <span className="pref-group-label">{c.backgroundPlain}</span>
              {tiles(plain, c.backgroundPlain)}
            </div>
            <div className="pref-group">
              <span className="pref-group-label">{c.backgroundPattern}</span>
              {tiles(patterned, c.backgroundPattern)}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

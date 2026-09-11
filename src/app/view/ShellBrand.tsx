import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { APP_LOCALES, type UiCopy, type AppLocale } from "../../i18n/uiCopy";

/**
 * The product's name, and the language it is read in.
 *
 * It used to be the topbar's left half. With the shell turned into one canvas
 * and the chrome floating on top of it, there is no full-width bar to be the
 * left half of: the wordmark belongs at the top of the rail card, which is the
 * card the reader starts from. The preview surface has no rail, so there it
 * floats on its own — the language switch has to stay reachable from both.
 */
export function ShellBrand({
  copy,
  locale,
  setLocale,
  /** Own floating card, for the surfaces with no rail to sit in. */
  floating = false,
}: {
  copy: UiCopy;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  floating?: boolean;
}) {
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  return (
    <div className="shell-brand" data-floating={floating ? "true" : undefined}>
      <div className="brand-block">
        {/* The wordmark is in the image, so the h1 carries the name for
            assistive tech and the img is decorative. */}
        <h1 className="brand-logo">
          <img src="/brand-logo.png" alt="AgentCanvas" />
        </h1>
      </div>
      <div
        className="language-picker"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setLanguageMenuOpen(false);
          }
        }}
      >
        <button
          className="language-trigger"
          type="button"
          aria-label={copy.shell.topbar.languageSwitchAria}
          aria-haspopup="menu"
          aria-expanded={languageMenuOpen}
          onClick={() => setLanguageMenuOpen((open) => !open)}
        >
          <span>{copy.shell.topbar.languageLabels[locale]}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {languageMenuOpen ? (
          <div className="language-menu" role="menu">
            {APP_LOCALES.map((option) => (
              <button
                key={option}
                className="language-option"
                type="button"
                role="menuitemradio"
                aria-checked={locale === option}
                data-active={locale === option}
                onClick={() => {
                  setLocale(option);
                  setLanguageMenuOpen(false);
                }}
              >
                {copy.shell.topbar.languageLabels[option]}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

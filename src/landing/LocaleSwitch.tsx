import { useRef } from "react";

import { APP_LOCALES, type AppLocale } from "../i18n/locales";
import { useSlidingPill } from "./useSlidingPill";

/**
 * Language switch with the same sliding pill as the theme tabs.
 *
 * Stripped back from the earlier version: no enclosing capsule, no border, no shadow. The
 * pill alone marks the active option, which is the least chrome that still shows state.
 *
 * Renders one button per shipped locale rather than a hardcoded pair. The pill needs no
 * layout work to follow: `useSlidingPill` measures the active button's offset and width and
 * re-measures on resize, which it already had to do because label widths differ by language.
 */
export function LocaleSwitch({
  locale,
  onChange,
  ariaLabel,
  labels,
}: {
  locale: AppLocale;
  onChange: (next: AppLocale) => void;
  ariaLabel: string;
  labels: Record<AppLocale, string>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useSlidingPill({
    containerRef,
    pillRef,
    activeSelector: '[aria-pressed="true"]',
    deps: [locale],
  });

  return (
    <div className="lp-locale" role="group" aria-label={ariaLabel} ref={containerRef}>
      <span className="lp-locale-pill" ref={pillRef} aria-hidden="true" />
      {APP_LOCALES.map((value) => (
        <button
          key={value}
          type="button"
          aria-pressed={locale === value}
          onClick={() => onChange(value)}
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}

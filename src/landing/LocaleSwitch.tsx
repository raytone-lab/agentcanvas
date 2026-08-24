import { useRef } from "react";

import type { AppLocale } from "../i18n/uiCopy";
import { useSlidingPill } from "./useSlidingPill";

/**
 * Two-state language switch with the same sliding pill as the theme tabs.
 *
 * Stripped back from the earlier version: no enclosing capsule, no border, no shadow. The
 * pill alone marks the active option, which is the least chrome that still shows state.
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
      {(["zh", "en"] as const).map((value) => (
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

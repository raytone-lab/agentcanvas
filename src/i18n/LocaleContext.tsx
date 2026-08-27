import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { HTML_LANG, isAppLocale, type AppLocale } from "./locales";
import { uiCopy } from "./uiCopy";

const STORAGE_KEY = "agentcanvas.locale";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  setLocale: () => undefined,
});

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "zh";
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isAppLocale(stored) ? stored : "zh";
  } catch {
    return "zh";
  }
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: AppLocale;
}) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale ?? readStoredLocale);

  const setLocale = useCallback((next: AppLocale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Session-only fallback when storage is unavailable.
    }
  }, []);

  /**
   * Keep `<html lang>` in step with the locale.
   *
   * Both entry HTML files ship a static `lang`, and editor.html's said `zh-CN` whatever the UI
   * was actually showing — so a screen reader read English and Japanese with a Chinese voice,
   * and font fallback picked Chinese glyph variants for kanji shared between the two.
   * Done here rather than per page so a new entry point cannot forget it.
   */
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function useCopy() {
  const { locale } = useContext(LocaleContext);
  return uiCopy[locale];
}

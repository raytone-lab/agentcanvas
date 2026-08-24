import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { uiCopy, type AppLocale } from "./uiCopy";

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
    return stored === "zh" || stored === "en" ? stored : "zh";
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

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "zh";

const STORAGE_KEY = "agentux.locale";

const dictionaries = {
  en: {
    brandSubtitle: "Agent frontend scaffold",
    run: { idle: "Replay", live: "Live" },
    panels: { conversation: "Conversation", output: "Output", git: "Source control" },
    composer: {
      placeholder: "What can I help you with today?",
      provider: "Provider",
      model: "Model",
    },
    lang: { en: "EN", zh: "ZH", switch: "Switch language" },
    emptyOutput: "No artifact yet - run a turn to populate output.",
    gitEmpty: "No repository changes.",
  },
  zh: {
    brandSubtitle: "Agent 前端脚手架",
    run: { idle: "回放", live: "实时" },
    panels: { conversation: "对话", output: "输出", git: "版本控制" },
    composer: {
      placeholder: "我今天能帮你做些什么？",
      provider: "服务商",
      model: "模型",
    },
    lang: { en: "EN", zh: "中文", switch: "切换语言" },
    emptyOutput: "暂无产物——运行一轮以填充输出。",
    gitEmpty: "没有仓库改动。",
  },
};

export type Copy = (typeof dictionaries)["en"];

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };

const LocaleContext = createContext<LocaleContextValue>({ locale: "en", setLocale: () => undefined });

function readStored(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "zh" || stored === "en" ? stored : "en";
  } catch {
    return "en";
  }
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStored);
  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage failures (private mode)
    }
  }, []);
  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useCopy(): Copy {
  return dictionaries[useContext(LocaleContext).locale];
}

export function LanguageSwitch() {
  const { locale, setLocale } = useContext(LocaleContext);
  const copy = dictionaries[locale];
  return (
    <div data-language-switch role="group" aria-label={copy.lang.switch}>
      <button type="button" data-active={locale === "en"} onClick={() => setLocale("en")}>{dictionaries.en.lang.en}</button>
      <button type="button" data-active={locale === "zh"} onClick={() => setLocale("zh")}>{dictionaries.zh.lang.zh}</button>
    </div>
  );
}

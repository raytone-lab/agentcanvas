import { chatCopy } from "./copy/chat";
import { composerCopy } from "./copy/composer";
import { shellCopy } from "./copy/shell";
import { workspaceCopy } from "./copy/workspace";

export type AppLocale = "en" | "zh";

/** @deprecated Use `useLocale()` from LocaleContext instead. Kept for transition. */
export const activeLocale: AppLocale = "en";

export const uiCopy = {
  en: {
    shell: shellCopy.en,
    composer: composerCopy.en,
    chat: chatCopy.en,
    workspace: workspaceCopy.en,
    // Back-compat alias for the original top-level namespace.
    reasoning: chatCopy.en.reasoning,
  },
  zh: {
    shell: shellCopy.zh,
    composer: composerCopy.zh,
    chat: chatCopy.zh,
    workspace: workspaceCopy.zh,
    reasoning: chatCopy.zh.reasoning,
  },
} as const;

export type UiCopy = (typeof uiCopy)["en"];

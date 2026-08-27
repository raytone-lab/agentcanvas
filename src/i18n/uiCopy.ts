import { chatCopy } from "./copy/chat";
import { composerCopy } from "./copy/composer";
import { previewCopy } from "./copy/preview";
import { shellCopy } from "./copy/shell";
import { workspaceCopy } from "./copy/workspace";
import { APP_LOCALES, type AppLocale } from "./locales";

// Re-exported because most of the app reaches for the type from here. The definition lives
// in ./locales so the dictionaries can annotate themselves without importing this module.
export { APP_LOCALES, isAppLocale, type AppLocale } from "./locales";

/** @deprecated Use `useLocale()` from LocaleContext instead. Kept for transition. */
export const activeLocale: AppLocale = "en";

/**
 * Assembled per locale rather than per domain so `UiCopy` can be read off `en` — the shape
 * every other locale is then checked against.
 */
const compose = (locale: AppLocale) => ({
  shell: shellCopy[locale],
  composer: composerCopy[locale],
  chat: chatCopy[locale],
  workspace: workspaceCopy[locale],
  preview: previewCopy[locale],
  // Back-compat alias for the original top-level namespace.
  reasoning: chatCopy[locale].reasoning,
});

export type UiCopy = ReturnType<typeof compose>;

/**
 * Listed explicitly rather than mapped over `APP_LOCALES`: `satisfies` then reports a locale
 * with no entry here, where a computed object plus an `as` cast would silently accept one.
 */
export const uiCopy = {
  en: compose("en"),
  zh: compose("zh"),
  ja: compose("ja"),
} satisfies Record<AppLocale, UiCopy>;

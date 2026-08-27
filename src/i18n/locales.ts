/**
 * The set of UI locales, and nothing else.
 *
 * Its own module so it can have no imports. The copy dictionaries annotate themselves
 * `satisfies Record<AppLocale, T>`, which means they need this type — and they are what
 * `uiCopy.ts` is built from, so defining the type there would make every dictionary import
 * its own consumer. Type-only imports are erased and would not actually cycle at runtime,
 * but the graph reads as circular to anyone tracing it, and to some bundlers.
 *
 * Adding a locale is meant to be an edit to this array plus the dictionaries it makes the
 * compiler ask for. Nothing should branch on a specific locale outside a lookup table; the
 * whole point of `Record<AppLocale, T>` is that the compiler names what is missing.
 */
export const APP_LOCALES = ["en", "zh", "ja"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

/** Narrows an untrusted value (localStorage, a URL param) to a locale we actually ship. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (APP_LOCALES as readonly string[]).includes(value);
}

/**
 * BCP 47 tag for `<html lang>`, which is not always the locale key.
 *
 * `zh` needs a region to be useful — a screen reader picks a different voice for zh-CN than
 * zh-TW, and font stacks fall back differently. Kept here rather than inline at the one call
 * site so a new locale cannot be added without deciding its tag.
 */
export const HTML_LANG: Record<AppLocale, string> = {
  en: "en",
  zh: "zh-CN",
  ja: "ja",
};

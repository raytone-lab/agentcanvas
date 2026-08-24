import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { IconSetProvider } from "../agentmatrix/IconSetContext";
import { LocaleProvider } from "../i18n/LocaleContext";
import type { AppLocale } from "../i18n/uiCopy";

/** Match the providers used by the real app and exported scaffold. */
export function renderWithProviders(
  node: ReactNode,
  locale: AppLocale = "en",
): string {
  return renderToStaticMarkup(
    <LocaleProvider initialLocale={locale}>
      <IconSetProvider>{node}</IconSetProvider>
    </LocaleProvider>,
  );
}

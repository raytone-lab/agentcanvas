import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { LocaleProvider } from "../i18n/LocaleContext";
// The design system's tokens and element reset. Imported, never modified — every landing
// rule lives in `landing.css` behind a `.lp-*` prefix.
import "../styles/app.css";
import { Landing } from "./Landing";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

// Shares `LocaleProvider` with the editor, so the `agentcanvas.locale` choice made here
// carries over to /editor.html instead of resetting.
createRoot(root).render(
  <StrictMode>
    <LocaleProvider>
      <Landing />
    </LocaleProvider>
  </StrictMode>,
);

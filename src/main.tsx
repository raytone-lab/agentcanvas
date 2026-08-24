import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { IconSetProvider } from "./agentmatrix";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LocaleProvider } from "./i18n/LocaleContext";
import "generative-loaders/styles.css";
import "./styles/app.css";
import "./styles/agentmatrix.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <LocaleProvider>
        <IconSetProvider>
          <App />
        </IconSetProvider>
      </LocaleProvider>
    </ErrorBoundary>
  </StrictMode>,
);

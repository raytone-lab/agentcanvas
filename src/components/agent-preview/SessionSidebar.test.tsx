/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconSetProvider } from "../../agentmatrix";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { SessionSidebar, type SessionSidebarItem } from "./SessionSidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<{ container: HTMLDivElement; unmount: () => void }> = [];

async function renderSidebar(props: {
  sessionPrompts?: readonly string[];
  sessionItems?: readonly SessionSidebarItem[];
  activeSessionId?: string;
  onSelectSession?: (prompt: string) => void;
  search?: boolean;
}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mounted.push({ container, unmount: () => root.unmount() });

  await act(async () => {
    root.render(
      <LocaleProvider initialLocale="en">
        <IconSetProvider>
          <SessionSidebar
            project={props.search === undefined
              ? defaultCodingAgentProject
              : {
                  ...defaultCodingAgentProject,
                  sidebar: { ...defaultCodingAgentProject.sidebar, search: props.search },
                }}
            sessionPrompts={props.sessionPrompts}
            sessionItems={props.sessionItems}
            activeSessionId={props.activeSessionId}
            onSelectSession={props.onSelectSession}
          />
        </IconSetProvider>
      </LocaleProvider>,
    );
  });

  return container;
}

afterEach(async () => {
  await act(async () => {
    for (const item of mounted.splice(0)) item.unmount();
  });
  document.body.replaceChildren();
});

describe("SessionSidebar session data contract", () => {
  it("keeps configured search visible without fabricating history", async () => {
    const container = await renderSidebar({});

    expect(container.querySelector('[aria-label="Search chats"]')).not.toBeNull();
    expect(container.querySelector(".session-list")).toBeNull();
    expect(container.textContent).not.toContain("What can this agent do?");
    expect(container.textContent).toContain("New chat");
  });

  it("hides search when the exported configuration turns it off", async () => {
    const container = await renderSidebar({ search: false });

    expect(container.querySelector('[aria-label="Search chats"]')).toBeNull();
  });

  it("does not render inert history when sessions have no selection handler", async () => {
    const container = await renderSidebar({ sessionPrompts: ["Unwired session"] });

    expect(container.querySelector(".session-list")).toBeNull();
    expect(container.textContent).not.toContain("Unwired session");
  });

  it("renders explicit sessions and forwards selection", async () => {
    const onSelectSession = vi.fn();
    const container = await renderSidebar({
      sessionPrompts: ["Inspect the export contract"],
      onSelectSession,
    });
    const row = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Inspect the export contract",
    );

    expect(row).toBeDefined();
    await act(async () => row?.click());
    expect(onSelectSession).toHaveBeenCalledOnce();
    expect(onSelectSession).toHaveBeenCalledWith("Inspect the export contract");
  });

  it("uses stable session IDs even when two conversations have the same title", async () => {
    const onSelectSession = vi.fn();
    const container = await renderSidebar({
      sessionItems: [{ id: "first", title: "Same title" }, { id: "second", title: "Same title" }],
      activeSessionId: "second",
      onSelectSession,
    });
    const rows = Array.from(container.querySelectorAll<HTMLButtonElement>(".session-item"));

    expect(rows).toHaveLength(2);
    expect(rows[1]?.getAttribute("aria-current")).toBe("true");
    await act(async () => rows[0]?.click());
    expect(onSelectSession).toHaveBeenCalledWith("first");
  });
});

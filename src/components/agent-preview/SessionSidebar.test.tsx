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
  /** Partial `project.sidebar`, for the tests about which parts are chosen. */
  sidebar?: Partial<typeof defaultCodingAgentProject.sidebar>;
  onCollapse?: () => void;
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
            project={props.search === undefined && props.sidebar === undefined
              ? defaultCodingAgentProject
              : {
                  ...defaultCodingAgentProject,
                  sidebar: {
                    ...defaultCodingAgentProject.sidebar,
                    ...(props.search === undefined ? {} : { search: props.search }),
                    ...props.sidebar,
                  },
                }}
            sessionPrompts={props.sessionPrompts}
            sessionItems={props.sessionItems}
            activeSessionId={props.activeSessionId}
            onSelectSession={props.onSelectSession}
            onCollapse={props.onCollapse}
          />
        </IconSetProvider>
      </LocaleProvider>,
    );
  });

  return container;
}

/** Nothing chosen, as a new project starts. */
const NO_SIDEBAR_PARTS = {
  title: false,
  collapse: false,
  newButton: false,
  search: false,
  sessionList: false,
  grouping: false,
  footer: false,
} as const;

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

  it("draws only the parts the project picked", async () => {
    // Every part of the column is a module the reader picks. The title, the
    // collapse control and the conversation rows used to arrive with the
    // component instead, so picking 搜索功能 put four things on the canvas.
    const container = await renderSidebar({
      sessionPrompts: ["Inspect the export contract"],
      onSelectSession: () => {},
      onCollapse: () => {},
      sidebar: { ...NO_SIDEBAR_PARTS, title: true },
    });

    expect(container.querySelector(".session-brand-name")?.textContent).toBe(
      defaultCodingAgentProject.name,
    );
    expect(container.querySelector(".session-collapse")).toBeNull();
    expect(container.querySelector(".session-list")).toBeNull();
    expect(container.querySelector(".session-new")).toBeNull();
    expect(container.querySelector(".session-footer")).toBeNull();
    expect(container.textContent).not.toContain("Inspect the export contract");
  });

  it("drops the header when none of its three parts are chosen", async () => {
    // The header is the title and the two controls beside it; with none of them
    // picked it is an empty band of padding at the top of the column.
    const container = await renderSidebar({
      onCollapse: () => {},
      sidebar: { ...NO_SIDEBAR_PARTS, sessionList: true },
    });

    expect(container.querySelector(".session-brand")).toBeNull();
  });

  it("brings the list along with the date headings", async () => {
    // Headings head a list, so asking for them asks for the list — otherwise
    // picking 日期分组 would be a pick that changed nothing.
    const container = await renderSidebar({
      sessionPrompts: ["Inspect the export contract"],
      onSelectSession: () => {},
      sidebar: { ...NO_SIDEBAR_PARTS, grouping: true, sessionList: true },
    });

    expect(container.querySelector(".session-list")).not.toBeNull();
    expect(Array.from(container.querySelectorAll("h4")).map((h) => h.textContent)).toContain("Today");
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

  it("groups timestamped sessions by the actual day instead of list position", async () => {
    const onSelectSession = vi.fn();
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const yesterday = dayStart.getTime() - 24 * 60 * 60 * 1000;
    const today = dayStart.getTime() + 60 * 60 * 1000; // 01:00 today
    const container = await renderSidebar({
      // Positionally the older session comes first — a positional slice would put
      // yesterday's row under "Today".
      sessionItems: [
        { id: "old", title: "Yesterday session", createdAt: yesterday },
        { id: "recent", title: "Today session", createdAt: today },
      ],
      onSelectSession,
    });
    const groups = Array.from(container.querySelectorAll("h4")).map((heading) => heading.textContent);
    const todayGroup = Array.from(container.querySelectorAll("h4"))
      .find((heading) => heading.textContent === "Today")?.parentElement;
    const todayTitles = todayGroup ? Array.from(todayGroup.querySelectorAll(".session-item")).map((row) => row.textContent) : [];

    expect(groups).toContain("Today");
    expect(groups).toContain("Earlier");
    expect(todayTitles).toContain("Today session");
    expect(todayTitles).not.toContain("Yesterday session");
  });

  it("falls back to positional grouping when sessions carry no timestamps", async () => {
    const onSelectSession = vi.fn();
    const container = await renderSidebar({
      sessionItems: [
        { id: "one", title: "First" },
        { id: "two", title: "Second" },
        { id: "three", title: "Third" },
        { id: "four", title: "Fourth" },
      ],
      onSelectSession,
    });
    const todayGroup = Array.from(container.querySelectorAll("h4"))
      .find((heading) => heading.textContent === "Today")?.parentElement;
    const todayTitles = todayGroup ? Array.from(todayGroup.querySelectorAll(".session-item")).map((row) => row.textContent) : [];
    expect(todayTitles).toEqual(["First", "Second", "Third"]);
  });
});

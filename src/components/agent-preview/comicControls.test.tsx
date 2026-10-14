// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LocaleProvider } from "../../i18n/LocaleContext";
import { defaultCodingAgentProject } from "../../schema/agentuxConfig";
import { ComposerFrame } from "./ComposerFrame";

describe("comic composer interactions", () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const project = {
    ...defaultCodingAgentProject,
    theme: { ...defaultCodingAgentProject.theme, stylePreset: "studio" as const },
  };

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  async function mount(isRunning = false) {
    container = document.createElement("div");
    container.className = "preview-frame";
    container.dataset.stylePreset = "studio";
    document.body.append(container);
    root = createRoot(container);
    const onStop = vi.fn();
    const onSubmit = vi.fn();
    await act(async () => {
      root.render(
        <LocaleProvider initialLocale="en">
          <ComposerFrame
            project={project}
            modelOptions={["gpt-4o"]}
            isRunning={isRunning}
            onModelChange={vi.fn()}
            onProviderChange={vi.fn()}
            onSubmit={onSubmit}
            onStop={onStop}
          />
        </LocaleProvider>,
      );
    });
    return { onStop, onSubmit };
  }

  it("keeps the icon-only send action named and blocks empty submissions", async () => {
    const { onSubmit } = await mount();
    const send = container.querySelector<HTMLButtonElement>(".send-button")!;
    expect(send.getAttribute("aria-label")).toBe("Send");
    expect(send.disabled).toBe(true);
    await act(async () => {
      container.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("stops an active run without submitting an empty prompt", async () => {
    const { onSubmit, onStop } = await mount(true);
    const stop = container.querySelector<HTMLButtonElement>(".send-button")!;
    expect(stop.getAttribute("aria-label")).toBe("Stop");
    expect(stop.disabled).toBe(false);
    await act(async () => stop.click());
    expect(onStop).toHaveBeenCalledOnce();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("opens the budget menu inside the product theme and applies a selection", async () => {
    await mount();
    const trigger = container.querySelector<HTMLButtonElement>(".budget-mode-trigger")!;
    await act(async () => {
      trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    const menu = container.querySelector('[role="menu"]');
    expect(menu).not.toBeNull();
    expect(menu?.closest(".preview-frame")).toBe(container);
    const firstOption = menu!.querySelector<HTMLElement>('[role="menuitem"]')!;
    const selectedLabel = firstOption.querySelector("strong")!.textContent;
    await act(async () => firstOption.click());
    expect(trigger.textContent).toContain(selectedLabel);
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});

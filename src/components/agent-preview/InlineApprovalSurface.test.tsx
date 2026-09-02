// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconSetProvider } from "../../agentmatrix";
import { LocaleProvider } from "../../i18n/LocaleContext";
import { InlineApprovalSurface } from "./ChatFrame";

const tool = {
  kind: "tool",
  id: "tool_rm_cache",
  name: "rm",
  title: "Remove temp cache",
  status: "awaiting_approval",
  approval: {
    prompt: "Remove .agent/tmp-cache recursively?",
    argsPreview: { path: ".agent/tmp-cache", recursive: true, force: true },
  },
} as never;

describe("InlineApprovalSurface", () => {
  let container: HTMLDivElement | undefined;
  let root: ReturnType<typeof createRoot> | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it("confirms the selected real approval decision", async () => {
    const onConfirm = vi.fn(async () => undefined);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <LocaleProvider initialLocale="en">
          <IconSetProvider>
            <InlineApprovalSurface tool={tool} onConfirm={onConfirm} />
          </IconSetProvider>
        </LocaleProvider>,
      );
    });

    const always = container.querySelector<HTMLButtonElement>('[data-approval-action="always"]');
    await act(async () => always?.click());

    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onConfirm).toHaveBeenCalledWith("always");
  });

  it("stays retryable when the approval request fails", async () => {
    const onConfirm = vi.fn(async () => {
      throw new Error("offline");
    });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(
        <LocaleProvider initialLocale="en">
          <IconSetProvider>
            <InlineApprovalSurface tool={tool} onConfirm={onConfirm} />
          </IconSetProvider>
        </LocaleProvider>,
      );
    });

    const allow = container.querySelector<HTMLButtonElement>('[data-approval-action="yes"]');
    await act(async () => allow?.click());

    expect(container.querySelector('[data-approval-surface="inline"]')).not.toBeNull();
    expect(allow?.disabled).toBe(false);
  });
});

// @vitest-environment jsdom

import {
  defaultAgentCanvasExperience,
  defaultAgentCanvasExperienceV2,
} from "@agentmatrix/agentcanvas-contract";
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";

import { ExperienceConfigurator } from "../src/ExperienceConfigurator";
import { ExperienceStudio } from "../src/ExperienceStudio";
import { ProductInterfaceStudio } from "../src/ProductInterfaceStudio";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cleanup: (() => void) | undefined;

afterEach(() => cleanup?.());

describe("ExperienceConfigurator interactions", () => {
  it("edits v2 Brand and Welcome while preserving Canvas state", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };

    function Harness() {
      const [value, setValue] = useState(defaultAgentCanvasExperienceV2);
      return <ProductInterfaceStudio value={value} onChange={setValue} />;
    }

    await act(() => root.render(<Harness />));
    const name = container.querySelector<HTMLInputElement>(
      'input[maxlength="128"]',
    )!;
    await input(name, "Signal Desk");
    expect(container.textContent).toContain("Signal Desk");

    await click(button(container, "Welcome"));
    const headline = [
      ...container.querySelectorAll<HTMLInputElement>("input"),
    ].find((candidate) => candidate.value === "How can I help?")!;
    await input(headline, "How can Signal Desk help?");
    expect(container.textContent).toContain("How can Signal Desk help?");

    const canvasTab = [...container.querySelectorAll("button")].find(
      (candidate) => candidate.textContent?.trim() === "Canvas",
    )!;
    await click(canvasTab);
    expect(container.querySelector(".agentcanvas-studio")).not.toBeNull();
    expect(container.textContent).toContain("Conversation");
  });

  it("edits only logical Brand and stylesheet asset references", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };
    let observed = defaultAgentCanvasExperienceV2;

    function Harness() {
      const [value, setValue] = useState(defaultAgentCanvasExperienceV2);
      return (
        <ProductInterfaceStudio
          value={value}
          onChange={(next) => {
            observed = next;
            setValue(next);
          }}
        />
      );
    }

    await act(() => root.render(<Harness />));
    const brandAsset = container.querySelector<HTMLInputElement>(
      'input[aria-label="Logical brand asset ID"]',
    )!;
    await input(brandAsset, "support-mark");
    expect(observed.brand.mark).toEqual({
      kind: "asset",
      assetId: "support-mark",
    });

    await input(brandAsset, "https://example.test/logo.svg");
    expect(brandAsset.getAttribute("aria-invalid")).toBe("true");
    expect(observed.brand.mark).toEqual({
      kind: "asset",
      assetId: "support-mark",
    });

    await click(button(container, "Add stylesheet asset"));
    expect(observed.extensions?.stylesheets).toEqual([
      { assetId: "stylesheet-1", layer: "overrides" },
    ]);
    expect(container.textContent).not.toContain("https://example.test");
  });

  it("keeps the Workspace-themed Studio shell separate from the selected product theme", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };

    function Harness() {
      const [value, setValue] = useState(defaultAgentCanvasExperienceV2);
      return (
        <ProductInterfaceStudio
          value={value}
          onChange={setValue}
          semanticTokens={{ canvas: "#fff7ed", text: "#292524" }}
        />
      );
    }

    await act(() => root.render(<Harness />));
    const shell = container.firstElementChild as HTMLElement;
    const productPreviewRoot = () =>
      container
        .querySelector(".agentcanvas-preview")
        ?.closest<HTMLElement>(".agentcanvas-embed");

    expect(shell.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#fff7ed",
    );
    expect(
      productPreviewRoot()?.style.getPropertyValue("--agentcanvas-canvas"),
    ).toBe("#f5f5f7");

    await click(button(container, "Canvas"));
    await click(button(container, "Theme"));
    await click(button(container, "Graphite mono"));
    expect(
      productPreviewRoot()?.style.getPropertyValue("--agentcanvas-canvas"),
    ).toBe("#17191d");

    await click(button(container, "Product UI"));
    expect(shell.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#fff7ed",
    );
    expect(
      productPreviewRoot()?.style.getPropertyValue("--agentcanvas-canvas"),
    ).toBe("#17191d");
  });

  it("changes Studio groups, options, scenarios, and viewports", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };

    function Harness() {
      const [value, setValue] = useState(defaultAgentCanvasExperience);
      return <ExperienceStudio value={value} onChange={setValue} />;
    }

    await act(() => root.render(<Harness />));
    await click(button(container, "Theme"));
    await click(button(container, "Graphite mono"));
    expect(
      container
        .querySelector(".agentcanvas-preview")
        ?.getAttribute("data-theme"),
    ).toBe("graphite");

    await click(button(container, "Welcome screen"));
    expect(container.textContent).toContain("How can your agent help?");

    await click(
      container.querySelector<HTMLButtonElement>(
        '[aria-label="Mobile preview"]',
      )!,
    );
    expect(
      container
        .querySelector(".agentcanvas-studio__canvas")
        ?.getAttribute("data-viewport"),
    ).toBe("mobile");
  });

  it("hides live terminal and unsupported renderer choices", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };
    const codeOnly = {
      ...defaultAgentCanvasExperience,
      output: {
        ...defaultAgentCanvasExperience.output,
        artifactRenderer: "code" as const,
        supportedArtifactRenderers: ["code" as const],
      },
    };

    await act(() =>
      root.render(
        <ExperienceConfigurator
          value={codeOnly}
          onChange={() => undefined}
          capabilities={{ liveRun: false }}
        />,
      ),
    );
    await click(button(container, "Tool Calls"));
    expect(container.textContent).not.toContain("Terminal drawer");

    await click(button(container, "Render"));
    const rendererLabels = [
      ...container.querySelectorAll(".agentcanvas-option__label"),
    ].map((element) => element.textContent);
    expect(rendererLabels).toContain("Auto renderer");
    expect(rendererLabels).toContain("Code");
    expect(rendererLabels).not.toContain("Data / form");
    expect(rendererLabels).not.toContain("Diff");
  });

  it("lets the host select and clear Code diffs and never exposes deferred export", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };

    function Harness() {
      const [value, setValue] = useState({
        ...defaultAgentCanvasExperience,
        blocks: { ...defaultAgentCanvasExperience.blocks, codeDiff: false },
        output: {
          ...defaultAgentCanvasExperience.output,
          artifactRenderer: "auto" as const,
        },
      });
      return (
        <ExperienceConfigurator
          value={value}
          onChange={setValue}
          capabilities={{ export: true }}
        />
      );
    }

    await act(() => root.render(<Harness />));
    expect(container.textContent).not.toContain("Export panel");

    await click(button(container, "Blocks"));
    const codeDiff = button(container, "Code diffs");
    expect(codeDiff.getAttribute("aria-pressed")).toBe("false");

    await click(codeDiff);
    expect(button(container, "Code diffs").getAttribute("aria-pressed")).toBe(
      "true",
    );

    await click(button(container, "Code diffs"));
    expect(button(container, "Code diffs").getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("keeps host tokens on the configurator shell while previewing the selected theme", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    cleanup = () => {
      act(() => root.unmount());
      container.remove();
    };

    function Harness() {
      const [value, setValue] = useState(defaultAgentCanvasExperience);
      return (
        <ExperienceConfigurator
          value={value}
          onChange={setValue}
          semanticTokens={{ canvas: "#hostcanvas", text: "#hosttext" }}
        />
      );
    }

    await act(() => root.render(<Harness />));
    const shellRoot = container.firstElementChild as HTMLElement;
    const previewRoot = container
      .querySelector(".agentcanvas-preview")
      ?.closest<HTMLElement>(".agentcanvas-embed");
    expect(shellRoot.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#hostcanvas",
    );
    expect(previewRoot?.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#f5f5f7",
    );

    await click(button(container, "Theme"));
    await click(button(container, "Graphite mono"));
    expect(previewRoot?.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#17191d",
    );
    expect(shellRoot.style.getPropertyValue("--agentcanvas-canvas")).toBe(
      "#hostcanvas",
    );
  });
});

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find((candidate) =>
    candidate.textContent?.trim().includes(label),
  );
  if (!match) throw new Error(`Button not found: ${label}`);
  return match;
}

async function click(target: HTMLButtonElement) {
  await act(() => target.click());
}

async function input(target: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  await act(() => {
    setter?.call(target, value);
    target.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

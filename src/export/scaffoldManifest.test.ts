import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import {
  SCAFFOLD_PUBLIC_ASSETS,
  createScaffoldExportSnapshot,
  createScaffoldPackageJson,
  loadScaffoldAssets,
} from "./scaffoldManifest";

describe("scaffold package manifest", () => {
  it("vendors AgentUX and ships the component runtime dependencies", () => {
    const manifest = createScaffoldPackageJson(defaultCodingAgentProject);
    expect(manifest.dependencies["@agent-ux/react"]).toBe("file:./vendor/agent-ux/react");
    expect(manifest.dependencies["@agent-ux/render-core"]).toBe("file:./vendor/agent-ux/render-core");
    // Real agent-preview components pull in Radix primitives, motion and thinking-orbs.
    expect(manifest.dependencies["@radix-ui/react-tooltip"]).toBeDefined();
    expect(manifest.dependencies.motion).toBeDefined();
    expect(manifest.dependencies["thinking-orbs"]).toBeDefined();
    expect(manifest.dependencies.react).toBeDefined();
    expect(manifest.dependencies["@earendil-works/pi-coding-agent"]).toBe("^0.84.4");
    expect(manifest.engines.node).toBe(">=22.19.0");
  });

  it("ships a working headless Pi runtime instead of inert composer controls", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    for (const file of [
      "src/pi/piClient.ts",
      "src/pi/piHost.ts",
      "src/pi/piVitePlugin.ts",
      "src/harness/adapters/piAdapter.ts",
    ]) {
      expect(snapshot.files).toContain(file);
    }
    expect(snapshot.fileContents["vite.config.ts"]).toContain("piRuntimePlugin()");
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell).toContain("runPiTurn");
    expect(shell).toContain("onSubmit: submitToPi");
    expect(shell).toContain("resolvePiApproval");
    expect(shell).not.toContain("onSubmit: noop");
  });

  it("ships the generated entry files", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    for (const file of [
      "README.md",
      "package.json",
      "index.html",
      "tsconfig.json",
      "vite.config.ts",
      "src/vite-env.d.ts",
      "src/exported-project.ts",
      "src/demo-events.ts",
      "src/agent-shell.tsx",
      "src/main.tsx",
    ]) {
      expect(snapshot.files).toContain(file);
    }
  });

  it("packages the REAL agent-preview components (single source of truth)", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    for (const file of [
      "src/components/agent-preview/ChatFrame.tsx",
      "src/components/agent-preview/ComposerFrame.tsx",
      "src/components/agent-preview/OutputFrame.tsx",
      "src/components/agent-preview/SessionSidebar.tsx",
      "src/components/agent-preview/GitFrame.tsx",
      "src/components/agent-preview/ReasoningBlock.tsx",
      "src/components/agent-preview/ToolCallCard.tsx",
      "src/components/ui/index.ts",
      "src/i18n/LocaleContext.tsx",
      "src/theme/applyTheme.ts",
      "src/agentmatrix/index.ts",
    ]) {
      expect(snapshot.files).toContain(file);
    }
    // The real component markup, not the old 93-line simplified copy.
    const chat = snapshot.fileContents["src/components/agent-preview/ChatFrame.tsx"] ?? "";
    expect(chat).toContain("chat-frame");
    expect(chat.length).toBeGreaterThan(5000);
  });

  it("inlines the real stylesheet so the export looks like the configurator", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const appCss = snapshot.fileContents["src/styles/app.css"] ?? "";
    expect(appCss.length).toBeGreaterThan(50_000);
    expect(appCss).toContain(".preview-frame");
    expect(appCss).toContain(".session-sidebar");
  });

  it("wires the entry through the same providers the app uses", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const main = snapshot.fileContents["src/main.tsx"] ?? "";
    expect(main).toContain("LocaleProvider");
    expect(main).toContain("IconSetProvider");
    // App.tsx wraps the whole tree in this; without it the exported app renders
    // line icons where the configurator renders bold ones.
    expect(main).toContain("IconStyleProvider");
    expect(main).toContain('import "./styles/app.css"');
  });

  it("renders through the real slot registry rather than a hand-written switch", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell).toContain("renderSlots");
    expect(shell).toContain('from "./slots/slotRegistry"');
    expect(snapshot.files).toContain("src/slots/slotRegistry.tsx");
    // The registry is an exhaustive Record over SlotConfig["component"], so these two
    // must resolve inside the zip even though an exported app never renders them.
    expect(snapshot.files).toContain("src/components/agent-preview/ExportFrame.tsx");
    expect(snapshot.files).toContain("src/components/debug-dock/DebugDock.tsx");
  });

  it("carries every attribute the configurator sets on .preview-frame", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell).toContain("preview-frame");
    for (const attribute of [
      "data-has-sidebar",
      "data-has-right-panel",
      "data-left-collapsed",
      "data-right-collapsed",
      "data-style-preset",
      "data-appearance",
      "data-welcome",
    ]) {
      expect(shell, `missing ${attribute}`).toContain(attribute);
    }
    // The style preset must come from the project — hardcoding it silently sent every
    // export down app.css's "native" branch.
    expect(shell).toContain("project.theme.stylePreset");
    // The configurator does not set data-theme; an extra attribute is a divergence too.
    expect(shell).not.toContain("data-theme");
  });

  it("passes the welcome-greeting context the configurator passes", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell).toContain("welcomeGreeting");
    expect(shell).toContain("isWelcome");
  });

  it("derives the same render policy the configurator derives from the project", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell).toContain("createReasoningRenderPolicy");
    expect(shell).toContain("errorCollapse");
    expect(shell).toContain("toolCalls.detail");
    expect(snapshot.files).toContain("src/preview/reasoningPreviewPolicy.ts");
  });

  it("ships every bundled event stream so each UI state can be inspected", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const demo = snapshot.fileContents["src/demo-events.ts"] ?? "";
    expect(demo).toContain("eventStreams");
    expect(demo).toContain("previewFixtures");
    expect(demo).toContain("SCENARIOS");
    expect(snapshot.files).toContain("src/preview/fixtures.ts");
    const jsonl = snapshot.files.filter((file) => file.endsWith(".events.jsonl"));
    expect(jsonl).toHaveLength(7);
    const scenarios = snapshot.files.filter((file) => file.startsWith("src/agentmatrix/fixtures/"));
    expect(scenarios).toHaveLength(9);
  });

  it("emits real stylesheets and assets from any working directory", async () => {
    // Regression: the Node read fallback used to resolve export paths against
    // process.cwd(), so exporting from anywhere but the project root produced 0-byte
    // stylesheets and no public/ assets — silently, and the app rendered unstyled.
    const original = process.cwd();
    try {
      process.chdir(tmpdir());
      const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
      expect((snapshot.fileContents["src/styles/app.css"] ?? "").length).toBeGreaterThan(50_000);
      expect((snapshot.fileContents["src/styles/agentmatrix.css"] ?? "").length).toBeGreaterThan(1_000);
      const assets = await loadScaffoldAssets();
      expect(Object.keys(assets)).toHaveLength(SCAFFOLD_PUBLIC_ASSETS.length);
    } finally {
      process.chdir(original);
    }
  });

  it("routes both modes through one event entry, never fixtures directly", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    // The shell must not reach for fixture data itself; it asks event-source.
    expect(shell).toContain('from "./event-source"');
    expect(shell).not.toContain('from "./demo-events"');
    expect(snapshot.files).toContain("src/event-source.ts");
  });

  it("keeps the fixture picker opt-in and out of the default product UI", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    const eventSource = snapshot.fileContents["src/event-source.ts"] ?? "";
    // Dev-only, explicit opt-in, AND fixture-mode-only: demo data must never surface as
    // product UI merely because the recipient followed the normal `npm run dev` instructions.
    expect(shell).toContain("import.meta.env.DEV");
    expect(shell).toContain("devtoolsRequested");
    expect(shell).toContain('get("devtools")');
    expect(shell).toContain('value === "1" || value === "true"');
    expect(shell).toContain("showPicker");
    expect(eventSource).toContain('project.runtime.transport !== "sse"');
    // Fixed position, so the picker cannot shift the frame and break parity.
    expect(shell).toContain('position: "fixed"');
    // Fixtures load dynamically, so the live path never requests that chunk.
    expect(eventSource).toContain('import("./demo-events")');
    expect(eventSource).not.toContain('from "./demo-events"');
    // ?stream=<id> selects a stream with no UI at all.
    expect(eventSource).toContain("stream");
    expect(eventSource).toContain("URLSearchParams");
  });

  it("ships selected sidebar search even before a session adapter has data", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const sidebar = snapshot.fileContents["src/components/agent-preview/SessionSidebar.tsx"] ?? "";
    const exportedProject = snapshot.fileContents["src/exported-project.ts"] ?? "";

    expect(exportedProject).toContain('\"search\": true');
    expect(sidebar).toContain("{search ? (");
    expect(sidebar).not.toContain("{search && hasSessions ? (");
  });

  it("lets app.css own the shell layout instead of re-implementing it inline", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    // `.exported-shell` shares `.builder-surface`'s rule, which is the sizing context
    // `.preview-frame` was designed against. Hardcoding padding/background here is what
    // made the exported layout not fit.
    expect(shell).toContain('className="exported-shell"');
    expect(shell).not.toContain('padding: "16px"');
    expect(shell).not.toContain("var(--surface-canvas)");
    const appCss = snapshot.fileContents["src/styles/app.css"] ?? "";
    expect(appCss).toContain(".exported-shell");
  });

  it("ships a backend adapter seam that keeps components off raw payloads", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    expect(snapshot.files).toContain("src/adapters/backendAdapter.ts");
    const adapter = snapshot.fileContents["src/adapters/backendAdapter.ts"] ?? "";
    expect(adapter).toContain("BackendEventAdapter");
    expect(adapter).toContain("toStandardEvents");
    expect(adapter).toContain("liveEventSource");
    // An unconfigured live export must stay empty rather than fall back to demo data.
    expect(adapter).toContain("return null;");
  });

  it("keeps the live entry independent of fixtures for an sse project", () => {
    const live = {
      ...defaultCodingAgentProject,
      runtime: { ...defaultCodingAgentProject.runtime, transport: "sse" as const },
    };
    const snapshot = createScaffoldExportSnapshot(live);
    const eventSource = snapshot.fileContents["src/event-source.ts"] ?? "";
    // Same module either way — the mode is a runtime branch, so the live path never
    // statically depends on fixture data.
    expect(eventSource).toContain("liveEventSource");
    expect(eventSource).not.toContain('from "./demo-events"');
    expect(snapshot.fileContents["src/exported-project.ts"]).toContain('"transport": "sse"');
  });

  it("downgrades the under-construction studio style to native", () => {
    const studio = {
      ...defaultCodingAgentProject,
      theme: { ...defaultCodingAgentProject.theme, stylePreset: "studio" as const },
    };
    const snapshot = createScaffoldExportSnapshot(studio);
    expect(snapshot.agentuxConfig.theme.stylePreset).toBe("native");
    expect(snapshot.fileContents["src/exported-project.ts"]).toContain('"stylePreset": "native"');
  });

  it("emits a portable vite config and a project snapshot", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    expect(snapshot.fileContents["vite.config.ts"]).toContain('base: "./"');
    // The vendored @agent-ux/* file: deps import bare react; without dedupe a second React
    // instance shows up as "Cannot read properties of null (reading 'useMemo')".
    expect(snapshot.fileContents["vite.config.ts"]).toContain('dedupe: ["react", "react-dom"]');
    const projectFile = snapshot.fileContents["src/exported-project.ts"] ?? "";
    expect(projectFile).toContain("export const project");
    expect(projectFile).toContain(defaultCodingAgentProject.name);
  });

  it("vendors the AgentUX SDK dist and gives every file content", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    expect(snapshot.files).toContain("vendor/agent-ux/react/dist/index.js");
    expect(snapshot.files).toContain("vendor/agent-ux/protocol/package.json");
    for (const file of snapshot.files) {
      expect(snapshot.fileContents[file], `content for ${file}`).toBeTruthy();
    }
  });
});

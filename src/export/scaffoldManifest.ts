import { appVersion } from "../appVersion";
import { assertValidProject, type AgentFrontendProject } from "../schema/agentuxConfig";
import { themeTokens } from "../theme/themeTokens";
import { scaffoldTemplateContent } from "./scaffoldTemplates";

/**
 * Export pipeline — single source of truth.
 *
 * The exported zip packages the REAL configurator components (`src/components/agent-preview/*`
 * and their dependency closure: ui primitives, i18n, theme, the agentmatrix icon layer, the
 * agentux runtime re-exports, and the global stylesheet `styles/app.css`). The files are read
 * verbatim via Vite `?raw` and written to the zip at their original `src/...` paths, so every
 * relative import keeps resolving. A tiny generated entry (`main.tsx` + `agent-shell.tsx`)
 * mounts them and replays a demo event stream.
 *
 * Result: what the builder previews and what the user downloads are the SAME components — no
 * separate simplified template to drift out of sync.
 */

const agentUxVendorPackages = ["protocol", "runtime", "render-core", "react"] as const;

const agentUxVendorFiles = agentUxVendorPackages.flatMap((packageName) => [
  `vendor/agent-ux/${packageName}/package.json`,
  `vendor/agent-ux/${packageName}/dist/index.js`,
  `vendor/agent-ux/${packageName}/dist/index.d.ts`,
]);

const agentCanvasContractVendorModules = import.meta.glob(
  "../../packages/contract/dist/**/*.{js,d.ts,json}",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const agentCanvasContractVendorByExportPath: Record<string, string> =
  Object.fromEntries(
    Object.entries(agentCanvasContractVendorModules).map(([key, content]) => [
      key.replace(
        /^\.\.\/\.\.\/packages\/contract\//,
        "vendor/agentmatrix/agentcanvas-contract/",
      ),
      content.replace(/^\/\/# sourceMappingURL=.*(?:\r?\n|$)/gm, ""),
    ]),
  );

const agentCanvasContractVendorFiles = [
  "vendor/agentmatrix/agentcanvas-contract/package.json",
  ...Object.keys(agentCanvasContractVendorByExportPath),
];

function agentUxVendorDependency(packageName: typeof agentUxVendorPackages[number]): string {
  return `file:./vendor/agent-ux/${packageName}`;
}

const agentCanvasContractVendorDependency =
  "file:./vendor/agentmatrix/agentcanvas-contract";

export type ScaffoldPackageJson = {
  name: string;
  private: boolean;
  version: string;
  type: "module";
  engines: { node: string };
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

export type ScaffoldExportSnapshot = {
  packageJson: ScaffoldPackageJson;
  agentuxConfig: AgentFrontendProject;
  files: string[];
  fileContents: Record<string, string>;
};

// ---------------------------------------------------------------------------
// Binary assets from public/.
// ---------------------------------------------------------------------------
// `app.css` and `OutputFrame.tsx` reference these by absolute path, so they must sit in
// the exported public/ or the style-preset cards render with no background and the output
// preview thumbnails come out broken. Only referenced files are shipped: public/remotion/**
// belongs to the Remotion video, and style-card-placeholder.png has no referent.
//
// Loaded at export time rather than inlined via `?inline`: these six total ~1.8MB, which
// base64 would add ~2.4MB to the configurator's own bundle (currently ~630KB).
export const SCAFFOLD_PUBLIC_ASSETS = [
  "style-native.png",
  "style-minimal.png",
  "style-illustrated.png",
  "output-previews/product-projector.png",
  "output-previews/aurora.png",
  "output-previews/lens.png",
] as const;

export type ScaffoldAssetMap = Record<string, Uint8Array>;

/**
 * Read the public/ assets the export references.
 *
 * Browser: fetched from the running origin (the configurator serves public/ at the root).
 * Node/vitest: read from disk via the same guarded `node:fs` handle used for CSS.
 * A missing asset is skipped with a warning rather than failing the export — a zip with
 * one broken image beats no zip at all.
 */
export async function loadScaffoldAssets(): Promise<ScaffoldAssetMap> {
  const assets: ScaffoldAssetMap = {};

  for (const name of SCAFFOLD_PUBLIC_ASSETS) {
    const exportPath = `public/${name}`;
    try {
      if (nodeReadFile) {
        assets[exportPath] = nodeReadFile(exportPath);
        continue;
      }
      const response = await fetch(`/${name}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      assets[exportPath] = new Uint8Array(await response.arrayBuffer());
    } catch (error) {
      console.warn(`[AgentCanvas export] skipped asset ${name}:`, error);
    }
  }

  return assets;
}

// ---------------------------------------------------------------------------
// Real source closure — globbed verbatim and shipped at their original paths.
// ---------------------------------------------------------------------------
// Patterns are relative to this file (src/export/). Negative patterns drop tests
// and configurator-only modules (ExportFrame pulls the export pipeline itself;
// agentmatrix/export pulls jszip).
const realSourceModules = import.meta.glob(
  [
    "../components/agent-preview/**/*.{ts,tsx,css}",
    "../components/ui/**/*.{ts,tsx,css}",
    "../components/common/**/*.{ts,tsx}",
    "../components/activity/**/*.{ts,tsx}",
    "../components/debug-dock/**/*.{ts,tsx}",
    "../components/ShimmerText.tsx",
    "../components/ErrorBoundary.tsx",
    "../i18n/**/*.{ts,tsx}",
    "../theme/**/*.{ts,tsx}",
    "../agentmatrix/**/*.{ts,tsx,json}",
    "../agentux/**/*.{ts,tsx}",
    "../runtime/toolDisplaySpec.ts",
    // The admission layer travels with the export: the exported app is the one that talks to a
    // real backend, so it is the one that most needs a vendor's stream narrowed to what these
    // components can render — and needs to say so out loud when it cannot.
    "../runtime/eventNormalizer.ts",
    "../runtime/eventContract.ts",
    "../runtime/admissionReport.ts",
    // Vendor adapters: one table per backend, so an exported package can be pointed at Codex,
    // Claude Code, opencode or the Anthropic API without editing a component.
    "../harness/HarnessAdapter.ts",
    "../harness/attachments.ts",
    "../harness/adapters/**/*.ts",
    "../pi/**/*.ts",
    "../appVersion.ts",
    "../schema/agentuxConfig.ts",
    "../schema/presets.ts",
    "../slots/slotRegistry.tsx",
    "../preview/fixtures.ts",
    "../preview/reasoningPreviewPolicy.ts",
    "../fixtures/agentux/**/*.jsonl",
    "../preview-runner/PreviewRunner.ts",
    "../harness/gitAdapter.ts",
    "../styles/app.css",
    "../styles/agentmatrix.css",
    "!../**/*.test.*",
    "!../components/agent-preview/ExportFrame.tsx",
    "!../agentmatrix/export/**",
  ],
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

// Map "../components/x" (glob key) -> "src/components/x" (path inside the zip).
const realSourceByExportPath: Record<string, string> = Object.fromEntries(
  Object.entries(realSourceModules).map(([key, content]) => [
    key.replace(/^\.\.\//, "src/"),
    content,
  ]),
);

const realSourceFiles = Object.keys(realSourceByExportPath);

// Vite's `?raw` returns real content for .tsx/.ts/.css in a BROWSER build (verified:
// app.css is inlined), but strips .css to an empty string under vitest/SSR. When that
// happens (Node only), fall back to reading the file from disk so the vitest smoke test
// and CI-generated packages get the real stylesheet too. Export paths mirror source
// paths ("src/..."), so a cwd-relative read resolves. The browser export never hits this.
function isNode(): boolean {
  const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
  return Boolean(proc && proc.versions && proc.versions.node);
}

// Node/vitest only. node:fs is loaded via a guarded dynamic import so the browser build
// never evaluates it: a *static* `import ... from "node:fs"` is replaced by Vite with a
// throwing browser stub that is read at module-load time, which white-screens the client.
// The isNode() guard means the browser never reaches this import at all.
let nodeReadFileSync: ((path: string) => string) | null = null;
let nodeReadFile: ((path: string) => Uint8Array) | null = null;
if (isNode()) {
  try {
    const fs = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const path = await import("node:path");
    // Anchor on this module, NOT process.cwd(). Export paths are repo-relative
    // ("src/...", "public/..."), and this file is <root>/src/export/, so the root is two
    // levels up. A cwd-relative read silently emitted EMPTY stylesheets and skipped every
    // public/ asset whenever the exporter ran from anywhere but the project root — the
    // generated app then rendered completely unstyled with no error anywhere.
    const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const at = (exportPath: string) => path.resolve(projectRoot, exportPath);
    nodeReadFileSync = (exportPath) => fs.readFileSync(at(exportPath), "utf8");
    nodeReadFile = (exportPath) => new Uint8Array(fs.readFileSync(at(exportPath)));
  } catch {
    /* leave null — fall back to the (possibly empty) globbed content */
  }
}

function resolveRawContent(exportPath: string, globbed: string): string {
  if (globbed && globbed.length > 0) return globbed;
  // Node/vitest only: Vite's `?raw` strips .css under SSR (browser build inlines it fine,
  // so the product export is unaffected). Read from disk so vitest-generated packages and
  // the smoke test get the real stylesheet. Export paths mirror source paths.
  if (nodeReadFileSync) {
    try {
      return nodeReadFileSync(exportPath);
    } catch {
      /* fall through */
    }
  }
  return globbed;
}

// Files the exporter synthesizes (not copied from source).
const GENERATED_FILES = [
  "README.md",
  // Instructions for the coding agent the user hands this folder to. The export is a
  // starting point that gets finished by an AI more often than by hand, and the failure
  // mode when it is not briefed is always the same: it writes a second set of components
  // instead of filling in the adapter.
  "AGENTS.md",
  "package.json",
  "index.html",
  "tsconfig.json",
  "vite.config.ts",
  "src/vite-env.d.ts",
  "src/exported-project.ts",
  "src/demo-events.ts",
  "src/agent-shell.tsx",
  "src/main.tsx",
  "src/event-source.ts",
  "src/adapters/backendAdapter.ts",
  // Stubs that satisfy `slots/slotRegistry.tsx`'s static imports. The registry is a
  // exhaustive Record over SlotConfig["component"], so ExportFrame has to resolve even
  // though an exported app has nothing to export; and the registry type-imports the
  // export pipeline, which we must not ship (it globs source and touches node:fs).
  "src/components/agent-preview/ExportFrame.tsx",
  "src/export/scaffoldManifest.ts",
] as const;

export function createScaffoldPackageJson(project: AgentFrontendProject): ScaffoldPackageJson {
  const packageName = project.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "agentux-scaffold";

  return {
    name: packageName,
    private: true,
    // Tracks the app, because `src/appVersion.ts` reads this and renders it in the footer.
    // Hardcoding it meant every exported package reported v0.1.0 forever, so the footer
    // disagreed with the configurator that produced it.
    version: appVersion,
    type: "module",
    engines: { node: ">=22.19.0" },
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      preview: "vite preview",
      typecheck: "tsc --noEmit",
    },
    dependencies: {
      "@agent-ux/protocol": agentUxVendorDependency("protocol"),
      "@agent-ux/react": agentUxVendorDependency("react"),
      "@agent-ux/render-core": agentUxVendorDependency("render-core"),
      "@agent-ux/runtime": agentUxVendorDependency("runtime"),
      "@agentmatrix/agentcanvas-contract": agentCanvasContractVendorDependency,
      "@earendil-works/pi-coding-agent": "^0.84.4",
      // `agentmatrix/icons.tsx` imports Phosphor for the "bold" icon weight, so the
      // exported package must declare it or `tsc` fails with TS2307 (the import is
      // currently unreferenced, so bundlers elide it — but typecheck still resolves it).
      "@phosphor-icons/react": "^2.1.10",
      "@radix-ui/react-dialog": "^1.1.16",
      "@radix-ui/react-dropdown-menu": "^2.1.17",
      "@radix-ui/react-popover": "^1.1.16",
      "@radix-ui/react-slider": "^1.4.0",
      "@radix-ui/react-switch": "^1.3.0",
      "@radix-ui/react-tabs": "^1.1.14",
      "@radix-ui/react-tooltip": "^1.2.8",
      "generative-loaders": "^0.1.1",
      "lucide-react": "^1.16.0",
      motion: "^12.40.0",
      react: "^19.2.6",
      "react-dom": "^19.2.6",
      "react-resizable-panels": "^4.11.1",
      "thinking-orbs": "^0.1.1",
    },
    devDependencies: {
      "@types/node": "^24.0.0",
      "@types/react": "^19.2.15",
      "@types/react-dom": "^19.2.3",
      "@vitejs/plugin-react": "^6.0.2",
      typescript: "^6.0.3",
      vite: "^8.0.14",
    },
  };
}

/**
 * "studio" is still under construction: in the configurator it renders a placeholder
 * panel ("正在搭建中…") rather than a real surface, and it contributes no `app.css`
 * rules. The exported app has no placeholder to show, so it falls back to "native".
 * Applied once here so the shell and `exported-project.ts` can never disagree.
 */
function exportableProject(project: AgentFrontendProject): AgentFrontendProject {
  if (project.theme.stylePreset !== "studio") return project;
  return { ...project, theme: { ...project.theme, stylePreset: "native" } };
}

export function createScaffoldExportSnapshot(input: AgentFrontendProject): ScaffoldExportSnapshot {
  assertValidProject(input);
  const project = exportableProject(input);
  const packageJson = createScaffoldPackageJson(project);
  const files = createScaffoldFiles(project);

  return {
    packageJson,
    agentuxConfig: project,
    files,
    fileContents: createScaffoldFileContents(project, files, packageJson),
  };
}

export function createScaffoldFiles(_project: AgentFrontendProject): string[] {
  return Array.from(
    new Set([
      ...GENERATED_FILES,
      ...realSourceFiles,
      ...agentUxVendorFiles,
      ...agentCanvasContractVendorFiles,
    ]),
  );
}

export function createScaffoldFileContents(
  project: AgentFrontendProject,
  files: readonly string[],
  packageJson: ScaffoldPackageJson = createScaffoldPackageJson(project),
): Record<string, string> {
  return Object.fromEntries(files.map((file) => [file, scaffoldFileContent(file, project, packageJson)]));
}

function scaffoldFileContent(file: string, project: AgentFrontendProject, packageJson: ScaffoldPackageJson): string {
  if (file === "README.md") return readmeContent(project, packageJson);
  if (file === "AGENTS.md") return agentsMdContent(project, packageJson);
  if (file === "package.json") return `${JSON.stringify(packageJson, null, 2)}\n`;
  if (file === "index.html") {
    return `<!doctype html><html><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${project.name}</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>\n`;
  }
  if (file === "tsconfig.json") return tsconfigContent();
  if (file === "vite.config.ts") {
    return [
      'import { defineConfig } from "vite";',
      'import react from "@vitejs/plugin-react";',
      'import { piRuntimePlugin } from "./src/pi/piVitePlugin.ts";',
      "",
      '// base: "./" emits relative asset paths so the built app works when served from any',
      "// subpath, not just the domain root.",
      "export default defineConfig({",
      '  base: "./",',
      "  plugins: [react(), piRuntimePlugin()],",
      "  resolve: {",
      "    // The vendored @agent-ux/* packages are linked via `file:./vendor/...` and import",
      "    // bare \"react\"/\"react-dom\". Without dedupe the bundler may resolve those from the",
      "    // vendor folder, which has no node_modules of its own — that yields a second React",
      "    // instance and the app dies with `Cannot read properties of null (reading 'useMemo')`.",
      "    // Force every import to resolve from this app.",
      '    dedupe: ["react", "react-dom"],',
      "  },",
      "});",
      "",
    ].join("\n");
  }
  if (file === "src/vite-env.d.ts") return `/// <reference types="vite/client" />\n`;
  if (file === "src/exported-project.ts") return exportedProjectContent(project);
  if (file === "src/demo-events.ts") return demoEventsContent();
  if (file === "src/agent-shell.tsx") return AGENT_SHELL_SOURCE;
  if (file === "src/main.tsx") return MAIN_SOURCE;
  if (file === "src/event-source.ts") return EVENT_SOURCE_SOURCE;
  if (file === "src/adapters/backendAdapter.ts") return BACKEND_ADAPTER_SOURCE;
  if (file === "src/components/agent-preview/ExportFrame.tsx") return EXPORT_FRAME_STUB_SOURCE;
  if (file === "src/export/scaffoldManifest.ts") return SCAFFOLD_MANIFEST_TYPE_STUB_SOURCE;
  if (file.startsWith("vendor/agent-ux/")) return agentUxVendorFileContent(file);
  if (file === "vendor/agentmatrix/agentcanvas-contract/package.json") {
    return `${JSON.stringify(agentCanvasContractVendorPackageJson(), null, 2)}\n`;
  }
  if (file.startsWith("vendor/agentmatrix/agentcanvas-contract/")) {
    return agentCanvasContractVendorByExportPath[file] ?? `export {};\n`;
  }

  const real = realSourceByExportPath[file];
  if (real !== undefined) return resolveRawContent(file, real);

  return `export {};\n`;
}

// ---------------------------------------------------------------------------
// Generated entry + shell (static; import the real components).
// ---------------------------------------------------------------------------

// Provider tree mirrors App.tsx (`IconStyleProvider` wraps everything at App.tsx:2449
// with "bold" for the native style, "line" otherwise).
const MAIN_SOURCE = `import { createRoot } from "react-dom/client";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LocaleProvider } from "./i18n/LocaleContext";
import { IconSetProvider, IconStyleProvider } from "./agentmatrix";
import { AgentApp } from "./agent-shell";
import { project } from "./exported-project";
import "./styles/app.css";
import "./styles/agentmatrix.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <LocaleProvider>
      <IconSetProvider>
        <IconStyleProvider value={project.theme.stylePreset === "native" ? "bold" : "line"}>
          <AgentApp />
        </IconStyleProvider>
      </IconSetProvider>
    </LocaleProvider>
  </ErrorBoundary>,
);
`;

const EVENT_SOURCE_SOURCE = `import { useEffect, useMemo, useState } from "react";
import type { AgentUXEvent } from "@agent-ux/protocol";

import { liveEventSource } from "./adapters/backendAdapter";
import { project } from "./exported-project";

/**
 * The single event entry point for this app.
 *
 * Fixtures are preview / development / test data — they are NOT product data, and no UI
 * component may reach for them. They are reachable only while \`runtime.transport\` is
 * "replay" or "mock"; with "sse" this module talks to the real backend through the
 * adapter in \`./adapters/backendAdapter\`. The dynamic import below keeps the fixtures out
 * of the main bundle: the build splits them into their own chunk which the live path never
 * requests. (The chunk file still ships — it just is not loaded.)
 *
 * Either way the output is the same: an array of AgentCanvas standard events, which flows
 * on through the view model and \`slotRegistry\` into the existing components.
 */
export const isFixtureMode = project.runtime.transport !== "sse";

type LoadedStream = { id: string; label: string; load: () => AgentUXEvent[] };

/**
 * \`?stream=<id>\` picks a stream with no UI involved, so screenshots and automation do not
 * depend on the dev-only picker.
 *
 * With no \`?stream=\`, nothing is selected and the app opens on its welcome screen. It used to
 * default to the first stream, so a freshly downloaded package opened mid-conversation —
 * showing somebody else's demo transcript instead of the product's own first impression.
 */
function requestedStreamId(streams: readonly LoadedStream[]): string {
  if (typeof window === "undefined") return "";
  const requested = new URLSearchParams(window.location.search).get("stream");
  if (!requested) return "";
  const match = streams.find(
    (item) => item.id === requested || item.id.endsWith(":" + requested),
  );
  return match ? match.id : "";
}

export type EventStreamOption = { id: string; label: string };

export type EventSourceState = {
  events: AgentUXEvent[];
  /** Empty unless a fixture mode is active. */
  streams: EventStreamOption[];
  streamId: string;
  setStreamId: (id: string) => void;
};

export function useEventSource(): EventSourceState {
  const [loaded, setLoaded] = useState<LoadedStream[]>([]);
  const [streamId, setStreamId] = useState("");
  const [liveEvents, setLiveEvents] = useState<AgentUXEvent[]>([]);

  // Preview / development only. Dynamic so the live path never loads the fixture chunk.
  useEffect(() => {
    if (!isFixtureMode) return;
    let cancelled = false;
    void import("./demo-events").then((module) => {
      if (cancelled) return;
      setLoaded(module.eventStreams);
      setStreamId((current) => current || requestedStreamId(module.eventStreams));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live backend. An unconfigured adapter yields no source, which leaves the app empty
  // rather than quietly falling back to demo data.
  useEffect(() => {
    if (isFixtureMode) return;
    const source = liveEventSource();
    if (!source) {
      console.warn(
        "[AgentCanvas] transport is \\"sse\\" but no live source is configured — " +
          "implement liveEventSource() in src/adapters/backendAdapter.ts.",
      );
      return;
    }
    return source.subscribe(
      (incoming) => setLiveEvents((current) => [...current, ...incoming]),
      (error) => console.error("[AgentCanvas] live event source failed:", error),
    );
  }, []);

  const events = useMemo(() => {
    if (!isFixtureMode) return liveEvents;
    const stream = loaded.find((item) => item.id === streamId);
    return stream ? stream.load() : [];
  }, [liveEvents, loaded, streamId]);

  const streams = useMemo(
    () => loaded.map((item) => ({ id: item.id, label: item.label })),
    [loaded],
  );

  return { events, streams, streamId, setStreamId };
}
`;

const BACKEND_ADAPTER_SOURCE = `import type { AgentUXEvent } from "@agent-ux/protocol";

/**
 * Backend adapter seam.
 *
 * UI components in this package never see backend payloads. They only ever consume the
 * view model produced from AgentCanvas standard events, so any backend — Claude, Codex,
 * OpenAI, LangGraph, or your own — plugs in here by translating its raw payloads into
 * StandardEvent values. Nothing downstream needs to change.
 *
 *   backend raw payload
 *     -> BackendEventAdapter.toStandardEvents()      <-- you implement this
 *     -> StandardEvent (AgentUX protocol)
 *     -> projector / view model
 *     -> slotRegistry -> existing UI components
 *
 * Already-supported states: text, reasoning, tool call lifecycle (including approval),
 * artifacts, errors, retries and interrupts. Emit the matching standard event and the
 * existing component renders it — do not build new UI for a new backend.
 */

/** The one event shape every UI component in this package understands. */
export type StandardEvent = AgentUXEvent;

export type BackendEventAdapter = {
  /**
   * Translate one raw backend payload into zero or more standard events.
   * Return [] for keep-alives and anything with no UI meaning.
   */
  toStandardEvents(raw: unknown): StandardEvent[];
};

export type LiveEventSource = {
  /** Returns an unsubscribe function. */
  subscribe(
    onEvents: (events: StandardEvent[]) => void,
    onError?: (error: unknown) => void,
  ): () => void;
};

/**
 * Pass-through adapter: use it when your endpoint already emits AgentCanvas standard
 * events. Replace it with your own translation for any other backend.
 */
export const passthroughAdapter: BackendEventAdapter = {
  toStandardEvents(raw) {
    return raw && typeof raw === "object" ? [raw as StandardEvent] : [];
  },
};

export type SseEventSourceOptions = {
  /** Stream URL, e.g. "/v1/sessions/abc/events/stream". */
  url: string;
  adapter?: BackendEventAdapter;
  headers?: Record<string, string>;
  fetcher?: typeof fetch;
};

/**
 * Minimal \`text/event-stream\` (or newline-delimited JSON) reader. Each \`data:\` line is
 * parsed as JSON and handed to the adapter.
 *
 * If your backend already speaks the AgentMatrix protocol, you can instead use
 * \`createBackendStreamSource\` from \`./agentmatrix\` and convert its durable events with
 * \`toAgentUXEvents\` — both ship in this package.
 */
export function createSseEventSource(options: SseEventSourceOptions): LiveEventSource {
  const adapter = options.adapter ?? passthroughAdapter;
  const fetcher = options.fetcher ?? fetch;

  return {
    subscribe(onEvents, onError) {
      const controller = new AbortController();

      void (async () => {
        try {
          const response = await fetcher(options.url, {
            method: "GET",
            headers: { Accept: "text/event-stream", ...(options.headers ?? {}) },
            signal: controller.signal,
          });
          if (!response.ok || !response.body) {
            throw new Error("Event stream failed: " + response.status);
          }
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const parts = buffer.split(/\\r?\\n\\r?\\n|\\r?\\n/);
            buffer = parts.pop() ?? "";
            for (const part of parts) {
              const line = part.startsWith("data:") ? part.slice(5).trim() : part.trim();
              if (!line || line === "[DONE]") continue;
              try {
                const events = adapter.toStandardEvents(JSON.parse(line));
                if (events.length > 0) onEvents(events);
              } catch {
                // Ignore keep-alive / comment lines.
              }
            }
          }
        } catch (error) {
          if (!controller.signal.aborted) onError?.(error);
        }
      })();

      return () => controller.abort();
    },
  };
}

/**
 * Wire your backend here. Returning \`null\` (the default) leaves the app with no live
 * source, which is why an unconfigured \`transport: "sse"\` export renders an empty
 * conversation instead of silently falling back to demo data.
 */
export function liveEventSource(): LiveEventSource | null {
  // return createSseEventSource({ url: "/v1/sessions/current/events/stream" });
  return null;
}
`;

const EXPORT_FRAME_STUB_SOURCE = `import type { ScaffoldExportSnapshot } from "../../export/scaffoldManifest";

/**
 * Stub. In AgentCanvas this panel downloads the scaffold zip; an exported app has
 * nothing to export, but \`slots/slotRegistry.tsx\` is an exhaustive registry over
 * every SlotConfig component, so the module has to exist. The "ExportFrame" slot is
 * not part of an exported layout, so this never renders.
 */
export function ExportFrame(_props: { snapshot?: ScaffoldExportSnapshot; onExport: () => void }) {
  return null;
}
`;

const SCAFFOLD_MANIFEST_TYPE_STUB_SOURCE = `/**
 * Type-only stub. \`slots/slotRegistry.tsx\` type-imports ScaffoldExportSnapshot from
 * here; the real export pipeline is deliberately not shipped (it globs the source tree
 * and reads node:fs). Nothing in an exported app produces one of these values.
 */
export type ScaffoldExportSnapshot = {
  packageJson: unknown;
  agentuxConfig: unknown;
  files: string[];
  fileContents: Record<string, string>;
};
`;

const AGENT_SHELL_SOURCE = `import { useEffect, useMemo, useRef, useState } from "react";
import { agentUXEventBuilders, type AgentUXEvent } from "@agent-ux/protocol";
import { useAgentUXReplay } from "@agent-ux/react";
import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from "react-resizable-panels";
import { PanelLeft, PanelRight } from "lucide-react";

import {
  OutputPanelModal,
  normalizeOutputPanelRequest,
  type OutputPanelItem,
  type OutputPanelOpenRequest,
} from "./components/agent-preview/OutputFrame";
import { ProviderFloatingSettings } from "./components/agent-preview/ProviderFloatingSettings";
import type { ComposerSubmitContext } from "./components/agent-preview/ComposerFrame";
import { RightSidebarRailIcon, SidebarRailIcon } from "./components/common/RailIcons";
import { SelectMenu } from "./components/ui/select-menu";
import { gitPreviewStateFromEvents } from "./harness/gitAdapter";
import { useCopy, useLocale } from "./i18n/LocaleContext";
import { localizePreviewViewModel } from "./i18n/previewLocalization";
import { createReasoningRenderPolicy } from "./preview/reasoningPreviewPolicy";
import {
  defaultProviderConnection,
  modelOptionsForProject,
  type ProviderConnection,
  type ProviderConnectionId,
  type SlotConfig,
} from "./schema/agentuxConfig";
import { renderSlots, slotsForTemplate, type SlotRenderContext } from "./slots/slotRegistry";
import { applyTheme } from "./theme/applyTheme";
import { themeTokens } from "./theme/themeTokens";
import { isFixtureMode, useEventSource } from "./event-source";
import { project } from "./exported-project";
import {
  abortPiRun,
  configurePiRuntime,
  getPiRuntimeState,
  resolvePiApproval,
  runPiTurn,
  startNewPiSession,
  type PiRuntimeState,
} from "./pi/piClient";

const noop = () => {};
const PREVIEW_RESPONSIVE_WIDTHS = {
  hideRightPanel: 860,
  hideLeftSidebar: 660,
} as const;

/** Development fixtures are useful, but their controls are not part of the composed product. */
function devtoolsRequested(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const value = new URLSearchParams(window.location.search).get("devtools");
  return value === "1" || value === "true";
}

/**
 * The exported agent surface.
 *
 * This renders through the SAME \`slots/slotRegistry\` the AgentCanvas configurator uses,
 * with the same \`data-*\` attributes on \`.preview-frame\` (App.tsx:2902-2911) and the same
 * render policy derived from the project (App.tsx:1210-1221). Anything visual is decided
 * by the real components + \`styles/app.css\`, not re-implemented here — that is what keeps
 * the export from drifting away from what you previewed.
 *
 * Pi is mounted by the generated Vite config, so submit, stop, provider/model selection and
 * tool approvals are live while the same fixture path remains available for visual QA.
 */
export function AgentApp() {
  const { locale } = useLocale();
  const copy = useCopy();
  const frameRef = useRef<HTMLDivElement>(null);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [autoHiddenRails, setAutoHiddenRails] = useState({ left: false, right: false });
  const [outputPanelItems, setOutputPanelItems] = useState<OutputPanelItem[]>([]);
  const [activeOutputPanelItemId, setActiveOutputPanelItemId] = useState<string | undefined>(undefined);
  const [outputModalOpen, setOutputModalOpen] = useState(false);
  const [outputSource, setOutputSource] = useState(project.output.source);
  const [sessionKeys, setSessionKeys] = useState<Record<string, string>>({});
  const [configuredProject, setConfiguredProject] = useState(project);
  const [piEvents, setPiEvents] = useState<AgentUXEvent[] | undefined>(undefined);
  const [piPrompt, setPiPrompt] = useState("");
  const [piRunning, setPiRunning] = useState(false);
  const [piRuntimeState, setPiRuntimeState] = useState<PiRuntimeState>();
  const piAbortRef = useRef<AbortController | undefined>(undefined);

  // Single entry for both modes: fixture replay (dev/preview) or the live backend
  // stream. Components never learn which one they got.
  const { events: sourceEvents, streams, streamId, setStreamId } = useEventSource();
  const events = piEvents ?? sourceEvents;

  // Mirrors the configurator's policy derivation so reasoning / tool / error states
  // render exactly as previewed.
  const reasoningRenderPolicy = useMemo(() => createReasoningRenderPolicy(project), []);
  const toolRenderPolicy = useMemo(
    () => ({
      showArgs: project.toolCalls.detail === "summary" ? ("safe" as const) : ("debug" as const),
      showResult: project.toolCalls.detail === "summary" ? ("summary" as const) : ("full" as const),
    }),
    [],
  );
  const { viewModel } = useAgentUXReplay(events, {
    policy: {
      reasoning: reasoningRenderPolicy,
      tool: toolRenderPolicy,
      error: { showDeveloperMessage: !project.blocks.errorCollapse, showRawError: false },
      visibility: { show: "developer" },
    },
  });
  const displayViewModel = useMemo(() => localizePreviewViewModel(viewModel, locale), [locale, viewModel]);
  const isWelcome = displayViewModel.timeline.length === 0;

  const activeProject = useMemo(
    () => ({ ...configuredProject, output: { ...configuredProject.output, source: outputSource } }),
    [configuredProject, outputSource],
  );

  useEffect(() => {
    void getPiRuntimeState().then(setPiRuntimeState).catch(() => undefined);
  }, []);

  useEffect(() => {
    const tokens = themeTokens[project.theme.preset] ?? Object.values(themeTokens)[0];
    applyTheme(tokens, document.documentElement);
    if (frameRef.current) applyTheme(tokens, frameRef.current);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateAutoHiddenRails = (width: number) => {
      const next = {
        right: width < PREVIEW_RESPONSIVE_WIDTHS.hideRightPanel,
        left: width < PREVIEW_RESPONSIVE_WIDTHS.hideLeftSidebar,
      };
      setAutoHiddenRails((current) =>
        current.left === next.left && current.right === next.right ? current : next,
      );
    };

    updateAutoHiddenRails(frame.getBoundingClientRect().width);
    const observer = new ResizeObserver((entries) => {
      updateAutoHiddenRails(entries[0]?.contentRect.width ?? frame.getBoundingClientRect().width);
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  const visibleLayoutSlots = useMemo(
    () => slotsForTemplate(activeProject.layout.slots, activeProject.template),
    [activeProject.layout.slots, activeProject.template],
  );
  const inRegion = (region: SlotConfig["region"]) =>
    visibleLayoutSlots.filter((slot) => slot.enabled && slot.region === region);
  const hasSidebar = inRegion("sidebar").length > 0;
  const hasRightPanel = inRegion("right-panel").length > 0;
  const leftSidebarMounted = hasSidebar && !autoHiddenRails.left;
  const leftSidebarVisible = leftSidebarMounted && !leftCollapsed;
  const rightPanelVisible = hasRightPanel && !rightCollapsed && !autoHiddenRails.right && !isWelcome;

  function openArtifact(request: OutputPanelOpenRequest) {
    const item = normalizeOutputPanelRequest(request);
    setOutputPanelItems((current) => {
      const index = current.findIndex((entry) => entry.id === item.id);
      if (index >= 0) {
        const next = [...current];
        next[index] = item;
        return next;
      }
      return [...current, item];
    });
    setActiveOutputPanelItemId(item.id);
    setOutputSource("artifact");
    if (rightPanelVisible) {
      setOutputModalOpen(false);
      setRightCollapsed(false);
      return;
    }
    setOutputModalOpen(true);
  }

  function closeOutputPanelItem(id: string) {
    setOutputPanelItems((current) => {
      const next = current.filter((entry) => entry.id !== id);
      if (next.length === 0) {
        setOutputModalOpen(false);
        setActiveOutputPanelItemId(undefined);
      } else if (activeOutputPanelItemId === id) {
        setActiveOutputPanelItemId(next[0].id);
      }
      return next;
    });
  }

  async function refreshPiRuntime() {
    const state = await getPiRuntimeState();
    setPiRuntimeState(state);
    return state;
  }

  async function submitToPi(prompt: string, context?: ComposerSubmitContext) {
    if (piRunning) return;
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) return;
    const provider = defaultProviderConnection(activeProject);
    const controller = new AbortController();
    piAbortRef.current = controller;
    setPiRunning(true);
    setPiPrompt(normalizedPrompt);
    setPiEvents([]);
    const nextEvents: AgentUXEvent[] = [];
    const runId = "pi_export_" + Date.now().toString(36);
    try {
      for await (const event of runPiTurn({
        prompt: normalizedPrompt,
        provider: provider.id,
        model: provider.defaultModel,
        thinkingLevel: context?.budgetMode === "fast" ? "low" : context?.budgetMode === "expert" ? "high" : "medium",
        permissionMode: context?.permissionMode ?? "request",
      }, { signal: controller.signal })) {
        if (controller.signal.aborted || piAbortRef.current !== controller) return;
        nextEvents.push(event);
        setPiEvents([...nextEvents]);
      }
      await refreshPiRuntime();
    } catch (error) {
      if (!controller.signal.aborted) {
        const message = error instanceof Error ? error.message : "Pi runtime failed.";
        if (nextEvents.length === 0) {
          nextEvents.push(agentUXEventBuilders.runStarted({
            id: runId + "_started",
            runId,
            seq: 1,
            ts: Date.now(),
          }, { title: "Pi session" }));
        }
        nextEvents.push(agentUXEventBuilders.runError({
          id: runId + "_error",
          runId,
          seq: nextEvents.length + 1,
          ts: Date.now(),
        }, { code: "pi_runtime_error", message, userMessage: message }));
        setPiEvents([...nextEvents]);
      }
    } finally {
      if (piAbortRef.current === controller) piAbortRef.current = undefined;
      setPiRunning(false);
    }
  }

  function stopPi() {
    piAbortRef.current?.abort();
    void abortPiRun();
    setPiRunning(false);
  }

  async function selectProvider(id: ProviderConnectionId) {
    const provider = activeProject.providers.connections.find((entry) => entry.id === id && entry.enabled);
    if (!provider) return;
    setConfiguredProject((current) => ({
      ...current,
      providers: { ...current.providers, defaultProviderId: id },
    }));
    setPiRuntimeState(await configurePiRuntime({ provider: id, model: provider.defaultModel }));
  }

  async function selectModel(model: string) {
    const provider = defaultProviderConnection(activeProject);
    updateProvider(provider.id, { defaultModel: model });
    setPiRuntimeState(await configurePiRuntime({ provider: provider.id, model }));
  }

  function updateProvider(id: ProviderConnectionId, patch: Partial<ProviderConnection> & { authEnvVar?: string }) {
    setConfiguredProject((current) => ({
      ...current,
      providers: {
        ...current.providers,
        connections: current.providers.connections.map((provider) => provider.id === id ? {
          ...provider,
          ...patch,
          auth: patch.authEnvVar && provider.auth.mode === "env"
            ? { ...provider.auth, envVar: patch.authEnvVar }
            : provider.auth,
        } : provider),
      },
    }));
  }

  async function savePiSettings() {
    const provider = defaultProviderConnection(activeProject);
    setPiRuntimeState(await configurePiRuntime({
      provider: provider.id,
      model: provider.defaultModel,
      apiKey: sessionKeys[provider.id]?.trim() || undefined,
    }));
  }

  async function fetchPiModels(provider: ProviderConnection, apiKey?: string) {
    const state = await configurePiRuntime({ provider: provider.id, apiKey: apiKey?.trim() || undefined });
    setPiRuntimeState(state);
    const models = state.models.filter((model) => model.provider === provider.id).map((model) => model.id);
    if (models.length > 0) updateProvider(provider.id, { models });
  }

  /**
   * Back to a clean welcome screen: deselect the stream and drop everything derived from it.
   * Leaving the artifact panel populated would show products of a conversation that is no
   * longer on screen.
   */
  function startNewSession() {
    setStreamId("");
    setPiEvents(undefined);
    setPiPrompt("");
    void startNewPiSession().then(setPiRuntimeState).catch(() => undefined);
    setOutputPanelItems([]);
    setActiveOutputPanelItemId(undefined);
    setOutputModalOpen(false);
    setLeftCollapsed(false);
    setRightCollapsed(false);
  }

  const slotContext: SlotRenderContext = {
    project: activeProject,
    viewModel: displayViewModel,
    events,
    // Must be set, not omitted. ChatFrame defaults this prop to a sample sentence ("Add
    // validation to the search input..."), so leaving it undefined prepended a user message
    // nobody sent to every exported app — while the configurator looked correct, because
    // App.tsx always passes a value. The default itself is load-bearing for 16 preset
    // rendering tests, so it stays; the omission here was the actual defect.
    previewPrompt: piPrompt,
    // A shipped scaffold has no session store yet. An explicit empty list keeps the shared
    // sidebar from presenting localized preview prompts as if they were real user history.
    sessionPrompts: [],
    showDebugBadges: false,
    gitPreviewState: gitPreviewStateFromEvents(events),
    modelOptions: modelOptionsForProject(activeProject),
    isRunning: piRunning,
    onSubmit: submitToPi,
    onStop: stopPi,
    onExport: noop,
    onGitCommit: noop,
    onProviderChange: (id) => void selectProvider(id),
    onModelChange: (model) => void selectModel(model),
    onApprovalDecision: (toolCallId, decision) => resolvePiApproval(toolCallId, decision),
    onCollapseLeft: () => setLeftCollapsed(true),
    onCollapseRight: () => setRightCollapsed(true),
    onOpenArtifact: openArtifact,
    outputPanelItems,
    activeOutputPanelItemId,
    onSelectOutputPanelItem: setActiveOutputPanelItemId,
    onCloseOutputPanelItem: closeOutputPanelItem,
    onOutputSourceChange: setOutputSource,
    // Not a no-op: starting a new conversation needs no backend, it just clears the transcript
    // and returns to the welcome screen. Wiring it to \`noop\` made the button look broken —
    // the one control in the shell a user is guaranteed to try.
    onNewSession: startNewSession,
    welcomeGreeting: activeProject.welcome.greeting,
    isWelcome,
    providerSettingsControl: (
      <ProviderFloatingSettings
        project={activeProject}
        sessionKeys={sessionKeys}
        onFetchModels={(provider, key) => void fetchPiModels(provider, key)}
        onSave={() => void savePiSettings()}
        onSetDefaultProvider={(id) => void selectProvider(id)}
        onSessionKeyChange={(id, value) => setSessionKeys((current) => ({ ...current, [id]: value }))}
        onTestProvider={(provider, key) => void fetchPiModels(provider, key)}
        onUpdateProvider={updateProvider}
      />
    ),
  };

  const previewOverlaySlots = renderSlots(
    visibleLayoutSlots.filter((slot) => slot.component === "OutputFrame"),
    "overlay",
    { ...slotContext, onCollapseRight: undefined },
  );

  const appearance = (themeTokens[project.theme.preset] ?? Object.values(themeTokens)[0]).appearance;
  // Explicit opt-in even in dev: npm run dev is how recipients first inspect the package,
  // so debug chrome must not appear unless they ask for it with ?devtools=1.
  const showPicker = devtoolsRequested() && isFixtureMode && streams.length > 0;
  // String concat (not a template literal) so this file can be emitted from the exporter.
  const mainSize = activeProject.layout.mainSize + "%";
  const rightSize = activeProject.layout.rightPanelSize + "%";

  return (
    // No inline layout: \`.exported-shell\` shares \`.builder-surface\`'s rule in app.css,
    // which is the sizing context \`.preview-frame\` and \`.preview-overlay-surface\` were
    // designed against. Re-implementing it here is what made the export "not fit".
    <div className="exported-shell" style={{ height: "100vh" }}>

      <>
        <div
          className="preview-frame"
          data-has-sidebar={hasSidebar}
          data-has-right-panel={rightPanelVisible}
          data-left-collapsed={leftCollapsed}
          data-right-collapsed={rightCollapsed}
          data-style-preset={project.theme.stylePreset}
          data-appearance={appearance}
          ref={frameRef}
        >
          {leftSidebarMounted ? renderSlots(visibleLayoutSlots, "sidebar", slotContext) : null}
          {rightPanelVisible ? (
            <PanelGroup className="preview-panels" orientation="horizontal">
              <Panel defaultSize={mainSize} minSize="52%">
                <section className="preview-stack" data-welcome={isWelcome ? "true" : undefined}>
                  {renderSlots(visibleLayoutSlots, "main", slotContext)}
                  {renderSlots(visibleLayoutSlots, "composer", slotContext)}
                </section>
              </Panel>
              <PanelResizeHandle className="resize-handle" />
              <Panel defaultSize={rightSize} minSize="24%">
                <aside className="right-panel">
                  {renderSlots(visibleLayoutSlots, "right-panel", slotContext)}
                </aside>
              </Panel>
            </PanelGroup>
          ) : (
            <section className="preview-stack preview-stack-solo" data-welcome={isWelcome ? "true" : undefined}>
              {renderSlots(visibleLayoutSlots, "main", slotContext)}
              {renderSlots(visibleLayoutSlots, "composer", slotContext)}
            </section>
          )}
          {hasSidebar && leftCollapsed && !autoHiddenRails.left ? (
            <button
              type="button"
              className="rail-icon-btn preview-rail-float"
              data-side="left"
              aria-label={copy.shell.editor.expandSidebar}
              onClick={() => setLeftCollapsed(false)}
            >
              <span className="native-rail-icon"><SidebarRailIcon size={15} /></span>
              <span className="legacy-rail-icon"><PanelLeft size={15} /></span>
            </button>
          ) : null}
          {hasRightPanel && rightCollapsed && !autoHiddenRails.right && !isWelcome ? (
            <button
              type="button"
              className="rail-icon-btn preview-rail-float"
              data-side="right"
              aria-label={copy.shell.editor.expandPanel}
              onClick={() => setRightCollapsed(false)}
            >
              <span className="native-rail-icon"><RightSidebarRailIcon size={15} /></span>
              <span className="legacy-rail-icon"><PanelRight size={15} /></span>
            </button>
          ) : null}
          {outputModalOpen ? (
            <OutputPanelModal
              items={outputPanelItems}
              activeId={activeOutputPanelItemId}
              onSelectItem={setActiveOutputPanelItemId}
              onCloseItem={closeOutputPanelItem}
              onClose={() => setOutputModalOpen(false)}
            />
          ) : null}
        </div>
        {previewOverlaySlots.length > 0 ? (
          <aside className="preview-overlay-surface" data-preview-region="overlay">
            {previewOverlaySlots}
          </aside>
        ) : null}
      </>

      {/* Preview/development scaffolding — never product UI. Opt in with ?devtools=1;
          use ?stream=<id> to select a stream without any UI. */}
      {showPicker ? (
        <div
          style={{
            position: "fixed",
            right: "16px",
            bottom: "16px",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 8px",
            borderRadius: "10px",
            background: "var(--surface-panel)",
            boxShadow: "var(--shadow)",
          }}
        >
          <span style={{ fontSize: "11px", opacity: 0.55, whiteSpace: "nowrap" }}>
            {copy.shell.editor.eventStreamLabel}
          </span>
          <SelectMenu
            size="sm"
            value={streamId}
            onValueChange={setStreamId}
            ariaLabel={copy.shell.editor.eventStreamAria}
            // The empty option is what "new conversation" returns to, and what the app opens
            // on. Without it the picker could never get back to the welcome screen.
            options={[
              { value: "", label: copy.shell.editor.eventStreamWelcome },
              ...streams.map((item) => ({ value: item.id, label: item.label })),
            ]}
          />
        </div>
      ) : null}
    </div>
  );
}
`;

function tsconfigContent(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        useDefineForClassFields: true,
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        skipLibCheck: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        forceConsistentCasingInFileNames: true,
        module: "ESNext",
        moduleResolution: "Bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
      },
      include: ["src"],
    },
    null,
    2,
  )}\n`;
}

function exportedProjectContent(project: AgentFrontendProject): string {
  return `import type { AgentFrontendProject } from "./schema/agentuxConfig";

// Snapshot of what was composed in AgentCanvas. Edit by hand to tweak the export.
export const project = ${JSON.stringify(project, null, 2)} as unknown as AgentFrontendProject;

export default project;
`;
}

// Realistic single-turn coding-agent run used to seed the exported preview.
const DEMO_FIXTURE_EVENTS: Array<Record<string, unknown>> = [
  { type: "run.started", payload: { title: "Add validation to the search input" } },
  { type: "text.started", payload: { textId: "txt_user", role: "user" } },
  { type: "text.delta", payload: { textId: "txt_user", delta: "Add input validation to the search box, then show me the patch." } },
  { type: "text.finished", payload: { textId: "txt_user" } },
  { type: "reasoning.status", payload: { reasoningId: "rsn_1", status: "planning", label: "Thinking" } },
  { type: "reasoning.delta", payload: { reasoningId: "rsn_1", kind: "summary", delta: "Read the current SearchInput, then add a validity check and loading state before wiring the request.", format: "plain" } },
  { type: "reasoning.finished", payload: { reasoningId: "rsn_1", collapsedByDefault: true } },
  { type: "tool.call.started", payload: { toolCallId: "tool_edit", name: "edit_file", title: "Patch SearchInput.tsx" } },
  { type: "tool.call.running", payload: { toolCallId: "tool_edit", args: { path: "src/components/SearchInput.tsx" } } },
  { type: "tool.call.result", payload: { toolCallId: "tool_edit", result: { changed: true, insertions: 18, deletions: 4 }, resultPreview: "+18 -4" } },
  { type: "tool.call.finished", payload: { toolCallId: "tool_edit", status: "success" } },
  { type: "artifact.created", payload: { artifactId: "art_patch", kind: "code", title: "SearchInput.tsx", mimeType: "text/typescript" } },
  { type: "artifact.delta", payload: { artifactId: "art_patch", format: "text", delta: "const isValid = query.trim().length >= 2;\n\nasync function handleSearch() {\n  if (!isValid || loading) return;\n  setLoading(true);\n  setError(null);\n  try {\n    await fetchResults(query.trim());\n  } catch {\n    setError(\"Failed to fetch results.\");\n  } finally {\n    setLoading(false);\n  }\n}" } },
  { type: "artifact.finished", payload: { artifactId: "art_patch", status: "success", uri: "memory://search-input" } },
  { type: "text.started", payload: { textId: "txt_assistant", role: "assistant", format: "markdown" } },
  { type: "text.delta", payload: { textId: "txt_assistant", delta: "Validation and loading state added. The search button is disabled for invalid input and a spinner shows while results load." } },
  { type: "text.finished", payload: { textId: "txt_assistant" } },
  { type: "run.finished", payload: { status: "success" } },
];

function demoEventsContent(): string {
  const jsonl = DEMO_FIXTURE_EVENTS
    .map((event, index) => JSON.stringify({ protocol: "agent-ux", version: "0.1", id: `evt_${index + 1}`, runId: "exported_fixture", seq: index + 1, ts: index + 1, ...event }))
    .join("\n");
  return `import type { AgentUXEvent } from "@agent-ux/protocol";
import { parseAgentUXEventJSONL } from "@agent-ux/runtime";

import { SCENARIOS, toAgentUXEvents } from "./agentmatrix";
import { parsePreviewFixture, previewFixtures } from "./preview/fixtures";

const builtinJsonl = ${JSON.stringify(jsonl)};

export type EventStream = {
  id: string;
  label: string;
  load: () => AgentUXEvent[];
};

/**
 * Every event stream bundled with this export, so each UI state (reasoning, tool
 * approval, retry, error, interrupt, artifacts, capabilities…) can actually be seen
 * and checked against the AgentCanvas preview. Use ?stream=<id> directly, or add
 * ?devtools=1 in development to reveal the fixture picker.
 *
 * - "Built-in demo" is the single happy-path run the exporter always ships.
 * - The AgentUX fixtures are the same JSONL the configurator previews.
 * - The AgentMatrix scenarios are converted through the same legacy adapter the
 *   configurator uses (\`toAgentUXEvents\`).
 */
export const eventStreams: EventStream[] = [
  {
    id: "builtin-demo",
    label: "Built-in demo",
    load: () => parseAgentUXEventJSONL(builtinJsonl),
  },
  ...previewFixtures.map((fixture) => ({
    id: "fixture:" + fixture.id,
    label: fixture.label,
    load: () => parsePreviewFixture(fixture),
  })),
  ...SCENARIOS.map((scenario) => ({
    id: "scenario:" + scenario.id,
    label: scenario.title,
    load: () => toAgentUXEvents(scenario.fixture.events, { title: scenario.title }) as unknown as AgentUXEvent[],
  })),
];

export function demoEvents(): AgentUXEvent[] {
  return eventStreams[0].load();
}
`;
}

function agentUxVendorFileContent(file: string): string {
  const [, , packageName, fileName, distFile] = file.split("/");
  if (fileName === "package.json") {
    return `${JSON.stringify(agentUxVendorPackageJson(packageName), null, 2)}\n`;
  }
  if (fileName === "dist" && distFile) {
    return scaffoldTemplateContent(file) ?? `export {};\n`;
  }
  return `export {};\n`;
}

function agentUxVendorPackageJson(packageName: string): Record<string, unknown> {
  const base = {
    name: `@agent-ux/${packageName}`,
    version: "0.1.0",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        default: "./dist/index.js",
      },
    },
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    private: true,
  };

  if (packageName === "runtime") {
    return { ...base, dependencies: { "@agent-ux/protocol": "file:../protocol" } };
  }
  if (packageName === "render-core") {
    return { ...base, dependencies: { "@agent-ux/protocol": "file:../protocol", "@agent-ux/runtime": "file:../runtime" } };
  }
  if (packageName === "react") {
    return {
      ...base,
      dependencies: {
        "@agent-ux/protocol": "file:../protocol",
        "@agent-ux/render-core": "file:../render-core",
        "@agent-ux/runtime": "file:../runtime",
      },
      peerDependencies: { react: ">=18.3.0 || >=19.0.0" },
    };
  }
  return base;
}

function agentCanvasContractVendorPackageJson(): Record<string, unknown> {
  return {
    name: "@agentmatrix/agentcanvas-contract",
    version: "0.2.0",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        default: "./dist/index.js",
      },
    },
    main: "./dist/index.js",
    types: "./dist/index.d.ts",
    private: true,
  };
}

/**
 * Bilingual usage guide shipped inside every exported zip so the end user knows
 * how to run it in an IDE / AI coding tool.
 */
function readmeContent(project: AgentFrontendProject, packageJson: ScaffoldPackageJson): string {
  const name = packageJson.name;
  const styleNote = project.theme.stylePreset === "native"
    ? []
    : [
      `> Style preset: \`${project.theme.stylePreset}\`. / 样式预设:\`${project.theme.stylePreset}\`。`,
      "",
    ];
  const lines = [
    `# ${name}`,
    "",
    "A self-contained Agent frontend exported from **AgentCanvas** — the same components the",
    "AgentCanvas builder previews. Vite + React + TypeScript, with the AgentUX SDK vendored",
    "under `vendor/`. / 从 **AgentCanvas** 导出的独立 Agent 前端(与配置器预览同一套组件),",
    "Vite + React + TypeScript,SDK 已内置在 `vendor/`,开箱即跑。",
    "",
    "---",
    "",
    "## Requirements / 环境要求",
    "- Node.js 22.19+ and npm / Node.js 22.19 及以上 + npm",
    "",
    "## Quick start / 快速开始",
    "```bash",
    "npm install",
    "npm run dev",
    "```",
    "Then open the local URL printed in the terminal (e.g. http://localhost:5173).",
    "然后打开终端里输出的本地地址(例如 http://localhost:5173)。",
    "",
    "## Production preview / 构建后预览",
    "```bash",
    "npm install",
    "npm run build",
    "npm run preview   # serves the built app over HTTP",
    "```",
    "Open the URL that `preview` prints (e.g. http://localhost:4173).",
    "打开 `preview` 输出的地址(例如 http://localhost:4173)。",
    "",
    "> ⚠️ Must be served over HTTP. Do NOT open `index.html` (source or `dist/`) by",
    "> double-clicking / via `file://` — browsers block ES module scripts on `file://`, so the",
    "> page shows up blank. Always use `npm run dev` or `npm run preview`.",
    "> ⚠️ 必须通过 HTTP 打开。**不要双击 / 用 `file://` 打开 `index.html`(源码或 dist 里的都不行)**",
    "> —— 浏览器禁止在 `file://` 下加载 ES module,页面会空白。请始终用 `npm run dev` 或 `npm run preview`。",
    "",
    "## Open with Codex / Claude / an AI IDE / 用 AI 编程工具打开",
    "`AGENTS.md` in this folder briefs a coding agent: where the backend seam is, which adapters",
    "already ship, and what not to rewrite. Point your tool at it before asking for changes —",
    "an unbriefed agent tends to build a second set of components instead of filling in the",
    "adapter, which throws away the interface you just composed.",
    "`AGENTS.md` 是给 AI 编程工具看的说明:后端接入点在哪、哪些 adapter 已自带、哪些不许重写。",
    "让工具先读它再动手——没有交代的 AI 通常会另做一套组件,而不是去填 adapter,",
    "那等于把你刚配好的界面扔掉。",
    "",
    "To just get it running, paste this:",
    "> This is a Vite + React + TypeScript project with the SDK vendored under `vendor/`. Read",
    "> AGENTS.md first. Run `npm install` then `npm run dev` and give me the local URL — do NOT",
    "> open index.html via file:// (ES modules are blocked there and the page goes blank). I",
    "> should see the composed Agent UI. Submit a prompt to run the bundled headless Pi agent;",
    "> use ?devtools=1 when you want the fixture-state picker.",
    "",
    "## What you should see / 预期效果",
    "- The full composed Agent interface; the composer runs Pi and fixtures remain available for QA.",
    "- 完整的 Agent 界面；输入框会运行 Pi，fixture 仍可用于逐项检查 UI 状态。",
    "",
    ...styleNote,
    "## Event-source modes / 事件来源模式",
    "`src/exported-project.ts` → `runtime.transport` decides where events come from. Everything",
    "downstream is identical, so components cannot tell the two apart.",
    "`src/exported-project.ts` 里的 `runtime.transport` 决定事件来源,下游完全一致,组件无法区分。",
    "",
    "| transport | Events from | Fixture picker |",
    "| --- | --- | --- |",
    "| `replay` / `mock` | bundled fixtures (preview & development data) | hidden by default; add `?devtools=1` |",
    "| `sse` | your backend, via the adapter | **hidden** |",
    "",
    "Pi turns use the bundled local runtime and temporarily replace the fixture/backend event list",
    "with the current Pi session events; they still enter the same AgentUX rendering pipeline.",
    "",
    "Fixtures are preview / development / test data only — never product data. No UI component",
    "imports them; `src/event-source.ts` loads them with a dynamic import, so the build splits them",
    "into their own chunk and the live path never requests it. / Fixture 仅用于预览、开发与测试,",
    "不是产品数据。任何 UI 组件都不引用它们;`src/event-source.ts` 用动态 import 加载,构建会拆成",
    "独立 chunk,live 路径永不请求(chunk 文件仍在 dist 里,只是不加载)。",
    "",
    "## Inspecting every UI state / 逐个查看 UI 状态",
    "In `replay` / `mock`, add `?devtools=1` to reveal a fixture picker for the built-in demo, the 7 AgentUX",
    "fixtures, and the 9 AgentMatrix scenarios — enough to check reasoning, tool call + result,",
    "approval, error, retry, exhausted/terminal incidents, interrupts, artifacts, and capability",
    "states against what you saw in AgentCanvas. / `replay`/`mock` 下,加 `?devtools=1` 可显示事件流选择器,切换内置 demo +",
    "7 个 AgentUX fixture + 9 个 AgentMatrix 场景,用来逐一核对思考、工具调用与结果、审批、错误、",
    "重试、耗尽/终止、打断、产物、能力等状态。",
    "",
    "## Connecting a real backend / 接入真实后端",
    "Edit `src/adapters/backendAdapter.ts` — that is the only file you need to touch:",
    "",
    "```",
    "backend raw payload",
    "  -> BackendEventAdapter.toStandardEvents()   <- you implement this",
    "  -> StandardEvent (AgentUX protocol)",
    "  -> view model",
    "  -> slotRegistry -> the existing UI components",
    "```",
    "",
    "1. Implement `toStandardEvents(raw)` for your backend. Return `[]` for keep-alives — but",
    "   check the two shortcuts below first, because for Claude Code, Codex and opencode the",
    "   translation already ships in this package.",
    "2. Return a source from `liveEventSource()` (`createSseEventSource` is provided).",
    "3. Set `runtime.transport` to `\"sse\"` in `src/exported-project.ts`.",
    "",
    "Text, reasoning, the whole tool-call lifecycle including approval, artifacts, errors, retries",
    "and interrupts are already handled: emit the matching standard event and the existing",
    "component renders it. **Do not build new UI for a new backend.** If your backend already",
    "speaks the AgentMatrix protocol, `createBackendStreamSource` (`./agentmatrix`) plus",
    "`toAgentUXEvents` are bundled too.",
    "1. 为你的后端实现 `toStandardEvents(raw)`——但先看下面两条捷径,Claude Code / Codex / opencode",
    "   的转译本包已自带;",
    "2. 在 `liveEventSource()` 里返回事件源(已提供 `createSseEventSource`);",
    "3. 把 `runtime.transport` 改成 `\"sse\"`。",
    "文本、思考、完整工具调用生命周期(含审批)、产物、错误、重试、打断都已支持——发出对应的标准事件,",
    "现有组件就会渲染。**不要为新后端另做一套 UI。**",
    "",
    "### Shortcut A — an agentic CLI's JSONL / 捷径 A:直接吃 CLI 的 JSONL",
    "Claude Code, Codex and opencode already run the loop (tools, approvals, file writes). Their",
    "process is not in the browser, so you consume the JSON lines they printed — and the mapping",
    "table for all three is already here. You write no translation.",
    "Claude Code / Codex / opencode 自己就会跑工具、审批、写文件。它们的进程不在浏览器里,所以你消费",
    "它们打印的 JSON 行——三家的映射表本包已自带,转译不用你写。",
    "",
    "```ts",
    "import { importHarnessJsonl } from \"../harness/adapters/jsonlImport\";",
    "",
    "const result = importHarnessJsonl(text, \"claude\");   // or \"codex\" | \"opencode\"",
    "if (result.ok) onEvents(result.events);",
    "else console.error(result.error);",
    "```",
    "",
    "For a live stream instead of a finished file: `parseHarnessLines` +",
    "`translateHarnessStream(lines, mappingForHarness(\"claude\"))`. Check `producedNothing(result)`",
    "— a table that matched nothing renders an empty transcript that looks like a working",
    "connection. / 流式场景用 `parseHarnessLines` + `translateHarnessStream`,并检查",
    "`producedNothing(result)`:表没匹配上时会渲染出一个「看起来连上了」的空对话。",
    "",
    "### Shortcut B — a model API directly / 捷径 B:直连模型 API",
    "One HTTP request to a model. **No tools are executed** — this is the chat-shaped route, not",
    "an agent that does work. / 一次 HTTP 请求,**不执行任何工具**——这是对话形态,不是会干活的 Agent。",
    "",
    "```ts",
    "import { createAnthropicHarness } from \"../harness/adapters/anthropicAdapter\";",
    "",
    "const harness = createAnthropicHarness({ baseUrl: \"/api/anthropic\", model: \"claude-sonnet-5\" });",
    "for await (const event of harness.connect({ prompt })) onEvents([event]);",
    "```",
    "",
    "> ⚠️ Do NOT put an API key in the browser. `baseUrl` is configurable so it can point at a",
    "> server you control that holds the key. A key shipped to the browser is a published key,",
    "> and Anthropic blocks direct browser calls with CORS unless an opt-in header is sent —",
    "> this package does not send it, so a browser aimed at `api.anthropic.com` fails either way.",
    "> ⚠️ 不要把 API key 放进浏览器。`baseUrl` 可配就是为了指向你自己持有密钥的服务端。前端带 key",
    "> 等于公开密钥;而且 Anthropic 会用 CORS 拦截浏览器直连(需要一个额外的 opt-in 头,本包不发),",
    "> 所以直接指向 `api.anthropic.com` 无论如何都不通。",
    "",
    "## Built-in Pi runtime / 内置 Pi 运行时",
    "The composer runs the open-source Pi agent through a same-origin local Node host. Submit, stop,",
    "new session, provider/model selection, model discovery and tool approvals work immediately.",
    "输入框通过同源本地 Node 服务运行开源 Pi Agent；发送、停止、新会话、模型切换、模型拉取和工具审批",
    "均已接通。Pi works in the exported folder, so its file and command tools use this folder as cwd.",
    "Pi 在导出目录中运行，因此读写文件和命令工具的工作目录就是当前导出目录。",
    "",
    "A session key is held in memory and sent only to the local Pi host. It is never written into",
    "the project, export zip or browser bundle. Pi can also use its normal local credentials.",
    "会话 Key 只保存在内存并发送给本机 Pi 服务，不会写入项目、ZIP 或浏览器 bundle；也可直接使用",
    "Pi 已有的本机凭据配置。Git commit/push remains a product-specific integration.",
    "",
    "## Customize / 自定义",
    "- `src/exported-project.ts` is the snapshot of what you composed — edit it to tweak layout,",
    "  theme, style preset, and enabled panels. / `src/exported-project.ts` 是你的配置快照,",
    "  可手改布局/主题/样式预设/面板。",
    "- UI components live under `src/components/agent-preview/`.",
    "- `src/agent-shell.tsx` renders through `src/slots/slotRegistry.tsx` — the same registry",
    "  AgentCanvas uses, which is why this package looks identical to the preview.",
    "  / `src/agent-shell.tsx` 经由 `src/slots/slotRegistry.tsx` 渲染(与配置器同一份注册表),",
    "  这是导出包与预览一致的原因。",
    "",
    "---",
    "",
    "_Generated by AgentCanvas._",
    "",
  ];
  return lines.join("\n");
}

/**
 * Briefing for a coding agent working inside an exported package.
 *
 * English only, unlike README.md. This file is read by a tool, not skimmed by the person who
 * downloaded the zip, and the vendor tables it has to name (`claude`, `codex`, `opencode`)
 * are English identifiers either way.
 *
 * The whole point is the "do not build UI" rule. An agent handed this folder with no context
 * reliably decides the fastest route to a working chat is a fresh component tree, which
 * throws away the interface the user just spent time composing — the one thing this package
 * exists to preserve.
 */
function agentsMdContent(project: AgentFrontendProject, packageJson: ScaffoldPackageJson): string {
  const lines = [
    "# AGENTS.md",
    "",
    `This is \`${packageJson.name}\`, an Agent frontend exported from AgentCanvas. Vite + React +`,
    "TypeScript, with the AgentUX SDK vendored under `vendor/`.",
    "",
    "## Run it first",
    "",
    "```bash",
    "npm install",
    "npm run dev",
    "```",
    "",
    "Report the local URL. Do NOT open `index.html` over `file://` — ES modules are blocked",
    "there and the page renders blank, which reads like a broken export.",
    "",
    "You should see the complete composed Agent interface. Fixture streams remain available for",
    "visual QA, and the composer is connected to the bundled headless Pi runtime.",
    "",
    "## The rule that matters",
    "",
    "**Do not build new UI components, and do not restructure the existing ones.**",
    "",
    "The interface in this package was composed by a person in a configurator. It is the",
    "deliverable. Every state a real agent produces already has a component: streaming text,",
    "reasoning, the full tool-call lifecycle including approval, artifacts, errors, retries,",
    "interrupts, Git panel, output panel.",
    "",
    "If something does not appear on screen, the event you emitted is wrong. It is never a",
    "missing component. Fix the translation, not the view.",
    "",
    "## Where your work goes",
    "",
    "One file:",
    "",
    "```",
    "src/adapters/backendAdapter.ts",
    "```",
    "",
    "```",
    "backend payload -> toStandardEvents() -> StandardEvent -> view model -> existing components",
    "```",
    "",
    "Then set `runtime.transport` to `\"sse\"` in `src/exported-project.ts`. An unconfigured",
    "`\"sse\"` export renders an empty conversation on purpose — it will not fall back to demo",
    "data, so an empty screen after your change means `liveEventSource()` returned `null`.",
    "",
    "## Check for a shipped adapter before writing a translation",
    "",
    "| Backend | Use | Do not |",
    "| --- | --- | --- |",
    "| Claude Code, Codex, opencode (CLI JSONL) | `importHarnessJsonl(text, \"claude\" \\| \"codex\" \\| \"opencode\")` from `src/harness/adapters/jsonlImport.ts` | hand-write a mapping — the tables ship here |",
    "| Pi (built in) | `src/pi/piHost.ts` + `src/harness/adapters/piAdapter.ts` | replace the composed UI or expose the SDK to the browser |",
    "| Anthropic Messages API | `createAnthropicHarness({ baseUrl, model })` from `src/harness/adapters/anthropicAdapter.ts` | put an API key in the browser |",
    "| AgentMatrix protocol | `createBackendStreamSource` + `toAgentUXEvents` from `./agentmatrix` | translate by hand |",
    "| Already emits AgentUX standard events | `passthroughAdapter` | write a no-op adapter |",
    "| Anything else | implement `toStandardEvents`, emit via `createEventWriter` | build components |",
    "",
    "For a live CLI stream rather than a saved file: `parseHarnessLines` +",
    "`translateHarnessStream(lines, mappingForHarness(id))`. Always check",
    "`producedNothing(result)` — a table that matches nothing produces an empty transcript that",
    "looks like a working connection, and reporting that is more useful than rendering silence.",
    "",
    "## Do not touch",
    "",
    "- `vendor/` — the vendored SDK. Patch upstream, not here.",
    "- `src/slots/slotRegistry.tsx` — an exhaustive registry over every slot component. Removing",
    "  an entry breaks the build; `src/components/agent-preview/ExportFrame.tsx` is an",
    "  intentional stub that exists only to satisfy it.",
    "- `src/components/agent-preview/**` — see the rule above.",
    "- Fixtures under `src/` are preview and test data, never product data. `src/event-source.ts`",
    "  loads them with a dynamic import so the live path never requests that chunk. Do not import",
    "  a fixture from a component to make something appear.",
    "",
    "`src/exported-project.ts` is the snapshot of what the user composed — layout, theme, style",
    "preset, enabled panels. Editing it is legitimate when the user asks for a layout change.",
    "Rewriting it to work around a translation bug is not.",
    "",
    "## Built-in Pi runtime",
    "",
    "`src/pi/piHost.ts` runs Pi in Node and `src/pi/piClient.ts` is the browser-safe same-origin",
    "client. Submit, stop, new session, provider/model configuration and approval decisions are",
    "already wired. Session keys stay in memory and must never be copied into source or export data.",
    "The Pi process cwd is this exported folder. Git commit/push remains product-specific.",
    "",
    "## How to verify a change",
    "",
    `Keep \`runtime.transport\` on \`"${project.runtime.transport}"\` while developing and add \`?devtools=1\``,
    "to reveal the fixture picker, then step through every built-in scenario — reasoning, tool call and result,",
    "approval, error, retry, exhausted and terminal incidents, interrupts, artifacts. That set is",
    "the contract your events have to satisfy. If a state renders under `replay` but not under",
    "`sse`, the difference is in your `toStandardEvents`, and the admission layer",
    "(`src/runtime/admissionReport.ts`) will usually already say why.",
    "",
    "---",
    "",
    "_Generated by AgentCanvas._",
    "",
  ];
  return lines.join("\n");
}

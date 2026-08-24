/**
 * Export glue.
 *
 * Packages the entire AgentMatrix standard layer (protocol, projector, mock SSE,
 * live backend client, icon registry, and UI components) into a downloadable
 * zip that drops into any React + Vite app and connects to a real AgentMatrix
 * backend with no projection changes. The mock and live paths share one client,
 * so the exported project is the same code the demo runs — only the source
 * differs.
 */

import JSZip from "jszip";

import agentMatrixCss from "../../styles/agentmatrix.css?raw";

// Raw source of the standard layer, read at build time by Vite.
const CORE_SOURCES = import.meta.glob("../*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FIXTURE_SOURCES = import.meta.glob("../fixtures/*.json", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const COMPONENT_SOURCES = import.meta.glob("../../components/agentmatrix/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export type ExportOptions = {
  /** Backend base URL baked into the generated config. */
  backendBaseUrl?: string;
  /** Session stream path template. */
  streamPath?: string;
};

export function buildProjectFiles(options: ExportOptions = {}): Record<string, string> {
  const backendBaseUrl = options.backendBaseUrl ?? "https://api.agentmatrix.example";
  const streamPath = options.streamPath ?? "/v1/sessions/{sessionId}/events/stream";
  const files: Record<string, string> = {};

  // agentmatrix core
  for (const [path, source] of Object.entries(CORE_SOURCES)) {
    const name = path.replace(/^\.\.\//, "");
    files[`src/agentmatrix/${name}`] = source;
  }
  for (const [path, source] of Object.entries(FIXTURE_SOURCES)) {
    const name = path.replace(/^\.\.\/fixtures\//, "");
    files[`src/agentmatrix/fixtures/${name}`] = source;
  }
  for (const [path, source] of Object.entries(COMPONENT_SOURCES)) {
    const name = path.replace(/^\.\.\/\.\.\/components\/agentmatrix\//, "");
    files[`src/components/agentmatrix/${name}`] = source;
  }
  // export module itself is intentionally omitted (build-time only).

  files["src/agentmatrix.css"] = agentMatrixCss;
  files["src/agentmatrix.config.ts"] = configFile(backendBaseUrl, streamPath);
  files["src/connect.ts"] = connectFile();
  files["src/App.tsx"] = appFile();
  files["src/main.tsx"] = mainFile();
  files["index.html"] = indexHtml();
  files["package.json"] = packageJson();
  files["tsconfig.json"] = tsconfig();
  files["vite.config.ts"] = viteConfig();
  files["README.md"] = readme(backendBaseUrl, streamPath);

  return files;
}

export async function createProjectZip(options: ExportOptions = {}): Promise<Blob> {
  const files = buildProjectFiles(options);
  const zip = new JSZip();
  for (const [path, content] of Object.entries(files)) {
    zip.file(path, content);
  }
  return zip.generateAsync({ type: "blob" });
}

export async function downloadProjectZip(options: ExportOptions = {}): Promise<void> {
  const blob = await createProjectZip(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "agentmatrix-canvas.zip";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Generated file bodies
// ---------------------------------------------------------------------------

function configFile(baseUrl: string, streamPath: string): string {
  return `/**
 * AgentMatrix backend configuration.
 * Fill these in for your deployment. The stream endpoint must emit the public
 * StreamFrame wire shape (durable event frames + ephemeral delta frames).
 */
export const agentMatrixConfig = {
  backendBaseUrl: ${JSON.stringify(baseUrl)},
  streamPath: ${JSON.stringify(streamPath)},
  // Provide auth headers at runtime; never commit tokens.
  headers: {} as Record<string, string>,
};

export function streamUrl(sessionId: string): string {
  return (
    agentMatrixConfig.backendBaseUrl +
    agentMatrixConfig.streamPath.replace("{sessionId}", sessionId)
  );
}
`;
}

function connectFile(): string {
  return `import {
  AgentMatrixClient,
  createBackendStreamSource,
  createMockClient,
  type OutboundTransport,
} from "./agentmatrix";
import { SCENARIOS } from "./agentmatrix/fixtures";
import { agentMatrixConfig, streamUrl } from "./agentmatrix.config";

/**
 * Live client: streams StreamFrames from the AgentMatrix backend and posts
 * client -> agent actions. This is the seam to the platform.
 */
export function connectLive(sessionId: string): AgentMatrixClient {
  const transport: OutboundTransport = {
    async sendUserMessage(text) {
      await fetch(streamUrl(sessionId).replace("/events/stream", "/messages"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...agentMatrixConfig.headers },
        body: JSON.stringify({ content: [{ type: "text", text }] }),
      });
    },
    async confirmTool(toolCallId, result, denyMessage) {
      await fetch(streamUrl(sessionId).replace("/events/stream", "/confirmations"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...agentMatrixConfig.headers },
        body: JSON.stringify({ tool_call_id: toolCallId, result, deny_message: denyMessage }),
      });
    },
    async interrupt() {
      await fetch(streamUrl(sessionId).replace("/events/stream", "/interrupt"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...agentMatrixConfig.headers },
        body: JSON.stringify({ scope: { type: "session" } }),
      });
    },
  };

  return new AgentMatrixClient({
    source: createBackendStreamSource({
      url: streamUrl(sessionId),
      headers: agentMatrixConfig.headers,
    }),
    transport,
  });
}

/** Offline client: replays a bundled reference scenario with no backend. */
export function connectMock(): AgentMatrixClient {
  return createMockClient(SCENARIOS[0].fixture, { speed: 1 });
}
`;
}

function appFile(): string {
  return `import { useMemo, useState } from "react";
import { IconSetProvider } from "./agentmatrix";
import { AgentMatrixWorkspace } from "./components/agentmatrix/AgentMatrixWorkspace";
import { connectLive, connectMock } from "./connect";

export function App() {
  const [mode] = useState<"mock" | "live">("mock");
  const client = useMemo(
    () => (mode === "live" ? connectLive("ssn_demo") : connectMock()),
    [mode],
  );
  return (
    <IconSetProvider>
      <AgentMatrixWorkspace client={client} sidePanel="activity" />
    </IconSetProvider>
  );
}
`;
}

function mainFile(): string {
  return `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./agentmatrix.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`;
}

function indexHtml(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>AgentMatrix Canvas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function packageJson(): string {
  return JSON.stringify(
    {
      name: "agentmatrix-canvas",
      private: true,
      version: "0.1.0",
      type: "module",
      scripts: { dev: "vite", build: "tsc && vite build", preview: "vite preview" },
      dependencies: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "lucide-react": "^0.400.0",
        jszip: "^3.10.1",
      },
      devDependencies: {
        "@types/react": "^19.0.0",
        "@types/react-dom": "^19.0.0",
        "@vitejs/plugin-react": "^4.3.0",
        typescript: "^5.5.0",
        vite: "^5.4.0",
      },
    },
    null,
    2,
  );
}

function tsconfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        lib: ["DOM", "DOM.Iterable", "ES2022"],
        module: "ESNext",
        moduleResolution: "Bundler",
        jsx: "react-jsx",
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
      },
      include: ["src"],
    },
    null,
    2,
  );
}

function viteConfig(): string {
  return `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" emits relative asset paths so the built app works when opened
// directly (file://) or served from any subpath — not just the domain root.
export default defineConfig({ base: "./", plugins: [react()] });
`;
}

function readme(baseUrl: string, streamPath: string): string {
  return `# AgentMatrix Canvas

A controlled front end for the AgentMatrix public Session Event model. It
projects durable Events + ephemeral deltas into a stable view model and renders
Transcript, Activity, Incident, Runtime, and Diagnostics surfaces.

## What's inside

- \`src/agentmatrix/protocol.ts\` — the 22 durable + 2 delta event kinds and shared structures.
- \`src/agentmatrix/projector.ts\` — pure projection (tool lifecycle, incidents, spans, runtime ops).
- \`src/agentmatrix/mockSse.ts\` — replay a fixture as timed StreamFrames (no backend).
- \`src/agentmatrix/client.ts\` — one client over mock OR live SSE; \`createBackendStreamSource\` is the live seam.
- \`src/agentmatrix/icons.ts\` — 3-5 swappable lucide icons per state.
- \`src/components/agentmatrix/*\` — the controlled components.

## Connect to your backend

1. Edit \`src/agentmatrix.config.ts\`:
   - \`backendBaseUrl\`: \`${baseUrl}\`
   - \`streamPath\`: \`${streamPath}\`
   - \`headers\`: inject auth at runtime (do not commit tokens).
2. In \`src/App.tsx\`, switch \`mode\` to \`"live"\` (or wire your router/session id).
3. The stream endpoint must emit the public StreamFrame shape, one JSON frame per
   SSE \`data:\` line:
   - durable: \`{ "frame_type": "event", "event": { ...DurableEvent }, "stable_ordinal"? }\`
   - delta:   \`{ "frame_type": "delta", "type": "agent.message_delta", ... }\`
4. Client -> agent actions POST to \`/messages\`, \`/confirmations\`, \`/interrupt\`
   (see \`src/connect.ts\`; adjust to your routes).

## Run

\`\`\`bash
npm install
npm run dev
\`\`\`

Ships offline against a bundled reference scenario; flip to live when your
backend is ready. Projection, components, and icons are identical in both modes.
`;
}

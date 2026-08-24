import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), agentCanvasProviderProxy()],
  test: {
    css: true,
  },
  resolve: {
    // The AgentUX SDK packages are linked via `file:` from vendor/agent-ux and
    // import bare "react"/"react-dom". Without dedupe the production bundler
    // tries to resolve those from the SDK's own folder, which has no
    // node_modules, and the build fails. Force resolution from this app.
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      // Two HTML entries, not a client-side router: the marketing page must not ship
      // the editor's bundle, and `index.html` staying at the origin root keeps
      // `loadScaffoldAssets()`'s absolute `fetch("/style-*.png")` working.
      input: {
        main: "index.html",
        editor: "editor.html",
      },
      output: {
        manualChunks(id) {
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/")
          ) {
            return "react";
          }
          if (id.includes("/node_modules/@agent-ux/")) {
            return "agentux";
          }
          // Icons are split out of "ui" on purpose. The landing page (index.html) uses a
          // few Lucide glyphs and nothing else from this group; while lucide shared the
          // chunk with Radix + motion + cmdk + sonner, three 16px icons dragged ~250 kB
          // onto a static marketing page. The editor loads both chunks either way.
          if (id.includes("/node_modules/lucide-react/")) {
            return "icons";
          }
          if (
            id.includes("/node_modules/@radix-ui/") ||
            id.includes("/node_modules/cmdk/") ||
            id.includes("/node_modules/motion/") ||
            id.includes("/node_modules/react-resizable-panels/") ||
            id.includes("/node_modules/sonner/")
          ) {
            return "ui";
          }
          return undefined;
        },
      },
    },
  },
});

function agentCanvasProviderProxy(): Plugin {
  const prefix = "/__agentcanvas/provider/";

  return {
    name: "agentcanvas-provider-proxy",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        void (async () => {
          if (!req.url?.startsWith(prefix)) {
            next();
            return;
          }

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            res.setHeader("access-control-allow-origin", "*");
            res.setHeader(
              "access-control-allow-headers",
              "authorization, content-type, x-api-key, x-agentcanvas-provider-base-url, anthropic-version",
            );
            res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
            res.end();
            return;
          }

          const baseUrl = headerValue(
            req.headers["x-agentcanvas-provider-base-url"],
          );
          if (!baseUrl) {
            writeProxyError(
              res,
              400,
              "Missing x-agentcanvas-provider-base-url.",
            );
            return;
          }

          let targetUrl: URL;
          try {
            const targetBase = new URL(
              baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
            );
            if (
              targetBase.protocol !== "http:" &&
              targetBase.protocol !== "https:"
            ) {
              writeProxyError(
                res,
                400,
                "Provider base URL must be http or https.",
              );
              return;
            }
            targetUrl = new URL(req.url.slice(prefix.length), targetBase);
          } catch {
            writeProxyError(res, 400, "Invalid provider base URL.");
            return;
          }

          try {
            const upstreamHeaders: Record<string, string> = {};
            for (const header of [
              "content-type",
              "authorization",
              "x-api-key",
              "anthropic-version",
            ]) {
              const value = headerValue(req.headers[header]);
              if (value) {
                upstreamHeaders[header] = value;
              }
            }

            const upstream = await fetch(targetUrl, {
              method: req.method,
              headers: upstreamHeaders,
              body:
                req.method === "GET" || req.method === "HEAD"
                  ? undefined
                  : await readRequestBody(req),
              redirect: "manual",
            });
            await writeUpstreamResponse(res, upstream);
          } catch (error) {
            writeProxyError(
              res,
              502,
              error instanceof Error
                ? error.message
                : "Provider proxy request failed.",
            );
          }
        })();
      });
    },
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

async function readRequestBody(req: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function writeUpstreamResponse(
  res: ProxyServerResponse,
  upstream: Response,
) {
  const contentType =
    upstream.headers.get("content-type") ?? "application/json";
  const isEventStream = contentType.toLowerCase().includes("text/event-stream");

  res.statusCode = upstream.status;
  res.statusMessage = upstream.statusText;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("content-type", contentType);
  if (isEventStream) {
    res.setHeader("cache-control", "no-cache");
    res.setHeader("connection", "keep-alive");
    res.flushHeaders?.();
  }

  const reader = upstream.body?.getReader();
  if (!reader) {
    res.end();
    return;
  }

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (value) {
        res.write(Buffer.from(value));
      }
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
}

type ProxyServerResponse = {
  statusCode: number;
  statusMessage: string;
  setHeader(name: string, value: string): void;
  write(chunk: Buffer): void;
  end(body?: string): void;
  flushHeaders?: () => void;
};

function writeProxyError(
  res: {
    statusCode: number;
    setHeader(name: string, value: string): void;
    end(body?: string): void;
  },
  statusCode: number,
  message: string,
) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: message }));
}

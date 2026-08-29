import type { Plugin } from "vite";

import { PI_API_PREFIX } from "./piClient.ts";
import { createPiHttpHost } from "./piHost.ts";

/** Mount Pi into both `vite dev` and `vite preview`; the React bundle never imports the SDK. */
export function piRuntimePlugin(options: { cwd?: string } = {}): Plugin {
  const cwd = options.cwd ?? process.cwd();
  let host: ReturnType<typeof createPiHttpHost> | undefined;
  const getHost = () => host ??= createPiHttpHost({ cwd });

  const mount = (middlewares: { use(handler: (req: any, res: any, next: () => void) => void): void }) => {
    middlewares.use((req, res, next) => {
      if (!req.url?.startsWith(PI_API_PREFIX)) {
        next();
        return;
      }
      void getHost().handle(req, res).catch(next);
    });
  };

  return {
    name: "agentcanvas-pi-runtime",
    configureServer(server) {
      mount(server.middlewares);
    },
    configurePreviewServer(server) {
      mount(server.middlewares);
    },
    closeBundle() {
      host?.dispose();
      host = undefined;
    },
  };
}

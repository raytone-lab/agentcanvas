import protocolIndexJs from "./templates/vendor/agent-ux/protocol/dist/index.js.txt?raw";
import protocolIndexDts from "./templates/vendor/agent-ux/protocol/dist/index.d.ts.txt?raw";
import runtimeIndexJs from "./templates/vendor/agent-ux/runtime/dist/index.js.txt?raw";
import runtimeIndexDts from "./templates/vendor/agent-ux/runtime/dist/index.d.ts.txt?raw";
import renderCoreIndexJs from "./templates/vendor/agent-ux/render-core/dist/index.js.txt?raw";
import renderCoreIndexDts from "./templates/vendor/agent-ux/render-core/dist/index.d.ts.txt?raw";
import reactIndexJs from "./templates/vendor/agent-ux/react/dist/index.js.txt?raw";
import reactIndexDts from "./templates/vendor/agent-ux/react/dist/index.d.ts.txt?raw";

const scaffoldTemplates: Record<string, string> = {
  "vendor/agent-ux/protocol/dist/index.js": protocolIndexJs,
  "vendor/agent-ux/protocol/dist/index.d.ts": protocolIndexDts,
  "vendor/agent-ux/runtime/dist/index.js": runtimeIndexJs,
  "vendor/agent-ux/runtime/dist/index.d.ts": runtimeIndexDts,
  "vendor/agent-ux/render-core/dist/index.js": renderCoreIndexJs,
  "vendor/agent-ux/render-core/dist/index.d.ts": renderCoreIndexDts,
  "vendor/agent-ux/react/dist/index.js": reactIndexJs,
  "vendor/agent-ux/react/dist/index.d.ts": reactIndexDts,
};

export function scaffoldTemplateContent(file: string): string | undefined {
  return scaffoldTemplates[file];
}

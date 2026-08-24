import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
run("npm", ["run", "packages:pack"], repositoryRoot);

const consumerRoot = await mkdtemp(
  resolve(tmpdir(), "agentcanvas-react19-consumer-"),
);
const packageRoot = resolve(repositoryRoot, "out", "packages");
const contractManifest = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "packages/contract/package.json"),
    "utf8",
  ),
);
const reactManifest = JSON.parse(
  await readFile(
    resolve(repositoryRoot, "packages/react/package.json"),
    "utf8",
  ),
);
const contractTarball = resolve(
  packageRoot,
  packageTarballName(contractManifest),
);
const reactTarball = resolve(packageRoot, packageTarballName(reactManifest));

try {
  await write(
    "package.json",
    JSON.stringify(
      {
        name: "agentcanvas-clean-consumer",
        private: true,
        type: "module",
        scripts: { build: "tsc --noEmit && vite build" },
        dependencies: {
          "@agentmatrix/agentcanvas-contract": `file:${contractTarball}`,
          "@agentmatrix/agentcanvas-react": `file:${reactTarball}`,
          react: "19.2.6",
          "react-dom": "19.2.6",
        },
        devDependencies: {
          "@types/react": "19.2.15",
          "@types/react-dom": "19.2.3",
          "@vitejs/plugin-react": "6.0.2",
          typescript: "6.0.3",
          vite: "8.0.14",
        },
      },
      null,
      2,
    ),
  );
  await write(
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["DOM", "ES2022"],
          module: "ESNext",
          moduleResolution: "Bundler",
          strict: true,
          noEmit: true,
          jsx: "react-jsx",
          skipLibCheck: true,
        },
        include: ["src"],
      },
      null,
      2,
    ),
  );
  await write(
    "vite.config.ts",
    `import react from "@vitejs/plugin-react";\nimport { defineConfig } from "vite";\nexport default defineConfig({ base: process.env.CONSUMER_BASE_PATH || "/", plugins: [react()] });\n`,
  );
  await write(
    "index.html",
    `<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n`,
  );
  await write(
    "src/main.tsx",
    `import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultAgentCanvasExperience, defaultAgentCanvasExperienceV2, type AgentCanvasExperienceV1 } from "@agentmatrix/agentcanvas-contract";
import { ExperienceConfigurator, ProductInterfacePreview } from "@agentmatrix/agentcanvas-react";
import "@agentmatrix/agentcanvas-react/styles.css";

function App() {
  const [value, setValue] = useState<AgentCanvasExperienceV1>(defaultAgentCanvasExperience);
  return <><ExperienceConfigurator value={value} onChange={setValue} capabilities={{ provider: false, liveRun: false, gitMutation: false, debug: false }} /><ProductInterfacePreview value={defaultAgentCanvasExperienceV2} /></>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
`,
  );

  run("npm", ["install", "--no-audit", "--no-fund"], consumerRoot);
  await Promise.all([
    readFile(
      resolve(
        consumerRoot,
        "node_modules/@agentmatrix/agentcanvas-contract/src/index.ts",
      ),
      "utf8",
    ),
    readFile(
      resolve(
        consumerRoot,
        "node_modules/@agentmatrix/agentcanvas-react/src/index.ts",
      ),
      "utf8",
    ),
  ]);
  run("npm", ["run", "build"], consumerRoot);
  run("npm", ["run", "build"], consumerRoot, {
    CONSUMER_BASE_PATH: "/nested/build/",
  });

  const nestedIndex = await readFile(
    resolve(consumerRoot, "dist", "index.html"),
    "utf8",
  );
  if (!nestedIndex.includes("/nested/build/assets/")) {
    throw new Error(
      "Configured base-path build did not retain its asset prefix",
    );
  }
  console.log("Verified clean React 19 consumer at root and /nested/build/");
} finally {
  await rm(consumerRoot, { recursive: true, force: true });
}

function packageTarballName(manifest) {
  return `${manifest.name.replace(/^@/, "").replaceAll("/", "-")}-${manifest.version}.tgz`;
}

async function write(relativePath, contents) {
  const path = resolve(consumerRoot, relativePath);
  await import("node:fs/promises").then(({ mkdir }) =>
    mkdir(dirname(path), { recursive: true }),
  );
  await writeFile(path, contents);
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed in ${cwd}:\n${result.stdout}\n${result.stderr}`,
    );
  }
}

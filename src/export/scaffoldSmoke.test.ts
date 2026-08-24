import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { createScaffoldExportSnapshot, loadScaffoldAssets, type ScaffoldExportSnapshot } from "./scaffoldManifest";

const runSmoke = process.env.RUN_SCAFFOLD_SMOKE === "1";
const smokeIt = runSmoke ? it : it.skip;

async function writeSnapshot(snapshot: ScaffoldExportSnapshot, cwd: string): Promise<void> {
  for (const file of snapshot.files) {
    const outputPath = join(cwd, file);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, snapshot.fileContents[file] ?? "");
  }
  // public/ assets are binary and live outside fileContents.
  for (const [path, bytes] of Object.entries(await loadScaffoldAssets())) {
    const outputPath = join(cwd, path);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, bytes);
  }
}

function run(command: string, args: string[], cwd: string): void {
  try {
    execFileSync(command, args, {
      cwd,
      env: {
        ...process.env,
        npm_config_audit: "false",
        npm_config_fund: "false",
      },
      stdio: "pipe",
      encoding: "utf8",
    });
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; message?: string };
    throw new Error(`${command} ${args.join(" ")} failed\n${failure.stdout ?? ""}\n${failure.stderr ?? ""}\n${failure.message ?? ""}`);
  }
}

describe("exported scaffold smoke test", () => {
  smokeIt("installs, typechecks, and builds the generated Vite React package", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "agentcanvas-export-"));
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);

    try {
      await writeSnapshot(snapshot, tempDir);

      run("npm", ["install", "--ignore-scripts", "--prefer-offline"], tempDir);
      run("npm", ["run", "typecheck"], tempDir);
      run("npm", ["run", "build"], tempDir);

      expect(true).toBe(true);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }, 420_000);
});

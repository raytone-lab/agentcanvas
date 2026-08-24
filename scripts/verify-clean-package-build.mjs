import { access, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sentinels = ["contract", "react"].map((packageName) =>
  resolve(
    repositoryRoot,
    "packages",
    packageName,
    "dist",
    "stale-build-sentinel.txt",
  ),
);

for (const sentinel of sentinels) {
  await mkdir(resolve(sentinel, ".."), { recursive: true });
  await writeFile(sentinel, "This file must not survive a package build.\n");
}

const result = spawnSync("npm", ["run", "packages:build"], {
  cwd: repositoryRoot,
  encoding: "utf8",
  stdio: "pipe",
});
if (result.status !== 0) {
  throw new Error(
    `npm run packages:build failed:\n${result.stderr || result.stdout}`,
  );
}

for (const sentinel of sentinels) {
  try {
    await access(sentinel);
    throw new Error(`Package build retained stale dist file: ${sentinel}`);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      continue;
    }
    throw error;
  }
}

console.log("Package builds remove stale dist files before compilation.");

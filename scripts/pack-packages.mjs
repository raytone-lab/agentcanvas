import { createHash } from "node:crypto";
import { mkdir, readFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputRoot = resolve(repositoryRoot, "out", "packages");
const first = resolve(outputRoot, ".first");
const second = resolve(outputRoot, ".second");

// Packaging is a source-level operation: always rebuild from empty dist
// directories instead of trusting whatever a previous local build left behind.
run("npm", ["run", "packages:build"]);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(first, { recursive: true });
await mkdir(second, { recursive: true });

for (const directory of [first, second]) {
  for (const workspace of [
    "@agentmatrix/agentcanvas-contract",
    "@agentmatrix/agentcanvas-react",
  ]) {
    run("npm", [
      "pack",
      "--workspace",
      workspace,
      "--pack-destination",
      directory,
    ]);
  }
}

const names = await Promise.all(
  ["contract", "react"].map(async (directory) => {
    const manifest = JSON.parse(
      await readFile(
        resolve(repositoryRoot, "packages", directory, "package.json"),
        "utf8",
      ),
    );
    return `${manifest.name.replace(/^@/, "").replaceAll("/", "-")}-${manifest.version}.tgz`;
  }),
);
for (const name of names) {
  const [firstDigest, secondDigest] = await Promise.all([
    digest(resolve(first, name)),
    digest(resolve(second, name)),
  ]);
  if (firstDigest !== secondDigest)
    throw new Error(`${name} is not reproducible`);
  await mkdir(outputRoot, { recursive: true });
  const target = resolve(outputRoot, name);
  await import("node:fs/promises").then(({ copyFile }) =>
    copyFile(resolve(first, name), target),
  );
  console.log(`${firstDigest}  ${target}`);
}

await rm(first, { recursive: true, force: true });
await rm(second, { recursive: true, force: true });

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0)
    throw new Error(
      `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`,
    );
}

async function digest(path) {
  return createHash("sha256")
    .update(await readFile(path))
    .digest("hex");
}

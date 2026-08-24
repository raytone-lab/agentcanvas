import { rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const packageName = process.argv[2];
if (packageName !== "contract" && packageName !== "react") {
  throw new Error("Expected package name: contract or react");
}

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = resolve(repositoryRoot, "packages", packageName, "dist");

await rm(distRoot, { recursive: true, force: true });

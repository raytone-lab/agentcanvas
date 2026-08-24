import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const packageName = process.argv[2];
if (packageName !== "contract" && packageName !== "react") {
  throw new Error("Expected package name: contract or react");
}

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const packageRoot = resolve(repositoryRoot, "packages", packageName);
if (packageName === "contract") {
  const schemaDir = resolve(packageRoot, "dist", "schema");
  await mkdir(schemaDir, { recursive: true });
  for (const version of ["v1", "v2"]) {
    await cp(
      resolve(
        packageRoot,
        "src",
        `agentcanvas-experience-${version}.schema.json`,
      ),
      resolve(schemaDir, `agentcanvas-experience-${version}.json`),
    );
  }
} else {
  await mkdir(resolve(packageRoot, "dist"), { recursive: true });
  await cp(
    resolve(packageRoot, "src", "styles.css"),
    resolve(packageRoot, "dist", "styles.css"),
  );
  await cp(
    resolve(packageRoot, "src", "styles.css.d.ts"),
    resolve(packageRoot, "dist", "styles.css.d.ts"),
  );
}

await rm(resolve(packageRoot, "dist", ".tsbuildinfo"), { force: true });

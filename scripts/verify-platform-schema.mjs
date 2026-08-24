import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const platformRoot =
  process.env.AGENTMATRIX_PLATFORM_REPO ??
  resolve(repositoryRoot, "..", "..", "agentmatrix-platform");
const schemaDirectory = resolve(
  platformRoot,
  "internal",
  "services",
  "workspaceapi",
  "schema",
);

for (const version of ["v1", "v2"]) {
  const filename = `agentcanvas-experience-${version}.schema.json`;
  const canvasSchemaPath = resolve(
    repositoryRoot,
    "packages",
    "contract",
    "src",
    filename,
  );
  const platformSchemaPath = resolve(schemaDirectory, filename);
  const [canvasSchema, platformSchema] = await Promise.all([
    readFile(canvasSchemaPath, "utf8").then(JSON.parse),
    readFile(platformSchemaPath, "utf8").then(JSON.parse),
  ]);

  if (stable(canvasSchema) !== stable(platformSchema)) {
    throw new Error(
      `AgentCanvas Experience ${version} schema drifted from Platform: ${platformSchemaPath}`,
    );
  }
}

console.log(
  `Verified AgentCanvas Experience v1 and v2 schemas against ${schemaDirectory}`,
);

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

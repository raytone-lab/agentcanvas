import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const repositoryRoot = resolve(import.meta.dirname, "..");
const reactEntry = resolve(repositoryRoot, "packages/react/dist/index.js");
const builtEntry = await readFile(reactEntry, "utf8");
if (builtEntry.includes("styles.css")) {
  throw new Error("React JavaScript entrypoint must not import CSS in Node");
}

const [
  { ExperiencePreview, ProductInterfacePreview },
  { defaultAgentCanvasExperience, defaultAgentCanvasExperienceV2 },
] = await Promise.all([
  import("@agentmatrix/agentcanvas-react"),
  import("@agentmatrix/agentcanvas-contract"),
]);
const markup = renderToStaticMarkup(
  createElement(ExperiencePreview, { value: defaultAgentCanvasExperience }),
);
if (!markup.includes("agentcanvas-preview")) {
  throw new Error("Node SSR did not render the AgentCanvas preview");
}
const productMarkup = renderToStaticMarkup(
  createElement(ProductInterfacePreview, {
    value: defaultAgentCanvasExperienceV2,
  }),
);
if (!productMarkup.includes("agentcanvas-experience-v2")) {
  throw new Error("Node SSR did not render the v2 product interface preview");
}

console.log("Verified CSS-free Node ESM/SSR package entrypoint");

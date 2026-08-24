import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  AGENTCANVAS_EXPERIENCE_V1,
  AGENTCANVAS_EXPERIENCE_V2,
  decodeAgentCanvasExperienceV2,
  defaultAgentCanvasExperienceV2,
  migrateAgentCanvasExperience,
} from "../src/index.js";

const schema = JSON.parse(
  readFileSync(
    resolve(
      fileURLToPath(new URL(".", import.meta.url)),
      "../src/agentcanvas-experience-v2.schema.json",
    ),
    "utf8",
  ),
) as object;
// The frozen schemas intentionally combine `const`/`enum` with maxLength in
// the same style as v1. Ajv can validate that shape while retaining all other
// strict schema checks by disabling only its redundant strictTypes warning.
const validateSchema = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTypes: false,
  strictRequired: false,
}).compile(schema);

describe("AgentCanvas Experience v2 frozen schema", () => {
  it("accepts the same representative defaults and migration as the decoder", () => {
    const migrated = migrateAgentCanvasExperience(
      {
        contractVersion: AGENTCANVAS_EXPERIENCE_V1,
        template: "chat",
      },
      AGENTCANVAS_EXPERIENCE_V2,
    );
    for (const value of [defaultAgentCanvasExperienceV2, migrated]) {
      expect(validateSchema(value), JSON.stringify(validateSchema.errors)).toBe(
        true,
      );
      expect(() => decodeAgentCanvasExperienceV2(value)).not.toThrow();
    }
  });

  it("rejects representative unsafe or inconsistent values at both boundaries", () => {
    const invalidValues = [
      {
        ...defaultAgentCanvasExperienceV2,
        design: { colors: { action: "red" } },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        design: { typography: { fontUi: "Inter; color:red" } },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        brand: {
          ...defaultAgentCanvasExperienceV2.brand,
          mark: { kind: "asset", assetId: "https://example.com/logo.svg" },
        },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        canvas: {
          ...defaultAgentCanvasExperienceV2.canvas,
          output: {
            ...defaultAgentCanvasExperienceV2.canvas.output,
            artifactRenderer: "data",
            supportedArtifactRenderers: ["code"],
          },
        },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        extensions: {
          stylesheets: [{ assetId: "theme", layer: "remote" }],
        },
      },
    ];

    for (const value of invalidValues) {
      expect(validateSchema(value), JSON.stringify(value)).toBe(false);
      expect(() => decodeAgentCanvasExperienceV2(value)).toThrow();
    }
  });
});

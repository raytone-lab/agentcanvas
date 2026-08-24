import { describe, expect, it } from "vitest";

import {
  AGENTCANVAS_EXPERIENCE_V1,
  AGENTCANVAS_EXPERIENCE_V2,
  ExperienceValidationError,
  UnsupportedExperienceVersionError,
  applyExperiencePresetOption,
  completeAgentCanvasExperience,
  decodeAgentCanvasExperience,
  decodeAgentCanvasExperienceV2,
  decodeSupportedAgentCanvasExperience,
  defaultAgentCanvasExperience,
  defaultAgentCanvasExperienceV2,
  encodeAgentCanvasExperience,
  encodeAgentCanvasExperienceV2,
  experiencePresetGroupsForCapabilities,
  experiencePresetGroupsForExperience,
  isExperiencePresetOptionActive,
  migrateAgentCanvasExperience,
  productInterfaceStylesheetReferences,
  toggleProductInterfacePresetOption,
  supportedExperienceMigrations,
  toggleExperiencePresetOption,
} from "../src/index";

describe("AgentCanvas Experience contract", () => {
  it("round-trips the Workspace-safe Experience deterministically", () => {
    const input = {
      template: "coding",
      contractVersion: AGENTCANVAS_EXPERIENCE_V1,
      composer: { mic: false, fileUpload: true },
      layout: { mainSize: 68, regions: ["main", "composer"] },
    } as const;

    const decoded = decodeAgentCanvasExperience(input);
    const encoded = encodeAgentCanvasExperience(decoded);

    expect(encoded).toBe(
      '{"composer":{"fileUpload":true,"mic":false},"contractVersion":"agentcanvas-experience-v1","layout":{"mainSize":68,"regions":["main","composer"]},"template":"coding"}',
    );
    expect(decodeAgentCanvasExperience(JSON.parse(encoded))).toEqual(decoded);
  });

  it("fails closed for unknown versions, fields, and registry identifiers", () => {
    expect(() =>
      migrateAgentCanvasExperience({
        contractVersion: "agentcanvas-experience-v9",
        template: "coding",
      }),
    ).toThrow(UnsupportedExperienceVersionError);
    expect(() =>
      decodeAgentCanvasExperience({
        contractVersion: AGENTCANVAS_EXPERIENCE_V1,
        template: "coding",
        provider: { apiKey: "secret" },
      }),
    ).toThrow(ExperienceValidationError);
    expect(() =>
      decodeAgentCanvasExperience({
        contractVersion: AGENTCANVAS_EXPERIENCE_V1,
        template: "anything",
      }),
    ).toThrow(ExperienceValidationError);
    expect(() =>
      applyExperiencePresetOption(
        defaultAgentCanvasExperience,
        "unknown-option",
      ),
    ).toThrow("Unsupported AgentCanvas preset option");
  });

  it("keeps same-version migration explicit and lossless", () => {
    expect(migrateAgentCanvasExperience(defaultAgentCanvasExperience)).toEqual(
      defaultAgentCanvasExperience,
    );
  });

  it("round-trips the complete v2 product interface deterministically", () => {
    const value = {
      ...defaultAgentCanvasExperienceV2,
      brand: {
        ...defaultAgentCanvasExperienceV2.brand,
        displayName: "Signal Desk",
        accent: { kind: "custom" as const, color: "#4f46e5" },
      },
      welcome: {
        headline: "How can Signal Desk help?",
        supportingText: "Ask about tickets, exports, or billing.",
        suggestedPrompts: ["Summarize support tickets"],
        showSuggestedPrompts: true,
      },
      design: {
        colors: { canvas: "#f7f7f9", text: "#161616" },
        typography: {
          fontUi: "Inter, system-ui, sans-serif",
          baseSize: 14,
        },
        geometry: { spacingScale: 1.1, radiusScale: 0.9 },
      },
      extensions: {
        stylesheets: [{ assetId: "product-base", layer: "overrides" as const }],
      },
    };

    const encoded = encodeAgentCanvasExperienceV2(value);
    expect(encoded).toContain('"contractVersion":"agentcanvas-experience-v2"');
    expect(encoded.indexOf('"brand"')).toBeLessThan(
      encoded.indexOf('"canvas"'),
    );
    expect(decodeAgentCanvasExperienceV2(JSON.parse(encoded))).toEqual(value);
    expect(decodeSupportedAgentCanvasExperience(value)).toEqual(value);
  });

  it("migrates v1 to v2 without mutation or visual-default drift", () => {
    const input = structuredClone(defaultAgentCanvasExperience);
    const before = JSON.stringify(input);
    const migrated = migrateAgentCanvasExperience(
      input,
      AGENTCANVAS_EXPERIENCE_V2,
    );

    expect(JSON.stringify(input)).toBe(before);
    expect(migrated.contractVersion).toBe(AGENTCANVAS_EXPERIENCE_V2);
    if (migrated.contractVersion !== AGENTCANVAS_EXPERIENCE_V2)
      throw new Error("expected v2");
    expect(migrated.surface.mode).toBe("agentcanvas");
    expect(migrated.brand.accent).toEqual({ kind: "theme" });
    expect(migrated.brand.corners).toBe("theme");
    expect(migrated.design).toEqual({});
    expect(migrated.canvas).toEqual(
      (({ contractVersion: _version, ...canvas }) => canvas)(input),
    );
    expect(supportedExperienceMigrations).toContainEqual({
      from: AGENTCANVAS_EXPERIENCE_V1,
      to: AGENTCANVAS_EXPERIENCE_V2,
    });
    expect(() =>
      migrateAgentCanvasExperience(migrated, AGENTCANVAS_EXPERIENCE_V1),
    ).toThrow(UnsupportedExperienceVersionError);
  });

  it("supports custom UI without discarding the standard Canvas recipe", () => {
    const custom = {
      ...defaultAgentCanvasExperienceV2,
      surface: { mode: "custom" as const },
    };

    expect(decodeAgentCanvasExperienceV2(custom).surface.mode).toBe("custom");
    expect(decodeAgentCanvasExperienceV2(custom).canvas).toEqual(
      defaultAgentCanvasExperienceV2.canvas,
    );
  });

  it("edits v2 Canvas options through the authoritative preset helpers", () => {
    const initial = structuredClone(defaultAgentCanvasExperienceV2);
    const next = toggleProductInterfacePresetOption(initial, "sidebar-visible");

    expect(next.surface).toEqual(initial.surface);
    expect(next.brand).toEqual(initial.brand);
    expect(next.welcome).toEqual(initial.welcome);
    expect(
      next.canvas.layout.slots.find(
        (slot) => slot.component === "SessionSidebar",
      )?.enabled,
    ).toBe(false);
    expect(initial).toEqual(defaultAgentCanvasExperienceV2);
  });

  it("exposes copied logical stylesheet references without resolving content", () => {
    const value = {
      ...defaultAgentCanvasExperienceV2,
      extensions: {
        stylesheets: [
          { assetId: "product-base", layer: "base" as const },
          { assetId: "brand-overrides", layer: "overrides" as const },
        ],
      },
    };
    const references = productInterfaceStylesheetReferences(value);

    expect(references).toEqual(value.extensions.stylesheets);
    expect(references).not.toBe(value.extensions.stylesheets);
  });

  it("fails closed for unsafe v2 extensions, fonts, colors, and asset shapes", () => {
    const invalidValues = [
      {
        ...defaultAgentCanvasExperienceV2,
        design: { typography: { fontUi: "Inter; background:url(https://x)" } },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        design: { colors: { action: "red" } },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        brand: {
          ...defaultAgentCanvasExperienceV2.brand,
          mark: { kind: "asset", assetId: "../logo.svg" },
        },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        extensions: {
          stylesheets: [
            { assetId: "theme", layer: "base" },
            { assetId: "theme", layer: "base" },
          ],
        },
      },
      {
        ...defaultAgentCanvasExperienceV2,
        extension: { javascript: "alert(1)" },
      },
    ];

    for (const invalid of invalidValues) {
      expect(() => decodeAgentCanvasExperienceV2(invalid)).toThrow(
        ExperienceValidationError,
      );
    }
  });

  it("derives active preset state without React or browser globals", () => {
    const next = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "writing-typewriter",
    );
    expect(isExperiencePresetOptionActive(next, "writing-typewriter")).toBe(
      true,
    );
    expect(isExperiencePresetOptionActive(next, "writing-smooth")).toBe(false);
  });

  it("toggles code diffs off after they have been selected", () => {
    const off = {
      ...defaultAgentCanvasExperience,
      blocks: { ...defaultAgentCanvasExperience.blocks, codeDiff: false },
      output: {
        ...defaultAgentCanvasExperience.output,
        artifactRenderer: "auto" as const,
      },
    };
    const selected = toggleExperiencePresetOption(off, "code-diff");
    const cleared = toggleExperiencePresetOption(selected, "code-diff");

    expect(isExperiencePresetOptionActive(selected, "code-diff")).toBe(true);
    expect(isExperiencePresetOptionActive(cleared, "code-diff")).toBe(false);
    expect(cleared.blocks.codeDiff).toBe(false);
    expect(cleared.output.artifactRenderer).toBe("auto");
  });

  it("restores optional visible slots when a valid partial layout omits them", () => {
    const withoutSlots = {
      ...defaultAgentCanvasExperience,
      layout: { ...defaultAgentCanvasExperience.layout, slots: [] },
    };
    const sidebar = toggleExperiencePresetOption(
      withoutSlots,
      "sidebar-visible",
    );
    const output = toggleExperiencePresetOption(sidebar, "output-visible");

    expect(
      sidebar.layout.slots.find((slot) => slot.component === "SessionSidebar")
        ?.enabled,
    ).toBe(true);
    expect(
      output.layout.slots.find((slot) => slot.component === "OutputFrame")
        ?.enabled,
    ).toBe(true);
  });

  it("toggles every matching slot from one aggregate visibility state", () => {
    const duplicated = {
      ...defaultAgentCanvasExperience,
      layout: {
        ...defaultAgentCanvasExperience.layout,
        slots: [
          ...defaultAgentCanvasExperience.layout.slots,
          {
            id: "sidebar-secondary",
            region: "right-panel" as const,
            component: "SessionSidebar" as const,
            enabled: false,
          },
        ],
      },
    };

    const hidden = toggleExperiencePresetOption(duplicated, "sidebar-visible");
    expect(
      hidden.layout.slots
        .filter((slot) => slot.component === "SessionSidebar")
        .map((slot) => slot.enabled),
    ).toEqual([false, false]);
    expect(isExperiencePresetOptionActive(hidden, "sidebar-visible")).toBe(
      false,
    );

    const shown = toggleExperiencePresetOption(hidden, "sidebar-visible");
    expect(
      shown.layout.slots
        .filter((slot) => slot.component === "SessionSidebar")
        .map((slot) => slot.enabled),
    ).toEqual([true, true]);
  });

  it("preserves an explicitly selected card layout when log tails are disabled", () => {
    const logTail = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "tool-log-tail",
    );
    const cards = applyExperiencePresetOption(logTail, "command-cards");
    const disabled = applyExperiencePresetOption(cards, "tool-log-tail");

    expect(disabled.blocks.toolLogTail).toBe(false);
    expect(disabled.theme.motion.toolCall).toBe("card");
  });

  it("keeps terminal and renderer active state scoped to their output source", () => {
    const consoleCards = {
      ...defaultAgentCanvasExperience,
      output: {
        ...defaultAgentCanvasExperience.output,
        source: "console" as const,
      },
    };
    expect(isExperiencePresetOptionActive(consoleCards, "terminal-log")).toBe(
      false,
    );

    const rendered = applyExperiencePresetOption(
      defaultAgentCanvasExperience,
      "renderer-code",
    );
    const consoleRendered = {
      ...rendered,
      output: { ...rendered.output, source: "console" as const },
    };
    expect(isExperiencePresetOptionActive(rendered, "renderer-code")).toBe(
      true,
    );
    expect(
      isExperiencePresetOptionActive(consoleRendered, "renderer-code"),
    ).toBe(false);
  });

  it("ignores explicit undefined values while completing partial form data", () => {
    const complete = completeAgentCanvasExperience({
      ...defaultAgentCanvasExperience,
      layout: { ...defaultAgentCanvasExperience.layout, mainSize: undefined },
      theme: {
        ...defaultAgentCanvasExperience.theme,
        radius: undefined,
        motion: {
          ...defaultAgentCanvasExperience.theme.motion,
          writingParams: {
            ...defaultAgentCanvasExperience.theme.motion.writingParams,
            chunkSize: undefined,
          },
        },
      },
    });

    expect(complete.layout.mainSize).toBe(
      defaultAgentCanvasExperience.layout.mainSize,
    );
    expect(complete.theme.radius).toBe(
      defaultAgentCanvasExperience.theme.radius,
    );
    expect(complete.theme.motion.writingParams.chunkSize).toBe(
      defaultAgentCanvasExperience.theme.motion.writingParams.chunkSize,
    );
  });

  it("returns false for inherited object keys", () => {
    for (const key of ["constructor", "toString", "valueOf", "__proto__"]) {
      expect(
        isExperiencePresetOptionActive(defaultAgentCanvasExperience, key),
      ).toBe(false);
      expect(() =>
        toggleExperiencePresetOption(defaultAgentCanvasExperience, key),
      ).toThrow("Unsupported AgentCanvas preset option");
    }
  });

  it("rejects sparse arrays instead of returning a value that later fails validation", () => {
    const regions = new Array(1) as Array<"main">;
    expect(() =>
      decodeAgentCanvasExperience({
        contractVersion: AGENTCANVAS_EXPERIENCE_V1,
        template: "coding",
        layout: { regions },
      }),
    ).toThrow(ExperienceValidationError);
  });

  it("rejects artifact renderers outside the persisted support list", () => {
    const invalid = {
      ...defaultAgentCanvasExperience,
      output: {
        ...defaultAgentCanvasExperience.output,
        artifactRenderer: "data" as const,
        supportedArtifactRenderers: ["code" as const],
      },
    };

    for (const operation of [
      () => decodeAgentCanvasExperience(invalid),
      () => encodeAgentCanvasExperience(invalid),
    ]) {
      expect(operation).toThrow(ExperienceValidationError);
      expect(operation).toThrow(
        "$.output.artifactRenderer: must be included in $.output.supportedArtifactRenderers",
      );
    }
    expect(
      decodeAgentCanvasExperience({
        ...invalid,
        output: { ...invalid.output, artifactRenderer: "auto" as const },
      }),
    ).toBeDefined();
  });

  it("hides privileged or unsupported presentation controls by capability", () => {
    const safeIds = experiencePresetGroupsForCapabilities().flatMap((group) =>
      group.options.map((option) => option.id),
    );
    expect(safeIds).not.toContain("model-tools");
    expect(safeIds).not.toContain("git-visible");
    expect(safeIds).not.toContain("debug-visible");
    expect(safeIds).not.toContain("export-visible");
    expect(safeIds).not.toContain("terminal-log");

    const exportEnabledIds = experiencePresetGroupsForCapabilities({
      export: true,
    }).flatMap((group) => group.options.map((option) => option.id));
    expect(exportEnabledIds).not.toContain("export-visible");

    const enabledIds = experiencePresetGroupsForCapabilities({
      provider: true,
      git: true,
      liveRun: true,
    }).flatMap((group) => group.options.map((option) => option.id));
    expect(enabledIds).toContain("model-tools");
    expect(enabledIds).toContain("git-visible");
    expect(enabledIds).toContain("terminal-log");
  });

  it("limits renderer presets and mutations to the Experience support list", () => {
    const codeOnly = {
      ...defaultAgentCanvasExperience,
      output: {
        ...defaultAgentCanvasExperience.output,
        artifactRenderer: "code" as const,
        supportedArtifactRenderers: ["code" as const],
      },
    };
    const optionIds = experiencePresetGroupsForExperience(codeOnly).flatMap(
      (group) => group.options.map((option) => option.id),
    );

    expect(optionIds).toContain("renderer-auto");
    expect(optionIds).toContain("renderer-code");
    expect(optionIds).not.toContain("renderer-data");
    expect(optionIds).not.toContain("renderer-diff");
    expect(optionIds).not.toContain("code-diff");
    expect(() =>
      applyExperiencePresetOption(codeOnly, "renderer-data"),
    ).toThrow(
      "Unsupported AgentCanvas artifact renderer for this Experience: data",
    );
    expect(() => applyExperiencePresetOption(codeOnly, "code-diff")).toThrow(
      "Unsupported AgentCanvas artifact renderer for this Experience: diff",
    );
  });
});

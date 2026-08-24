import { describe, expect, it } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { SCAFFOLD_PUBLIC_ASSETS, createScaffoldExportSnapshot } from "../export/scaffoldManifest";
import { landingCopy } from "./copy";
import { EXPORT_FILE_COUNT } from "./exportFacts";

/**
 * The landing page prints the export's file count in public. That number is a constant (see
 * exportFacts.ts for why it is not computed there), so it can go stale the moment the manifest
 * changes. This is the tripwire.
 */
describe("export facts", () => {
  it("matches what a real export actually writes", () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    expect(snapshot.files.length + SCAFFOLD_PUBLIC_ASSETS.length).toBe(EXPORT_FILE_COUNT);
  });

  it("derives the count from the constant rather than hardcoding it in copy", () => {
    for (const locale of ["zh", "en"] as const) {
      expect(landingCopy[locale].exported.expandNote).toContain("{count}");
    }
  });

  it("describes every core file it lists, in both locales", () => {
    const zh = landingCopy.zh.exported.coreFiles;
    const en = landingCopy.en.exported.coreFiles;
    expect(zh.length).toBe(en.length);
    // Paths are code, not prose — they must not have been "translated".
    expect(zh.map((file) => file.path)).toEqual(en.map((file) => file.path));
    for (const file of [...zh, ...en]) {
      expect(file.note.trim().length, `${file.path} has no note`).toBeGreaterThan(0);
    }
  });

  it("lists only core files that the export really writes", () => {
    const written = new Set(createScaffoldExportSnapshot(defaultCodingAgentProject).files);
    for (const file of landingCopy.zh.exported.coreFiles) {
      expect(written.has(`src/${file.path}`), `export writes no src/${file.path}`).toBe(true);
    }
  });

  it("keeps the run scripts verbatim from the generated package.json", () => {
    const scripts = createScaffoldExportSnapshot(defaultCodingAgentProject).packageJson.scripts;
    for (const locale of ["zh", "en"] as const) {
      for (const script of landingCopy[locale].exported.scripts) {
        expect(scripts[script.name], `script ${script.name} drifted`).toBe(script.run);
      }
    }
  });

  it("does not leave Chinese strings in the English copy", () => {
    // The en locale shipped `copyLabel: "复制"` for a while. Cheap to assert, easy to regress.
    const en = landingCopy.en.exported;
    for (const value of [en.copyLabel, en.copiedLabel, en.coreLabel, en.expandLabel]) {
      expect(value, `"${value}" is not English`).not.toMatch(/[一-鿿]/);
    }
  });
});

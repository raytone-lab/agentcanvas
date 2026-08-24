import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import { SCAFFOLD_PUBLIC_ASSETS, createScaffoldExportSnapshot, loadScaffoldAssets } from "./scaffoldManifest";
import { createScaffoldZip, downloadScaffold, scaffoldArchiveFilename } from "./scaffoldDownload";

describe("scaffold download", () => {
  it("creates a zip archive containing every staged scaffold file", async () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const blob = await createScaffoldZip(snapshot);
    const archive = await JSZip.loadAsync(await blob.arrayBuffer());

    expect(scaffoldArchiveFilename(snapshot)).toBe("coding-agent-scaffold.zip");
    expect(Object.keys(archive.files)).toContain("package.json");
    expect(Object.keys(archive.files)).toContain("src/exported-project.ts");
    expect(Object.keys(archive.files)).toContain("vendor/agent-ux/react/dist/index.js");
    expect(await archive.file("package.json")?.async("string")).toContain('"name": "coding-agent-scaffold"');
  });

  it("packs the public/ assets that app.css and OutputFrame reference", async () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const assets = await loadScaffoldAssets();
    const blob = await createScaffoldZip(snapshot, assets);
    const archive = await JSZip.loadAsync(await blob.arrayBuffer());

    for (const name of SCAFFOLD_PUBLIC_ASSETS) {
      const entry = archive.file(`public/${name}`);
      expect(entry, `missing public/${name}`).toBeTruthy();
      const bytes = await entry!.async("uint8array");
      // A real PNG, not an empty placeholder or an HTML error page.
      expect(bytes.length, `empty public/${name}`).toBeGreaterThan(1000);
      expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    }
  });

  it("downloads the scaffold zip through a browser blob URL", async () => {
    const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
    const anchor = {
      href: "",
      download: "",
      click: vi.fn(),
      remove: vi.fn(),
    };
    const platform = {
      createObjectURL: vi.fn(() => "blob:agentcanvas-export"),
      revokeObjectURL: vi.fn(),
      document: {
        createElement: vi.fn(() => anchor),
        body: {
          appendChild: vi.fn(),
        },
      },
    };

    await downloadScaffold(snapshot, platform);

    expect(platform.createObjectURL).toHaveBeenCalledTimes(1);
    expect(platform.document.createElement).toHaveBeenCalledWith("a");
    expect(anchor.href).toBe("blob:agentcanvas-export");
    expect(anchor.download).toBe("coding-agent-scaffold.zip");
    expect(platform.document.body.appendChild).toHaveBeenCalledWith(anchor);
    expect(anchor.click).toHaveBeenCalledTimes(1);
    expect(anchor.remove).toHaveBeenCalledTimes(1);
    expect(platform.revokeObjectURL).toHaveBeenCalledWith("blob:agentcanvas-export");
  });
});

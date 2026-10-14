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
      // The real file, not an empty placeholder or an HTML error page — which is
      // what a mistyped path fetches in the browser path of
      // `loadScaffoldAssets`. Checked per format now that the list is not all
      // images: a woff2 opens with "wOF2", and the OFL text has to actually be
      // the licence rather than any text that happened to be served.
      const minimumBytes = name.endsWith(".svg") ? 100 : 1000;
      expect(bytes.length, `empty public/${name}`).toBeGreaterThan(minimumBytes);
      if (name.endsWith(".png")) {
        expect(Array.from(bytes.slice(0, 4)), name).toEqual([0x89, 0x50, 0x4e, 0x47]);
      } else if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
        // SOI, then the first marker. 水墨风's sidebar painting is the first
        // JPEG in the manifest: it is a photographed wash with no
        // transparency, and the same 560px image costs 71KB here against
        // 475KB as a PNG.
        expect(Array.from(bytes.slice(0, 3)), name).toEqual([0xff, 0xd8, 0xff]);
      } else if (name.endsWith(".webp")) {
        expect(new TextDecoder().decode(bytes.slice(0, 4)), name).toBe("RIFF");
        expect(new TextDecoder().decode(bytes.slice(8, 12)), name).toBe("WEBP");
      } else if (name.endsWith(".woff2")) {
        expect(Array.from(bytes.slice(0, 4)), name).toEqual([0x77, 0x4f, 0x46, 0x32]);
      } else if (name.endsWith(".ttf")) {
        // A TrueType/OpenType file opens with either the 0x00010000 version tag
        // or the "OTTO" magic; Outfit is the former.
        expect(Array.from(bytes.slice(0, 4)), name).toEqual([0x00, 0x01, 0x00, 0x00]);
      } else if (name.endsWith(".txt")) {
        expect(new TextDecoder().decode(bytes.slice(0, 400)), name).toContain("SIL Open Font License");
      } else if (name.endsWith(".svg")) {
        const header = new TextDecoder().decode(bytes.slice(0, 400));
        expect(header, name).toMatch(/<svg(?:\s|>)/i);
      } else {
        throw new Error(`no format check for packed asset ${name}`);
      }
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

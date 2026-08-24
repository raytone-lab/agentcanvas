import JSZip from "jszip";

import { loadScaffoldAssets, type ScaffoldAssetMap, type ScaffoldExportSnapshot } from "./scaffoldManifest";

export type ScaffoldDownloadAnchor = {
  href: string;
  download: string;
  click(): void;
  remove(): void;
};

export type ScaffoldDownloadPlatform = {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  document: {
    createElement(tagName: "a"): ScaffoldDownloadAnchor;
    body: {
      appendChild(node: ScaffoldDownloadAnchor): unknown;
    };
  };
};

export function scaffoldArchiveFilename(snapshot: ScaffoldExportSnapshot): string {
  return `${snapshot.packageJson.name}.zip`;
}

/**
 * @param assets binary public/ files. Defaults to loading them here; pass an explicit map
 *   (including `{}`) to skip the fetch — used by tests.
 */
export async function createScaffoldZip(
  snapshot: ScaffoldExportSnapshot,
  assets?: ScaffoldAssetMap,
): Promise<Blob> {
  const zip = new JSZip();

  for (const file of snapshot.files) {
    zip.file(file, snapshot.fileContents[file] ?? "");
  }

  for (const [path, bytes] of Object.entries(assets ?? (await loadScaffoldAssets()))) {
    zip.file(path, bytes);
  }

  return zip.generateAsync({ type: "blob" });
}

function browserDownloadPlatform(): ScaffoldDownloadPlatform {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    document: {
      createElement: (tagName) => document.createElement(tagName),
      body: {
        appendChild: (node) => document.body.appendChild(node as HTMLAnchorElement),
      },
    },
  };
}

export async function downloadScaffold(
  snapshot: ScaffoldExportSnapshot,
  platform: ScaffoldDownloadPlatform = browserDownloadPlatform(),
): Promise<void> {
  const blob = await createScaffoldZip(snapshot);
  const url = platform.createObjectURL(blob);
  const anchor = platform.document.createElement("a");

  anchor.href = url;
  anchor.download = scaffoldArchiveFilename(snapshot);
  platform.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  platform.revokeObjectURL(url);
}

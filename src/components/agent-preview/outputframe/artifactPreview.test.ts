import { describe, expect, it } from "vitest";

import { artifactDiffPreview } from "./artifactPreview";
import { outputItemRenderKind } from "./renderKind";

describe("artifactDiffPreview", () => {
  it("returns a real patch as-is", () => {
    const content = [
      "--- a/src/App.tsx",
      "+++ b/src/App.tsx",
      "@@ -1,2 +1,2 @@",
      "-const a = 1;",
      "+const a = 2;",
    ].join("\n");

    expect(artifactDiffPreview({
      kind: "artifact",
      id: "art_patch",
      artifactKind: "code",
      title: "fix.patch",
      status: "success",
      content,
    } as never)).toBe(content);
  });

  it("does not invent a previous-implementation deletion", () => {
    const preview = artifactDiffPreview({
      kind: "artifact",
      id: "art_patch",
      artifactKind: "code",
      title: "fix.patch",
      status: "success",
      content: "--- a/src/App.tsx\n+++ b/src/App.tsx\n+const a = 2;\n",
    } as never);

    expect(preview).toContain("--- a/src/App.tsx");
    expect(preview).not.toContain("previous implementation");
  });

  it("says nothing when the content is not a diff", () => {
    expect(artifactDiffPreview({
      kind: "artifact",
      id: "art_json",
      artifactKind: "code",
      title: "data.json",
      status: "success",
      content: '{"ok":true}',
    } as never)).toBeUndefined();
    expect(artifactDiffPreview({
      kind: "artifact",
      id: "art_empty",
      artifactKind: "code",
      title: "fix.patch",
      status: "success",
    } as never)).toBeUndefined();
  });
});

describe("outputItemRenderKind", () => {
  it("treats .diff and .patch panel items as diffs", () => {
    expect(outputItemRenderKind({
      id: "file:PreviewChanges.diff",
      kind: "file",
      title: "PreviewChanges.diff",
      language: "diff",
    })).toBe("diff");
    expect(outputItemRenderKind({
      id: "file:fix.patch",
      kind: "file",
      title: "fix.patch",
    })).toBe("diff");
  });
});

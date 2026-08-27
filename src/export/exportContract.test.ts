import { describe, expect, it } from "vitest";

import { appVersion } from "../appVersion";
import { defaultCodingAgentProject } from "../schema/agentuxConfig";
import {
  SCAFFOLD_PUBLIC_ASSETS,
  createScaffoldExportSnapshot,
  createScaffoldPackageJson,
} from "./scaffoldManifest";

/**
 * Export contract guards.
 *
 * These exist so nobody has to remember `docs/EXPORT_CONTRACT.md`. Both failures below
 * have already shipped once:
 *
 * - `@phosphor-icons/react` was imported by a shipped component but missing from the
 *   generated package.json, so every exported zip failed `npm run build` (TS2307).
 * - Six PNGs referenced from app.css / OutputFrame were never packed, so the exported app
 *   rendered broken images. `vite build` only warns about that, which is why the smoke
 *   test stayed green.
 *
 * A failure here is not a test problem — it means the exported package would be broken.
 * The message tells you exactly what to add and where.
 */

const snapshot = createScaffoldExportSnapshot(defaultCodingAgentProject);
const packageJson = createScaffoldPackageJson(defaultCodingAgentProject);

const sourceFiles = Object.entries(snapshot.fileContents).filter(([file]) =>
  /\.(ts|tsx|css)$/.test(file),
);

describe("export contract: declared dependencies", () => {
  it("declares every package the exported source imports", () => {
    const declared = new Set([
      ...Object.keys(packageJson.dependencies),
      ...Object.keys(packageJson.devDependencies),
    ]);

    // Anchored at line start so specifiers quoted inside template literals (ToolCallCard
    // renders sample test code containing an import statement) are not mistaken for real
    // imports.
    const importPattern = /^(?:import|export)\s[^;]*?from\s+"([^"]+)"|^import\s+"([^"]+)"/gm;
    const offenders = new Map<string, string[]>();

    for (const [file, content] of sourceFiles) {
      for (const match of content.matchAll(importPattern)) {
        const specifier = match[1] ?? match[2];
        if (!specifier || specifier.startsWith(".") || specifier.startsWith("/")) continue;
        if (specifier.startsWith("node:")) continue;
        const name = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0];
        if (declared.has(name)) continue;
        if (!offenders.has(name)) offenders.set(name, []);
        offenders.get(name)!.push(file);
      }
    }

    const report = [...offenders.entries()]
      .map(([name, files]) => `  ${name}\n    ← ${files.slice(0, 3).join("\n    ← ")}`)
      .join("\n");

    expect(
      offenders.size,
      offenders.size === 0
        ? ""
        : [
          "",
          "导出包会装不上/编译不过：以下依赖被导出的源码 import，但没写进导出的 package.json。",
          report,
          "",
          "修法：在 src/export/scaffoldManifest.ts 的 createScaffoldPackageJson() 里，",
          "把它们按主工程 package.json 的同一版本加进 dependencies。",
          "",
        ].join("\n"),
    ).toBe(0);
  });
});

describe("export contract: no demo data inside components", () => {
  it("keeps invented content out of the shipped components", () => {
    // Components render what the event stream carries; absent data renders as absent. The
    // console surface shipped four fixed lines (`> npm test` / `7 tests passed` / …) no matter
    // what the session did, so switching to that tab showed a transcript belonging to nobody —
    // and it read as a dead control, because nothing on screen changed meaningfully.
    //
    // Preview data belongs in src/fixtures/** and src/agentmatrix/fixtures/**, never in a
    // component. Add it there instead of reintroducing filler here.
    const banned: Array<{ needle: string; why: string }> = [
      { needle: "7 tests passed", why: "hardcoded console transcript" },
      { needle: "built scaffold preview", why: "hardcoded console transcript" },
      { needle: "SearchInputState", why: "invented file body keyed off the extension" },
      { needle: "relatedFileNames", why: "invented sibling files" },
      { needle: "joinVirtualPath", why: "invented paths for invented files" },
      { needle: "fallbackFileMeta", why: "invented line counts / diff stats" },
    ];

    const offenders: string[] = [];
    for (const [file, content] of sourceFiles) {
      if (!file.startsWith("src/components/")) continue;
      for (const { needle, why } of banned) {
        if (content.includes(needle)) offenders.push(`  ${file}\n    "${needle}" — ${why}`);
      }
    }

    expect(
      offenders,
      offenders.length === 0
        ? ""
        : [
          "",
          "组件里出现了写死的模拟数据，它会跟着导出包发给最终用户：",
          offenders.join("\n"),
          "",
          "修法：把演示数据放到 src/fixtures/** 或 src/agentmatrix/fixtures/**，",
          "组件只渲染事件流里真实存在的字段，缺失就不渲染那一块。",
          "",
        ].join("\n"),
    ).toEqual([]);
  });
});

describe("export contract: no internal vocabulary in product copy", () => {
  it("never says \"fixture\" in copy the exported app renders", () => {
    // "fixture" is our preview/test vocabulary. It reached the artifact panel's empty state, so
    // a customer running a real backend was told "No artifact event in this fixture" — a word
    // that means nothing to them about a run they just made. Configurator-only copy (shell.ts)
    // may use it; anything a shipped app renders may not.
    const productCopy = sourceFiles.filter(([file]) =>
      file.startsWith("src/i18n/copy/") && !file.endsWith("/shell.ts"),
    );
    const offenders: string[] = [];
    for (const [file, content] of productCopy) {
      for (const line of content.split("\n")) {
        if (/fixture/i.test(line)) offenders.push(`  ${file}: ${line.trim()}`);
      }
    }
    expect(
      offenders,
      offenders.length === 0
        ? ""
        : ["", "导出的应用会把内部词汇 \"fixture\" 显示给最终用户：", offenders.join("\n"), ""].join("\n"),
    ).toEqual([]);
  });
});

describe("export contract: no fabricated content in the exported shell", () => {
  it("sets every prop whose component default would invent content", () => {
    // `ChatFrame` defaults `previewPrompt` to a sample sentence, so *omitting* the prop is not
    // neutral — it prepends a user message nobody sent. The exported shell did exactly that,
    // and the configurator looked fine because `App.tsx` always passes a value, so the two
    // surfaces disagreed in a way only a screenshot of the export would reveal.
    //
    // Any future prop with a content-bearing default belongs in this list.
    const mustBeSet = [
      { prop: "previewPrompt", why: "ChatFrame 默认值会凭空插入一条用户消息" },
    ];

    const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
    expect(shell, "导出的 shell 源码应该存在").not.toBe("");

    const missing = mustBeSet
      .filter(({ prop }) => !new RegExp(`\\b${prop}\\s*:`).test(shell))
      .map(({ prop, why }) => `  ${prop} — ${why}`);

    expect(
      missing,
      missing.length === 0
        ? ""
        : [
          "",
          "导出的 shell 没有给这些 prop 赋值，组件默认值会凭空造出内容：",
          missing.join("\n"),
          "",
          "修法：在 src/export/scaffoldManifest.ts 的 slotContext 里显式赋值（通常是空字符串）。",
          "",
        ].join("\n"),
    ).toEqual([]);
  });
});

describe("export contract: the exported app's first impression", () => {
  const shell = snapshot.fileContents["src/agent-shell.tsx"] ?? "";
  const eventSource = snapshot.fileContents["src/event-source.ts"] ?? "";

  it("reports the same version as the app that produced it", () => {
    // The footer renders package.json's version. A hardcoded "0.1.0" meant every export
    // disagreed with the configurator it came from — visible side by side in a screenshot.
    expect(packageJson.version).toBe(appVersion);
  });

  it("opens on the welcome screen instead of mid-conversation", () => {
    // Defaulting to the first demo stream meant a freshly downloaded package opened showing
    // somebody else's transcript. `isWelcome` is driven by an empty timeline, so the default
    // selection has to be no stream at all.
    expect(shell).toContain("const isWelcome = displayViewModel.timeline.length === 0");
    expect(
      /if \(!requested\) return "";/.test(eventSource),
      "没有 ?stream= 时不应默认选中任何事件流，否则打开就是对话中",
    ).toBe(true);
    expect(
      /const fallback = streams\[0\]/.test(eventSource),
      "不应再回退到第一条事件流",
    ).toBe(false);
  });

  it("wires new-conversation to something real", () => {
    // Everything that needs a backend is intentionally inert, but starting a new conversation
    // needs no backend — and it is the one control a user is guaranteed to click.
    expect(shell).toContain("onNewSession: startNewSession");
    expect(shell).not.toContain("onNewSession: noop");
    expect(shell, "新建对话必须清空事件流与产物面板").toMatch(
      /function startNewSession\(\)[\s\S]{0,240}setStreamId\(""\)/,
    );
  });

  it("does not fabricate conversation history without a session adapter", () => {
    expect(shell).toContain("sessionPrompts: []");
    expect(shell).not.toContain("onSelectSession:");
  });

  it("lets the picker return to the welcome screen", () => {
    // Without an empty option the picker is a one-way door: once a stream is chosen there is
    // no way back to the welcome state.
    expect(shell).toMatch(/value: "", label: copy\.shell\.editor\.eventStreamWelcome/);
  });
});

describe("export contract: packed assets", () => {
  it("packs every absolute asset the exported source references", () => {
    const packed = new Set<string>(SCAFFOLD_PUBLIC_ASSETS);

    // `url("/foo.png")` in CSS and `src: "/foo.png"` / `src="/foo.png"` in TSX. Both are
    // root-absolute, so they resolve against the exported public/ directory.
    const assetPattern = /url\("\/([^")]+)"\)|src[:=]\s*"\/([^"]+)"/g;
    const offenders = new Map<string, string[]>();

    for (const [file, content] of sourceFiles) {
      for (const match of content.matchAll(assetPattern)) {
        const ref = match[1] ?? match[2];
        // "/src/..." is a module path (index.html entry), not a public asset.
        if (!ref || ref.startsWith("src/")) continue;
        if (packed.has(ref)) continue;
        if (!offenders.has(ref)) offenders.set(ref, []);
        offenders.get(ref)!.push(file);
      }
    }

    const report = [...offenders.entries()]
      .map(([ref, files]) => `  public/${ref}\n    ← ${files.slice(0, 3).join("\n    ← ")}`)
      .join("\n");

    expect(
      offenders.size,
      offenders.size === 0
        ? ""
        : [
          "",
          "导出包里会是碎图：以下资源被导出的源码引用，但没打进 zip。",
          "（vite build 对这种情况只警告不报错，所以 export-smoke 抓不到。）",
          report,
          "",
          "修法：在 src/export/scaffoldManifest.ts 的 SCAFFOLD_PUBLIC_ASSETS 里加上",
          "相对 public/ 的路径，例如 \"hero-bg.png\" 或 \"output-previews/foo.png\"。",
          "",
        ].join("\n"),
    ).toBe(0);
  });

  it("does not pack assets nothing references", () => {
    const referenced = new Set<string>();
    const assetPattern = /url\("\/([^")]+)"\)|src[:=]\s*"\/([^"]+)"/g;
    for (const [, content] of sourceFiles) {
      for (const match of content.matchAll(assetPattern)) {
        const ref = match[1] ?? match[2];
        if (ref) referenced.add(ref);
      }
    }

    const stale = SCAFFOLD_PUBLIC_ASSETS.filter((asset) => !referenced.has(asset));

    expect(
      stale,
      stale.length === 0
        ? ""
        : [
          "",
          "以下资源打进了 zip 但没有任何地方引用，白占体积：",
          stale.map((asset) => "  " + asset).join("\n"),
          "",
          "修法：从 src/export/scaffoldManifest.ts 的 SCAFFOLD_PUBLIC_ASSETS 里移除，",
          "或者确认引用方是不是被误删了。",
          "",
        ].join("\n"),
    ).toEqual([]);
  });
});

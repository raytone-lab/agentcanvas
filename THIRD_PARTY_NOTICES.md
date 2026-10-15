# Third Party Notices

External UI and runtime libraries are consumed as package dependencies declared
in `package.json`, not by copying their source into this repository.

## codicon (CC-BY-4.0) — attribution required

The WorkBuddy style renders its icons with **codicon**, the icon font from
[microsoft/vscode-codicons](https://github.com/microsoft/vscode-codicons),
consumed as the `@vscode/codicons` package. The mapping from this app's
semantic icon slots to codicon glyph names is `src/agentmatrix/codiconSlots.ts`.

Every other dependency here is permissively licensed; this one is not the same:

> Icons © Microsoft Corporation, licensed under
> [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

That license permits redistribution **provided attribution is given**, which is
why this notice exists and why projects produced by the scaffold exporter carry
it too — the exporter declares `@vscode/codicons` in the generated
`package.json` and reproduces this section in the generated notices.

The obligation is the reason codicon is opt-in per style rather than the app's
icon set: choosing any other style leaves an exported project with no CC-BY
attribution requirement, because nothing paints a codicon glyph and the font is
never fetched.

## Ark Pixel Font (SIL OFL 1.1) — license must accompany the font

The Pixel style sets its text in **Ark Pixel Font 12px** (方舟像素字体) by
TakWolf, from
[TakWolf/ark-pixel-font](https://github.com/TakWolf/ark-pixel-font).

Unlike every other third-party dependency here, this one is **copied into the
repository** rather than resolved from a package — the font is not published on
npm. The `zh_cn` proportional 12px build is vendored as
`public/fonts/ark-pixel-12px-zh_cn.woff2` (524KB), declared by an `@font-face`
at the top of `src/styles/app.css`, and referenced only by the `pixel-slate`
theme's font stack.

> Font files © TakWolf, licensed under the
> [SIL Open Font License 1.1](https://openfontlicense.org/).
> The project's build scripts are MIT; only the font files are OFL here.

OFL 1.1 permits bundling and redistribution, including inside a commercial
product, on two conditions that apply to this repository:

- **The license must accompany the font.** `OFL.txt` from the upstream release
  is vendored beside it as `public/fonts/ark-pixel-font-OFL.txt`, and the
  scaffold exporter ships both files (`SCAFFOLD_PUBLIC_ASSETS` in
  `src/export/scaffoldManifest.ts`), because an exported project is a
  redistribution.
- **The Reserved Font Name may not be used by a modified version.** The font is
  shipped byte-for-byte as released; nothing here subsets or rebuilds it, so the
  name is used as published.

Also worth recording, since it is a product fact and not a legal one: the face
is ~93% complete over GB2312 (515 of 7445 characters missing as of release
2026.09.01). A glyph it lacks falls through to the monospace stack behind it,
which is why the pixel theme names a monospace fallback rather than a
proportional one — a missing character then keeps its advance width instead of
reflowing the line.

## EB Garamond (SIL OFL 1.1)

The Retro style bundles the regular and medium EB Garamond font files from
[Google Fonts](https://github.com/google/fonts/tree/main/ofl/ebgaramond).
The original license is shipped at `public/fonts/eb-garamond-OFL.txt`, including
in exported scaffolds. The font files are unmodified.

## Noto Sans SC Black (SIL OFL 1.1) — landing page only

The landing page's display type is Noto Sans SC Black from
[notofonts/noto-cjk](https://github.com/notofonts/noto-cjk), **subset** to the
characters the landing copy uses (`scripts/subset-landing-display-font.py`) and
shipped as `public/fonts/landing-display.woff2`. A subset is a Modified Version
under the OFL; it keeps the original font name only as permitted by the license's
Reserved Font Name terms (Noto has none) and is not sold on its own. The license is
shipped at `public/fonts/OFL-NotoSansSC.txt`. Not part of exported scaffolds.

## Lenis (MIT) — landing page only

Smooth scrolling on the landing page uses [Lenis](https://github.com/darkroomengineering/lenis),
MIT-licensed, installed from npm. Not part of the editor or exported scaffolds.

## Vendored prebuilt packages

`vendor/agent-ux/` contains prebuilt distributions of the AgentUX SDK packages
`@agent-ux/protocol`, `@agent-ux/runtime`, `@agent-ux/render-core` and
`@agent-ux/react`. They are resolved by the `file:` specifiers in
`package.json` and are required to build this app.

Only build output (`dist/`) is vendored; the SDK source is not part of this
repository. The upstream package metadata declares the MIT license and the
repository `https://github.com/flamingtonForAI/agent-ux-sdk`.

A second copy lives at `src/export/templates/vendor/agent-ux/` — that one is
stamped into projects produced by the scaffold exporter, so exported projects
run without depending on this repository.

## Copied fixtures

`src/fixtures/agentux/*.events.jsonl` were copied from the AgentUX SDK's
`fixtures/events` directory and are used for replay-mode previews and tests.

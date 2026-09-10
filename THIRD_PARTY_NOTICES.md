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

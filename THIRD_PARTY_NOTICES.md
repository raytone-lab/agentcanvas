# Third Party Notices

External UI and runtime libraries are consumed as package dependencies declared
in `package.json`, not by copying their source into this repository.

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

# Contributing

Thanks for taking an interest in AgentCanvas.

## Setup

Node.js `^20.19.0 || >=22.12.0`.

```bash
npm install
npm run dev
```

`npm install` links the vendored SDK under `vendor/agent-ux` through `file:`
specifiers. If `@agent-ux/*` imports fail to resolve, remove
`node_modules/@agent-ux` and reinstall.

## Before opening a pull request

```bash
npm run typecheck
npm test
npm run build
```

If you touched anything under `packages/`, also run:

```bash
npm run packages:verify
```

If you touched the export pipeline (`src/export/`), run the smoke test that
actually installs and builds a generated scaffold:

```bash
npm run test:export-smoke
```

## Conventions

[AGENTS.md](AGENTS.md) documents the architectural rules this codebase holds
itself to. The ones worth knowing up front:

- UI components consume AgentUX runtime/render-core state or view models. They
  do not read provider raw streams directly.
- Use the existing canonical event names rather than inventing new ones.
- Keep preview components schema-driven so they stay exportable. Anything that
  only makes sense inside the configurator does not belong in the exported
  scaffold.
- The exported project must not depend on AgentCanvas, ship builder chrome, or
  carry AgentCanvas session keys.
- Two event-stream layers currently coexist: `src/agentmatrix/` is the
  go-forward standard, `src/agentux/` is legacy and still drives preview and the
  main export path. New work should target `agentmatrix` unless you are fixing
  the legacy path.

[DESIGN.md](DESIGN.md) covers the design system. Prefer existing theme tokens in
`src/theme` over new hard-coded values.

## The vendored SDK

`vendor/agent-ux/` contains prebuilt `dist` output only — no source. Do not
patch it in place; changes belong upstream at
<https://github.com/flamingtonForAI/agent-ux-sdk>, after which the vendored
`dist` gets refreshed. Do not add `vendor/**/dist` back to `.gitignore`; a
clone without it cannot build.

## Reporting issues

Include the command you ran, the full output, your Node and npm versions, and —
for export bugs — the configuration that produced the broken scaffold.

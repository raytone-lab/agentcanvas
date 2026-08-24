# AgentUX Scaffold Configurator

## Product Definition

AgentUX Scaffold Configurator is a default Agent frontend template plus a small set of high-leverage UX presets, built on top of AgentUX SDK. It helps developers choose an Agent type, tune thinking/writing/tool-call/block/composer/Git behavior, preview canonical event streams, and export a runnable Vite + React + TypeScript scaffold.

It is not a Figma-style infinite canvas, not a generic low-code page builder, and not a component assembly platform. The output is a maintainable frontend project that can keep using AgentUX protocol, runtime, render-core, and thin framework wrappers.

## First Principle

The configurator saves schema, not arbitrary DOM.

Users start from a strong default Agent frontend, then adjust a small number of UX decisions. Components have valid regions so exported code stays clean:

- `main`: message viewport and primary run content.
- `composer`: bottom dock, floating bottom, right rail, or overlay composer.
- `right-panel`: artifact preview, inspector, capability tray, provider controls.
- `bottom-dock`: event timeline, trace, runtime state, transport status.
- `overlay`: approval prompts, quick settings, floating capability/tool surfaces.

Dragging is not the core interaction. The default path should preserve good chat ergonomics, with optional snap-based placement for the composer and overlay surfaces.

Component independence still matters. Even if the MVP does not emphasize drag/drop, each major surface should be implemented as a self-contained, copyable module so the builder can customize it in isolation and exported projects can reuse or replace it without untangling the whole page.

Copyable modules:

- `ChatFrame`: transcript, message viewport, reasoning/tool inline blocks.
- `ComposerFrame`: input, send, upload, thinking budget, model switcher, tool toggle, optional mic.
- `OutputFrame`: output source host plus artifact renderers for code, diff, markdown, preview, and data/form content.
- `GitFrame`: branch status, changed files, diff preview, commit message, commit/push controls.
- `ActivityUx`: thinking, writing, tool-call, and collapse presets.
- `ProviderHarnessBar`: provider, model, harness, transport, run/export controls.
- `DebugDock`: event timeline, runtime state, raw canonical events.

These modules should communicate through typed config and AgentUX view models, not through hidden DOM coupling or global UI assumptions.

## Target User

Primary user: technical builders using AgentUX SDK to quickly scaffold Agent frontends.

Secondary user: open-source contributors who want reusable templates and examples for Agent chat, coding agents, research agents, artifact agents, and tool-heavy agents.

This is a developer tool first. It can later expose a simpler product-facing mode, but the MVP should optimize for generated project quality.

## MVP Direction

Build the `Scaffold Configurator` direction first.

Page structure:

```txt
TopBar
  Project name
  Template selector
  Provider/model status
  Transport/harness mode
  Run replay
  Export scaffold

LeftPresetRail
  UX Effects
  Tool Calls
  Blocks
  Composer
  Output
  Git
  Theme

AgentPreview
  Large chat frame
  Floating or bottom composer
  Reasoning/writing/tool-call examples
  Code/diff/artifact output examples

RightUtilityPanel
  Output / artifact / code preview
  Git management drawer
  Lightweight selected-area settings

BottomDebugDock
  Event timeline
  Runtime state
  Raw canonical events
```

The main mockup should show a coding agent template. The user has selected `UX Effects`, with card choices for thinking, writing, tool call, and collapse behavior. The center is a complete Agent UI preview, not an empty canvas. The right side shows output preview and a compact Git panel. The bottom debug dock is optional and secondary.

## Templates

Initial templates:

- `chat`: clean assistant chat with message viewport, composer, reasoning block, error/retry item.
- `coding`: chat + tool calls + artifact/code preview + event timeline.
- `research`: chat + source/capability tray + trace timeline + artifact summary.
- `artifact`: chat + large right preview + artifact actions + export controls.
- `tool-heavy`: compact message viewport + persistent tool timeline + approval surface.
- `multi-provider`: provider/model controls and transport state are first-class.

Each template sets:

- default layout regions,
- enabled UX presets,
- default AgentUX render policy,
- mock/replay fixture,
- theme preset,
- harness adapter placeholder,
- export file structure.

## UX Presets

The left rail should expose experience presets, not draggable components.

Preset categories:

- `UX Effects`: thinking animation, writing animation, tool-call display, collapse mode.
- `Tool Calls`: read/write/edit/bash/search/browser/git command card styles.
- `Blocks`: long reasoning block, tool log, and error block collapse rules.
- `Composer`: upload, mic, thinking budget, model switcher, tool toggle, prompt shortcuts.
- `Output`: source selection and panel behavior.
- `Render`: artifact renderer defaults.
- `Git`: changed files, diff preview, branch, commit message, commit/push controls.
- `Theme`: color tokens, density, radius, typography, motion duration.

Agent-aware UI primitives still exist in code, but users should not need to assemble them manually in MVP:

- `MessageViewport`
- `Composer`
- `ReasoningBlock`
- `ToolCallCard`
- `ArtifactPanel`
- `GitPanel`
- `OutputPanel`
- `RunStatusBar`
- `ProviderModelControls`

Use product copy like `Thinking` where appropriate, but keep protocol and code concepts named `reasoning`. This avoids confusing public reasoning summaries with raw chain-of-thought.

Each primitive should be exportable as a practical building block. Avoid one-off JSX that only works inside the configurator shell. Prefer explicit props, typed config, semantic tokens, and local state boundaries.

## Existing Assets To Reuse

From AgentUX SDK:

- canonical protocol events,
- runtime reducer,
- render-core view model,
- React hooks wrapper,
- openrouter-webui example,
- agent-run-inspector example,
- replay fixtures.

From Artifacts:

- semantic theme tokens from `themeStore`,
- provider/model/capability structures from `apiStore`,
- `AgentActivitySpinner`,
- `ThinkingBlock` expand/collapse behavior,
- `ToolCalls` and `toolDisplaySpec`,
- `ArtifactViewer` and `PreviewBase`,
- `RunUiBlock` semantics: `thought`, `plan`, `action`, `observation`, `final`.

## Event And Binding Model

The UI should not bind directly to provider chunks. Components consume AgentUX render-core view models and timeline items. The inspector may show which canonical events feed each component, but binding should happen through stable view model fields.

Canonical events to display in the debug view:

```txt
run.started
run.finished
run.error

text.started
text.delta
text.finished

reasoning.status
reasoning.summary
reasoning.finished

tool.call.started
tool.call.args.delta
tool.call.awaiting_approval
tool.call.running
tool.call.progress
tool.call.result
tool.call.error
tool.call.finished

artifact.created
artifact.delta
artifact.finished

capability.attached
capability.suggested
capability.detached

heartbeat
```

Do not use invented event names such as `thinking.started`, `message.delta`, `artifact.updated`, or `run.completed`.

## Configuration Model

The right side should not be a heavy always-on inspector. It shows output and Git by default. When the user selects a specific area, it can reveal lightweight settings for that area.

Core settings:

- Thinking: spinner, jumping dots, pulse line, terminal cursor, minimal status.
- Writing: smooth stream, typewriter, chunked, instant/fade.
- Tool calls: compact chips, command cards, timeline, terminal log.
- Collapse: auto, manual, summary-first, expanded.
- Composer: upload, mic, thinking budget, model switcher, tool toggle, prompt shortcuts.
- Output source: latest artifact, console logs.
- Render: auto, code, diff, markdown, HTML/app preview, data/form.
- Output surface: right panel, overlay.
- Git: changed files, diff, branch, commit message, commit, push disabled by default.

Developer-only settings can show the underlying binding:

- view model fields consumed,
- timeline item kinds consumed,
- canonical event sources,
- hidden/developer/debug visibility boundaries.

Raw provider thinking must not be exposed in normal UI. Debug display requires explicit policy.

## Default Coding Agent Scaffold

Default configuration:

```ts
const defaultCodingAgentScaffold = {
  template: "coding-agent",

  layout: {
    main: "chat-with-artifact",
    composer: "floating-bottom",
    outputPanel: "right",
    gitPanel: "bottom-right-drawer",
  },

  composer: {
    fileUpload: true,
    mic: false,
    thinkingBudget: true,
    modelSwitcher: true,
    toolToggle: true,
    promptShortcuts: true,
  },

  thinking: {
    animation: "jumping-dots",
    mode: "summary-first",
    collapse: "auto-after-tool-call",
    expandable: true,
  },

  writing: {
    animation: "smooth-stream",
    cursor: true,
  },

  toolCalls: {
    style: "command-cards",
    commands: ["read", "write", "edit", "bash", "search", "git"],
    collapseLogs: true,
    showDuration: true,
    showStatus: true,
  },

  output: {
    source: "artifact",
    artifactRenderer: "auto",
    surface: "right-panel",
    supportedArtifactRenderers: ["code", "diff", "markdown", "preview", "data"],
  },

  git: {
    showBranchStatus: true,
    showChangedFiles: true,
    showDiff: true,
    suggestCommitMessage: true,
    allowCommit: true,
    allowPush: false,
  },

  export: {
    target: "vite-react",
    harness: ["codex", "opencode", "claude", "pi", "custom"],
  },
};
```

## Project Schema

The configurator stores this kind of schema:

```ts
type AgentFrontendProject = {
  id: string;
  name: string;
  template: "chat" | "coding" | "research" | "artifact" | "tool-heavy" | "multi-provider";
  runtime: {
    transport: "sse" | "replay" | "mock";
    harness: "agentux" | "claude" | "codex" | "opencode" | "pi" | "custom";
  };
  theme: {
    preset: string;
    tokens: Record<string, string | number>;
    motion: {
      reasoning: "minimal" | "pulse" | "wave" | "terminal";
      writing: "smooth-stream" | "typewriter" | "chunked";
      toolCall: "card" | "timeline" | "inline" | "drawer";
    };
  };
  layout: {
    regions: RegionConfig[];
    slots: SlotConfig[];
  };
  composer: ComposerConfig;
  thinking: ReasoningUxConfig;
  writing: WritingUxConfig;
  toolCalls: ToolCallUxConfig;
  output: OutputConfig;
  git: GitConfig;
};
```

Internal UI primitives are still generated from config records:

```ts
type SlotConfig = {
  id: string;
  type:
    | "message-viewport"
    | "composer"
    | "reasoning-block"
    | "tool-call-card"
    | "artifact-panel"
    | "provider-model-controls"
    | "git-panel";
  region: "main" | "composer" | "right-panel" | "bottom-dock" | "overlay";
  props: Record<string, unknown>;
  bindings: AgentEventBinding[];
};
```

This allows live preview, code generation, template reuse, and future sharing.

## Module Contract

Every exported module should have a narrow contract:

```ts
type AgentScaffoldModule<Props, Config> = {
  id: string;
  displayName: string;
  defaultConfig: Config;
  Component: React.ComponentType<Props>;
  getBindings?: (config: Config) => AgentEventBinding[];
};
```

Practical rules:

- A module may depend on AgentUX view models, theme tokens, and its own config.
- A module should not import provider adapters directly.
- A module should not require sibling modules to render.
- A module should expose defaults that work in the default Coding Agent scaffold.
- A module can be copied into another app with minimal surrounding shell code.
- Builder-specific editing chrome should wrap modules from the outside, not live inside the exported module.

## Export Target

MVP export target: runnable Vite + React + TypeScript scaffold.

Generated shape:

```txt
agentux.config.ts
src/main.tsx
src/agent/layout.tsx
src/agent/theme.ts
src/agent/harness.ts
src/agent/components/*
src/agent/adapters/agentux.ts
src/agent/adapters/claude.ts
src/agent/adapters/codex.ts
src/agent/adapters/opencode.ts
src/agent/adapters/pi.ts
src/agent/fixtures/*
```

Do not make Next.js the default export target in MVP. Add it later as a preset.

## Harness Adapter Boundary

First version should export adapter placeholders, not promise full Claude/Codex/OpenCode/Pi integration.

```ts
export type HarnessAdapter = {
  name: string;
  connect(input: AgentInput): AsyncIterable<AgentUXEvent>;
};
```

The builder can include comments and mapping stubs for each harness, while replay fixtures provide a reliable live preview.

## Implementation Path

1. Static configurator mockup with realistic coding agent content.
2. Default coding agent scaffold config.
3. Schema-driven layout regions and generated primitives.
4. Mock/replay event runtime using AgentUX fixtures.
5. Theme and motion presets.
6. UX preset controls for thinking, writing, tool calls, blocks, composer, output, and Git.
7. Vite/React scaffold export.
8. Optional snap placement for composer/output/Git surfaces.
9. Real harness examples after the scaffold flow is stable.

## Image Direction

Generate one high-fidelity UI mockup for the `AgentUX Scaffold Configurator`.

Scene:

- desktop app screenshot,
- simplified developer configurator,
- top toolbar,
- left UX presets rail,
- central complete Agent frontend preview,
- right output preview and compact Git panel,
- optional bottom event timeline,
- coding agent template selected,
- no empty canvas and no heavy component library,
- tool call and artifact preview visible,
- debug/event stream visible but secondary.

Visual tone:

- restrained developer-tool interface,
- refined product console,
- light neutral canvas with dark navy text and muted teal/gold accents,
- dense but readable,
- no marketing hero,
- no generic low-code toy aesthetic,
- no purple-blue neon AI look.

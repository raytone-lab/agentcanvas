# AGENTS.md

## Design Source of Truth

Before generating or changing any UI, read `DESIGN.md` (project root) — the visual + interaction spec (colors, typography, geometry, elevation, component contracts, motion). Use semantic tokens only; no raw hex or raw px motion durations. Component architecture lives in `docs/COMPONENT_SYSTEM.md`. App orchestration layering (`src/app` state machine, viewmodel, projections, and the agent-preview facade boundaries) lives in `docs/APP_ARCHITECTURE.md`.

## Project Mode

This project is AgentUX Scaffold Configurator: a default Agent frontend template plus focused UX presets on top of AgentUX SDK.

Optimize for the shortest path to a working, maintainable scaffold. Challenge goals or paths that drift toward a generic low-code builder, infinite canvas, heavy component assembly surface, or decorative UI prototype without exportable engineering structure.

## Core Product Rule

Do not build a Figma-style infinite canvas.

The product should feel configurable, but the implementation must be schema-driven and region-constrained so exported code remains clean. Users should start from a strong default Agent frontend, then adjust key UX presets.

The primary user journey is: users assemble and tune the Agent UI/UX in this app, click download/export, receive a runnable code package, and continue second-stage development of their own Agent frontend from that package. AgentCanvas is the scaffold configurator and package generator, not the long-term hosted runtime for the user's Agent product.

Do not treat export as a cosmetic manifest or preview-only summary. The export path must produce real project files that can be installed, run, edited, and extended outside AgentCanvas.

Allowed regions:

- `main`
- `composer`
- `right-panel`
- `bottom-dock`
- `overlay`

Free positioning is not a primary MVP interaction. Optional snap placement is acceptable only for composer, output, Git, and overlay/floating components with clear bounds.

Even without drag/drop as the primary interaction, keep each major UI area independent and copyable. The builder should be able to customize Chat, Composer, Output, Git, Activity UX, Provider/Harness controls, and Debug Dock separately.

Modules should communicate through typed config and AgentUX runtime/render-core view models, not hidden DOM coupling or broad global assumptions.

## MVP Product Shape

Default template: coding agent.

Core blocks:

- large chat frame,
- composer with send, upload, thinking budget, model switcher, tool toggle, optional mic,
- output/artifact frame,
- Git/project frame,
- Agent activity UX for thinking, writing, tool calls, and collapse behavior.

Left rail should be `UX Presets`, not `Component Library`.

Preset groups:

- UX Effects,
- Tool Calls,
- Blocks,
- Composer,
- Output,
- Git,
- Theme.

Do not make users manually drag `MessageViewport`, `Composer`, `ToolCard`, or `ArtifactPanel` into an empty canvas for MVP.

## Source Projects

The AgentUX SDK is vendored as prebuilt packages under `vendor/agent-ux/`. For
SDK behavior, read the shipped type declarations:

- `vendor/agent-ux/protocol/dist/index.d.ts` — canonical event and schema types
- `vendor/agent-ux/runtime/dist/index.d.ts` — run state machine
- `vendor/agent-ux/render-core/dist/index.d.ts` — view models
- `vendor/agent-ux/react/dist/index.d.ts` — React bindings

Upstream SDK source (not part of this repository):
`https://github.com/flamingtonForAI/agent-ux-sdk`.

Read only the files needed for the current task.

Some theme tokens, the activity spinner and the tool display spec were adapted
from an internal ArtifactOS UI that is not public. Treat the code in
`src/theme` and `src/components/agent-preview` as the authoritative version;
there is no external reference to consult.

## AgentUX Boundaries

UI components must consume AgentUX runtime/render-core state or view models. They must not consume provider raw streams directly.

Use existing canonical event names:

- `run.started`
- `run.finished`
- `run.error`
- `text.started`
- `text.delta`
- `text.finished`
- `reasoning.status`
- `reasoning.summary`
- `reasoning.finished`
- `tool.call.started`
- `tool.call.args.delta`
- `tool.call.awaiting_approval`
- `tool.call.running`
- `tool.call.progress`
- `tool.call.result`
- `tool.call.error`
- `tool.call.finished`
- `artifact.created`
- `artifact.delta`
- `artifact.finished`
- `capability.attached`
- `capability.suggested`
- `capability.detached`
- `heartbeat`

Do not introduce invented names such as `thinking.started`, `message.delta`, `artifact.updated`, or `run.completed`.

In product copy, `thinking` is acceptable. In protocol/code boundaries, prefer `reasoning`.

Never expose raw chain-of-thought in ordinary UI. Respect AgentUX render policy and visibility fields.

## MVP Export Target

Default export target is Vite + React + TypeScript.

Do not make Next.js the default in MVP. Next can be a later preset.

The exported package is the product handoff. It should be usable after download with normal project commands such as install, dev, build, and typecheck. Generated code must not require AgentCanvas app state, builder chrome, preview-only components, or local filesystem paths from this repo.

The generated scaffold should preserve:

- `agentux.config.ts`
- schema-driven layout,
- theme tokens,
- harness adapter interface,
- replay fixtures,
- AgentUX runtime/render-core usage,
- component boundaries that can be continued by developers.

Keep builder-only surfaces out of the generated agent package unless explicitly exported as optional developer tooling. In particular, preset rails, configurator top bars, scaffold staging summaries, command menus, toast workflow, and resizable builder chrome should wrap exported modules from AgentCanvas, not become required runtime dependencies of the downloaded project.

## Harness Boundary

First version should include adapter placeholders and replay/mock transport.

Do not promise full Claude SDK, Codex, OpenCode, or Pi integration until there is a concrete adapter implementation and test path.

Use an interface like:

```ts
export type HarnessAdapter = {
  name: string;
  connect(input: AgentInput): AsyncIterable<AgentUXEvent>;
};
```

## UI Direction

This is a developer tool and product console, not a landing page.

Prefer:

- dense but readable layouts,
- clear panel hierarchy,
- restrained motion,
- stable component dimensions,
- semantic theme tokens,
- visible but secondary event/runtime/debug surfaces,
- practical scaffold export controls.

Avoid:

- decorative hero sections,
- generic low-code builder visuals,
- one-note purple/blue neon AI palette,
- card nesting,
- unrestricted drag positioning,
- UI states that cannot map back to AgentUX runtime/render-core.

## Implementation Preferences

Use existing local patterns before inventing new ones.

Prefer:

- schema-first project state,
- small well-bounded components,
- independent copyable modules with explicit props/config,
- UX preset controls before drag/drop,
- optional `dnd-kit` only for constrained snap placement if needed,
- CSS grid/flex layout regions,
- AgentUX fixtures for preview,
- Artifacts semantic theme tokens,
- focused tests around schema, layout constraints, and event/view model projection.

Do not wire real external harnesses before replay fixtures and export structure work.

## Communication

Answer directly, then deepen only when useful.

If the goal is unclear, stop and clarify.

If a requested path would make the generated scaffold worse, state that and propose the lower-cost path.

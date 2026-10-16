# Changelog

All notable changes to AgentCanvas are recorded here, newest first. Versions follow
[Semantic Versioning](https://semver.org/); while the project is in 0.x, a minor version
(0.**2**.0) brings new features and a patch version (0.1.**1**) brings fixes.

Each version is tagged in git (`v0.2.0`) and published on the
[Releases](https://github.com/raytone-lab/agentcanvas/releases) page, where the notes
below are copied automatically when the tag is pushed.

## [0.2.0] — 2026-10-16

A redesign of the editor around a single canvas, a full set of visual styles, and a
new landing page.

### Added

- **Canvas-first editor.** The window is the canvas and the chrome floats on it: a
  Figma-style rail, a layer tree, zoom, a 4:3 page, a draggable left column, and
  edit / delete controls on every module.
- **Build from empty.** The canvas opens empty and fills in as components are picked;
  the conversation is composed from your picks one turn at a time, and the event flow
  is drawn as a vertical axis with coverage ticks.
- **Thinking components.** Thinking and Thought process are separate stages, with
  eight motions, expand behaviour, a "Thought for N seconds" display style, and three
  text-loading modes (smooth stream, typewriter, chunked) with a live speed control.
- **13 visual styles on one skin engine** — Native, Ink Wash, Quest, Sketch, Retro,
  Tech and more — each with its own palettes, icons, avatars and component materials.
- **Selection island** above the canvas: component and event-flow counts, what is
  left to fill in, clear and undo.
- **Model panel** with provider logos and a model picker in the composer.
- **Avatars:** four default user avatars plus upload; pointer-following 3D avatars.
- **Approvals** show Allow / Always allow / Deny / Cancel, and both inline and
  external approvals can be cancelled.
- **Landing page** rebuilt: a style browser that scales to dozens of styles, an
  anatomy of the canvas, an event-to-component wiring diagram, providers, and the
  export tree.
- **README demo** re-recorded as a 25-second English tour of the real editor
  (`npm run capture:tour`).
- **CHANGELOG** and automatic GitHub releases from version tags.

### Changed

- The output area's tabs are a segmented control with underline tabs whose corners
  follow the style.
- The send button is one 32px icon key in every style.
- The brand menu's **Home** opens the landing page, asking first if the canvas has
  unsaved picks.
- Esc leaves run mode; the output area maximises in place.

### Fixed

- Exported projects carry the editor's icon picks, so an export keeps its style's
  avatars instead of falling back to Native's.
- The editor's hover highlight no longer ships inside exported apps.
- Exported projects include `unifiedDiff.ts` and typecheck again.
- Icons no longer leak into other styles after a style switch; low-contrast text in
  several themes, clipped hover highlights and an empty canvas reading 11% complete
  are fixed.
- The editor shows its real version number (it read v0.1.0 through v0.1.1).

## [0.1.1] — 2026-09-24

### Added

- The Pi runtime is embedded in the editor and in exported scaffolds, so composed
  surfaces render real runs.
- Theme presets route through a skin module and skin engine.
- Output renders full markdown, KaTeX math, mermaid diagrams and real tool diffs.
- Japanese, alongside English and Chinese.
- Approval requests appear above the composer in every surface.

### Changed

- The app is split into an MVVM-layered architecture (see `docs/APP_ARCHITECTURE.md`).

### Fixed

- A cancelled or failed Pi turn always ends in a terminal state.
- Dev-server HTTP surfaces are guarded and Pi approval modes are narrowed.
- Host controls are disabled mid-run, event sizes are bounded, and sessions are
  grouped by their real date.
- Long select menus stay inside the viewport.

## [0.1.0] — 2026-08-24

First open-source release. A visual UX configurator for Agent frontends: compose how
reasoning, tool calls, approvals and artifacts are presented, preview against a
replaying event stream, and export a runnable React project.

[0.2.0]: https://github.com/raytone-lab/agentcanvas/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/raytone-lab/agentcanvas/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/raytone-lab/agentcanvas/releases/tag/v0.1.0

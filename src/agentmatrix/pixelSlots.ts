/**
 * Semantic icon slot → pixelarticons glyph name, for the Pixel style only.
 *
 * Why a third icon vocabulary exists, after lucide and codicon: a pixel style
 * drawn with lucide is not a pixel style. lucide is a 24-grid stroked outline
 * set with curves, non-integer coordinates and round caps; a pixel icon is
 * drawn cell by cell on a grid, orthogonal and 45° only. Turning off
 * antialiasing on the first does not produce the second — it produces an
 * aliased vector icon, which is a different (and worse) thing. So this needs a
 * different set, the same conclusion `codiconSlots.ts` reached for WorkBuddy.
 *
 * pixelarticons is genuinely drawn that way: every glyph is a `<path>` made of
 * 1×2 and 2×2 rectangles on a 24 grid, `fill="currentColor"`, no strokes at
 * all. And it is **MIT**, like this repo — unlike codicon, whose CC-BY-4.0 is
 * the reason that set has to be opt-in per style and carries an attribution
 * obligation into every export.
 *
 * Keyed by *slot*, not by the option the reader picked. That is deliberate and
 * it is the same trade codicon already makes: the icon gallery offers several
 * lucide alternatives per slot, and a themed set cannot supply variants of a
 * hand-drawn glyph. So in this style the slot's meaning decides the glyph and
 * the per-option choice stops applying. 65 entries instead of 282, and
 * `Record<IconSlot, …>` makes a missing one a compile error rather than a
 * silently vector icon sitting in a pixel set.
 *
 * Names are chosen for what the icon *does* here rather than for a matching
 * label, and every one is checked against the installed package by
 * pixelSlots.test.ts — a typo or an upstream rename fails a test instead of
 * rendering nothing.
 */

import type { IconSlot } from "./icons";

export const pixelIconForSlot: Record<IconSlot, string> = {
  // ---- session lifecycle -------------------------------------------------
  "session.initializing": "Loader",
  "session.running": "Reload",
  "session.idle": "Circle",
  "session.requires_action": "CircleQuestion",
  "session.rescheduling": "Clock",
  "session.terminated": "Close",
  "session.deleted": "Trash",
  // The row mark. `Notes` rather than a chat bubble: in this list a row is a
  // saved thing, not a conversation in progress.
  "session.item": "Notes",

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": "Shield",
  "tool.in_progress": "Loader",
  "tool.file_read": "FileText",
  "tool.file_modified": "PenSquare",
  "tool.file_edit": "Pencil",
  "tool.validate": "CheckDouble",
  "tool.search": "Search",
  "tool.completed": "Check",
  "tool.failed": "Close",
  "tool.cancelled": "CircleInfo",
  // Partway: a half-filled bar reads as "some of it" better than a fraction
  // glyph would at this size.
  "tool.partial": "SpeedMedium",

  // ---- permission --------------------------------------------------------
  "permission.allow": "Check",
  "permission.allow_always": "CheckDouble",
  "permission.deny": "Close",
  "permission.cancel": "Close",
  "permission.pending": "Hourglass",

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": "Power",
  "runtime.ready": "Check",
  "runtime.degraded": "WarningDiamond",
  "runtime.error": "SquareAlert",
  "runtime.recovering": "Reload",
  "runtime.op": "Zap",
  "runtime.op_done": "Check",
  "runtime.op_failed": "Close",
  "runtime.op_skipped": "Minus",

  // ---- severity ----------------------------------------------------------
  "severity.info": "CircleInfo",
  "severity.warning": "WarningDiamond",
  "severity.error": "SquareAlert",

  // ---- authors + content -------------------------------------------------
  "author.user": "User",
  "author.agent": "Users",
  // No brain in the set; the chip is the closest thing it has to "thinking",
  // and in a style built out of terminals it reads correctly anyway.
  "content.thinking": "Cpu",
  "content.mcp": "Plug",
  "content.terminal": "Terminal",
  "content.diff": "GitMerge",
  "content.image": "Image",
  "content.audio": "Music",
  "content.text": "Note",
  "content.resource": "Box",
  "content.location": "Globe",
  "source.native": "Cpu",
  "source.mcp": "Plug",

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": "Reload",
  "incident.exhausted": "Hourglass",
  "incident.terminal": "Close",

  // ---- error domains -----------------------------------------------------
  "error.model": "Cpu",
  "error.mcp": "Plug",
  "error.billing": "CreditCard",
  "error.budget": "Coins",
  "error.resource": "Server",
  "error.sandbox": "Box",
  "error.timeout": "Clock",
  "error.unknown": "CircleQuestion",

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": "Chart",
  "surface.diagnostics": "Debug",
  "surface.model_span": "Cpu",
  "surface.compaction": "Archive",
  "surface.config": "Gear",
  "surface.interrupt": "Close",
};

/**
 * Option id → glyph, for the slots where the reader's pick really does change
 * the icon in this style.
 *
 * The header above says a themed set cannot supply variants of a hand-drawn
 * glyph, so the slot decides and the per-option choice stops applying. That was
 * true of codicon and it is **not** true here: pixelarticons ships 1036 glyphs,
 * enough that every option in the 工具调用 group has a near-synonym drawn on the
 * same grid. So the trade was being made for no reason, and the gallery offered
 * four tiles that all rendered the same picture.
 *
 * Only those five slots, deliberately. The other sixty keep one glyph each
 * until someone has looked at their options and chosen four that are genuinely
 * distinct — a table half-filled with near-duplicates would put the same
 * picture behind two tiles again, which is the bug this fixes.
 *
 * Matched on meaning, not on name: `eye → Eye` is obvious, `waypoints →
 * GitBranch` is the one that needed thinking about (waypoints is nodes joined
 * by a path, which on this grid is a branch), and `replace → Repeat` is the
 * swap rather than the arrow.
 *
 * Keyed by slot *then* option, not by option alone: `layers` is an option id in
 * both `tool.file_read` and `tool.search`, so a flat table cannot tell the two
 * apart — one of them would silently take the other's glyph.
 *
 * Every name is checked against the installed package by `pixelSlots.test.ts`,
 * so a typo or an upstream rename fails a test rather than rendering nothing.
 */
export const pixelIconForOption: Partial<Record<IconSlot, Record<string, string>>> = {
  "tool.file_read": {
    "file-read-action": "FileText",
    "file-text": "Article",
    // A stack, which is what a stack of files is.
    layers: "Files",
    eye: "Eye",
  },
  "tool.file_edit": {
    "file-modified-action": "Note",
    "file-pen": "Feather",
    pencil: "Pencil",
    replace: "Repeat",
  },
  "tool.validate": {
    "search-check": "CheckDouble",
    check: "Check",
    "file-check": "Clipboard",
    // A hammer is the build step; this set has no hammer, and `Scale` is the
    // other thing validation means — weighing a result against what was
    // expected.
    hammer: "Scale",
  },
  "tool.search": {
    "file-search": "ZoomIn",
    search: "Search",
    waypoints: "GitBranch",
    // `Flatten`, where the read slot's `layers` takes `Files`: the same option
    // id in two slots, and two tiles drawing one picture is the bug this table
    // exists to fix.
    layers: "Flatten",
  },
  "content.terminal": {
    terminal: "Terminal",
    "square-terminal": "TerminalSharp",
    cpu: "Cpu",
    server: "Server",
  },
};

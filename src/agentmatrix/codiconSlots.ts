/**
 * Semantic icon slot → codicon glyph name, for the WorkBuddy style only.
 *
 * Why a second icon vocabulary exists at all: the WorkBuddy client draws its
 * icons on a 16x16 grid as filled glyphs (`viewBox="0 0 16 16"
 * fill="currentColor"` — 105 of the 16-grid viewBoxes in its bundle against 39
 * on a 24 grid), which is the VS Code design language. lucide, which every
 * other style uses, is a 24x24 stroked outline set. That difference is not a
 * stroke-width setting; it is two different ways of drawing an icon, so
 * matching it needs a different set rather than different parameters.
 *
 * codicon is the set the client itself bundles (`codicon-*.ttf`, verified stock
 * — all 608 of its glyph codepoints match microsoft/vscode-codicons upstream),
 * so this is the same icons rather than an imitation of them.
 *
 * LICENSE: codicon glyphs are CC-BY-4.0, not MIT like the rest of this repo.
 * Attribution rides along in THIRD_PARTY_NOTICES.md and in the notices of
 * every exported project. That obligation is why this is opt-in per style
 * instead of a global swap.
 *
 * Names are checked against the installed package by codiconSlots.test.ts, so
 * a typo or a glyph renamed upstream fails a test rather than rendering an
 * invisible box.
 */

import type { IconSlot } from "./icons";

export const codiconForSlot: Record<IconSlot, string> = {
  // ---- session lifecycle -------------------------------------------------
  "session.initializing": "loading",
  "session.running": "sync",
  "session.idle": "circle-large-outline",
  "session.requires_action": "question",
  "session.rescheduling": "history",
  "session.terminated": "circle-slash",
  "session.deleted": "trash",
  "session.item": "book",

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": "shield",
  "tool.in_progress": "sync",
  "tool.file_read": "file",
  "tool.file_modified": "diff-modified",
  "tool.file_edit": "edit",
  "tool.validate": "beaker",
  "tool.search": "search",
  "tool.completed": "check",
  "tool.failed": "error",
  "tool.cancelled": "circle-slash",
  "tool.partial": "dash",

  // ---- permission replies ------------------------------------------------
  "permission.allow": "check",
  "permission.allow_always": "pass-filled",
  "permission.deny": "close",
  "permission.cancel": "circle-slash",
  "permission.pending": "clock",

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": "rocket",
  "runtime.ready": "pass",
  "runtime.degraded": "warning",
  "runtime.error": "error",
  "runtime.recovering": "refresh",
  "runtime.op": "play-circle",
  "runtime.op_done": "pass-filled",
  "runtime.op_failed": "error",
  "runtime.op_skipped": "debug-step-over",

  // ---- severity ----------------------------------------------------------
  "severity.info": "info",
  "severity.warning": "warning",
  "severity.error": "error",

  // ---- authors -----------------------------------------------------------
  "author.user": "account",
  "author.agent": "hubot",

  // ---- content kinds -----------------------------------------------------
  "content.thinking": "lightbulb",
  "content.mcp": "server-process",
  "content.terminal": "terminal",
  "content.diff": "diff",
  "content.image": "file-media",
  "content.audio": "unmute",
  "content.text": "symbol-string",
  "content.resource": "link",
  "content.location": "location",

  // ---- sources -----------------------------------------------------------
  "source.native": "gear",
  "source.mcp": "plug",

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": "sync",
  "incident.exhausted": "circle-slash",
  "incident.terminal": "stop-circle",

  // ---- errors ------------------------------------------------------------
  "error.model": "chip",
  "error.mcp": "debug-disconnect",
  "error.billing": "credit-card",
  "error.budget": "dashboard",
  "error.resource": "database",
  "error.sandbox": "vm",
  "error.timeout": "watch",
  "error.unknown": "question",

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": "pulse",
  "surface.diagnostics": "list-tree",
  "surface.model_span": "graph",
  "surface.compaction": "archive",
  "surface.config": "settings-gear",
  "surface.interrupt": "debug-pause",
};

/**
 * Semantic icon slot → 复古风's own mark, for every slot.
 *
 * The fifth style to answer for itself, and it arrived at the problem from the
 * opposite side of the other four. 游戏风 and 漫画风 were rendering lucide in
 * fifty-odd slots; this style was rendering *one* drawing in several — its
 * branch painted `/retro/file-status.svg` onto the tool row's status icon from
 * CSS and hid the React icon underneath (`> * { display: none }`), so the four
 * 工具调用 galleries in the left rail changed nothing on the canvas. Asked for
 * directly: "有的没有和中间栏关联上".
 *
 * So two things had to happen together, and neither works alone: the style
 * needs marks of its own in this vocabulary (otherwise unblocking the rail
 * just puts lucide outlines on paper), and the CSS has to stop painting over
 * them. `retroIcons.tsx` holds the drawings; this table is what the canvas
 * reads.
 *
 * Thirty-three drawings over sixty-five slots, so sharing is the rule. Where
 * two slots share, they mean the same thing in this world — a signpost is both
 * "look over there" and "here is where you are". What is not allowed is two of
 * one gallery's four tiles drawing the same picture; `retroSlots.test.ts` pins
 * that, the same way `gameSlots.test.ts` does.
 *
 * `Record<IconSlot, …>` on purpose: a missing slot is a compile error rather
 * than one 1.4px outline left in a room of inked plates.
 */

import type { IconSlot } from "./icons";
import type { LucideIcon } from "lucide-react";
import {
  RetroAbacusIcon,
  RetroApprovedIcon,
  RetroBalloonIcon,
  RetroBalloonLinesIcon,
  RetroBarrelIcon,
  RetroBarrierIcon,
  RetroBellIcon,
  RetroBulbIcon,
  RetroCabinetIcon,
  RetroCandleIcon,
  RetroClipboardIcon,
  RetroClosedBookIcon,
  RetroCloudIcon,
  RetroCratesIcon,
  RetroCrossIcon,
  RetroCubeIcon,
  RetroCycleIcon,
  RetroDoorOpenIcon,
  RetroDoorShutIcon,
  RetroDotIcon,
  RetroDoubleTickIcon,
  RetroEnvelopeIcon,
  RetroEraserIcon,
  RetroFolderIcon,
  RetroFrameIcon,
  RetroGaugeIcon,
  RetroGearIcon,
  RetroHourglassIcon,
  RetroHourglassSpentIcon,
  RetroIndexIcon,
  RetroInkpotIcon,
  RetroKeyIcon,
  RetroLedgerIcon,
  RetroLensIcon,
  RetroLeverIcon,
  RetroMetronomeIcon,
  RetroPadlockIcon,
  RetroPadlockOpenIcon,
  RetroPauseIcon,
  RetroPlugIcon,
  RetroPocketWatchIcon,
  RetroQuillIcon,
  RetroReturnIcon,
  RetroRosetteIcon,
  RetroScissorsIcon,
  RetroSealIcon,
  RetroSheetIcon,
  RetroSheetLensIcon,
  RetroSheetPenIcon,
  RetroSheetRuledIcon,
  RetroSheetsIcon,
  RetroSignpostIcon,
  RetroSpannerIcon,
  RetroStampIcon,
  RetroStopSignIcon,
  RetroStruckSheetIcon,
  RetroTagIcon,
  RetroTelescopeIcon,
  RetroTerminalIcon,
  RetroTicketIcon,
  RetroTornTicketIcon,
  RetroUnplugIcon,
} from "./retroIcons";

export const retroIconForSlot: Record<IconSlot, LucideIcon> = {
  // ---- session lifecycle -------------------------------------------------
  // Setting the works going, then the hourglass; the desk quiet; the bell.
  "session.initializing": RetroGearIcon,
  "session.running": RetroHourglassIcon,
  "session.idle": RetroIndexIcon,
  "session.requires_action": RetroBellIcon,
  // Filed for later, which is what a card index drawer is for.
  "session.rescheduling": RetroAbacusIcon,
  "session.terminated": RetroCrossIcon,
  "session.deleted": RetroFolderIcon,
  /* The row mark: a dot. It was the balloon this style draws for 新建对话, which
     put the same picture in front of every row in the list. */
  "session.item": RetroDotIcon,

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": RetroStampIcon,
  "tool.in_progress": RetroGearIcon,
  "tool.file_read": RetroSheetIcon,
  "tool.file_modified": RetroSheetPenIcon,
  "tool.file_edit": RetroQuillIcon,
  // The seal: checked, and the seal is the proof.
  "tool.validate": RetroSealIcon,
  "tool.search": RetroLensIcon,
  "tool.completed": RetroSealIcon,
  "tool.failed": RetroCrossIcon,
  "tool.cancelled": RetroEraserIcon,
  // Half the ledger filled in: some of it came back.
  "tool.partial": RetroLedgerIcon,

  // ---- permission --------------------------------------------------------
  // A stamp is permission in this vocabulary; the rosette is permission standing.
  // An admit-one ticket: through, this once. It was the stamp, which is also
  // what 等待确认 opens on, and the two galleries sit one above the other.
  "permission.allow": RetroTicketIcon,
  "permission.allow_always": RetroRosetteIcon,
  "permission.deny": RetroCrossIcon,
  "permission.cancel": RetroEraserIcon,
  "permission.pending": RetroBellIcon,

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": RetroGearIcon,
  "runtime.ready": RetroPlugIcon,
  "runtime.degraded": RetroSpannerIcon,
  "runtime.error": RetroCrossIcon,
  "runtime.recovering": RetroSpannerIcon,
  "runtime.op": RetroGearIcon,
  "runtime.op_done": RetroSealIcon,
  "runtime.op_failed": RetroCrossIcon,
  "runtime.op_skipped": RetroTagIcon,

  // ---- severity ----------------------------------------------------------
  "severity.info": RetroEnvelopeIcon,
  "severity.warning": RetroBellIcon,
  "severity.error": RetroCrossIcon,

  // ---- authors -----------------------------------------------------------
  /* Neither normally renders: `author.*` is served by the avatar tables and the
     resolver skips this one for those slots (`AVATAR_SLOTS` in
     `IconSetContext`). Present because the record is total. */
  "author.user": RetroTagIcon,
  "author.agent": RetroBalloonIcon,

  // ---- content -----------------------------------------------------------
  "content.thinking": RetroCloudIcon,
  // Something outside this desk that you plug into.
  "content.mcp": RetroPlugIcon,
  "content.terminal": RetroTerminalIcon,
  // Two sheets side by side, which is what a diff is.
  "content.diff": RetroSheetsIcon,
  "content.image": RetroFrameIcon,
  "content.audio": RetroBellIcon,
  "content.text": RetroBalloonLinesIcon,
  // A parcel: the thing fetched and kept.
  "content.resource": RetroCubeIcon,
  "content.location": RetroSignpostIcon,
  // This desk's own work, versus something plugged in from outside.
  "source.native": RetroIndexIcon,
  "source.mcp": RetroPlugIcon,

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": RetroHourglassIcon,
  "incident.exhausted": RetroAbacusIcon,
  "incident.terminal": RetroCrossIcon,

  // ---- error domains -----------------------------------------------------
  "error.model": RetroBulbIcon,
  "error.mcp": RetroPlugIcon,
  // What it is paid from, and the count of what is left.
  "error.billing": RetroLedgerIcon,
  "error.budget": RetroAbacusIcon,
  "error.resource": RetroCubeIcon,
  "error.sandbox": RetroFolderIcon,
  "error.timeout": RetroHourglassIcon,
  "error.unknown": RetroLensIcon,

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": RetroLedgerIcon,
  "surface.diagnostics": RetroLensIcon,
  "surface.model_span": RetroBulbIcon,
  "surface.compaction": RetroCubeIcon,
  "surface.config": RetroGearIcon,
  "surface.interrupt": RetroBellIcon,
};

/**
 * Option id → mark, for the slots whose gallery the reader picks from.
 *
 * Two levels rather than one for the reason `gameIconForOption` gives: an id
 * like `retro-sheet` is an option in more than one slot, and a flat table
 * could not tell the two apart.
 *
 * Every entry here is a *different* drawing from its three neighbours. The
 * alternative — mapping several ids onto the nearest mark — is what made the
 * pixel and Game galleries show four tiles that rendered one picture, and it is
 * indistinguishable from the bug this file exists to fix: a gallery that does
 * nothing when you click it.
 */
export const retroIconForOption: Partial<Record<IconSlot, Record<string, LucideIcon>>> = {
  "tool.file_read": {
    "retro-sheet": RetroSheetIcon,
    "retro-sheets": RetroSheetsIcon,
    "retro-sheet-lens": RetroSheetLensIcon,
    "retro-index": RetroIndexIcon,
  },
  "tool.file_edit": {
    "retro-quill": RetroQuillIcon,
    "retro-inkpot": RetroInkpotIcon,
    "retro-sheet-pen": RetroSheetPenIcon,
    "retro-eraser": RetroEraserIcon,
  },
  "tool.validate": {
    "retro-seal": RetroSealIcon,
    "retro-ledger": RetroLedgerIcon,
    "retro-rosette": RetroRosetteIcon,
    "retro-double-tick": RetroDoubleTickIcon,
  },
  "tool.search": {
    "retro-lens": RetroLensIcon,
    "retro-telescope": RetroTelescopeIcon,
    "retro-signpost": RetroSignpostIcon,
    "retro-folder": RetroFolderIcon,
  },
  "content.thinking": {
    "retro-cloud": RetroCloudIcon,
    "retro-bulb": RetroBulbIcon,
    "retro-hourglass": RetroHourglassIcon,
    "retro-abacus": RetroAbacusIcon,
  },
  "content.terminal": {
    "retro-terminal": RetroTerminalIcon,
    "retro-gear": RetroGearIcon,
    "retro-spanner": RetroSpannerIcon,
    "retro-plug": RetroPlugIcon,
  },
  "content.text": {
    "retro-balloon-lines": RetroBalloonLinesIcon,
    "retro-sheet-ruled": RetroSheetRuledIcon,
    "retro-envelope": RetroEnvelopeIcon,
    "retro-tag": RetroTagIcon,
  },
  "session.item": {
    "retro-dot": RetroDotIcon,
    "retro-balloon": RetroBalloonIcon,
    "retro-index": RetroIndexIcon,
    "retro-folder": RetroFolderIcon,
  },
  "tool.completed": {
    "retro-seal": RetroSealIcon,
    "retro-rosette": RetroRosetteIcon,
    "retro-double-tick": RetroDoubleTickIcon,
    "retro-stamp": RetroStampIcon,
  },
  "tool.failed": {
    "retro-cross": RetroCrossIcon,
    "retro-bell": RetroBellIcon,
    "retro-hourglass": RetroHourglassIcon,
    "retro-spanner": RetroSpannerIcon,
  },
  "content.resource": {
    "retro-cube": RetroCubeIcon,
    "retro-folder": RetroFolderIcon,
    "retro-tag": RetroTagIcon,
    "retro-index": RetroIndexIcon,
  },
  "content.image": {
    "retro-frame": RetroFrameIcon,
    "retro-cube": RetroCubeIcon,
    "retro-sheet": RetroSheetIcon,
    "retro-stamp": RetroStampIcon,
  },
  /* The confirmation replies and the run outcomes. Ten galleries that had no
     entry here, so every tile resolved to the one slot mark above. */
  "tool.pending_approval": {
    "retro-stamp": RetroStampIcon,
    "retro-pocket-watch": RetroPocketWatchIcon,
    "retro-clipboard": RetroClipboardIcon,
    "retro-bell": RetroBellIcon,
  },
  "permission.allow": {
    "retro-ticket": RetroTicketIcon,
    "retro-key": RetroKeyIcon,
    "retro-seal": RetroSealIcon,
    "retro-approved": RetroApprovedIcon,
  },
  "permission.allow_always": {
    "retro-rosette": RetroRosetteIcon,
    "retro-door-open": RetroDoorOpenIcon,
    "retro-padlock-open": RetroPadlockOpenIcon,
    "retro-double-tick": RetroDoubleTickIcon,
  },
  "permission.deny": {
    "retro-cross": RetroCrossIcon,
    "retro-padlock": RetroPadlockIcon,
    "retro-barrier": RetroBarrierIcon,
    "retro-door-shut": RetroDoorShutIcon,
  },
  "permission.cancel": {
    "retro-eraser": RetroEraserIcon,
    "retro-return": RetroReturnIcon,
    "retro-torn-ticket": RetroTornTicketIcon,
    "retro-struck-sheet": RetroStruckSheetIcon,
  },
  "incident.retrying": {
    "retro-hourglass": RetroHourglassIcon,
    "retro-cycle": RetroCycleIcon,
    "retro-metronome": RetroMetronomeIcon,
    "retro-gear": RetroGearIcon,
  },
  "incident.exhausted": {
    "retro-abacus": RetroAbacusIcon,
    "retro-hourglass-spent": RetroHourglassSpentIcon,
    "retro-candle": RetroCandleIcon,
    "retro-gauge": RetroGaugeIcon,
  },
  "incident.terminal": {
    "retro-cross": RetroCrossIcon,
    "retro-stop-sign": RetroStopSignIcon,
    "retro-lever": RetroLeverIcon,
    "retro-closed-book": RetroClosedBookIcon,
  },
  "surface.interrupt": {
    "retro-bell": RetroBellIcon,
    "retro-pause": RetroPauseIcon,
    "retro-scissors": RetroScissorsIcon,
    "retro-unplug": RetroUnplugIcon,
  },
  "error.resource": {
    "retro-cube": RetroCubeIcon,
    "retro-crates": RetroCratesIcon,
    "retro-barrel": RetroBarrelIcon,
    "retro-cabinet": RetroCabinetIcon,
  },
};

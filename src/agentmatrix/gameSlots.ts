/**
 * Semantic icon slot → the Game style's painted mark, for every slot.
 *
 * The style shipped twelve line drawings, registered as *options* for nine
 * slots; the other fifty-six fell through to lucide, so a compass and a scroll
 * sat among sixty generic outlines. Asked for directly — "所有游戏风格里边的图标…
 * 都和原生风太类似了" — and then answered twice.
 *
 * The first answer drew thirty-nine more vector glyphs of fantasy subjects at
 * the product's own stroke weight. Wrong, and the reason is worth keeping: what
 * makes this art read as a game is the *painting* — bevelled gold, an inset
 * gem, cast shadow, worn edges — not the choice of object. A 1.4px stroke
 * cannot carry any of that, so the set read as line icons of game things. The
 * second answer is the supplied sheet, sliced into `public/game/icons/` and
 * mapped here.
 *
 * Twenty-four icons over sixty-five slots, so sharing is the rule rather than
 * the exception, and where it happens the two slots mean the same thing in this
 * world: an exhausted retry and a timed-out call are both the chronicle's clock
 * running out. What is *not* allowed is two of one gallery's four tiles drawing
 * the same picture — three of them would look like they do nothing. Pinned by
 * `gameSlots.test.ts`.
 *
 * `Record<IconSlot, …>` on purpose: a missing slot is a compile error rather
 * than one flat outline left in a room of painted plates, which is invisible
 * until someone happens to open that state.
 */

import {
  GameArtBell,
  GameArtCharter,
  GameArtChatNew,
  GameArtChest,
  GameArtChronicle,
  GameArtCog,
  GameArtCompass,
  GameArtCrest,
  GameArtCycle,
  GameArtFellowship,
  GameArtFolder,
  GameArtKeep,
  GameArtLens,
  GameArtMarket,
  GameArtMic,
  GameArtPack,
  GameArtPages,
  GameArtPortrait,
  GameArtPotion,
  GameArtQuill,
  GameArtScroll,
  GameArtSwords,
  GameArtTrophy,
  GamePaintBarrel,
  GamePaintBrokenSword,
  GamePaintCoin,
  GamePaintCrates,
  GamePaintCrossBars,
  GamePaintCrossShield,
  GamePaintGauntlet,
  GamePaintHammer,
  GamePaintHourglass,
  GamePaintHourglassSpent,
  GamePaintKey,
  GamePaintPadlock,
  GamePaintPadlockOpen,
  GamePaintPause,
  GamePaintPortcullis,
  GamePaintPotionOnce,
  GamePaintReturn,
  GamePaintRing,
  GamePaintSealedLetter,
  GamePaintShatteredGem,
  GamePaintSkull,
  GamePaintSnappedChain,
  GamePaintTombstone,
  GamePaintTorchOut,
  GamePaintTornScroll,
} from "./gameIcons";
import type { IconSlot } from "./icons";
import type { LucideIcon } from "lucide-react";

export const gameIconForSlot: Record<IconSlot, LucideIcon> = {
  // ---- session lifecycle -------------------------------------------------
  // The works turning over, then turning; the keep quiet; the bell rung.
  "session.initializing": GameArtCog,
  "session.running": GameArtCycle,
  "session.idle": GameArtKeep,
  "session.requires_action": GameArtBell,
  // The chronicle is a book with a clock on it — "later" has an object here.
  "session.rescheduling": GameArtChronicle,
  "session.terminated": GameArtSwords,
  "session.deleted": GameArtChest,
  // The row mark: in this list a row is a saved record, not a conversation in
  // progress. `rowMarkOptionForStyle` names the same one.
  "session.item": GameArtScroll,

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": GameArtCrest,
  "tool.in_progress": GameArtCog,
  "tool.file_read": GameArtPages,
  "tool.file_modified": GameArtQuill,
  "tool.file_edit": GameArtQuill,
  // The sealed charter: checked, and the seal is the proof.
  "tool.validate": GameArtCharter,
  "tool.search": GameArtLens,
  "tool.completed": GameArtTrophy,
  "tool.failed": GameArtSwords,
  "tool.cancelled": GameArtCrest,
  // Half a flask: some of it came back.
  "tool.partial": GameArtPotion,

  // ---- permission --------------------------------------------------------
  "permission.allow": GameArtCharter,
  "permission.allow_always": GameArtCrest,
  "permission.deny": GameArtSwords,
  "permission.cancel": GameArtBell,
  "permission.pending": GameArtChronicle,

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": GameArtCog,
  "runtime.ready": GameArtCrest,
  "runtime.degraded": GameArtPotion,
  "runtime.error": GameArtSwords,
  "runtime.recovering": GameArtCycle,
  "runtime.op": GameArtCog,
  "runtime.op_done": GameArtTrophy,
  "runtime.op_failed": GameArtSwords,
  "runtime.op_skipped": GameArtScroll,

  // ---- severity ----------------------------------------------------------
  "severity.info": GameArtScroll,
  "severity.warning": GameArtBell,
  "severity.error": GameArtSwords,

  // ---- authors -----------------------------------------------------------
  /* The sheet's two figures, and neither of them normally renders: `author.*`
     is served by the style's own painted portraits (`campfire-traveler` /
     `campfire-companion`) and the resolver skips this table for those slots —
     see `AVATAR_SLOTS` in `IconSetContext`. Present because the record is
     total. */
  "author.user": GameArtPortrait,
  "author.agent": GameArtFellowship,

  // ---- content -----------------------------------------------------------
  // A flask on the boil: the thinking.
  "content.thinking": GameArtPotion,
  // The market stall: somewhere outside this hall that you connect to.
  "content.mcp": GameArtMarket,
  "content.terminal": GameArtCog,
  // Two leaves side by side, which is what a diff is.
  "content.diff": GameArtPages,
  "content.image": GameArtChest,
  "content.audio": GameArtMic,
  "content.text": GameArtScroll,
  "content.resource": GameArtPack,
  "content.location": GameArtCompass,
  // This hall's own work, versus something fetched from the stall.
  "source.native": GameArtKeep,
  "source.mcp": GameArtMarket,

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": GameArtCycle,
  "incident.exhausted": GameArtChronicle,
  "incident.terminal": GameArtSwords,

  // ---- error domains -----------------------------------------------------
  "error.model": GameArtPotion,
  "error.mcp": GameArtMarket,
  // The coffer it is paid from, and the ledger that says how much is left.
  "error.billing": GameArtChest,
  "error.budget": GameArtChronicle,
  "error.resource": GameArtPack,
  // The walls the call is run inside.
  "error.sandbox": GameArtKeep,
  "error.timeout": GameArtChronicle,
  "error.unknown": GameArtLens,

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": GameArtChronicle,
  "surface.diagnostics": GameArtLens,
  "surface.model_span": GameArtPotion,
  "surface.compaction": GameArtChest,
  "surface.config": GameArtCog,
  "surface.interrupt": GameArtBell,
};

/**
 * Option id → mark, for the eight slots whose gallery the reader picks from.
 *
 * Two levels, not one, and the reason is `layers`: it is an option id in two
 * different slots, so a flat table could not tell them apart and one would
 * silently take the other's picture. Same shape as `pixelIconForOption`.
 *
 * Four *different* icons per slot. The alternative — mapping each lucide option
 * onto the nearest painted one — put a single picture behind two tiles, which
 * is the bug both the pixel set and the first pass of this one shipped.
 */
export const gameIconForOption: Partial<Record<IconSlot, Record<string, LucideIcon>>> = {
  "tool.file_read": {
    "game-reading-file": GameArtPages,
    "game-vellum": GameArtScroll,
    "file-read-action": GameArtChronicle,
    eye: GameArtLens,
  },
  "tool.file_edit": {
    "game-quill": GameArtQuill,
    "game-note": GameArtCharter,
    "file-modified-action": GameArtFolder,
    replace: GameArtCycle,
  },
  "tool.validate": {
    "game-task": GameArtTrophy,
    "game-shield": GameArtCrest,
    "search-check": GameArtCharter,
    hammer: GameArtCog,
  },
  "tool.search": {
    "game-lens": GameArtLens,
    "game-glass": GameArtCompass,
    "file-search": GameArtFolder,
    waypoints: GameArtKeep,
  },
  "content.thinking": {
    "game-compass": GameArtCompass,
    bulb: GameArtPotion,
    sparkles: GameArtTrophy,
    loader: GameArtCycle,
  },
  "content.terminal": {
    "game-wrench": GameArtCog,
    terminal: GameArtPages,
    "square-terminal": GameArtChest,
    cpu: GameArtPotion,
  },
  "content.text": {
    "game-scroll": GameArtScroll,
    file: GameArtPages,
    layers: GameArtChronicle,
    message: GameArtChatNew,
  },
  "tool.failed": {
    "game-swords": GameArtSwords,
    x: GameArtCrest,
    alert: GameArtBell,
    bug: GameArtPotion,
  },
  /* The confirmation replies and the run outcomes: ten galleries that drew
     their one slot icon on all four tiles. The first entry of each is the
     painted icon `gameIconForSlot` already gives the slot. */
  "tool.pending_approval": {
    "game-crest": GameArtCrest,
    "game-hourglass": GamePaintHourglass,
    "game-sealed-letter": GamePaintSealedLetter,
    "game-chronicle": GameArtChronicle,
  },
  "permission.allow": {
    "game-charter": GameArtCharter,
    "game-key": GamePaintKey,
    "game-coin": GamePaintCoin,
    "game-potion": GamePaintPotionOnce,
  },
  "permission.allow_always": {
    "game-crest": GameArtCrest,
    "game-padlock-open": GamePaintPadlockOpen,
    "game-ring": GamePaintRing,
    "game-keep": GameArtKeep,
  },
  "permission.deny": {
    "game-swords": GameArtSwords,
    "game-padlock": GamePaintPadlock,
    "game-cross-shield": GamePaintCrossShield,
    "game-portcullis": GamePaintPortcullis,
  },
  "permission.cancel": {
    "game-bell": GameArtBell,
    "game-return": GamePaintReturn,
    "game-torn-scroll": GamePaintTornScroll,
    "game-cross-bars": GamePaintCrossBars,
  },
  "incident.retrying": {
    "game-cycle": GameArtCycle,
    "game-hammer": GamePaintHammer,
    "game-cog": GameArtCog,
    "game-compass": GameArtCompass,
  },
  "incident.exhausted": {
    "game-chronicle": GameArtChronicle,
    "game-hourglass-spent": GamePaintHourglassSpent,
    "game-broken-sword": GamePaintBrokenSword,
    "game-torch-out": GamePaintTorchOut,
  },
  "incident.terminal": {
    "game-swords": GameArtSwords,
    "game-skull": GamePaintSkull,
    "game-tombstone": GamePaintTombstone,
    "game-shattered-gem": GamePaintShatteredGem,
  },
  "surface.interrupt": {
    "game-bell": GameArtBell,
    "game-pause": GamePaintPause,
    "game-snapped-chain": GamePaintSnappedChain,
    "game-gauntlet": GamePaintGauntlet,
  },
  "error.resource": {
    "game-pack": GameArtPack,
    "game-chest": GameArtChest,
    "game-barrel": GamePaintBarrel,
    "game-crates": GamePaintCrates,
  },
};

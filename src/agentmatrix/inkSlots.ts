/**
 * Semantic icon slot → 水墨风's mark, for every slot.
 *
 * Same construction as `comicSlots.ts` and `gameSlots.ts`, for the same reason:
 * a style that ships its own marks for nine slots and lucide for the other
 * fifty-seven is not a style, it is lucide with props.
 *
 * **Sharing is no longer the rule, and that is the point of this revision.**
 * This table used to run 37 drawings over 141 positions and said so in its own
 * header — the cycle arcs carried every retry, recovery and reschedule, the
 * exclamation carried every warning and every failure, and `InkAlertIcon` alone
 * answered nineteen slots. The justification was that slots sharing a mark
 * "mean the same thing in this style's world", but a warning and a hard error
 * do not mean the same thing in any world, and a reader looking at the timeline
 * saw one grey squiggle everywhere. The set behind it now has 1512 marks
 * (`inkIcons.tsx`), so the slots that were only sharing for want of a drawing
 * have their own:
 *
 *   - severity's three were three copies of one exclamation; they take the
 *     conventional split now — a filled disc, a triangle, a circled bang.
 *   - `tool.file_edit` and `tool.file_modified` drew the same page; the brush
 *     is the hand and a noted page is the result.
 *   - `incident.retrying`, `runtime.recovering` and `session.rescheduling` were
 *     one turning ring between them; they are the turn, the path back and the
 *     clock.
 *   - the landscape marks — mountains, water, wind, moon — carry the slots a
 *     landscape can honestly answer (an idle session, a compaction) rather than
 *     being decoration hunting for a home.
 *
 * What remains shared is shared on purpose and reads the same way twice: the
 * crossed strokes for what was cancelled by hand, the seal for a standing
 * permission.
 *
 * **Defaults stay inside their own gallery.** Where a slot has a gallery in the
 * rail, its default here is one of the four ids that gallery offers — otherwise
 * the canvas opens on a mark the reader cannot find in the panel that is
 * supposed to control it.
 *
 * What is still not allowed is two tiles of one gallery drawing the same
 * picture — three identical tiles in a row of four reads as a broken gallery,
 * which is what `inkSlots.test.ts` pins.
 *
 * `Record<IconSlot, …>` on purpose: a missing slot is a compile error rather
 * than one thin lucide outline in a room of washes — invisible until someone
 * happens to open that state.
 *
 * The two avatar slots are present because the type demands totality, and the
 * branch in `IconSetContext` deliberately does not consult them (`AVATAR_SLOTS`
 * is excluded there, as it is for pixel, game and comic): an avatar is the one
 * icon the reader picks by identity.
 */

import type { LucideIcon } from "lucide-react";
import type { IconSlot } from "./icons";
import {
  InkAlertIcon,
  InkArrowRightIcon,
  InkArrowUpIcon,
  InkArrowUpRightIcon,
  InkBellIcon,
  InkBloomIcon,
  InkBrainIcon,
  InkBroadcastIcon,
  InkBrushIcon,
  InkBubbleIcon,
  InkBugIcon,
  InkChatNewIcon,
  InkCheckCircleIcon,
  InkCheckIcon,
  InkChevronDownIcon,
  InkChevronRightIcon,
  InkClipIcon,
  InkClockIcon,
  InkCodeIcon,
  InkCollapseIcon,
  InkCompassIcon,
  InkCopyIcon,
  InkCrossIcon,
  InkCubeIcon,
  InkCycleIcon,
  InkDatabaseIcon,
  InkDiffIcon,
  InkDiscIcon,
  InkDocEditIcon,
  InkDocReadIcon,
  InkDocSearchIcon,
  InkDocsIcon,
  InkDotIcon,
  InkDotsIcon,
  InkDownloadIcon,
  InkDrivesIcon,
  InkDropIcon,
  InkEmptyRingIcon,
  InkExpandIcon,
  InkEyeIcon,
  InkFileAudioIcon,
  InkFileCodeIcon,
  InkFileIcon,
  InkFileVideoIcon,
  InkFolderIcon,
  InkGaugeIcon,
  InkGearIcon,
  InkGitIcon,
  InkGlobeIcon,
  InkHourglassIcon,
  InkImageIcon,
  InkInfoIcon,
  InkLightningIcon,
  InkListIcon,
  InkMicIcon,
  InkMoonIcon,
  InkMountainsIcon,
  InkPanelsIcon,
  InkPanelsRightIcon,
  InkPauseIcon,
  InkPenIcon,
  InkPinIcon,
  InkPlayIcon,
  InkPlugsIcon,
  InkPlusIcon,
  InkProhibitIcon,
  InkPuzzleIcon,
  InkQuestionIcon,
  InkReturnIcon,
  InkRocketIcon,
  InkSaveIcon,
  InkScrollIcon,
  InkSearchIcon,
  InkSelectIcon,
  InkSendIcon,
  InkShieldIcon,
  InkShieldOffIcon,
  InkShieldWarnIcon,
  InkSparkIcon,
  InkSpeakerIcon,
  InkStackIcon,
  InkStampIcon,
  InkStarIcon,
  InkStopIcon,
  InkTentIcon,
  InkTerminalIcon,
  InkThoughtIcon,
  InkThumbDownIcon,
  InkThumbUpIcon,
  InkTrashIcon,
  InkWarnCircleIcon,
  InkWavesIcon,
  InkWindIcon,
} from "./inkIcons";

export const inkIconForSlot: Record<IconSlot, LucideIcon> = {
  /* ---- session lifecycle -------------------------------------------------
     Five of these eight used to be the same turning ring or the same cross.
     They are a sequence a reader watches a row move through, so they are the
     slots where sameness cost the most. */
  // Not yet turning: the dots before anything has started.
  "session.initializing": InkDotsIcon,
  // On air, which is what a running session is.
  "session.running": InkBroadcastIcon,
  // Nothing happening, and this style has a mark for quiet.
  "session.idle": InkMoonIcon,
  // It wants you, which a bell says and an exclamation only implies.
  "session.requires_action": InkBellIcon,
  // Queued for later — the clock, not the ring.
  "session.rescheduling": InkClockIcon,
  // Stopped, not refused: the square, kept apart from the cross below.
  "session.terminated": InkStopIcon,
  "session.deleted": InkTrashIcon,
  // The row mark: a balloon, because a row in this list is a conversation.
  "session.item": InkBubbleIcon,

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": InkShieldIcon,
  "tool.in_progress": InkBrushIcon,
  "tool.file_read": InkDocReadIcon,
  /* The hand and the result, told apart — these two drew the same page before.
     The brush rather than the nib because `ink-brush` is one of the four tiles
     this slot's gallery offers and `ink-pen` is not: a default the reader
     cannot find in the panel that controls it is a canvas you cannot get back
     to. (The nib draws `PenLine` in the chrome table below.) */
  "tool.file_edit": InkBrushIcon,
  "tool.file_modified": InkDocEditIcon,
  "tool.validate": InkShieldIcon,
  "tool.search": InkSearchIcon,
  "tool.completed": InkCheckIcon,
  /* The triangle, which is one of the four tiles this slot's gallery offers
     (`ink-alert`). Shared with `severity.warning` below and that is the one
     reuse in this family worth keeping: a failed tool row and a warning log
     line are never read side by side, and the alternative was defaulting the
     canvas to a mark the panel cannot reach. */
  "tool.failed": InkAlertIcon,
  "tool.cancelled": InkCrossIcon,
  "tool.partial": InkDocsIcon,

  // ---- permission --------------------------------------------------------
  "permission.allow": InkShieldIcon,
  /* The seal: a standing permission is a stamped one, and 朱红 is the style's
     only chromatic value for exactly this reason. Still one of the four ids
     its gallery offers (`ink-stamp`). */
  "permission.allow_always": InkStampIcon,
  "permission.deny": InkCrossIcon,
  "permission.cancel": InkCrossIcon,
  "permission.pending": InkHourglassIcon,

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": InkLightningIcon,
  "runtime.ready": InkBloomIcon,
  // Degraded is not error: a warned shield, then a barred circle.
  "runtime.degraded": InkShieldWarnIcon,
  "runtime.error": InkProhibitIcon,
  // Finding its way back, rather than the same ring every other state had.
  "runtime.recovering": InkReturnIcon,
  // One operation: one touch of the brush.
  "runtime.op": InkDotIcon,
  "runtime.op_done": InkCheckCircleIcon,
  "runtime.op_failed": InkCrossIcon,
  "runtime.op_skipped": InkChevronRightIcon,

  /* ---- severity ---------------------------------------------------------
     Three copies of one exclamation, previously. These three are the labels a
     log line is read by, so telling them apart is most of what makes a
     diagnostics panel legible — and they take the conventional split rather
     than an invented one: a disc for information, a triangle for a warning, a
     circled bang for an error. */
  "severity.info": InkInfoIcon,
  "severity.warning": InkAlertIcon,
  "severity.error": InkWarnCircleIcon,
  // Nothing below here has a gallery, so these are free picks.

  // ---- authors + content -------------------------------------------------
  // Never consulted — see the header.
  "author.user": InkBubbleIcon,
  "author.agent": InkBloomIcon,
  // 云: this style's thought. The brain below is the model's own machinery.
  "content.thinking": InkThoughtIcon,
  // MCP is a plug, everywhere in this table — not a panel.
  "content.mcp": InkPlugsIcon,
  "content.terminal": InkTerminalIcon,
  // A diff is two versions compared, which is its own mark, not a copy.
  "content.diff": InkDiffIcon,
  "content.image": InkImageIcon,
  "content.audio": InkMicIcon,
  "content.text": InkFileIcon,
  "content.resource": InkFolderIcon,
  "content.location": InkPinIcon,
  /* The style's own landscape for the style's own runtime — native means "from
     here", and the seal has gone to `permission.allow_always`. */
  "source.native": InkMountainsIcon,
  "source.mcp": InkPuzzleIcon,

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": InkCycleIcon,
  // The ring with nothing left in it: the retries are spent.
  "incident.exhausted": InkEmptyRingIcon,
  "incident.terminal": InkCrossIcon,

  /* ---- error domains ----------------------------------------------------
     Eight domains that shared four marks, three of them the panels glyph. The
     whole value of a domain is that it tells you where to look. */
  "error.model": InkBrainIcon,
  "error.mcp": InkPlugsIcon,
  "error.billing": InkScrollIcon,
  "error.budget": InkGaugeIcon,
  "error.resource": InkFolderIcon,
  "error.sandbox": InkCubeIcon,
  /* A clock, now that the set has one. This used to be a turning cycle with a
     note explaining that the sheet had no clock and that inventing one at a
     different weight would show — true of a hand-drawn sheet, and the reason
     that constraint is gone. */
  "error.timeout": InkClockIcon,
  "error.unknown": InkQuestionIcon,

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": InkCycleIcon,
  "surface.diagnostics": InkDocSearchIcon,
  "surface.model_span": InkBrainIcon,
  // Folded away into less space — water closing over it.
  "surface.compaction": InkWavesIcon,
  "surface.config": InkGearIcon,
  "surface.interrupt": InkPauseIcon,
};

/**
 * Option id → mark, for the slots whose gallery the reader actually picks from.
 *
 * Four tiles a slot and four different pictures, which is the whole point of
 * the table: without it every tile in a gallery would draw `inkIconForSlot` and
 * the reader would be choosing between four copies of one drawing.
 *
 * Keyed slot-then-option, not option alone: the same id can belong to two
 * slots' galleries, and a flat table cannot tell them apart.
 */
export const inkIconForOption: Partial<Record<IconSlot, Record<string, LucideIcon>>> = {
  "tool.file_read": {
    "ink-doc-read": InkDocReadIcon,
    "ink-file": InkFileIcon,
    "ink-docs": InkDocsIcon,
    "ink-doc-search": InkDocSearchIcon,
  },
  "tool.file_edit": {
    "ink-doc-edit": InkDocEditIcon,
    "ink-brush": InkBrushIcon,
    "ink-file": InkFileIcon,
    "ink-copy": InkCopyIcon,
  },
  "tool.validate": {
    "ink-shield": InkShieldIcon,
    "ink-check": InkCheckIcon,
    "ink-stamp": InkStampIcon,
    "ink-bloom": InkBloomIcon,
  },
  "tool.search": {
    "ink-search": InkSearchIcon,
    "ink-doc-search": InkDocSearchIcon,
    "ink-folder": InkFolderIcon,
    "ink-globe": InkGlobeIcon,
  },
  "tool.completed": {
    "ink-check": InkCheckIcon,
    "ink-bloom": InkBloomIcon,
    "ink-shield": InkShieldIcon,
    "ink-drop": InkDropIcon,
  },
  "tool.failed": {
    "ink-alert": InkAlertIcon,
    "ink-cross": InkCrossIcon,
    "ink-empty-ring": InkEmptyRingIcon,
    "ink-cycle": InkCycleIcon,
  },
  "content.thinking": {
    "ink-thought": InkThoughtIcon,
    "ink-drop": InkDropIcon,
    "ink-bloom": InkBloomIcon,
    "ink-cycle": InkCycleIcon,
  },
  "content.terminal": {
    "ink-terminal": InkTerminalIcon,
    "ink-stamp": InkStampIcon,
    "ink-panels": InkPanelsIcon,
    "ink-plus": InkPlusIcon,
  },
  "content.text": {
    "ink-file": InkFileIcon,
    "ink-bubble": InkBubbleIcon,
    "ink-list": InkListIcon,
    "ink-folder": InkFolderIcon,
  },
  "session.item": {
    "ink-bubble": InkBubbleIcon,
    "ink-chat-new": InkChatNewIcon,
    "ink-file": InkFileIcon,
    "ink-drop": InkDropIcon,
  },
  "content.image": {
    "ink-image": InkImageIcon,
    "ink-folder": InkFolderIcon,
    "ink-file": InkFileIcon,
    "ink-panels": InkPanelsIcon,
  },
  "content.audio": {
    "ink-mic": InkMicIcon,
    "ink-drop": InkDropIcon,
    "ink-disc": InkDiscIcon,
    "ink-file": InkFileIcon,
  },
  "content.resource": {
    "ink-folder": InkFolderIcon,
    "ink-docs": InkDocsIcon,
    "ink-globe": InkGlobeIcon,
    "ink-stamp": InkStampIcon,
  },
  "tool.in_progress": {
    "ink-brush": InkBrushIcon,
    "ink-cycle": InkCycleIcon,
    "ink-terminal": InkTerminalIcon,
    "ink-drop": InkDropIcon,
  },
  /* The five below are the fix for four-identical-tiles.
     Their galleries offer plain lucide ids (`refresh,timer,hourglass,rotate`
     and so on), and with no entry here every tile fell through to the slot's
     own mark — 重试中 was four turning rings, 终止 and 已中断 were eight crosses
     between them. The ids are this style's own now, and the four marks in each
     row are four different things: what is turning, what is waiting, what has
     stopped, what is not known. */
  "incident.retrying": {
    "ink-cycle": InkCycleIcon,
    "ink-return": InkReturnIcon,
    "ink-hourglass": InkHourglassIcon,
    "ink-drop": InkDropIcon,
  },
  "incident.exhausted": {
    "ink-empty-ring": InkEmptyRingIcon,
    "ink-hourglass": InkHourglassIcon,
    "ink-alert": InkAlertIcon,
    "ink-cross": InkCrossIcon,
  },
  "incident.terminal": {
    "ink-cross": InkCrossIcon,
    "ink-empty-ring": InkEmptyRingIcon,
    "ink-pause": InkPauseIcon,
    "ink-alert": InkAlertIcon,
  },
  "surface.interrupt": {
    "ink-pause": InkPauseIcon,
    "ink-cross": InkCrossIcon,
    "ink-empty-ring": InkEmptyRingIcon,
    "ink-return": InkReturnIcon,
  },
  "error.unknown": {
    "ink-question": InkQuestionIcon,
    "ink-drop": InkDropIcon,
    "ink-alert": InkAlertIcon,
    "ink-empty-ring": InkEmptyRingIcon,
  },
  /* Reached the rail when the canvas's failure row stopped sending an invented
     `E_WRITE_FILE` — which matched no domain and drew `error.unknown` — and
     started sending `resource_quota_exceeded_error`. A full disk is a named
     domain, so this is the gallery the reader now picks from. */
  "error.resource": {
    "ink-folder": InkFolderIcon,
    "ink-docs": InkDocsIcon,
    "ink-disc": InkDiscIcon,
    "ink-alert": InkAlertIcon,
  },
  /* 人机协作's six, added with the gallery itself — the section had no cards, so
     these slots had no tiles to differ. */
  "permission.pending": {
    "ink-hourglass": InkHourglassIcon,
    "ink-thought": InkThoughtIcon,
    "ink-select": InkSelectIcon,
    "ink-drop": InkDropIcon,
  },
  "permission.allow": {
    "ink-check": InkCheckIcon,
    "ink-shield": InkShieldIcon,
    "ink-bloom": InkBloomIcon,
    "ink-stamp": InkStampIcon,
  },
  "permission.allow_always": {
    "ink-bloom": InkBloomIcon,
    "ink-check": InkCheckIcon,
    "ink-stamp": InkStampIcon,
    "ink-shield": InkShieldIcon,
  },
  "permission.deny": {
    "ink-cross": InkCrossIcon,
    "ink-empty-ring": InkEmptyRingIcon,
    "ink-alert": InkAlertIcon,
    "ink-pause": InkPauseIcon,
  },
  "permission.cancel": {
    "ink-cross": InkCrossIcon,
    "ink-pause": InkPauseIcon,
    "ink-return": InkReturnIcon,
    "ink-empty-ring": InkEmptyRingIcon,
  },
  "tool.pending_approval": {
    "ink-shield": InkShieldIcon,
    "ink-hourglass": InkHourglassIcon,
    "ink-thought": InkThoughtIcon,
    "ink-alert": InkAlertIcon,
  },
};

/**
 * The marks the *chrome* draws with: lucide name → this style's mark.
 *
 * The other half of the wiring, and the half the request was actually about.
 * `inkIconForSlot` above answers the timeline — tool rows, run states, the
 * conversation mark. But the left column's own controls (新建对话, 搜索,
 * 展开收起), the composer's send key and every disclosure chevron are plain
 * lucide components imported by name, and they go through `withStyledIcon` in
 * `uiIcons.tsx`. Miss this table and the style has ink in its timeline and
 * lucide in its sidebar.
 *
 * Kept here rather than in `uiIcons.tsx` — where 漫画风 and the Game style keep
 * theirs — because this set is large enough that the table reads better next to
 * the slot map it shares a vocabulary with.
 */
export const INK_BY_LUCIDE: Record<string, LucideIcon | undefined> = {
  /* ---- the left column ---------------------------------------------------
     The three panel toggles used to be one glyph, so 展开左栏, 展开右栏 and
     the top-left panels button were indistinguishable — and they sit within a
     few pixels of each other. */
  Search: InkSearchIcon,
  Plus: InkPlusIcon,
  MessageSquarePlus: InkChatNewIcon,
  MessageSquare: InkBubbleIcon,
  MessageSquareText: InkBubbleIcon,
  PanelLeft: InkPanelsIcon,
  // The same sidebar mirrored, not an unrelated mark that happens to be free.
  PanelRight: InkPanelsRightIcon,
  PanelsTopLeft: InkStackIcon,
  ChevronDown: InkChevronDownIcon,
  ChevronRight: InkChevronRightIcon,
  ChevronUp: InkArrowUpIcon,
  ChevronsUpDown: InkSelectIcon,

  /* ---- the composer -----------------------------------------------------
     Four controls — thinking budget, model switcher, tool toggle, settings —
     drew one list glyph between them. They are four different menus. */
  Paperclip: InkClipIcon,
  Mic: InkMicIcon,
  Send: InkSendIcon,
  SendHorizontal: InkSendIcon,
  ArrowUp: InkArrowUpIcon,
  Gauge: InkGaugeIcon,
  Sparkles: InkSparkIcon,
  Settings: InkGearIcon,
  Settings2: InkGearIcon,
  SlidersHorizontal: InkListIcon,

  // message actions
  Copy: InkCopyIcon,
  Pencil: InkBrushIcon,
  // Retry and reload: the turn, and the way back.
  RotateCcw: InkReturnIcon,
  RefreshCw: InkCycleIcon,
  // A download is not a disclosure chevron, which is what it used to draw.
  Download: InkDownloadIcon,
  Save: InkSaveIcon,
  ArrowUpRight: InkArrowUpRightIcon,
  ThumbsUp: InkThumbUpIcon,
  ThumbsDown: InkThumbDownIcon,

  // status
  Check: InkCheckIcon,
  Circle: InkDotIcon,
  Clock3: InkClockIcon,
  Clock: InkClockIcon,
  Pause: InkPauseIcon,
  HelpCircle: InkQuestionIcon,
  CheckCircle2: InkCheckCircleIcon,
  CircleDot: InkDropIcon,
  ShieldCheck: InkShieldIcon,
  ShieldHalf: InkShieldWarnIcon,
  ShieldOff: InkShieldOffIcon,
  Bug: InkBugIcon,
  AlertTriangle: InkAlertIcon,
  AlertCircle: InkWarnCircleIcon,
  Info: InkInfoIcon,
  X: InkCrossIcon,
  // A stop button, not a panel.
  Square: InkStopIcon,
  Star: InkStarIcon,
  Play: InkPlayIcon,
  Rocket: InkRocketIcon,

  /* ---- content kinds ----------------------------------------------------
     A text file, a code file, an audio file and a video file drew a page, a
     page, a microphone and a picture frame. They are the labels on an output
     panel's tabs, which is the one place they are read side by side. */
  Brain: InkBrainIcon,
  FileText: InkFileIcon,
  FileCode2: InkFileCodeIcon,
  FileDiff: InkFileCodeIcon,
  FileAudio2: InkFileAudioIcon,
  FileVideo2: InkFileVideoIcon,
  FileSearch: InkDocSearchIcon,
  Files: InkDocsIcon,
  Image: InkImageIcon,
  ImageIcon: InkImageIcon,
  Volume2: InkSpeakerIcon,
  Terminal: InkTerminalIcon,
  TerminalSquare: InkTerminalIcon,
  Wrench: InkGearIcon,
  PenLine: InkPenIcon,
  GitCommitHorizontal: InkDotIcon,
  Boxes: InkCubeIcon,
  Globe2: InkGlobeIcon,
  // A branch, now that the set has one — it used to be the turning ring.
  GitBranch: InkGitIcon,
  Bell: InkBellIcon,
  // An eye is not a magnifier: one looks, the other searches.
  Eye: InkEyeIcon,
  Layers: InkStackIcon,
  Database: InkDatabaseIcon,
  HardDrive: InkDrivesIcon,
  Compass: InkCompassIcon,
  Maximize2: InkExpandIcon,
  Minimize2: InkCollapseIcon,
  Trash2: InkTrashIcon,
  Wind: InkWindIcon,
  ArrowRight: InkArrowRightIcon,
  /* These two were left to lucide, on the grounds that the supplied sheet had
     no mark for a code brace or a campsite and a wash-drawn stand-in would be
     a guess at a meaning rather than a translation of one. That was a true
     constraint of a 24-mark sheet and it is not a constraint now — leaving
     them meant two 1.4px lucide outlines in a room of filled marks, which is
     the exact seam this table exists to close. */
  Braces: InkCodeIcon,
  TentTree: InkTentIcon,
};

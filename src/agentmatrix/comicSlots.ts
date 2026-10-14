/**
 * Semantic icon slot → 漫画风's mark, for every slot.
 *
 * The same construction as `gameSlots.ts`, for the same reason: a style that
 * ships its own marks for nine slots and lucide for the other fifty-seven is
 * not a style, it is lucide with props. Twenty drawings over sixty-six slots,
 * so sharing is the rule.
 *
 * Where two slots share a mark they have to mean the same thing *in this
 * style's world*. The cycle arrows carry every retry, recovery and reschedule;
 * the shield carries every permission and every validation; the cog carries
 * config and the running operation. What is not allowed is two tiles of one
 * gallery drawing the same picture — three of four tiles that look identical
 * read as a broken gallery, which is what `comicSlots.test.ts` pins.
 *
 * `Record<IconSlot, …>` on purpose: a missing slot is a compile error rather
 * than one thin lucide outline in a room of contoured shapes — invisible until
 * someone happens to open that state.
 *
 * The two avatar slots are present because the type demands totality, and the
 * branch in `IconSetContext` deliberately does not consult them (`AVATAR_SLOTS`
 * is excluded there, as it is for pixel): an avatar is the one icon the reader
 * picks by identity, and 漫画风's faces come from the registry's expression set,
 * which `STYLE_AVATAR_DEFAULTS` already chooses. Naming them here is a value
 * that never renders; leaving them out would be a compile error.
 */

import type { LucideIcon } from "lucide-react";
import type { IconSlot } from "./icons";
import {
  ComicBellIcon,
  ComicChatNewIcon,
  ComicChevronIcon,
  ComicCogIcon,
  ComicCycleIcon,
  ComicDocIcon,
  ComicDocSearchIcon,
  ComicDocsIcon,
  ComicFolderIcon,
  ComicMessageIcon,
  ComicMicIcon,
  ComicPanelsIcon,
  ComicPencilIcon,
  ComicPlusIcon,
  ComicSearchIcon,
  ComicSendIcon,
  ComicShieldIcon,
  ComicSparkleIcon,
  ComicThoughtIcon,
  ComicWrenchIcon,
} from "./comicIcons";

export const comicIconForSlot: Record<IconSlot, LucideIcon> = {
  // ---- session lifecycle -------------------------------------------------
  "session.initializing": ComicCycleIcon,
  "session.running": ComicCycleIcon,
  "session.idle": ComicThoughtIcon,
  "session.requires_action": ComicBellIcon,
  "session.rescheduling": ComicCycleIcon,
  "session.terminated": ComicPanelsIcon,
  "session.deleted": ComicFolderIcon,
  // The row mark: a balloon, because a row in this list is a conversation.
  "session.item": ComicMessageIcon,

  // ---- tool lifecycle ----------------------------------------------------
  "tool.pending_approval": ComicShieldIcon,
  "tool.in_progress": ComicWrenchIcon,
  "tool.file_read": ComicDocIcon,
  "tool.file_modified": ComicPencilIcon,
  "tool.file_edit": ComicPencilIcon,
  "tool.validate": ComicShieldIcon,
  "tool.search": ComicSearchIcon,
  "tool.completed": ComicSparkleIcon,
  "tool.failed": ComicBellIcon,
  "tool.cancelled": ComicChevronIcon,
  "tool.partial": ComicDocsIcon,

  // ---- permission --------------------------------------------------------
  "permission.allow": ComicShieldIcon,
  "permission.allow_always": ComicSparkleIcon,
  "permission.deny": ComicPanelsIcon,
  "permission.cancel": ComicChevronIcon,
  "permission.pending": ComicThoughtIcon,

  // ---- runtime -----------------------------------------------------------
  "runtime.booting": ComicCogIcon,
  "runtime.ready": ComicSparkleIcon,
  "runtime.degraded": ComicBellIcon,
  "runtime.error": ComicBellIcon,
  "runtime.recovering": ComicCycleIcon,
  "runtime.op": ComicCogIcon,
  "runtime.op_done": ComicShieldIcon,
  "runtime.op_failed": ComicBellIcon,
  "runtime.op_skipped": ComicChevronIcon,

  // ---- severity ----------------------------------------------------------
  "severity.info": ComicMessageIcon,
  "severity.warning": ComicBellIcon,
  "severity.error": ComicBellIcon,

  // ---- authors + content -------------------------------------------------
  // Never consulted — see the header.
  "author.user": ComicMessageIcon,
  "author.agent": ComicThoughtIcon,
  "content.thinking": ComicThoughtIcon,
  "content.mcp": ComicPanelsIcon,
  "content.terminal": ComicWrenchIcon,
  "content.diff": ComicDocsIcon,
  "content.image": ComicPanelsIcon,
  "content.audio": ComicMicIcon,
  "content.text": ComicDocIcon,
  "content.resource": ComicFolderIcon,
  "content.location": ComicSearchIcon,
  "source.native": ComicCogIcon,
  "source.mcp": ComicPanelsIcon,

  // ---- incidents ---------------------------------------------------------
  "incident.retrying": ComicCycleIcon,
  "incident.exhausted": ComicThoughtIcon,
  "incident.terminal": ComicBellIcon,

  // ---- error domains -----------------------------------------------------
  "error.model": ComicThoughtIcon,
  "error.mcp": ComicPanelsIcon,
  "error.billing": ComicDocIcon,
  "error.budget": ComicDocsIcon,
  "error.resource": ComicFolderIcon,
  "error.sandbox": ComicPanelsIcon,
  // A cycle that keeps going is what a timeout looks like here; the sheet has
  // no clock, and inventing one at a different weight would show.
  "error.timeout": ComicCycleIcon,
  "error.unknown": ComicThoughtIcon,

  // ---- surfaces ----------------------------------------------------------
  "surface.activity": ComicCycleIcon,
  "surface.diagnostics": ComicDocSearchIcon,
  "surface.model_span": ComicThoughtIcon,
  "surface.compaction": ComicFolderIcon,
  "surface.config": ComicCogIcon,
  "surface.interrupt": ComicPanelsIcon,
};

/**
 * Option id → mark, for the slots whose gallery the reader actually picks from.
 *
 * Four tiles a slot and four different pictures, which is the whole point of
 * the table: without it every tile in a gallery would draw `comicIconForSlot`
 * and the reader would be choosing between four copies of one drawing.
 *
 * Keyed slot-then-option, not option alone: `layers` is an option id in both
 * `tool.file_read` and `tool.search`, and a flat table cannot tell them apart.
 */
export const comicIconForOption: Partial<Record<IconSlot, Record<string, LucideIcon>>> = {
  "tool.file_read": {
    "comic-doc": ComicDocIcon,
    "comic-docs": ComicDocsIcon,
    "comic-doc-search": ComicDocSearchIcon,
    "comic-panels": ComicPanelsIcon,
  },
  "tool.file_edit": {
    "comic-pencil": ComicPencilIcon,
    "comic-doc": ComicDocIcon,
    "comic-docs": ComicDocsIcon,
    "comic-cycle": ComicCycleIcon,
  },
  "tool.validate": {
    "comic-shield": ComicShieldIcon,
    "comic-sparkle": ComicSparkleIcon,
    "comic-doc": ComicDocIcon,
    "comic-cog": ComicCogIcon,
  },
  "tool.search": {
    "comic-search": ComicSearchIcon,
    "comic-doc-search": ComicDocSearchIcon,
    "comic-folder": ComicFolderIcon,
    "comic-panels": ComicPanelsIcon,
  },
  "content.thinking": {
    "comic-thought": ComicThoughtIcon,
    "comic-sparkle": ComicSparkleIcon,
    "comic-cog": ComicCogIcon,
    "comic-cycle": ComicCycleIcon,
  },
  "content.terminal": {
    "comic-wrench": ComicWrenchIcon,
    "comic-cog": ComicCogIcon,
    "comic-panels": ComicPanelsIcon,
    "comic-plus": ComicPlusIcon,
  },
  "content.text": {
    "comic-message": ComicMessageIcon,
    "comic-doc": ComicDocIcon,
    "comic-docs": ComicDocsIcon,
    "comic-folder": ComicFolderIcon,
  },
  "session.item": {
    "comic-message": ComicMessageIcon,
    "comic-chat-new": ComicChatNewIcon,
    "comic-doc": ComicDocIcon,
    "comic-sparkle": ComicSparkleIcon,
  },
  "tool.completed": {
    "comic-sparkle": ComicSparkleIcon,
    "comic-shield": ComicShieldIcon,
    "comic-cycle": ComicCycleIcon,
    "comic-bell": ComicBellIcon,
  },
  "tool.failed": {
    "comic-bell": ComicBellIcon,
    "comic-panels": ComicPanelsIcon,
    "comic-cycle": ComicCycleIcon,
    "comic-wrench": ComicWrenchIcon,
  },
};

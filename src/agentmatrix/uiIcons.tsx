/**
 * Chrome icons that follow the active style's icon set.
 *
 * `StateIcon` covers the ~64 semantic event-stream slots (tool states, session
 * states, errors, content kinds). It does not cover the surrounding UI — the
 * sidebar's search and collapse buttons, the composer's paperclip, the
 * permission menu's shields, the model picker, the output panel's tabs. Those
 * are plain lucide imports at their call sites, so switching the event-stream
 * icons alone left an interface that was half filled glyphs and half stroked
 * outlines.
 *
 * This module re-exports the lucide names those components already use, each
 * wrapped so the WorkBuddy style renders the equivalent codicon glyph instead.
 * A component adopts it by changing its import specifier from "lucide-react"
 * to this file — call sites, props and sizes stay exactly as they were, which
 * is why the mapping lives here rather than being spread across 47 usages.
 *
 * Every other style still gets the real lucide component, unchanged.
 *
 * The codicon names are validated against the installed package by
 * uiIcons.test.ts; see codiconSlots.ts for the licensing note (CC-BY-4.0).
 */

import type { ReactElement } from "react";

import * as lucide from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";
import * as pixelart from "pixelarticons/react";

import { useIconStyle } from "./IconSetContext";
/* 水墨风's table lives with its slot map rather than here, where the Game and
   comic tables are. That set is large enough — thirty-three marks against
   twenty — that the two tables read better side by side, sharing one
   vocabulary, than split across two files. */
import { INK_BY_LUCIDE } from "./inkSlots";
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
  GameArtKeep,
  GameArtLens,
  GameArtMarket,
  GameArtMic,
  GameArtPack,
  GameArtPanels,
  GameArtPages,
  GameArtPlane,
  GameArtPotion,
  GameArtQuill,
  GameArtScroll,
  GameArtSwords,
  GameArtTrophy,
} from "./gameIcons";

/**
 * lucide name → codicon glyph.
 *
 * Chosen for what the icon *does* in this UI, not for a matching label:
 * `Gauge` is the reasoning-effort control, so it maps to `dashboard`; `Sparkles`
 * marks the model picker, so it maps to `sparkle`. Where codicon has no
 * counterpart the entry is deliberately absent and the lucide original is kept
 * — a wrong glyph is worse than a consistent outline, and the test asserts the
 * gaps are intentional rather than typos.
 */
const CODICON_BY_LUCIDE: Partial<Record<string, string>> = {
  // Per-style marks. Both are drawn only under one style preset, and both still
  // need a glyph here: the workbuddy set swaps the whole family, so an icon with
  // no entry would be the one outline left among the filled glyphs.
  //
  // `link-external` for the arrow because that is what it means at the call
  // site — the "open" control on the artifact card, pointing away — rather than
  // a direction. `flame` for the tent because the mark is a camp
  // (`game-camp-mark`), and codicon has a campfire but no tent.
  /* 科技风's send key is an up arrow; every name a preview component imports
     from here needs a glyph, or WorkBuddy is the one style left with an
     outline in a room of filled glyphs (`uiIcons.test.ts` pins it). */
  ArrowUp: "arrow-up",
  ArrowUpRight: "link-external",
  TentTree: "flame",

  // sidebar chrome
  PanelLeft: "layout-sidebar-left",
  PanelRight: "layout-sidebar-right",
  PanelsTopLeft: "layout",
  Search: "search",
  Plus: "add",

  // composer
  Paperclip: "attach",
  Mic: "mic",
  Send: "send",
  Square: "primitive-square",
  Gauge: "dashboard",
  Sparkles: "sparkle",
  Brain: "lightbulb",
  MessageSquareText: "comment",
  Rocket: "rocket",
  Bug: "bug",
  FileText: "file",
  Files: "files",

  // Permission menu. These three sit in one list ("请求权限 / 替我批准 /
  // 全部允许"), so they must be three different glyphs — mapping two of them to
  // `shield` made the first two rows identical.
  ShieldCheck: "shield",
  ShieldHalf: "workspace-trusted",
  ShieldOff: "unlock",

  // disclosure + status
  ChevronDown: "chevron-down",
  ChevronRight: "chevron-right",
  CheckCircle2: "pass",
  CircleDot: "circle-filled",
  X: "close",

  // message actions
  Copy: "copy",
  Pencil: "edit",
  RotateCcw: "refresh",

  // output panel
  Maximize2: "screen-full",
  Minimize2: "screen-normal",
  FileCode2: "file-code",
  FileDiff: "diff",
  TerminalSquare: "terminal",
  Braces: "json",
  FileAudio2: "unmute",
  FileVideo2: "device-camera-video",
  Image: "file-media",
  ImageIcon: "file-media",
  Globe2: "globe",
  Play: "play",
  Volume2: "unmute",
  Download: "cloud-download",

  // misc chrome
  GitBranch: "git-branch",
  Settings: "settings-gear",
  Save: "save",
  RefreshCw: "refresh",
  Star: "star-full",
  Boxes: "layers",
};

/**
 * lucide name → pixelarticons component name, for the Pixel style.
 *
 * Same job as the map above and the same rule for choosing: what the icon does
 * here, not what it is called. `Gauge` is the reasoning-effort control, so it
 * becomes `SpeedMedium`; `Rocket` and `Sparkles` both mark the model picker,
 * and the set has no rocket, so the one that exists does both.
 *
 * Total on purpose. Where the codicon map leaves a gap and keeps the lucide
 * original — a defensible choice for a filled-glyph set that is otherwise
 * similar in construction — a gap here would put a smooth 24-grid outline in
 * the middle of a pixel grid, which is the single most visible way this style
 * breaks. `uiIcons.test.ts` checks every name against the installed package.
 */
const PIXELART_BY_LUCIDE: Partial<Record<string, string>> = {
  // sidebar chrome. The set has no sidebar/panel glyph, so all three panel
  // toggles share the layout one — at 16px the left/right distinction was
  // never legible anyway.
  ArrowUp: "ArrowUp",
  PanelLeft: "Layout",
  PanelRight: "Layout",
  PanelsTopLeft: "Layout",
  Search: "Search",
  Plus: "Plus",

  // composer
  Paperclip: "Attachment",
  Mic: "Mic",
  Send: "Send",
  Square: "Stop",
  Gauge: "SpeedMedium",
  Sparkles: "Sparkles",
  Brain: "Cpu",
  MessageSquareText: "MessageText",
  Rocket: "Sparkles",

  // permissions
  ShieldCheck: "Shield",
  ShieldHalf: "Shield",
  ShieldOff: "Shield",

  // disclosure + row actions
  ChevronDown: "ChevronDown",
  ChevronRight: "ChevronRight",
  CheckCircle2: "Check",
  CircleDot: "Circle",
  X: "Close",
  Copy: "Copy",
  Pencil: "Pencil",
  RotateCcw: "Undo",
  Maximize2: "Expand",
  Minimize2: "Collapse",

  // content kinds
  Bug: "Bug",
  FileText: "FileText",
  Files: "Files",
  FileCode2: "Code",
  // A diff is a code document; the same plate as the file it changes.
  FileDiff: "Code",
  TerminalSquare: "Terminal",
  Braces: "Code",
  FileAudio2: "Music",
  FileVideo2: "Video",
  Image: "Image",
  ImageIcon: "Image",
  Globe2: "Globe",
  Play: "Play",
  Volume2: "Volume2",
  Download: "Download",

  // misc chrome
  GitBranch: "GitBranch",
  Settings: "Gear",
  Save: "Save",
  RefreshCw: "Reload",
  Star: "Star",
  Boxes: "Box",
};

/**
 * Wraps one lucide icon so it answers to the active icon style.
 *
 * Two style-specific sets branch off here, and both drop the stroke-shaped
 * props (`strokeWidth`, `fill`, `absoluteStrokeWidth`) because neither is drawn
 * with a stroke — codicon is a filled font glyph, pixelarticons is a filled
 * path. `size` and `className` carry over, since those are what call sites use
 * to fit an icon to its slot.
 *
 * pixelarticons takes `width`/`height` rather than lucide's `size`, so the
 * adapter translates; it also has no `size` prop to pass through, which is why
 * `rest` is filtered rather than spread wholesale.
 */
/**
 * lucide name → the Game style's painted mark.
 *
 * The chrome, not the event stream: `gameSlots.ts` covers the ~65 semantic
 * slots and this covers what surrounds them — the sidebar's search and new-chat
 * controls, the composer's clip and mic and send, the menus' shields, the
 * output panel's tabs. Without it the style was painted plates inside the
 * conversation and stock outlines all round the edge of it.
 *
 * Chosen for what the control *does* here, the same rule the codicon map above
 * follows. Three worth saying out loud:
 *
 * `Plus` is the chat-with-a-plus bubble. The sheet drew that one for exactly
 * this control, which is the only place the art answered a chrome question
 * before it was asked.
 *
 * `RotateCcw` and `RefreshCw` are both the cycle: they are the same verb at two
 * call sites, and the sheet has one picture for it.
 *
 * `Download` and `Save` are both the chest. Taking a thing away and putting a
 * thing away are the same gesture in a game.
 *
 * The gaps are deliberate, like the codicon map's. `Maximize2` / `Minimize2`
 * are window geometry, `Braces` is JSON, `ChevronDown` / `ChevronRight` are a
 * direction — the sheet has no object for any of them, and a painted prop
 * standing in for "collapse" is a puzzle the reader has to solve.
 *
 * The two column toggles used to be listed here as gaps for the same reason,
 * and they were wrong: the two stock outlines left on the canvas were both of
 * them. `GameArtPanels` is a plaque with two panels ruled on it, which is what
 * the control does.
 */
const GAME_BY_LUCIDE: Partial<Record<string, LucideIcon>> = {
  // sidebar chrome + the column toggles
  Search: GameArtLens,
  Plus: GameArtChatNew,
  PanelLeft: GameArtPanels,
  PanelRight: GameArtPanels,
  PanelsTopLeft: GameArtPanels,

  // composer
  Paperclip: GameArtPack,
  Mic: GameArtMic,
  Send: GameArtPlane,
  Gauge: GameArtChronicle,
  Sparkles: GameArtPotion,
  Settings: GameArtCog,

  // message + artifact actions
  Copy: GameArtPages,
  Pencil: GameArtQuill,
  RotateCcw: GameArtCycle,
  RefreshCw: GameArtCycle,
  Download: GameArtChest,
  Save: GameArtChest,
  ArrowUpRight: GameArtCompass,

  // status + permission
  CheckCircle2: GameArtTrophy,
  CircleDot: GameArtCrest,
  ShieldCheck: GameArtCrest,
  ShieldHalf: GameArtCharter,
  ShieldOff: GameArtSwords,
  Bug: GameArtPotion,
  X: GameArtSwords,
  Square: GameArtBell,
  Star: GameArtTrophy,
  Play: GameArtCompass,
  Rocket: GameArtKeep,

  // content kinds, in the output panel's tabs and on artifact cards
  Brain: GameArtPotion,
  FileText: GameArtScroll,
  FileCode2: GameArtPages,
  FileDiff: GameArtPages,
  FileAudio2: GameArtMic,
  FileVideo2: GameArtChest,
  Files: GameArtChronicle,
  Image: GameArtChest,
  ImageIcon: GameArtChest,
  Volume2: GameArtMic,
  MessageSquareText: GameArtChatNew,
  TerminalSquare: GameArtCog,
  Boxes: GameArtPack,
  Globe2: GameArtCompass,
  GitBranch: GameArtCycle,
  Braces: undefined,

  // the campfire mark at the foot of the sidebar
  TentTree: GameArtKeep,
};

/**
 * lucide name → 漫画风's mark, for the chrome the event-stream slots do not
 * cover: the sidebar's buttons, the composer's row, the output tabs, the
 * message actions.
 *
 * Without this the style was one comic mark (the tool row's page) among seven
 * lucide outlines — measured on the canvas, which is how it was found. The
 * sheet has twenty drawings and this list has forty-five names, so most of the
 * mapping is by *meaning*: every shield is the crest, every retry and refresh
 * is the cycle, every file-ish tab is the page, audio is the microphone.
 *
 * `undefined` where the sheet has nothing honest to offer (`Braces`,
 * `TentTree`): falling back to lucide is better than drawing the wrong object
 * in the right weight, and it is one glyph rather than a whole surface.
 */
const COMIC_BY_LUCIDE: Record<string, LucideIcon | undefined> = {
  // sidebar
  Search: ComicSearchIcon,
  Plus: ComicPlusIcon,
  PanelLeft: ComicPanelsIcon,
  PanelRight: ComicPanelsIcon,
  PanelsTopLeft: ComicPanelsIcon,

  // composer
  Paperclip: ComicFolderIcon,
  Mic: ComicMicIcon,
  Send: ComicSendIcon,
  Gauge: ComicCogIcon,
  Sparkles: ComicSparkleIcon,
  Settings: ComicCogIcon,

  // message actions
  Copy: ComicDocsIcon,
  Pencil: ComicPencilIcon,
  RotateCcw: ComicCycleIcon,
  RefreshCw: ComicCycleIcon,
  Download: ComicChevronIcon,
  Save: ComicDocIcon,
  ArrowUpRight: ComicSendIcon,

  // status
  CheckCircle2: ComicShieldIcon,
  CircleDot: ComicCogIcon,
  ShieldCheck: ComicShieldIcon,
  ShieldHalf: ComicShieldIcon,
  ShieldOff: ComicBellIcon,
  Bug: ComicBellIcon,
  X: ComicPanelsIcon,
  Square: ComicPanelsIcon,
  Star: ComicSparkleIcon,
  Play: ComicCycleIcon,
  Rocket: ComicSparkleIcon,

  // content kinds
  Brain: ComicThoughtIcon,
  FileText: ComicDocIcon,
  FileCode2: ComicDocIcon,
  FileDiff: ComicDocIcon,
  FileAudio2: ComicMicIcon,
  FileVideo2: ComicPanelsIcon,
  Files: ComicDocsIcon,
  Image: ComicPanelsIcon,
  ImageIcon: ComicPanelsIcon,
  Volume2: ComicMicIcon,
  MessageSquareText: ComicMessageIcon,
  TerminalSquare: ComicWrenchIcon,
  Boxes: ComicFolderIcon,
  Globe2: ComicSearchIcon,
  GitBranch: ComicCycleIcon,
  Braces: undefined,
  TentTree: undefined,
  // Two more the sheet does answer, and neither is in the Game table: the
  // disclosure arrow and the new-conversation balloon.
  ChevronDown: ComicChevronIcon,
  MessageSquarePlus: ComicChatNewIcon,
  FileSearch: ComicDocSearchIcon,
  Wrench: ComicWrenchIcon,
  Bell: ComicBellIcon,
};

function withStyledIcon(name: string, Original: LucideIcon): LucideIcon {
  const glyph = CODICON_BY_LUCIDE[name];
  const pixelName = PIXELART_BY_LUCIDE[name];
  const GameIcon = GAME_BY_LUCIDE[name];
  const ComicIcon = COMIC_BY_LUCIDE[name];
  const InkIcon = INK_BY_LUCIDE[name];
  if (!glyph && !pixelName && !GameIcon && !ComicIcon && !InkIcon) return Original;

  const Wrapped = ({ size = 16, className, ...rest }: LucideProps) => {
    const style = useIconStyle();

    /* The Game mark is a real `LucideIcon` — an SVG with
       `stroke="currentColor"` — so it takes the call site's props unchanged
       and needs none of the size translation the two branches below do. */
    if (style === "game" && GameIcon) {
      return <GameIcon size={size} className={className} {...rest} data-lucide-name={name} />;
    }

    /* Same contract as the Game branch: the comic mark is a real `LucideIcon`,
       so the call site's props pass through untouched. */
    if (style === "comic" && ComicIcon) {
      return <ComicIcon size={size} className={className} {...rest} data-lucide-name={name} />;
    }

    /* 水墨风, same contract again. This is the branch that inks the *chrome* —
       the left column's 新建对话 and 搜索, the panel toggles, the send key, every
       disclosure chevron. `inkIconForSlot` covers the timeline; without this
       the style would have washes in its conversation and lucide outlines in
       its sidebar, which is the one place the seam would be obvious. */
    if (style === "ink" && InkIcon) {
      return <InkIcon size={size} className={className} {...rest} data-lucide-name={name} />;
    }

    if (style === "pixel" && pixelName) {
      const PixelIcon = (pixelart as Record<string, unknown>)[pixelName] as
        | ((props: Record<string, unknown>) => ReactElement)
        | undefined;
      if (PixelIcon) {
        const px = typeof size === "number" ? size : Number.parseInt(String(size), 10) || 16;
        return (
          <PixelIcon
            width={px}
            height={px}
            className={className}
            aria-hidden={rest["aria-hidden"] ?? true}
            data-lucide-name={name}
          />
        );
      }
    }

    if (style === "codicon" && glyph) {
      const px = typeof size === "number" ? `${size}px` : String(size);
      return (
        <span
          className={className ? `codicon codicon-${glyph} ${className}` : `codicon codicon-${glyph}`}
          style={{ fontSize: px, width: px, height: px, lineHeight: px }}
          aria-hidden={rest["aria-hidden"] ?? true}
          data-lucide-name={name}
        />
      );
    }

    return <Original size={size} className={className} {...rest} />;
  };
  Wrapped.displayName = `StyledIcon(${name})`;
  return Wrapped as unknown as LucideIcon;
}

/** The names the preview components import. Kept explicit so this module's
 *  surface is reviewable, rather than proxying all ~1500 lucide exports. */
export const ArrowUp = withStyledIcon("ArrowUp", lucide.ArrowUp);
export const ArrowUpRight = withStyledIcon("ArrowUpRight", lucide.ArrowUpRight);
export const Boxes = withStyledIcon("Boxes", lucide.Boxes);
export const Braces = withStyledIcon("Braces", lucide.Braces);
export const Brain = withStyledIcon("Brain", lucide.Brain);
export const Bug = withStyledIcon("Bug", lucide.Bug);
export const Check = withStyledIcon("Check", lucide.Check);
export const Circle = withStyledIcon("Circle", lucide.Circle);
export const Clock3 = withStyledIcon("Clock3", lucide.Clock3);
export const GitCommitHorizontal = withStyledIcon("GitCommitHorizontal", lucide.GitCommitHorizontal);
export const MessageSquare = withStyledIcon("MessageSquare", lucide.MessageSquare);
export const PenLine = withStyledIcon("PenLine", lucide.PenLine);
export const Wrench = withStyledIcon("Wrench", lucide.Wrench);
export const CheckCircle2 = withStyledIcon("CheckCircle2", lucide.CheckCircle2);
export const ChevronDown = withStyledIcon("ChevronDown", lucide.ChevronDown);
export const ChevronRight = withStyledIcon("ChevronRight", lucide.ChevronRight);
export const CircleDot = withStyledIcon("CircleDot", lucide.CircleDot);
export const Copy = withStyledIcon("Copy", lucide.Copy);
export const Download = withStyledIcon("Download", lucide.Download);
export const FileAudio2 = withStyledIcon("FileAudio2", lucide.FileAudio2);
export const FileCode2 = withStyledIcon("FileCode2", lucide.FileCode2);
export const FileDiff = withStyledIcon("FileDiff", lucide.FileDiff);
export const FileText = withStyledIcon("FileText", lucide.FileText);
export const FileVideo2 = withStyledIcon("FileVideo2", lucide.FileVideo2);
export const Files = withStyledIcon("Files", lucide.Files);
export const Gauge = withStyledIcon("Gauge", lucide.Gauge);
export const GitBranch = withStyledIcon("GitBranch", lucide.GitBranch);
export const Globe2 = withStyledIcon("Globe2", lucide.Globe2);
export const Image = withStyledIcon("Image", lucide.Image);
// lucide ships both spellings and call sites here use both; re-exporting only
// one leaves the other importing straight from lucide and rendering an outline
// among the glyphs.
export const ImageIcon = withStyledIcon("ImageIcon", lucide.ImageIcon);
export const Maximize2 = withStyledIcon("Maximize2", lucide.Maximize2);
export const MessageSquareText = withStyledIcon("MessageSquareText", lucide.MessageSquareText);
export const Mic = withStyledIcon("Mic", lucide.Mic);
export const Minimize2 = withStyledIcon("Minimize2", lucide.Minimize2);
export const PanelLeft = withStyledIcon("PanelLeft", lucide.PanelLeft);
export const PanelRight = withStyledIcon("PanelRight", lucide.PanelRight);
export const PanelsTopLeft = withStyledIcon("PanelsTopLeft", lucide.PanelsTopLeft);
export const Paperclip = withStyledIcon("Paperclip", lucide.Paperclip);
export const Pencil = withStyledIcon("Pencil", lucide.Pencil);
export const Play = withStyledIcon("Play", lucide.Play);
export const Plus = withStyledIcon("Plus", lucide.Plus);
export const RefreshCw = withStyledIcon("RefreshCw", lucide.RefreshCw);
export const Rocket = withStyledIcon("Rocket", lucide.Rocket);
export const RotateCcw = withStyledIcon("RotateCcw", lucide.RotateCcw);
export const Save = withStyledIcon("Save", lucide.Save);
export const Search = withStyledIcon("Search", lucide.Search);
export const Send = withStyledIcon("Send", lucide.Send);
export const Settings = withStyledIcon("Settings", lucide.Settings);
export const ShieldCheck = withStyledIcon("ShieldCheck", lucide.ShieldCheck);
export const ShieldHalf = withStyledIcon("ShieldHalf", lucide.ShieldHalf);
export const ShieldOff = withStyledIcon("ShieldOff", lucide.ShieldOff);
export const Sparkles = withStyledIcon("Sparkles", lucide.Sparkles);
export const Square = withStyledIcon("Square", lucide.Square);
export const Star = withStyledIcon("Star", lucide.Star);
export const TentTree = withStyledIcon("TentTree", lucide.TentTree);
export const TerminalSquare = withStyledIcon("TerminalSquare", lucide.TerminalSquare);
export const Volume2 = withStyledIcon("Volume2", lucide.Volume2);
export const X = withStyledIcon("X", lucide.X);

export { CODICON_BY_LUCIDE };

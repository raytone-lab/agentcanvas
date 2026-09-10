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

import * as lucide from "lucide-react";
import type { LucideIcon, LucideProps } from "lucide-react";

import { useIconStyle } from "./IconSetContext";

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
 * Wraps one lucide icon so it answers to the active icon style.
 *
 * The codicon branch drops the stroke-shaped props (`strokeWidth`, `fill`,
 * `absoluteStrokeWidth`) because a filled font glyph has nothing to apply them
 * to; `size` and `className` carry over, since those are what call sites use to
 * fit an icon to its slot.
 */
function withCodicon(name: string, Original: LucideIcon): LucideIcon {
  const glyph = CODICON_BY_LUCIDE[name];
  if (!glyph) return Original;

  const Wrapped = ({ size = 16, className, ...rest }: LucideProps) => {
    const style = useIconStyle();
    if (style !== "codicon") {
      return <Original size={size} className={className} {...rest} />;
    }
    const px = typeof size === "number" ? `${size}px` : String(size);
    return (
      <span
        className={className ? `codicon codicon-${glyph} ${className}` : `codicon codicon-${glyph}`}
        style={{ fontSize: px, width: px, height: px, lineHeight: px }}
        aria-hidden={rest["aria-hidden"] ?? true}
        data-lucide-name={name}
      />
    );
  };
  Wrapped.displayName = `Codicon(${name})`;
  return Wrapped as unknown as LucideIcon;
}

/** The names the preview components import. Kept explicit so this module's
 *  surface is reviewable, rather than proxying all ~1500 lucide exports. */
export const Boxes = withCodicon("Boxes", lucide.Boxes);
export const Braces = withCodicon("Braces", lucide.Braces);
export const Brain = withCodicon("Brain", lucide.Brain);
export const Bug = withCodicon("Bug", lucide.Bug);
export const CheckCircle2 = withCodicon("CheckCircle2", lucide.CheckCircle2);
export const ChevronDown = withCodicon("ChevronDown", lucide.ChevronDown);
export const ChevronRight = withCodicon("ChevronRight", lucide.ChevronRight);
export const CircleDot = withCodicon("CircleDot", lucide.CircleDot);
export const Copy = withCodicon("Copy", lucide.Copy);
export const Download = withCodicon("Download", lucide.Download);
export const FileAudio2 = withCodicon("FileAudio2", lucide.FileAudio2);
export const FileCode2 = withCodicon("FileCode2", lucide.FileCode2);
export const FileText = withCodicon("FileText", lucide.FileText);
export const FileVideo2 = withCodicon("FileVideo2", lucide.FileVideo2);
export const Files = withCodicon("Files", lucide.Files);
export const Gauge = withCodicon("Gauge", lucide.Gauge);
export const GitBranch = withCodicon("GitBranch", lucide.GitBranch);
export const Globe2 = withCodicon("Globe2", lucide.Globe2);
export const Image = withCodicon("Image", lucide.Image);
// lucide ships both spellings and call sites here use both; re-exporting only
// one leaves the other importing straight from lucide and rendering an outline
// among the glyphs.
export const ImageIcon = withCodicon("ImageIcon", lucide.ImageIcon);
export const Maximize2 = withCodicon("Maximize2", lucide.Maximize2);
export const MessageSquareText = withCodicon("MessageSquareText", lucide.MessageSquareText);
export const Mic = withCodicon("Mic", lucide.Mic);
export const Minimize2 = withCodicon("Minimize2", lucide.Minimize2);
export const PanelLeft = withCodicon("PanelLeft", lucide.PanelLeft);
export const PanelRight = withCodicon("PanelRight", lucide.PanelRight);
export const PanelsTopLeft = withCodicon("PanelsTopLeft", lucide.PanelsTopLeft);
export const Paperclip = withCodicon("Paperclip", lucide.Paperclip);
export const Pencil = withCodicon("Pencil", lucide.Pencil);
export const Play = withCodicon("Play", lucide.Play);
export const Plus = withCodicon("Plus", lucide.Plus);
export const RefreshCw = withCodicon("RefreshCw", lucide.RefreshCw);
export const Rocket = withCodicon("Rocket", lucide.Rocket);
export const RotateCcw = withCodicon("RotateCcw", lucide.RotateCcw);
export const Save = withCodicon("Save", lucide.Save);
export const Search = withCodicon("Search", lucide.Search);
export const Send = withCodicon("Send", lucide.Send);
export const Settings = withCodicon("Settings", lucide.Settings);
export const ShieldCheck = withCodicon("ShieldCheck", lucide.ShieldCheck);
export const ShieldHalf = withCodicon("ShieldHalf", lucide.ShieldHalf);
export const ShieldOff = withCodicon("ShieldOff", lucide.ShieldOff);
export const Sparkles = withCodicon("Sparkles", lucide.Sparkles);
export const Square = withCodicon("Square", lucide.Square);
export const Star = withCodicon("Star", lucide.Star);
export const TerminalSquare = withCodicon("TerminalSquare", lucide.TerminalSquare);
export const Volume2 = withCodicon("Volume2", lucide.Volume2);
export const X = withCodicon("X", lucide.X);

export { CODICON_BY_LUCIDE };

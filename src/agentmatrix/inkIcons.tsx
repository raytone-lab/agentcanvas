/**
 * 水墨风's icon set: Phosphor at `weight="fill"`.
 *
 * This replaced a hand-drawn set — 37 marks built from a supplied 6×4 sheet,
 * each one a wide blurred "bleed" pass under a 1.8px contour, meant to read as
 * ink soaking into paper. Two things were wrong with it, and only the second is
 * about drawing:
 *
 *   1. **37 marks had to cover 141 positions.** 92 semantic slots plus 49
 *      chrome names, and the sheet answers neither number. `InkAlertIcon` was
 *      the mark for nineteen slots, `InkCycleIcon` and `InkCrossIcon` for
 *      fifteen each — so every warning, every failure and every spent retry in
 *      the timeline drew one picture. That is not a style with a thin spot in
 *      it; it is the reason the set read as cheap. Sharing was written into the
 *      old header as "the rule", which is the tell: a vocabulary too small for
 *      its job will always be described as economical.
 *   2. **The bleed did not survive the render size.** 0.45px of blur at 0.18
 *      opacity is invisible at the 15–16px these marks are drawn at, so what
 *      shipped was the contour alone: a pale, uniform, thin grey outline. The
 *      construction that was supposed to make it ink only exists above ~64px.
 *
 * Phosphor was already a dependency (`icons.tsx` draws the avatars from it, and
 * `scaffoldManifest.ts` already lists it for the export), so this costs no new
 * package, no new licence entry and no new export wiring. It brings 1512 marks,
 * which is what lets the three tables in `inkSlots.ts` stop sharing.
 *
 * **Why `fill` and not an outline weight.** Ink-wash is brush on paper: solid
 * shapes with value contrast, tapering where the brush lifts. It is not a
 * uniform hairline, which is exactly what the old set degraded into. Measured
 * against `bold`, `regular` and `duotone` on all four colourways at 15px and
 * 22px (`scripts/probe-ink-weights.mjs`): `duotone` — nominally the faithful
 * one, a pale body under a darker line, the same construction the hand-drawn
 * set attempted — loses its pale layer entirely at 15px and on the night
 * palette, so it renders as a slightly dirty `regular`. `fill` holds at both
 * sizes on both, and `currentColor` carries it across all four colourways
 * without the "dark hole on a dark palette" problem a bitmap would have.
 */

import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import type { IconProps, IconWeight } from "@phosphor-icons/react";
/*
 * Named imports, one per mark, and deliberately not `import * as Ph`.
 *
 * A namespace import of this package is 1512 icons × 6 weights on the editor's
 * module graph with a dynamic `Ph[name]` lookup that no bundler can narrow —
 * it would defeat tree-shaking wholesale. The pixel style gets away with
 * exactly that shape (`pixelart as Record<string, unknown>` in `uiIcons.tsx`)
 * because pixelarticons is small; this one is not.
 */
import {
  ArrowRight as PhArrowRight,
  ArrowUUpLeft as PhArrowUUpLeft,
  ArrowUp as PhArrowUp,
  ArrowUpRight as PhArrowUpRight,
  ArrowsClockwise as PhArrowsClockwise,
  Bell as PhBell,
  BookOpenText as PhBookOpenText,
  Brain as PhBrain,
  Broadcast as PhBroadcast,
  Bug as PhBug,
  CaretDown as PhCaretDown,
  CaretRight as PhCaretRight,
  CaretUpDown as PhCaretUpDown,
  ChatTeardrop as PhChatTeardrop,
  ChatTeardropDots as PhChatTeardropDots,
  Check as PhCheck,
  CheckCircle as PhCheckCircle,
  Circle as PhCircle,
  CircleDashed as PhCircleDashed,
  Clock as PhClock,
  Cloud as PhCloud,
  Code as PhCode,
  Compass as PhCompass,
  Copy as PhCopy,
  CornersIn as PhCornersIn,
  CornersOut as PhCornersOut,
  Crosshair as PhCrosshair,
  Cube as PhCube,
  Database as PhDatabase,
  Disc as PhDisc,
  DotsThree as PhDotsThree,
  DownloadSimple as PhDownloadSimple,
  Drop as PhDrop,
  Eye as PhEye,
  File as PhFile,
  FileAudio as PhFileAudio,
  FileCode as PhFileCode,
  FileMagnifyingGlass as PhFileMagnifyingGlass,
  FileVideo as PhFileVideo,
  Files as PhFiles,
  Fire as PhFire,
  FloppyDisk as PhFloppyDisk,
  FlowerLotus as PhFlowerLotus,
  Folder as PhFolder,
  Gauge as PhGauge,
  Gear as PhGear,
  GitBranch as PhGitBranch,
  GitDiff as PhGitDiff,
  GlobeHemisphereEast as PhGlobeHemisphereEast,
  HardDrives as PhHardDrives,
  Hourglass as PhHourglass,
  Image as PhImage,
  Info as PhInfo,
  Leaf as PhLeaf,
  Lightning as PhLightning,
  ListDashes as PhListDashes,
  MagnifyingGlass as PhMagnifyingGlass,
  MapPin as PhMapPin,
  Microphone as PhMicrophone,
  Moon as PhMoon,
  Mountains as PhMountains,
  NotePencil as PhNotePencil,
  PaintBrush as PhPaintBrush,
  PaperPlaneTilt as PhPaperPlaneTilt,
  Paperclip as PhPaperclip,
  Path as PhPath,
  Pause as PhPause,
  PenNib as PhPenNib,
  Play as PhPlay,
  Plugs as PhPlugs,
  Plus as PhPlus,
  Prohibit as PhProhibit,
  PuzzlePiece as PhPuzzlePiece,
  Question as PhQuestion,
  Robot as PhRobot,
  Rocket as PhRocket,
  Scroll as PhScroll,
  ShieldCheck as PhShieldCheck,
  ShieldSlash as PhShieldSlash,
  ShieldWarning as PhShieldWarning,
  SidebarSimple as PhSidebarSimple,
  Sparkle as PhSparkle,
  SpeakerHigh as PhSpeakerHigh,
  Stack as PhStack,
  Stamp as PhStamp,
  Star as PhStar,
  Stop as PhStop,
  Tent as PhTent,
  TerminalWindow as PhTerminalWindow,
  ThumbsDown as PhThumbsDown,
  ThumbsUp as PhThumbsUp,
  Trash as PhTrash,
  Warning as PhWarning,
  WarningCircle as PhWarningCircle,
  Waves as PhWaves,
  Wind as PhWind,
  X as PhX,
} from "@phosphor-icons/react";

/**
 * The marks this set draws at `bold` instead of `fill`, by Phosphor name.
 *
 * **Why the list exists.** Phosphor's `fill` weight needs a body to fill. A
 * glyph that is only strokes has none, so for those the weight draws a
 * full-bleed rounded rect with the glyph reversed out of it — `Check` at fill
 * is literally `M216,40H40A16,16,0,0,0,24,56V200…`, a rect from (24,40) to
 * (232,216) with the tick cut out. At 15px that reads as a heavy black block,
 * and `Check`, `X` and `Plus` are the three marks this style's timeline uses
 * most.
 *
 * So: a wash has a body; a mark that is only a stroke has no body to fill, and
 * keeps the brush's weight instead.
 *
 * **How the list was found**, because the method matters more than the names
 * (`scripts/probe-phosphor-fill.mjs`): every candidate rasterised at both
 * weights and scored on dark-pixel coverage. Absolute coverage does not
 * separate them — `Check` at fill measures 0.511 and `Circle` 0.517, but the
 * first is a box and the second is a solid ink dot, the most on-style mark in
 * the set. The fill/bold *ratio* is the signal: a glyph with a body gains
 * 1.5–2.3×, a stroke-only glyph 3–8× because the weight invents a body for it.
 * That over-reports on its own (`DotsThree` gains 7.9× and is three honest
 * dots), so the probe conjoins the two and then *shows* you the survivors.
 *
 * The eye overruled the classifier twice, which is why this is a hand-held list
 * and not a threshold: `Code` (2.68×) and `ListDashes` (2.40×) are boxes that
 * fell below the ratio cut, and `CircleDashed` is here for a different reason
 * altogether — its fill is a *solid disc*, and the slot it serves
 * (`incident.exhausted`) means "the retries are spent". A filled dot says the
 * opposite of empty. Legal value, wrong element.
 *
 * `inkIcons.test.ts` pins this list exactly. One name wide is an exception; a
 * predicate would be a hole in the rule.
 */
export const INK_FILL_EXEMPTIONS: readonly string[] = [
  // Boxes at fill: the glyph is strokes, so the weight draws a rect around it.
  "Check",
  "Code",
  "ListDashes",
  "Plus",
  "X",
  // Fill turns an empty ring into a solid dot — the opposite of what it marks.
  "CircleDashed",
];

const EXEMPT = new Set(INK_FILL_EXEMPTIONS);

/** Every mark in this set is one of these two. There is no third weight. */
const INK_WEIGHTS = { body: "fill", stroke: "bold" } as const satisfies Record<string, IconWeight>;

const markNames: string[] = [];
const markWeights = new Map<string, IconWeight>();

/**
 * Every Phosphor name this set draws with, and the weight each resolved to.
 *
 * Exported so the exemption list can be checked against what is actually drawn
 * rather than against itself. The failure this catches is a rename: `inkMark`
 * matches on the display name it is handed, so re-pointing a mark from
 * `ListDashes` to `List` would silently return it to `fill` and start drawing a
 * knocked-out box, with the exemption list still listing a name nothing uses.
 */
export const INK_MARK_NAMES: readonly string[] = markNames;
export const inkMarkWeight = (phosphorName: string): IconWeight | undefined =>
  markWeights.get(phosphorName);

type InkIconProps = { size?: number | string; className?: string; [key: string]: unknown };

/**
 * Wrap a Phosphor icon as the `LucideIcon` the rest of the app passes around.
 *
 * `LucideIcon` is the shape every call site already speaks — `StateIcon`, the
 * `withStyledIcon` branches in `uiIcons.tsx`, the rail's gallery tiles — and
 * the cast is the same one the hand-drawn set used. Phosphor's `IconProps`
 * extends `ComponentPropsWithoutRef<"svg">`, so `className`, `data-icon-slot`
 * and `data-lucide-name` all reach the DOM untouched; `strokeWidth` from the
 * contact sheet lands as an inert SVG attribute, which at `fill` is correct.
 *
 * `data-ink-weight` is not decoration: it puts the exemption decision in the
 * DOM, so a probe can audit which marks actually resolved to `bold` rather
 * than trusting that the list and the call sites agree.
 */
function inkMark(
  Mark: ComponentType<IconProps>,
  phosphorName: string,
  { mirrored = false }: { mirrored?: boolean } = {},
): LucideIcon {
  const weight = EXEMPT.has(phosphorName) ? INK_WEIGHTS.stroke : INK_WEIGHTS.body;
  markNames.push(phosphorName);
  markWeights.set(phosphorName, weight);
  /* JSX rather than `createElement`: `data-*` on a component is a JSX-only
     affordance in React's types, so the object-literal form rejects
     `data-ink-weight` outright. Same shape the Comic and Game branches in
     `uiIcons.tsx` use. */
  const Icon = ({ size = 16, className, ...rest }: InkIconProps) => (
    <Mark
      size={size}
      weight={weight}
      mirrored={mirrored}
      className={["ink-icon", className].filter(Boolean).join(" ")}
      aria-hidden
      focusable={false}
      data-ink-weight={weight}
      {...(rest as Partial<IconProps>)}
    />
  );
  return Icon as unknown as LucideIcon;
}

/* ---- The 37 behind this style's `ink-*` option ids ----------------------- */
/* Same names as the hand-drawn set they replace: `icons.tsx` imports 34 of them
   for the rail's gallery tiles and `SessionSidebar.tsx` one more, so renaming
   would be churn for nothing. What each one *draws* is new. */

export const InkAlertIcon = inkMark(PhWarning, "Warning");
export const InkBloomIcon = inkMark(PhFlowerLotus, "FlowerLotus");
export const InkBrushIcon = inkMark(PhPaintBrush, "PaintBrush");
export const InkBubbleIcon = inkMark(PhChatTeardrop, "ChatTeardrop");
export const InkChatNewIcon = inkMark(PhChatTeardropDots, "ChatTeardropDots");
export const InkCheckIcon = inkMark(PhCheck, "Check");
export const InkChevronDownIcon = inkMark(PhCaretDown, "CaretDown");
export const InkChevronRightIcon = inkMark(PhCaretRight, "CaretRight");
export const InkCopyIcon = inkMark(PhCopy, "Copy");
export const InkCrossIcon = inkMark(PhX, "X");
export const InkCycleIcon = inkMark(PhArrowsClockwise, "ArrowsClockwise");
export const InkDiscIcon = inkMark(PhDisc, "Disc");
export const InkDocEditIcon = inkMark(PhNotePencil, "NotePencil");
export const InkDocReadIcon = inkMark(PhBookOpenText, "BookOpenText");
export const InkDocSearchIcon = inkMark(PhFileMagnifyingGlass, "FileMagnifyingGlass");
export const InkDocsIcon = inkMark(PhFiles, "Files");
/* The ink drop — the one mark in the set the style is named after. */
export const InkDropIcon = inkMark(PhDrop, "Drop");
export const InkEmptyRingIcon = inkMark(PhCircleDashed, "CircleDashed");
export const InkFileIcon = inkMark(PhFile, "File");
export const InkFolderIcon = inkMark(PhFolder, "Folder");
export const InkGlobeIcon = inkMark(PhGlobeHemisphereEast, "GlobeHemisphereEast");
export const InkHourglassIcon = inkMark(PhHourglass, "Hourglass");
export const InkImageIcon = inkMark(PhImage, "Image");
export const InkListIcon = inkMark(PhListDashes, "ListDashes");
export const InkMicIcon = inkMark(PhMicrophone, "Microphone");
export const InkPanelsIcon = inkMark(PhSidebarSimple, "SidebarSimple");
/**
 * The same sidebar, flipped.
 *
 * 展开左栏 and 展开右栏 sit a few pixels apart in the topbar and used to draw
 * one glyph between them. Phosphor has no right-hand variant — it has
 * `mirrored`, which is the correct answer rather than borrowing an unrelated
 * mark: the first fix here pointed `PanelRight` at `CornersIn`, which reads as
 * "collapse" and also collided with `Minimize2`.
 *
 * Registered under its own name so the one-Phosphor-mark-per-`Ink*Icon` guard
 * still sees two distinct marks.
 */
export const InkPanelsRightIcon = inkMark(PhSidebarSimple, "SidebarSimple(mirrored)", {
  mirrored: true,
});
export const InkPauseIcon = inkMark(PhPause, "Pause");
export const InkPlusIcon = inkMark(PhPlus, "Plus");
export const InkQuestionIcon = inkMark(PhQuestion, "Question");
export const InkReturnIcon = inkMark(PhArrowUUpLeft, "ArrowUUpLeft");
export const InkSearchIcon = inkMark(PhMagnifyingGlass, "MagnifyingGlass");
export const InkSelectIcon = inkMark(PhCaretUpDown, "CaretUpDown");
export const InkSendIcon = inkMark(PhPaperPlaneTilt, "PaperPlaneTilt");
export const InkShieldIcon = inkMark(PhShieldCheck, "ShieldCheck");
/* The seal. The style's accent is cinnabar for exactly this reason. */
export const InkStampIcon = inkMark(PhStamp, "Stamp");
export const InkTerminalIcon = inkMark(PhTerminalWindow, "TerminalWindow");
/* A cloud, not a brain: this style's thought is 云, and the brain is below for
   the model's own states, which are a different thing. */
export const InkThoughtIcon = inkMark(PhCloud, "Cloud");

/* ---- The expansion ------------------------------------------------------- */
/*
 * The marks that let the three tables in `inkSlots.ts` stop collapsing. None of
 * these existed in the hand-drawn sheet, which is why nineteen slots shared one
 * exclamation: there was nothing else to give them.
 *
 * Ordered by what they answer, not alphabetically — the grouping is the
 * argument for why each one is here rather than shared with a neighbour.
 */

// the machine's own states, distinct from a thought
export const InkBrainIcon = inkMark(PhBrain, "Brain");
export const InkRobotIcon = inkMark(PhRobot, "Robot");
export const InkBroadcastIcon = inkMark(PhBroadcast, "Broadcast");
export const InkLightningIcon = inkMark(PhLightning, "Lightning");

// severity, which used to be three copies of one exclamation
export const InkInfoIcon = inkMark(PhInfo, "Info");
export const InkWarnCircleIcon = inkMark(PhWarningCircle, "WarningCircle");
export const InkBugIcon = inkMark(PhBug, "Bug");
export const InkBellIcon = inkMark(PhBell, "Bell");
export const InkFireIcon = inkMark(PhFire, "Fire");

// permission and verdict, which used to be one shield and one tick
export const InkCheckCircleIcon = inkMark(PhCheckCircle, "CheckCircle");
export const InkShieldWarnIcon = inkMark(PhShieldWarning, "ShieldWarning");
export const InkShieldOffIcon = inkMark(PhShieldSlash, "ShieldSlash");
export const InkProhibitIcon = inkMark(PhProhibit, "Prohibit");
export const InkClockIcon = inkMark(PhClock, "Clock");

// files and content kinds, which used to be one page and one picture frame
export const InkFileCodeIcon = inkMark(PhFileCode, "FileCode");
export const InkFileAudioIcon = inkMark(PhFileAudio, "FileAudio");
export const InkFileVideoIcon = inkMark(PhFileVideo, "FileVideo");
export const InkCodeIcon = inkMark(PhCode, "Code");
export const InkSaveIcon = inkMark(PhFloppyDisk, "FloppyDisk");
export const InkTrashIcon = inkMark(PhTrash, "Trash");
export const InkScrollIcon = inkMark(PhScroll, "Scroll");
export const InkStackIcon = inkMark(PhStack, "Stack");
export const InkCubeIcon = inkMark(PhCube, "Cube");
export const InkSpeakerIcon = inkMark(PhSpeakerHigh, "SpeakerHigh");
export const InkClipIcon = inkMark(PhPaperclip, "Paperclip");

// the repository, which used to be a turning cycle for want of anything else
export const InkGitIcon = inkMark(PhGitBranch, "GitBranch");
export const InkDiffIcon = inkMark(PhGitDiff, "GitDiff");
export const InkPathIcon = inkMark(PhPath, "Path");

// storage and transport, which used to be a folder
export const InkDatabaseIcon = inkMark(PhDatabase, "Database");
export const InkDrivesIcon = inkMark(PhHardDrives, "HardDrives");
export const InkPlugsIcon = inkMark(PhPlugs, "Plugs");
export const InkPuzzleIcon = inkMark(PhPuzzlePiece, "PuzzlePiece");

// controls, which used to be one list for every slider and gear in the chrome
export const InkGearIcon = inkMark(PhGear, "Gear");
export const InkGaugeIcon = inkMark(PhGauge, "Gauge");
export const InkPlayIcon = inkMark(PhPlay, "Play");
export const InkStopIcon = inkMark(PhStop, "Stop");
export const InkDownloadIcon = inkMark(PhDownloadSimple, "DownloadSimple");
export const InkExpandIcon = inkMark(PhCornersOut, "CornersOut");
export const InkCollapseIcon = inkMark(PhCornersIn, "CornersIn");
export const InkEyeIcon = inkMark(PhEye, "Eye");
export const InkArrowUpIcon = inkMark(PhArrowUp, "ArrowUp");
export const InkArrowRightIcon = inkMark(PhArrowRight, "ArrowRight");
export const InkArrowUpRightIcon = inkMark(PhArrowUpRight, "ArrowUpRight");
export const InkDotsIcon = inkMark(PhDotsThree, "DotsThree");
export const InkThumbUpIcon = inkMark(PhThumbsUp, "ThumbsUp");
export const InkThumbDownIcon = inkMark(PhThumbsDown, "ThumbsDown");

// place, and the style's own landscape
export const InkPinIcon = inkMark(PhMapPin, "MapPin");
export const InkCompassIcon = inkMark(PhCompass, "Compass");
export const InkCrosshairIcon = inkMark(PhCrosshair, "Crosshair");
/* The four that are here because they are this style and not a generic set:
   mountains, water, wind, moon. They carry the slots a landscape can honestly
   answer — an idle session, a compaction, a quiet runtime — rather than being
   decoration hunting for a home. */
export const InkMountainsIcon = inkMark(PhMountains, "Mountains");
export const InkWavesIcon = inkMark(PhWaves, "Waves");
export const InkWindIcon = inkMark(PhWind, "Wind");
export const InkMoonIcon = inkMark(PhMoon, "Moon");
export const InkLeafIcon = inkMark(PhLeaf, "Leaf");
export const InkPenIcon = inkMark(PhPenNib, "PenNib");
export const InkSparkIcon = inkMark(PhSparkle, "Sparkle");
export const InkStarIcon = inkMark(PhStar, "Star");
export const InkRocketIcon = inkMark(PhRocket, "Rocket");
export const InkTentIcon = inkMark(PhTent, "Tent");
/* A solid ink dot. Measured as the heaviest mark that still reads as a mark
   rather than a block, and the closest thing in the library to a brush touched
   once to paper. */
export const InkDotIcon = inkMark(PhCircle, "Circle");

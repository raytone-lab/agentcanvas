import type { ReactNode } from "react";
/*
 * From `uiIcons`, not from lucide, and that is the whole point of this file.
 *
 * These cards are miniatures of the canvas: the paperclip here is a picture of
 * the paperclip the composer will draw. Imported straight from lucide they
 * stayed lucide in every style, so 水墨风 had washes on the canvas and outlines
 * in the panel that chooses them — reported as "左栏浮层展示的图标和画布展示的
 * 都不一样". `withStyledIcon` reads the active style from context, and this
 * whole tree is already inside `IconStyleProvider` (App.tsx), so repointing the
 * specifier is the entire fix: call sites, props and sizes are untouched.
 *
 * The rail's *own* chrome — the zoom control, the topbar, the group rows — must
 * keep importing lucide directly. Those are the editor, not a preview of the
 * thing being edited, and inking them would leave no neutral frame to judge the
 * style from.
 */
import {
  Check,
  ChevronRight,
  Circle,
  Copy,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  Image,
  Mic,
  MessageSquare,
  PanelLeft,
  PanelRight,
  PenLine,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Wrench,
} from "../agentmatrix/uiIcons";

import { appVersionLabel } from "../appVersion";
import { useCopy, useLocale } from "../i18n/LocaleContext";
import type { AppLocale } from "../i18n/locales";
import { canvasConclusionSample } from "../app/projection/canvasTimeline";
import { NewChatIcon, SearchIcon, SidebarToggleIcon } from "./agent-preview/SessionSidebar";
import {
  AudioSkeletonLoader,
  AudioWaveLoader,
  ImageBlurFlowLoader,
  ImageDotFlickerLoader,
  ImageGeneration,
  ImagePixelGridLoader,
  MediaLoadingVisual,
  mediaLoaderVisualStyle,
} from "./agent-preview/ImageGeneration";
import { ReasoningIndicator, useThinkingStage } from "./agent-preview/ReasoningBlock";
import { ShimmerText } from "./ShimmerText";
import { themeTokens, type ThemePresetId } from "../theme/themeTokens";
import type { AgentFrontendProject } from "../schema/agentuxConfig";

/**
 * A small framed thumbnail that depicts what each preset option does.
 * All previews share one container (`pv`) so they read as a coherent set of
 * mini UI swatches rather than stray marks. Motion variants animate to show
 * the actual effect; everything else is a literal mini mockup.
 */
/**
 * Option id → the motion it picks, so the eight cards are one branch rather
 * than eight copies of it.
 */
const THINKING_MOTIONS: Record<string, AgentFrontendProject["theme"]["motion"]["reasoning"]> = {
  "thinking-wave": "wave",
  "thinking-pulse": "pulse",
  "thinking-shimmer": "shimmer",
  "thinking-bars": "bars",
  "thinking-orbit": "orbit",
  "thinking-orb-s1": "orb-s1",
  "thinking-orb-b5": "orb-b5",
  "thinking-orb-m2": "orb-m2",
  "thinking-hourglass": "hourglass",
  "thinking-comic-halftone": "comic-halftone",
  "thinking-comic-inkblot": "comic-inkblot",
  "thinking-comic-bubble": "comic-bubble",
  "thinking-comic-flip": "comic-flip",
  "thinking-quest-torch": "quest-torch",
  "thinking-quest-rune": "quest-rune",
  "thinking-quest-coins": "quest-coins",
  "thinking-pixel-cursor": "pixel-cursor",
  "thinking-pixel-bars": "pixel-bars",
  "thinking-pixel-spin": "pixel-spin",
  "thinking-pixel-bricks": "pixel-bricks",
  "thinking-sketch-bubble": "sketch-bubble",
  "thinking-sketch-pencil": "sketch-pencil",
  "thinking-sketch-blot": "sketch-blot",
  "thinking-sketch-page": "sketch-page",
  "thinking-ink-drop": "ink-drop",
  "thinking-ink-stroke": "ink-stroke",
  "thinking-ink-ripple": "ink-ripple",
  "thinking-ink-seal": "ink-seal",
  "thinking-retro-watch": "retro-watch",
  "thinking-retro-record": "retro-record",
  "thinking-retro-metronome": "retro-metronome",
  "thinking-retro-telegraph": "retro-telegraph",
  "thinking-tech-matrix": "tech-matrix",
  "thinking-tech-signal": "tech-signal",
  "thinking-tech-scan": "tech-scan",
  "thinking-tech-segments": "tech-segments",
};

/*
 * The *Done title* cards, each showing the title it picks.
 *
 * Built from the block's own copy keys, so the cards follow a wording change
 * instead of having to be found and re-typed. `kind` reaches CSS, which needs
 * to know only one thing: `conclusion` is a sentence and the other three are
 * labels, so it is the one that has to be allowed to clip.
 */
type DoneTitleSample = {
  kind: "label" | "conclusion";
  text: (copy: ReturnType<typeof useCopy>, locale: AppLocale) => string;
};

const DONE_TITLE_SAMPLES: Record<string, DoneTitleSample> = {
  "reasoning-done-label": {
    kind: "label",
    text: (copy) => copy.chat.reasoning.reasonedPlain,
  },
  "reasoning-done-timed": {
    kind: "label",
    // `x`, not a number: the canvas reports the wait it measured, and a card
    // showing "11" would be naming a duration this option does not set.
    text: (copy) => copy.chat.reasoning.reasonedFor.replace("{seconds}", "x"),
  },
  "reasoning-done-counted": {
    kind: "label",
    text: (copy) => copy.chat.reasoning.reasonedCount.replace("{count}", "3"),
  },
  "reasoning-done-conclusion": {
    kind: "conclusion",
    text: (_copy, locale) => canvasConclusionSample(locale),
  },
};

/**
 * One motion's card: the transcript's reasoning row at card scale.
 *
 * A component rather than inline JSX because two of the three shapes need a
 * hook — the cycling label — and `PresetOptionPreview` is one long branch that
 * returns before reaching it.
 *
 * Three shapes, matching what the canvas draws for each:
 *   shimmer — the words alone, sweeping (the canvas hides its glyph)
 *   bars    — the words alone, cycling through the stages (same)
 *   rest    — glyph then words
 */
function ThinkingMotionTile({ motion }: { motion: AgentFrontendProject["theme"]["motion"]["reasoning"] }) {
  const copy = useCopy();
  const stage = useThinkingStage(motion === "bars");
  return (
    <Tile kind="thinking">
      <span className="pv-thinking">
        {motion === "shimmer" ? (
          <ShimmerText className="pv-thinking-label" text={copy.chat.reasoning.thinking} />
        ) : motion === "bars" ? (
          <span className="pv-thinking-label" data-cycling="true">{stage}</span>
        ) : (
          <>
            <ReasoningIndicator motion={motion} />
            <span className="pv-thinking-label">{copy.chat.reasoning.thinking}</span>
          </>
        )}
      </span>
    </Tile>
  );
}

function Tile({ kind, children }: { kind: string; children?: ReactNode }) {
  return (
    <span className="pv" data-kind={kind} aria-hidden="true">
      {children}
    </span>
  );
}

const Line = ({ w = "100%", tone }: { w?: string | number; tone?: "accent" | "muted" | "add" | "del" }) => (
  <span className="pv-line" data-tone={tone} style={{ width: typeof w === "number" ? `${w}px` : w }} />
);

function mediaLoaderPreviewKind(style: string): string {
  const visualStyle = mediaLoaderVisualStyle(style);
  if (visualStyle === "dot-flicker") {
    return "media-image-dot-flicker";
  }
  if (visualStyle === "blur-flow") {
    return "media-image-blur-flow";
  }
  if (visualStyle === "pixel-grid") {
    return "media-image-pixel-grid";
  }
  if (visualStyle === "audio-skeleton") {
    return "media-audio-skeleton";
  }
  if (visualStyle === "audio-wave") {
    return "media-audio-wave";
  }
  return "media-image-grid";
}

type MiniSidebarFocus = "title" | "collapse" | "new-button" | "search" | "sessions" | "row-icon" | "grouping" | "footer";
/** Each sidebar option and the part of the column its card puts in focus. */
const MINI_SIDEBAR_FOCUS: Partial<Record<string, MiniSidebarFocus>> = {
  "sidebar-title": "title",
  "sidebar-collapse": "collapse",
  "sidebar-new-button": "new-button",
  "sidebar-search": "search",
  "sidebar-sessions": "sessions",
  "sidebar-row-icon": "row-icon",
  "sidebar-grouping": "grouping",
  "sidebar-footer": "footer",
};

/**
 * A miniature sidebar column with one part in focus. Everything not in focus
 * is a skeleton bar; the focused part is the real thing — the project's name,
 * the real icons, the real session titles — so the card is a picture of the
 * product rather than an abstraction of it.
 */
function MiniSidebar({
  focus,
  title,
  newLabel,
  sessions,
  today,
  earlier,
}: {
  focus: MiniSidebarFocus;
  title: string;
  newLabel: string;
  sessions: readonly string[];
  today: string;
  earlier: string;
}) {
  const on = (part: MiniSidebarFocus) => (part === focus ? "true" : undefined);
  const rowMarks = focus === "row-icon";
  const row = (label: string, index: number) =>
    focus === "sessions" || rowMarks ? (
      <span className="msb-row" data-on="true" data-active={index === 0 && focus === "sessions" ? "true" : undefined} key={label}>
        {rowMarks ? <MessageSquare size={7} /> : null}
        {rowMarks ? <span className="msb-skel" style={{ width: index === 0 ? 26 : 20 }} /> : <span className="msb-text">{label}</span>}
      </span>
    ) : (
      <span className="msb-row" key={label}>
        <span className="msb-skel" style={{ width: index === 0 ? 30 : 22 }} />
      </span>
    );
  return (
    <span className="msb" data-focus={focus}>
      {/* The grouping card has two headings and two rows to fit; it gives up
          the header so the four stay legible in the same 42px frame. */}
      <span className="msb-head" hidden={focus === "grouping" || undefined}>
        {focus === "title" ? <span className="msb-title" data-on="true">{title}</span> : <span className="msb-skel msb-skel-title" />}
        <span className="msb-tools">
          {/* The title card keeps one placeholder, not two, so the name has room. */}
          {focus === "search" ? <span data-on="true"><SearchIcon size={8} /></span> : focus === "title" ? null : <span className="msb-dot" />}
          {focus === "collapse" ? <span data-on="true"><SidebarToggleIcon size={8} /></span> : <span className="msb-dot" />}
        </span>
      </span>
      {focus === "new-button" ? (
        <span className="msb-new" data-on="true">
          <NewChatIcon size={7} />
          <span>{newLabel}</span>
        </span>
      ) : null}
      {focus === "grouping" ? <span className="msb-group" data-on="true">{today}</span> : null}
      {row(sessions[0] ?? "", 0)}
      {focus === "grouping" ? <span className="msb-group" data-on="true">{earlier}</span> : null}
      {/* A card that adds a line of its own (the new-chat row, the version)
          drops the second row, so every card fits the same 42px frame. */}
      {focus === "new-button" || focus === "footer" ? null : row(sessions[1] ?? "", 1)}
      {focus === "footer" ? <span className="msb-version" data-on="true">{appVersionLabel}</span> : null}
    </span>
  );
}

export function PresetOptionPreview({
  optionId,
  projectName,
}: {
  optionId: string;
  /** For the cards that print a real value — the sidebar's title is the project's name. */
  projectName?: string;
}) {
  const copy = useCopy();
  const { locale } = useLocale();

  // ---- Conversation · writing rhythm ---------------------------------------
  if (optionId === "writing-smooth") {
    return (
      <Tile kind="lines">
        <Line w="80%" />
        <Line w="100%" />
        <Line w="60%" />
      </Tile>
    );
  }
  if (optionId === "writing-typewriter") {
    return (
      <Tile kind="lines">
        <Line w="100%" />
        <span className="pv-typing">
          <Line w={26} />
          <span className="pv-caret" />
        </span>
      </Tile>
    );
  }
  if (optionId === "writing-chunked") {
    return (
      <Tile kind="chunks">
        <span className="pv-chunk">
          <Line w={14} />
          <Line w={20} />
        </span>
        <span className="pv-chunk">
          <Line w={22} />
          <Line w={12} />
        </span>
      </Tile>
    );
  }

  // ---- Conversation · message chrome / recovery ----------------------------
  if (optionId === "speaker-labels") {
    return (
      <Tile kind="speaker">
        <span className="pv-turn">
          <span className="pv-avatar" />
          <Line w={28} tone="accent" />
        </span>
        <span className="pv-turn">
          <span className="pv-avatar" data-role="agent" />
          <Line w={20} />
        </span>
      </Tile>
    );
  }
  if (optionId === "message-actions") {
    return (
      <Tile kind="bubble">
        <Line w="100%" />
        <Line w="70%" />
        <span className="pv-actions">
          <Copy size={9} />
          <RotateCcw size={9} />
        </span>
      </Tile>
    );
  }

  // ---- Sidebar · conversation-history rail ---------------------------------
  if (optionId === "sidebar-visible") {
    return (
      <Tile kind="icon">
        <PanelLeft size={18} />
      </Tile>
    );
  }
  if (optionId === "chat-visible") {
    return (
      <Tile kind="icon">
        <MessageSquare size={18} />
      </Tile>
    );
  }
  if (optionId === "composer-visible") {
    return (
      <Tile kind="icon">
        <PenLine size={18} />
      </Tile>
    );
  }
  /*
   * The sidebar's eight parts, each drawn as a slice of the sidebar itself.
   *
   * They used to be eight isolated objects — a word, an icon, two greyed rows,
   * a different-sized tile for the row marks — which said *what* each option
   * was and nothing about *where* it goes, and two of them broke the grid (the
   * session list ran 53px tall, the row-mark tile 81px square against 56).
   * Now every card is the same miniature column: a faint skeleton of the
   * sidebar — header, title, rows — with the one part this option adds drawn
   * in full ink. Same frame, same size, one visual language, and the position
   * reads at a glance. See `MiniSidebar` below.
   */
  {
    const focus = MINI_SIDEBAR_FOCUS[optionId];
    if (focus) {
      return (
        <Tile kind="control">
          <MiniSidebar
            focus={focus}
            title={projectName?.trim() || copy.workspace.sessionSidebar.brandName}
            newLabel={copy.workspace.sessionSidebar.newSession}
            sessions={copy.workspace.sessionSidebar.sessions.slice(0, 2)}
            today={copy.workspace.sessionSidebar.groupToday}
            earlier={copy.workspace.sessionSidebar.groupEarlier}
          />
        </Tile>
      );
    }
  }

  // ---- Media generation -----------------------------------------------------
  if (optionId.startsWith("media-image-")) {
    const style = optionId.replace("media-image-", "");
    if (style === "grid") {
      return (
        <Tile kind="media-image-grid">
          <ImageGeneration decorative size="thumb" />
        </Tile>
      );
    }
    if (style === "blur") {
      return (
        <Tile kind="media-image-dot-flicker">
          <ImageDotFlickerLoader decorative size={58} />
        </Tile>
      );
    }
    if (style === "palette") {
      return (
        <Tile kind="media-image-blur-flow">
          <ImageBlurFlowLoader decorative size={58} />
        </Tile>
      );
    }
    if (style === "layers") {
      return (
        <Tile kind="media-image-pixel-grid">
          <ImagePixelGridLoader decorative size={58} />
        </Tile>
      );
    }
    return (
      <Tile kind="media-image">
        <span className="pv-media-frame" data-media-style={style}>
          <span className="pv-media-grid">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="pv-media-layers">
            <i />
            <i />
            <i />
          </span>
          <span className="pv-media-caption" />
        </span>
      </Tile>
    );
  }
  if (optionId.startsWith("media-audio-")) {
    const style = optionId.replace("media-audio-", "");
    if (style === "skeleton") {
      return (
        <Tile kind="media-audio-skeleton">
          <AudioSkeletonLoader decorative size={58} />
        </Tile>
      );
    }
    if (style === "waveform") {
      return (
        <Tile kind="media-audio-wave">
          <AudioWaveLoader decorative size={58} />
        </Tile>
      );
    }
    return (
      <Tile kind={mediaLoaderPreviewKind(style)}>
        <MediaLoadingVisual decorative size={58} style={style} />
      </Tile>
    );
  }
  if (optionId.startsWith("media-video-")) {
    const style = optionId.replace("media-video-", "");
    return (
      <Tile kind={mediaLoaderPreviewKind(style)}>
        <MediaLoadingVisual decorative size={58} style={style} />
      </Tile>
    );
  }

  /*
   * Thinking · the motions.
   *
   * The whole row, not just the glyph: the transcript draws the indicator and
   * the word 思考中 together, so a card showing the glyph alone was a picture of
   * half the thing being picked. Same indicator component as the transcript, so
   * the card cannot drift from the animation it is choosing.
   *
   * Shimmer is the one that carries no glyph — the canvas hides the indicator
   * for it and sweeps the words instead (see `[data-motion="shimmer"]
   * .reasoning-indicator-slot` in app.css), so the card is the words alone.
   */
  const thinkingMotion = THINKING_MOTIONS[optionId];
  if (thinkingMotion) {
    return <ThinkingMotionTile motion={thinkingMotion} />;
  }

  /*
   * Thinking · the closed block's presentation.
   *
   * A full row, so the card spans both columns (see `[data-kind="reasoning-done"]`
   * in app.css): 已思考（用时 11 秒） does not fit in half of a 236px panel, and
   * a card that clipped the title would be showing something the canvas never
   * draws. The 11 is a sample, the way the session rows and v0.1.0 are — the
   * canvas shows the wait it actually measured.
   */
  /*
   * The two axes are drawn in two different registers, because they change two
   * different things.
   *
   * *Done title* changes a string, so each of its four cards shows its own
   * string — the one the canvas will actually draw, assembled from the same
   * copy keys the block uses, so a wording change cannot leave the cards behind.
   * `x` and `3` stand in for the measured duration and the segment count the
   * way `v0.1.0` and the session rows do elsewhere.
   *
   * *Settled body* changes a shape, so its four cards drop the words and show
   * the shape: title bar, chevron or no chevron, how much body survives. The
   * title is a grey bar in these, not text — the words are what the *other*
   * axis picks, and spelling them out again would make the reader compare
   * sentences when the difference is below them.
   *
   * All eight shared the timed illustration before this, on the theory that the
   * labels carried the distinction. Eight identical thumbnails distinguish
   * nothing; the label is then doing the picture's whole job.
   */
  const doneTitleSample = DONE_TITLE_SAMPLES[optionId];
  if (doneTitleSample) {
    return (
      <Tile kind="reasoning-done">
        {/* The title alone. The glyph and the chevron were both borrowed from
            the real block and neither belongs to this card: the indicator is
            what the *Motion* cards are for, and the chevron is the disclosure
            control, which the *body* axis owns. */}
        <span className="pv-reasoning-done">
          <span className="pv-reasoning-done-title" data-sample={doneTitleSample.kind}>
            {doneTitleSample.text(copy, locale)}
          </span>
        </span>
      </Tile>
    );
  }
  if (
    optionId === "reasoning-done-expandable" ||
    optionId === "reasoning-done-title-only" ||
    optionId === "reasoning-done-first-line" ||
    optionId === "reasoning-done-rule"
  ) {
    const body = optionId.slice("reasoning-done-".length);
    return (
      <Tile kind="done-body">
        <span className="pv-done-body" data-body={body}>
          <span className="pv-done-body-head">
            <Line w={30} />
            {/* Suppressed for `title-only` for the same reason the canvas
                suppresses it: with the body discarded the control would open
                an empty block. Its absence is half of what that card is. */}
            {body !== "title-only" ? <span className="pv-done-chevron" /> : null}
          </span>
          {body === "first-line" ? (
            <span className="pv-done-body-peek">
              <Line w="86%" />
            </span>
          ) : null}
          {body === "rule" ? (
            <span className="pv-done-body-quoted">
              <Line w="72%" />
              <Line w="54%" />
            </span>
          ) : null}
        </span>
      </Tile>
    );
  }
  if (optionId === "reasoning-writing-smooth") {
    return (
      <Tile kind="lines">
        <Line w="80%" />
        <Line w="100%" />
        <Line w="60%" />
      </Tile>
    );
  }
  if (optionId === "reasoning-writing-typewriter") {
    return (
      <Tile kind="lines">
        <Line w="100%" />
        <span className="pv-typing">
          <Line w={26} />
          <span className="pv-caret" />
        </span>
      </Tile>
    );
  }
  if (optionId === "reasoning-writing-chunked") {
    return (
      <Tile kind="chunks">
        <span className="pv-chunk">
          <Line w={14} />
          <Line w={20} />
        </span>
        <span className="pv-chunk">
          <Line w={22} />
          <Line w={12} />
        </span>
      </Tile>
    );
  }

  // ---- Thinking · disclosure -----------------------------------------------
  if (optionId === "summary-first" || optionId === "reasoning-public-summary" || optionId === "reasoning-model-thinking") {
    return (
      <Tile kind="card">
        <Line w="90%" tone="accent" />
        <Line w="70%" tone="muted" />
        <Line w="80%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "reasoning-auto-collapse") {
    return (
      <Tile kind="collapsed">
        <span className="pv-row">
          <Line w={30} tone="muted" />
          <span className="pv-chevron" />
        </span>
      </Tile>
    );
  }
  if (optionId === "reasoning-expanded") {
    return (
      <Tile kind="card">
        <span className="pv-row">
          <Line w={26} tone="muted" />
          <span className="pv-chevron" data-open="true" />
        </span>
        <Line w="100%" />
        <Line w="80%" />
      </Tile>
    );
  }
  if (optionId === "reasoning-status-only") {
    return (
      <Tile kind="status">
        <span className="pv-status-dot" />
        <Line w={26} tone="muted" />
      </Tile>
    );
  }

  // ---- Tool calls -----------------------------------------------------------
  if (optionId === "command-cards") {
    return (
      <Tile kind="tool-card">
        <span className="pv-row">
          <span className="pv-check" />
          <Line w={28} />
        </span>
        <Line w="90%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "compact-chips") {
    return (
      <Tile kind="chips">
        <span className="pv-chip" />
        <span className="pv-chip" data-soft="true" />
      </Tile>
    );
  }
  if (optionId === "timeline-rail") {
    return (
      <Tile kind="timeline">
        <span className="pv-rail" />
        <span className="pv-rail-step">
          <i />
          <Line w={28} />
        </span>
        <span className="pv-rail-step">
          <i />
          <Line w={20} />
        </span>
        <span className="pv-rail-step">
          <i />
          <Line w={24} />
        </span>
      </Tile>
    );
  }
  if (optionId === "terminal-log" || optionId === "output-source-console") {
    return (
      <Tile kind="terminal">
        <span className="pv-term-bar">
          <i />
          <i />
          <i />
        </span>
        <Line w="70%" tone="add" />
        <Line w="50%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "tool-detail-full") {
    return (
      <Tile kind="card">
        <Line w={24} tone="muted" />
        <Line w="100%" />
        <Line w="100%" />
      </Tile>
    );
  }
  if (optionId === "tool-detail-output-only") {
    return (
      <Tile kind="card">
        <Line w="100%" />
        <Line w="80%" />
      </Tile>
    );
  }
  if (optionId === "tool-detail-summary") {
    return (
      <Tile kind="status">
        <span className="pv-check" />
        <Line w={30} tone="muted" />
      </Tile>
    );
  }
  if (optionId === "tool-progress-icon") {
    return (
      <Tile kind="status">
        <span className="pv-check" />
        <Line w={28} />
      </Tile>
    );
  }
  if (optionId === "tool-progress-bar") {
    return (
      <Tile kind="progress">
        <Line w={30} tone="muted" />
        <span className="pv-bar">
          <span className="pv-bar-fill" />
        </span>
      </Tile>
    );
  }
  if (optionId === "tool-approval-inline" || optionId === "tool-approval-hidden") {
    return (
      <Tile kind="approval">
        <span className="pv-banner" />
        <span className="pv-btn-row">
          <span className="pv-btn" data-variant="primary" />
          <span className="pv-btn" />
        </span>
      </Tile>
    );
  }

  // ---- Blocks ---------------------------------------------------------------
  if (optionId === "error-collapse") {
    return (
      <Tile kind="error">
        <span className="pv-row">
          <span className="pv-alert" />
          <Line w={26} tone="del" />
        </span>
        <Line w="80%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "tool-log-tail") {
    return (
      <Tile kind="terminal">
        <Line w="40%" tone="muted" />
        <Line w="100%" />
        <Line w="80%" />
      </Tile>
    );
  }

  // ---- Composer -------------------------------------------------------------
  if (optionId === "upload") {
    return (
      <Tile kind="icon">
        <Paperclip size={15} />
      </Tile>
    );
  }
  if (optionId === "mic") {
    return (
      <Tile kind="icon">
        <Mic size={15} />
      </Tile>
    );
  }
  if (optionId === "budget") {
    return (
      <Tile kind="progress">
        <Line w={24} tone="muted" />
        <span className="pv-bar">
          <span className="pv-bar-fill" data-level="mid" />
        </span>
      </Tile>
    );
  }
  if (optionId === "model-config") {
    return (
      <Tile kind="chips">
        <span className="pv-chip" data-soft="true" />
        <span className="pv-chip" data-icon="true">
          <ChevronRight size={9} />
        </span>
      </Tile>
    );
  }
  if (optionId === "model-tools") {
    return (
      <Tile kind="chips">
        <span className="pv-chip" data-icon="true">
          <Wrench size={9} />
        </span>
        <span className="pv-chip" data-soft="true" />
      </Tile>
    );
  }
  if (optionId === "prompt-shortcuts") {
    return (
      <Tile kind="chips-wrap">
        <span className="pv-chip" data-soft="true" />
        <span className="pv-chip" data-soft="true" />
        <span className="pv-chip" data-soft="true" />
      </Tile>
    );
  }

  // ---- Provider -------------------------------------------------------------
  if (optionId.startsWith("provider-")) {
    return (
      <Tile kind="provider">
        <span className="pv-provider-dot" />
        <Line w={30} />
      </Tile>
    );
  }

  // ---- Output source / surface ---------------------------------------------
  if (optionId === "output-visible") {
    return (
      <Tile kind="card">
        <span className="pv-row">
          <PanelRight size={11} />
          <Line w={20} tone="accent" />
        </span>
        <Line w="70%" />
        <Line w="50%" />
      </Tile>
    );
  }
  if (optionId === "output-source-artifact") {
    return (
      <Tile kind="card">
        <span className="pv-row">
          <Image size={11} />
          <Line w={22} tone="muted" />
        </span>
        <Line w="100%" />
      </Tile>
    );
  }

  // ---- Output · panel contents ---------------------------------------------
  // Three rows with a state mark, a bar under a count, three rows with a file
  // mark — each card is the section's own shape, which is what tells the three
  // apart at this size better than any wording could.
  if (optionId === "task-list") {
    return (
      <Tile kind="lines">
        <span className="pv-row">
          <Check size={10} />
          <Line w="70%" />
        </span>
        <span className="pv-row">
          <Check size={10} />
          <Line w="50%" />
        </span>
        <span className="pv-row">
          <Circle size={10} />
          <Line w="60%" tone="muted" />
        </span>
      </Tile>
    );
  }
  if (optionId === "exec-progress") {
    return (
      <Tile kind="progress">
        <Line w={24} tone="muted" />
        <span className="pv-bar">
          <span className="pv-bar-fill" data-level="mid" />
        </span>
      </Tile>
    );
  }
  if (optionId === "workspace-files") {
    return (
      <Tile kind="lines">
        <span className="pv-row">
          <FileText size={10} />
          <Line w="55%" />
        </span>
        <span className="pv-row">
          <FileText size={10} />
          <Line w="70%" />
        </span>
        <span className="pv-row">
          <FileText size={10} />
          <Line w="40%" tone="muted" />
        </span>
      </Tile>
    );
  }
  // ---- Render ---------------------------------------------------------------
  if (optionId === "renderer-auto") {
    return (
      <Tile kind="card">
        <span className="pv-row">
          <span className="pv-chip" data-soft="true" />
          <span className="pv-chip" data-soft="true" />
        </span>
        <Line w="90%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "renderer-code") {
    return (
      <Tile kind="code">
        <span className="pv-code-row">
          <i className="pv-gutter" />
          <Line w="70%" />
        </span>
        <span className="pv-code-row" data-indent="true">
          <i className="pv-gutter" />
          <Line w="55%" tone="accent" />
        </span>
        <span className="pv-code-row">
          <i className="pv-gutter" />
          <Line w="45%" />
        </span>
      </Tile>
    );
  }
  if (optionId === "renderer-diff" || optionId === "diff-preview") {
    return (
      <Tile kind="diff">
        <span className="pv-diff-row" data-sign="add">
          <Line w="80%" tone="add" />
        </span>
        <span className="pv-diff-row" data-sign="del">
          <Line w="65%" tone="del" />
        </span>
        <span className="pv-diff-row" data-sign="add">
          <Line w="75%" tone="add" />
        </span>
      </Tile>
    );
  }
  if (optionId === "renderer-markdown") {
    return (
      <Tile kind="card">
        <Line w="55%" tone="accent" />
        <Line w="100%" tone="muted" />
        <Line w="85%" tone="muted" />
      </Tile>
    );
  }
  if (optionId === "renderer-preview") {
    return (
      <Tile kind="visual">
        <Image size={16} />
      </Tile>
    );
  }
  if (optionId === "renderer-data") {
    return (
      <Tile kind="data">
        <span />
        <span />
        <span />
        <span />
        <span />
        <span />
      </Tile>
    );
  }

  // ---- Git ------------------------------------------------------------------
  if (optionId === "git-visible") {
    return (
      <Tile kind="git">
        <GitBranch size={12} />
        <Line w={24} tone="accent" />
      </Tile>
    );
  }
  if (optionId === "branch-status") {
    return (
      <Tile kind="git">
        <GitBranch size={12} />
        <Line w={28} tone="muted" />
      </Tile>
    );
  }
  if (optionId === "changed-files") {
    return (
      <Tile kind="git-files">
        <span className="pv-file">
          <Line w="70%" tone="muted" />
          <em data-sign="add">+</em>
        </span>
        <span className="pv-file">
          <Line w="55%" tone="muted" />
          <em data-sign="del">−</em>
        </span>
        <span className="pv-file">
          <Line w="62%" tone="muted" />
          <em data-sign="add">+</em>
        </span>
      </Tile>
    );
  }
  if (optionId === "commit-message" || optionId === "commit-action") {
    return (
      <Tile kind="commit">
        <GitCommitHorizontal size={12} />
        <Line w={28} />
      </Tile>
    );
  }

  // ---- Theme swatches -------------------------------------------------------
  if (isThemeId(optionId)) {
    const theme = themeTokens[optionId];
    return (
      <span className="pv" data-kind="theme" aria-hidden="true">
        <i className="pv-swatch" style={{ background: theme.surface.canvas, borderColor: theme.border.strong }} />
        <i className="pv-swatch" style={{ background: theme.surface.panel, borderColor: theme.border.strong }} />
        <i className="pv-swatch" style={{ background: theme.accent.action, borderColor: theme.accent.action }} />
      </span>
    );
  }

  // ---- Fallback -------------------------------------------------------------
  return (
    <Tile kind="lines">
      <Line w="100%" />
      <Line w="70%" />
    </Tile>
  );
}

function isThemeId(id: string): id is ThemePresetId {
  return id in themeTokens;
}

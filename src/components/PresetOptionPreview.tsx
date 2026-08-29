import type { ReactNode } from "react";
import {
  ChevronRight,
  Copy,
  GitBranch,
  GitCommitHorizontal,
  Image,
  Mic,
  PanelLeft,
  PanelRight,
  Paperclip,
  Plus,
  RotateCcw,
  Search,
  Wrench,
} from "lucide-react";

import { useCopy } from "../i18n/LocaleContext";
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
import { ReasoningIndicator } from "./agent-preview/ReasoningBlock";
import { ShimmerText } from "./ShimmerText";
import { themeTokens, type ThemePresetId } from "../theme/themeTokens";

/**
 * A small framed thumbnail that depicts what each preset option does.
 * All previews share one container (`pv`) so they read as a coherent set of
 * mini UI swatches rather than stray marks. Motion variants animate to show
 * the actual effect; everything else is a literal mini mockup.
 */
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

export function PresetOptionPreview({ optionId }: { optionId: string }) {
  const copy = useCopy();

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
  if (optionId === "sidebar-new-button") {
    return (
      <Tile kind="bubble">
        <span className="pv-actions">
          <Plus size={9} />
          <Line w={30} tone="accent" />
        </span>
        <Line w="80%" />
      </Tile>
    );
  }
  if (optionId === "sidebar-search") {
    return (
      <Tile kind="bubble">
        <span className="pv-actions">
          <Search size={9} />
          <Line w={30} />
        </span>
        <Line w="70%" />
      </Tile>
    );
  }
  if (optionId === "sidebar-grouping") {
    return (
      <Tile kind="lines">
        <Line w={18} tone="muted" />
        <Line w="90%" />
        <Line w={22} tone="muted" />
        <Line w="70%" />
      </Tile>
    );
  }
  if (optionId === "sidebar-footer") {
    return (
      <Tile kind="lines">
        <Line w="90%" />
        <Line w="70%" />
        <Line w={26} tone="muted" />
      </Tile>
    );
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

  // ---- Thinking · motion demos — reuse the SAME indicator as the transcript
  // so the sidebar thumbnail always matches the live reasoning animation. -----
  if (optionId === "thinking-wave") {
    return <Tile kind="motion"><ReasoningIndicator motion="wave" /></Tile>;
  }
  if (optionId === "thinking-pulse") {
    return <Tile kind="motion"><ReasoningIndicator motion="pulse" /></Tile>;
  }
  if (optionId === "thinking-shimmer") {
    return (
      <Tile kind="shimmer">
        <ShimmerText className="pv-shimmer-text" text={copy.chat.reasoning.thinking} />
      </Tile>
    );
  }
  if (optionId === "thinking-bars") {
    return <Tile kind="motion"><ReasoningIndicator motion="bars" /></Tile>;
  }
  if (optionId === "thinking-orbit") {
    return <Tile kind="motion"><ReasoningIndicator motion="orbit" /></Tile>;
  }
  if (optionId === "thinking-orb-s1") {
    return <Tile kind="motion"><ReasoningIndicator motion="orb-s1" /></Tile>;
  }
  if (optionId === "thinking-orb-b5") {
    return <Tile kind="motion"><ReasoningIndicator motion="orb-b5" /></Tile>;
  }
  if (optionId === "thinking-orb-m2") {
    return <Tile kind="motion"><ReasoningIndicator motion="orb-m2" /></Tile>;
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

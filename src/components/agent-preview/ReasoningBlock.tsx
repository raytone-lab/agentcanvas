import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import type { AgentUXReasoningTimelineItem } from "@agent-ux/render-core";

import { useCopy } from "../../i18n/LocaleContext";
import type { UiCopy } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { AgentActivitySpinner } from "../activity/AgentActivitySpinner";
import { ShimmerText } from "../ShimmerText";
import { deriveDisclosureOpen } from "./disclosureState";

export function ReasoningBlock({
  project,
  reasoning,
  showDebugBadges = false,
}: {
  project: AgentFrontendProject;
  reasoning: AgentUXReasoningTimelineItem;
  showDebugBadges?: boolean;
}) {
  const copy = useCopy();
  const running = reasoning.status !== "done";
  const canShowSummary = project.reasoning.show !== "status" && Boolean(reasoning.summary);
  const eventOpen =
    reasoning.id === "thinking-preview" && project.reasoning.collapse === "auto"
      ? false
      : reasoning.open;
  const desiredOpen = canShowSummary && desiredReasoningOpen(project.reasoning.collapse, eventOpen, running);
  const [open, setOpen] = useState(desiredOpen);
  const userToggledRef = useRef(false);
  const reasoningIdRef = useRef(reasoning.id);
  const policyKey = `${project.reasoning.show}:${project.reasoning.collapse}`;
  const policyKeyRef = useRef(policyKey);
  const visibilityLabel = reasoningVisibilityLabel(project.reasoning.show, copy);
  const disclosureLabel = reasoningDisclosureLabel(project.reasoning.collapse, copy);
  const showTextMotion = project.theme.motion.reasoning === "shimmer";
  const isSummaryFirst = project.reasoning.collapse === "summary-first";
  const canToggleSummary = project.reasoning.expandable && canShowSummary && !isSummaryFirst;

  useEffect(() => {
    if (reasoningIdRef.current !== reasoning.id || policyKeyRef.current !== policyKey) {
      reasoningIdRef.current = reasoning.id;
      policyKeyRef.current = policyKey;
      userToggledRef.current = false;
      setOpen(desiredOpen);
      return;
    }

    setOpen((currentOpen) =>
      deriveDisclosureOpen({
        desiredOpen,
        currentOpen,
        userToggled: userToggledRef.current,
      }),
    );
  }, [reasoning.id, desiredOpen]);

  function toggleOpen() {
    if (!canToggleSummary) {
      return;
    }
    userToggledRef.current = true;
    setOpen((value) => !value);
  }

  return (
    <section
      className="reasoning-block"
      data-preview-anchor="reasoning"
      data-collapse={project.reasoning.collapse}
      data-visibility={project.reasoning.show}
      data-motion={project.theme.motion.reasoning}
      data-open={open ? "true" : "false"}
      data-status={reasoning.status}
    >
      <button
        className="reasoning-header"
        data-text-motion={showTextMotion}
        data-toggleable={canToggleSummary ? "true" : "false"}
        type="button"
        onClick={toggleOpen}
        aria-expanded={canToggleSummary ? open : undefined}
      >
        <ReasoningIndicator motion={project.theme.motion.reasoning} active={running} />
        {showTextMotion ? (
          <ShimmerText className="reasoning-title" text={copy.reasoning.thinking} />
        ) : (
          <span className="reasoning-title">{running ? copy.chat.reasoning.thinking : copy.chat.reasoning.reasoned}</span>
        )}
        {showDebugBadges ? (
          <span className="reasoning-meta">
            <code>{project.theme.motion.reasoning}</code>
            <code>{visibilityLabel}</code>
            <code>{disclosureLabel}</code>
          </span>
        ) : null}
        {canToggleSummary ? <ChevronDown size={14} className="chevron" data-open={open} /> : null}
      </button>
      <AnimatePresence initial={false}>
        {open && canShowSummary ? (
          <motion.div
            key="reasoning-body"
            className="reasoning-body"
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <p>{reasoning.summary}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

function desiredReasoningOpen(
  collapse: AgentFrontendProject["reasoning"]["collapse"],
  eventOpen: boolean | undefined,
  running: boolean,
) {
  if (collapse === "expanded" || collapse === "summary-first") {
    return true;
  }
  if (typeof eventOpen === "boolean") {
    return eventOpen;
  }
  if (collapse === "auto") {
    return running;
  }
  return Boolean(eventOpen);
}

function reasoningVisibilityLabel(show: AgentFrontendProject["reasoning"]["show"], copy: UiCopy) {
  if (show === "status") {
    return copy.chat.reasoning.visibility.statusOnly;
  }
  if (show === "thinking") {
    return copy.chat.reasoning.visibility.thinkingSummary;
  }
  return copy.chat.reasoning.visibility.publicSummary;
}

function reasoningDisclosureLabel(collapse: AgentFrontendProject["reasoning"]["collapse"], copy: UiCopy) {
  if (collapse === "summary-first") {
    return copy.chat.reasoning.disclosure.summaryFirst;
  }
  if (collapse === "expanded") {
    return copy.chat.reasoning.disclosure.expanded;
  }
  if (collapse === "manual") {
    return copy.chat.reasoning.disclosure.manual;
  }
  return copy.chat.reasoning.disclosure.auto;
}

// Each thinking option maps to one of thinking-orbs' hand-tuned states so the 6
// options stay recognizably different under the illustrated style.
const ORB_STATE_FOR_MOTION: Record<string, OrbState> = {
  wave: "listening",
  pulse: "solving",
  terminal: "searching",
  minimal: "shaping",
  shimmer: "composing",
  bars: "working",
  orbit: "working",
  "orb-s1": "working",
  "orb-b5": "solving",
  "orb-m2": "shaping",
};

export function ReasoningIndicator({ motion, active = true }: { motion: AgentFrontendProject["theme"]["motion"]["reasoning"]; active?: boolean }) {
  // Both indicators are always rendered inside one grid slot; CSS shows exactly
  // one per preset style. Under the "illustrated" style the real ThinkingOrb
  // (thinking-orbs canvas) replaces the classic glyph — a pure visual swap, no
  // state threading and no change to the reasoning data/logic.
  return (
    <span className="reasoning-indicator-slot" aria-hidden="true">
      <span className="reasoning-orb" data-variant={motion}>
        <ThinkingOrb state={ORB_STATE_FOR_MOTION[motion] ?? "working"} size={20} theme="auto" paused={!active} />
      </span>
      <span className="reasoning-classic">
        <ClassicReasoningIndicator motion={motion} active={active} />
      </span>
    </span>
  );
}

function ClassicReasoningIndicator({ motion, active = true }: { motion: AgentFrontendProject["theme"]["motion"]["reasoning"]; active?: boolean }) {
  if (motion === "orb-s1") {
    return (
      <NativeOrbShell motion={motion} active={active}>
        <span className="reasoning-orb-lattice" data-variant="s1">
          {latticeCells().map((cell) => (
            <span
              key={cell.key}
              className="reasoning-orb-cell"
              data-mid={cell.mid ? "" : undefined}
              style={
                {
                  left: cell.left,
                  top: cell.top,
                  animationDelay: `${cell.delay}ms`,
                  "--orb-ax": `${cell.ax}px`,
                  "--orb-ay": `${cell.ay}px`,
                  "--orb-bx": `${cell.bx}px`,
                  "--orb-by": `${cell.by}px`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </NativeOrbShell>
    );
  }

  if (motion === "orb-b5") {
    return (
      <NativeOrbShell motion={motion} active={active}>
        <span className="reasoning-orb-lens" data-variant="b5">
          <span className="reasoning-orb-shape reasoning-orb-shape-a" />
          <span className="reasoning-orb-shape reasoning-orb-shape-b" />
          <span className="reasoning-orb-shape reasoning-orb-shape-c" />
        </span>
      </NativeOrbShell>
    );
  }

  if (motion === "orb-m2") {
    return (
      <NativeOrbShell motion={motion} active={active}>
        <span className="reasoning-orb-morph" data-variant="m2">
          <span className="reasoning-orb-morph-stage">
            {morphDots().map((dot) => (
              <span
                key={dot.key}
                className="reasoning-orb-morph-dot"
                style={
                  {
                    "--m-1": dot.m1,
                    "--m-2": dot.m2,
                    "--m-3": dot.m3,
                    "--m-4": dot.m4,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        </span>
      </NativeOrbShell>
    );
  }

  if (motion === "pulse") {
    return (
      <span className="reasoning-infinity" aria-hidden="true">
        <svg viewBox="0 0 32 32" fill="none">
          <path
            className="reasoning-infinity-track"
            d="M12.7 12.1c-2.4-2.6-7.3-3.2-9.9-.7s-2.5 6.7 0 9.2 7.4 1.9 9.9-.7c2.1-2.2 4.5-5.6 6.5-7.8 2.4-2.6 7.4-3.2 9.9-.7s2.5 6.7 0 9.2-7.5 1.9-9.9-.7c-2-2.2-4.4-5.6-6.5-7.8z"
          />
          <path
            className="reasoning-infinity-line"
            d="M12.7 12.1c-2.4-2.6-7.3-3.2-9.9-.7s-2.5 6.7 0 9.2 7.4 1.9 9.9-.7c2.1-2.2 4.5-5.6 6.5-7.8 2.4-2.6 7.4-3.2 9.9-.7s2.5 6.7 0 9.2-7.5 1.9-9.9-.7c-2-2.2-4.4-5.6-6.5-7.8z"
          />
        </svg>
      </span>
    );
  }

  if (motion === "terminal") {
    return (
      <span className="reasoning-terminal" aria-hidden="true">
        <span className="terminal-cursor" />
      </span>
    );
  }

  if (motion === "minimal") {
    return <span className="reasoning-minimal" aria-hidden="true" />;
  }

  if (motion === "shimmer") {
    return null;
  }

  if (motion === "bars") {
    return (
      <span className="reasoning-bars" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    );
  }

  if (motion === "orbit") {
    // NinetyRingWithBg (react-svg-spinners): a faint full ring with a rotating
    // 90° arc. Inlined (no new dependency); rotation is CSS-driven so it honors
    // reduced-motion and pauses when the turn is no longer active.
    return (
      <span className="reasoning-ninety-ring" data-active={active} aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z"
            opacity=".25"
          />
          <path
            className="reasoning-ninety-ring-arc"
            d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
          />
        </svg>
      </span>
    );
  }

  return <AgentActivitySpinner variant="thinking" active={active} />;
}

function NativeOrbShell({
  motion,
  active,
  children,
}: {
  motion: AgentFrontendProject["theme"]["motion"]["reasoning"];
  active: boolean;
  children: ReactNode;
}) {
  return (
    <span className="reasoning-native-orb" data-motion={motion} data-active={active}>
      <span
        className="reasoning-native-orb-glyph"
        style={{ "--orb-k": 20 / 28 } as CSSProperties}
      >
        {children}
      </span>
      <span className="reasoning-native-orb-fallback">
        <AgentActivitySpinner variant="thinking" active={active} />
      </span>
    </span>
  );
}

const LATTICE_N = 3;
const LATTICE_PITCH = 6;
const LATTICE_MID = (LATTICE_N - 1) / 2;
const LATTICE_SWIRL = 1.05;
const LATTICE_SPREAD = 1.6;

function latticeDelay(x: number, y: number): number {
  const dx = x - LATTICE_MID;
  const dy = y - LATTICE_MID;
  return Math.hypot(dx, dy) * 700 - (dx === 0 && dy === 0 ? 180 : 0);
}

function latticeSwirl(x: number, y: number, angle: number): [number, number] {
  const dx = x - LATTICE_MID;
  const dy = y - LATTICE_MID;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return [
    ((dx * cos - dy * sin) * LATTICE_SPREAD - dx) * LATTICE_PITCH,
    ((dx * sin + dy * cos) * LATTICE_SPREAD - dy) * LATTICE_PITCH,
  ];
}

function latticeCells() {
  const cells: Array<{
    key: string;
    left: number;
    top: number;
    delay: number;
    ax: number;
    ay: number;
    bx: number;
    by: number;
    mid: boolean;
  }> = [];

  for (let y = 0; y < LATTICE_N; y += 1) {
    for (let x = 0; x < LATTICE_N; x += 1) {
      const [ax, ay] = latticeSwirl(x, y, -LATTICE_SWIRL);
      const [bx, by] = latticeSwirl(x, y, LATTICE_SWIRL);
      cells.push({
        key: `${x},${y}`,
        left: x * LATTICE_PITCH,
        top: y * LATTICE_PITCH,
        delay: latticeDelay(x, y),
        ax,
        ay,
        bx,
        by,
        mid: x === LATTICE_MID && y === LATTICE_MID,
      });
    }
  }

  return cells;
}

const MORPH_N = 8;
const MORPH_R = 7;
type ShapeFn = (i: number) => [number, number];

const shapeCenter: ShapeFn = (i) => {
  const a = (i / MORPH_N) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * 1.5, Math.sin(a) * 1.5];
};

const shapeCircle: ShapeFn = (i) => {
  const a = (i / MORPH_N) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(a) * MORPH_R, Math.sin(a) * MORPH_R];
};

function morphDots() {
  const dots: Array<{ key: number; m1: string; m2: string; m3: string; m4: string }> = [];
  for (let i = 0; i < MORPH_N; i += 1) {
    const [x1, y1] = shapeCenter(i);
    const [x2, y2] = shapeCircle(i);
    const [x3, y3] = shapeCenter(i);
    const [x4, y4] = shapeCircle(i);
    dots.push({
      key: i,
      m1: `${x1.toFixed(1)}px, ${y1.toFixed(1)}px`,
      m2: `${x2.toFixed(1)}px, ${y2.toFixed(1)}px`,
      m3: `${x3.toFixed(1)}px, ${y3.toFixed(1)}px`,
      m4: `${x4.toFixed(1)}px, ${y4.toFixed(1)}px`,
    });
  }
  return dots;
}

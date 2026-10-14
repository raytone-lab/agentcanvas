import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "../../agentmatrix/uiIcons";
import { useIconStyle } from "../../agentmatrix";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ThinkingOrb, type OrbState } from "thinking-orbs";
import type { AgentUXReasoningTimelineItem } from "@agent-ux/render-core";

import { useCopy } from "../../i18n/LocaleContext";
import type { UiCopy } from "../../i18n/uiCopy";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import { AgentActivitySpinner } from "../activity/AgentActivitySpinner";
import { ShimmerText } from "../ShimmerText";
import { WritingText } from "./WritingText";
import { deriveDisclosureOpen } from "./disclosureState";

export function ReasoningBlock({
  project,
  reasoning,
  showDebugBadges = false,
  writingReplayKey = 0,
}: {
  project: AgentFrontendProject;
  reasoning: AgentUXReasoningTimelineItem;
  showDebugBadges?: boolean;
  /** Bumped when a writing option is picked, so the same text plays again. */
  writingReplayKey?: number;
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
  // Read off its own field now, not off the motion. It used to *be* a motion,
  // which made it exclusive with the glyphs; the two compose, so the glyph the
  // reader picked keeps showing beside the cycling words.
  const cyclesStages = project.reasoning.textCycle;
  const stageLabel = useThinkingStage(running && cyclesStages);
  /*
   * How long the thinking took, measured here rather than read off the item.
   *
   * The protocol carries no duration — the reasoning events only open, append
   * and close — so the only honest source is the wait this component itself
   * watched: the clock starts when the block first arrives running and stops
   * when it turns done. A block that was never seen running (history restored
   * from a snapshot, say) has no duration, and the title says 已思考 with no
   * parenthetical rather than inventing one.
   */
  const startedAtRef = useRef<number | null>(null);
  const [thinkingMs, setThinkingMs] = useState<number | null>(null);
  /*
   * The clock runs while the span is open, rather than being read once at the
   * end.
   *
   * It used to hold `null` for the whole wait and then take a single
   * measurement on the transition to done, so the only number the reader ever
   * saw was the total — the wait itself was silent. A wait with a number on it
   * that does not move reads as a still frame; one that counts is the only part
   * of this block that says the run is alive.
   *
   * One second is the tick, and it is also the floor: `Math.max(1, …)` below
   * means the label opens at 1s instead of flashing 0s for the first frame.
   *
   * The final value still comes from the transition, not from the last tick, so
   * a run that ends between ticks reports what it actually took.
   */
  useEffect(() => {
    if (running) {
      if (startedAtRef.current === null) startedAtRef.current = Date.now();
      const tick = () => {
        if (startedAtRef.current !== null) setThinkingMs(Date.now() - startedAtRef.current);
      };
      tick();
      const timer = window.setInterval(tick, 1000);
      return () => window.clearInterval(timer);
    }
    if (startedAtRef.current !== null) {
      setThinkingMs(Date.now() - startedAtRef.current);
      startedAtRef.current = null;
    }
    return undefined;
  }, [running, reasoning.id]);
  const timedStyle = project.reasoning.doneStyle === "timed";
  /*
   * The producer's own name for the block wins over the wait this component
   * measured: `label` is what the protocol carries, and a producer that reports
   * one knows more about the run than a clock started when the element mounted.
   * Then the measurement, then 已思考 with no parenthetical — never a number
   * nobody counted.
   */
  /**
   * `12s` under a minute, `2m 3s` over it.
   *
   * Seconds alone stop being readable past 60 — "Thought for 143s" is a number
   * the reader has to divide — so the label switches form rather than growing.
   */
  const elapsedLabel = (short: string, long: string): string | null => {
    if (thinkingMs === null) return null;
    const total = Math.max(1, Math.round(thinkingMs / 1000));
    if (total < 60) return short.replace("{seconds}", String(total));
    return long
      .replace("{minutes}", String(Math.floor(total / 60)))
      .replace("{seconds}", String(total % 60));
  };

  /*
   * What the header says while the span is open, composed from two independent
   * choices rather than picked from a list of three.
   *
   *   text  = the cycling stage name, or the plain status word
   *   clock = appended when the block is titled by its duration
   *
   * Both are optional and neither excludes the other, so a reader who picked
   * the dots, the text cycle and the elapsed time gets all three: the glyph
   * (rendered separately, from the motion), the cycling words, and the seconds.
   * This used to be a three-way choice where the clock and the cycle each
   * displaced the other.
   */
  const runningClock = timedStyle
    ? elapsedLabel(copy.chat.reasoning.elapsedSuffix, copy.chat.reasoning.elapsedSuffixLong)
    : null;
  /*
   * With the clock on and no cycling text, the title is the *same phrase the
   * card shows* — 已思考（用时 N 秒）— rather than 思考中 with a number stuck on
   * the end. The card is a preview of what the canvas will say, so the two
   * agreeing is the point, and the reader picked a card that reads that way.
   *
   * It is only the wording. The span is still open: `status` stays "thinking",
   * the indicator keeps animating and the number keeps climbing, which is what
   * tells the running state from the settled one — not the choice of words.
   *
   * When the text cycles, the stage name owns the words and the clock goes back
   * to being a suffix: "读取文件 2 秒". A phrase cannot compose with a phrase.
   */
  const runningTitle = cyclesStages
    ? (runningClock ? `${stageLabel} ${runningClock}` : stageLabel)
    : timedStyle
      ? elapsedLabel(copy.chat.reasoning.reasonedFor, copy.chat.reasoning.reasonedForLong)
        ?? copy.chat.reasoning.thinking
      : copy.chat.reasoning.thinking;

  /*
   * The settled title, one of four.
   *
   * `counted` and `conclusion` both read from data that may not be there — a
   * transcript with one unsegmented summary has no count to show, and a
   * reasoning span with no text has no conclusion to quote — so both fall back
   * to the plain label rather than rendering "· 0 段" or an empty title.
   *
   * The fallback is `reasonedPlain`, not `reasoned`. They differ: `reasoned` is
   * the *running* word — English has it as "Thinking" — so using it here put
   * "Thinking" on a block that had finished. Measured on the canvas: the plain
   * title read 思考过程 and the counted one 思考过程 · 3.
   */
  const summaryLines = typeof reasoning.summary === "string"
    ? reasoning.summary.split("\n").map((line) => line.trim()).filter(Boolean)
    : [];
  const doneStyle = project.reasoning.doneStyle;
  const timedTitle = typeof reasoning.label === "string" && reasoning.label.trim().length > 0
    ? reasoning.label
    : elapsedLabel(copy.chat.reasoning.reasonedFor, copy.chat.reasoning.reasonedForLong)
      ?? copy.chat.reasoning.reasonedPlain;
  const doneTitle = doneStyle === "timed"
    ? timedTitle
    : doneStyle === "counted"
      ? (summaryLines.length > 1
        ? copy.chat.reasoning.reasonedCount.replace("{count}", String(summaryLines.length))
        : copy.chat.reasoning.reasonedPlain)
      : doneStyle === "conclusion"
        // The last line, not the first: a reasoning span argues its way to a
        // decision, so the conclusion is where it stopped.
        ? (summaryLines[summaryLines.length - 1] ?? copy.chat.reasoning.reasonedPlain)
        : copy.chat.reasoning.reasonedPlain;
  /*
   * What is left of the body once it settles.
   *
   * `title-only` discards it, which also means there is nothing to toggle — so
   * it has to suppress the chevron too, or the control would open an empty
   * block. `first-line` keeps the block closed but leaves one line showing; the
   * fade is CSS.
   */
  const doneBody = project.reasoning.doneBody;
  const bodyDiscarded = !running && doneBody === "title-only";
  const isSummaryFirst = project.reasoning.collapse === "summary-first";
  const canToggleSummary = project.reasoning.expandable && canShowSummary && !isSummaryFirst && !bodyDiscarded;

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
      data-done-style={project.reasoning.doneStyle}
      data-done-rule={project.reasoning.doneRule ? "true" : undefined}
      data-done-body={project.reasoning.doneBody}
      data-text-cycle={cyclesStages ? "true" : undefined}
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
          <span className="reasoning-title">{running ? runningTitle : doneTitle}</span>
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
      {/* `initial` off for the first paint — a replayed transcript should not
          unfold itself on arrival — and on for a replay, where the block is
          re-mounted deliberately and the reader is being shown the interaction
          rather than the end state. */}
      <AnimatePresence initial={writingReplayKey > 0}>
        {/* `first-line` renders the body while *closed* — that is the whole
            point of it — so it has its own condition rather than riding on
            `open`. `title-only` renders nothing once the span has settled. */}
        {((open || (!running && doneBody === "first-line")) && canShowSummary && !bodyDiscarded) ? (
          <motion.div
            key="reasoning-body"
            className="reasoning-body"
            // The same choice the answer text has in Delivery, for the thinking
            // text, which had none.
            data-writing-motion={project.reasoning.writing}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            {/* The real reveal, not a CSS stand-in: the same component that
                writes the answer out, at the rhythm 文字加载方式 picked. A
                `max-height` animation wiped the block in one go and could not
                follow wrapped lines, which is exactly what this was built to
                avoid. */}
            <WritingText
              project={project}
              text={reasoning.summary ?? ""}
              mode={project.reasoning.writing}
              replayKey={writingReplayKey}
            />
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
  hourglass: "working",
};

/**
 * The words the indicator cycles through while the span is open.
 *
 * One shared source for the canvas and for the rail's card, so the card cannot
 * show a sequence the canvas does not run. Sequence, not spinner: the point is
 * to say what the wait is *for* — 思考中 → 推理需求 → 规划回复 — which a glyph
 * cannot. Front-end only for now; the protocol carries no stage names (the
 * reasoning events open, append and close, nothing else), so when a producer
 * starts naming steps this becomes the fallback.
 */
const THINKING_STAGE_MS = 1800;

export function useThinkingStage(active: boolean): string {
  const copy = useCopy();
  const stages = copy.chat.reasoning.thinkingStages;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    // Reduced motion keeps the first word rather than swapping text on a timer,
    // which is motion whether or not anything slides.
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % stages.length);
    }, THINKING_STAGE_MS);
    return () => window.clearInterval(timer);
  }, [active, stages.length]);

  return stages[Math.min(index, stages.length - 1)] ?? stages[0];
}

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

/**
 * Hourglass: the sand runs out, then the glass turns over.
 *
 * Four sand shapes for two bulbs, which is the part that is not obvious. Sand
 * drains *towards* the neck and piles *away* from it, so the two motions have
 * opposite anchors — and after the turn each bulb swaps which of the two it is
 * doing. Two shapes cannot express that: anchoring both at the neck makes the
 * lower pile hang from the middle, and anchoring both at the outer wall makes
 * the upper sand lift away from the neck as it drains. So each bulb carries a
 * neck-anchored `drain` and a wall-anchored `pile`, and the pair swaps at the
 * turn. The swap is invisible because it happens at the instant both are full,
 * where the two shapes are identical.
 *
 * Geometry is a tall bow-tie: sand scaled about the apex of a triangle stays a
 * similar triangle, which is also what a real pile of sand looks like.
 */
function HourglassIndicator({ active }: { active: boolean }) {
  /*
   * In the Game style this is the painted cog instead, turning.
   *
   * Asked for directly, and it is the right swap: the style's icons are all
   * painted plates now, and a two-colour stroked hourglass beside them was the
   * one flat drawing left in the conversation. The sand simulation below is
   * kept rather than deleted — the motion id is `thinking-hourglass`, it is
   * persisted in saved projects, and any surface that is not this style still
   * gets an hourglass when it asks for one.
   */
  if (useIconStyle() === "game") {
    return <QuestCogIndicator active={active} />;
  }

  return (
    <span className="reasoning-hourglass" data-active={active ? "true" : undefined}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <g className="reasoning-hourglass-turn">
          {/* Frame: two plates and the posts between them. */}
          <path className="reasoning-hourglass-frame" d="M6 3h12M6 21h12M7.5 3v1.2M16.5 3v1.2M7.5 19.8V21M16.5 19.8V21" />
          {/* Glass, as the bow-tie the sand lives inside. */}
          <path className="reasoning-hourglass-glass" d="M7 4.2h10L12.6 12 17 19.8H7L11.4 12z" />
          {/* Upper bulb: apex down at the neck. */}
          <path className="reasoning-hourglass-sand" data-role="drain-a" d="M8.2 5.2h7.6L12 11.6z" />
          <path className="reasoning-hourglass-sand" data-role="pile-a" d="M8.2 5.2h7.6L12 11.6z" />
          {/* Lower bulb: apex up at the neck. */}
          <path className="reasoning-hourglass-sand" data-role="drain-b" d="M12 12.4l3.8 6.4H8.2z" />
          <path className="reasoning-hourglass-sand" data-role="pile-b" d="M12 12.4l3.8 6.4H8.2z" />
          {/* The falling stream. */}
          <path className="reasoning-hourglass-stream" d="M12 11.8v5.4" />
        </g>
      </svg>
    </span>
  );
}

/**
 * The Game style's loading mark: its own painted cogwheel, turning.
 *
 * One `rotate(360deg)` at a constant rate, which is the only honest motion for
 * a gear — easing it would read as a gear slipping. 2.2s a turn: fast enough to
 * be plainly moving at 20px, slow enough that the bevel and the gem stay
 * readable rather than smearing into a ring.
 *
 * `transform` on the image, not on the wrapper, so the spin cannot drag the
 * text baseline beside it around.
 */
function QuestCogIndicator({ active }: { active: boolean }) {
  return (
    <span className="reasoning-quest-cog" data-active={active ? "true" : undefined} aria-hidden="true">
      <img src="/game/icons/cog.png" alt="" draggable={false} />
    </span>
  );
}

/*
 * The per-style indicators, as a table where the shape is just N children.
 *
 * Eleven of these are new and they exist because the eight that came before
 * were one style's vocabulary: three of them (the lattice, the lens, the morph
 * ring) have their geometry and keyframes written only under
 * `[data-style-preset="native"]`, so in every other style they had no size and
 * no animation — they were not dim, they were absent.
 *
 * Every one is a *progression* rather than a spin: sand falling, bricks
 * filling, coins stacking, halftone dots swelling in sequence. A rotating
 * finished object reads as "busy"; something being assembled reads as loading,
 * which is what the block means.
 *
 * `cells` is the child count and nothing more — the CSS owns size, colour and
 * timing, so a motion's whole appearance lives in its style's branch and can
 * use that style's tokens. The four shapes that cannot be expressed as equal
 * children (a bubble, a flame, a rune ring, a coin stack) get their own JSX
 * below.
 */
const CELL_MOTIONS: Partial<Record<string, { className: string; cells: number }>> = {
  // 漫画风 — halftone dots swelling left to right, and one ink blot beating.
  "comic-halftone": { className: "reasoning-halftone", cells: 4 },
  "comic-inkblot": { className: "reasoning-inkblot", cells: 1 },
  "comic-flip": { className: "reasoning-flip", cells: 1 },
  // 像素风 — whole-cell jumps, no interpolation. `steps()` in the CSS is what
  // keeps these on the grid; an eased transform would put a block at 1.4px.
  "pixel-cursor": { className: "reasoning-pixel-cursor", cells: 1 },
  "pixel-bars": { className: "reasoning-pixel-bars", cells: 3 },
  "pixel-spin": { className: "reasoning-pixel-spin", cells: 4 },
  "pixel-bricks": { className: "reasoning-pixel-bricks", cells: 5 },
  /* 手绘风 — pen on paper. The blot is one mark spreading; the pencil is a
     single stroke being drawn; the page is a corner lifting. The balloon needs
     three dots inside a drawn outline, so it gets its own JSX below. */
  "sketch-blot": { className: "reasoning-sketch-blot", cells: 1 },
  "sketch-pencil": { className: "reasoning-sketch-pencil", cells: 1 },
  "sketch-page": { className: "reasoning-sketch-page", cells: 1 },
  /* 科技风 — instrument readouts. The matrix is the avatar's LED face, the
     bars a signal meter, the scan a cursor on a baseline, the segments the
     progress rail's own language. Cells are squares; nothing here is round. */
  "tech-matrix": { className: "reasoning-tech-matrix", cells: 9 },
  "tech-signal": { className: "reasoning-tech-signal", cells: 4 },
  "tech-scan": { className: "reasoning-tech-scan", cells: 1 },
  "tech-segments": { className: "reasoning-tech-segments", cells: 4 },
  /* 水墨风 — ink on rice paper. A drop bleeding out, one brush stroke drying,
     rings on water, and the cinnabar seal: the style's one colour, kept for the
     one motion that is a stamp. */
  "ink-drop": { className: "reasoning-ink-drop", cells: 1 },
  "ink-stroke": { className: "reasoning-ink-stroke", cells: 1 },
  "ink-ripple": { className: "reasoning-ink-ripple", cells: 2 },
  "ink-seal": { className: "reasoning-ink-seal", cells: 1 },
  /* 复古风 — the instruments on a period desk: a pocket watch, a record on
     the turntable, a metronome and a telegraph tape. Objects, like the
     style's icon plates, rather than abstract marks. */
  "retro-watch": { className: "reasoning-retro-watch", cells: 1 },
  "retro-record": { className: "reasoning-retro-record", cells: 1 },
  "retro-metronome": { className: "reasoning-retro-metronome", cells: 1 },
  "retro-telegraph": { className: "reasoning-retro-telegraph", cells: 4 },
};

function ClassicReasoningIndicator({ motion, active = true }: { motion: AgentFrontendProject["theme"]["motion"]["reasoning"]; active?: boolean }) {
  if (motion === "hourglass") {
    return <HourglassIndicator active={active} />;
  }

  const cellShape = CELL_MOTIONS[motion];
  if (cellShape) {
    return (
      <span
        className={cellShape.className}
        data-active={active ? "true" : undefined}
        aria-hidden="true"
      >
        {Array.from({ length: cellShape.cells }, (_, index) => (
          // The index reaches CSS as a custom property so a stagger is one
          // `animation-delay: calc(var(--i) * 120ms)` instead of N selectors.
          <i key={index} style={{ "--i": index } as CSSProperties} />
        ))}
      </span>
    );
  }

  if (motion === "sketch-bubble") {
    /* The reference's "Thought" mark: a hand-drawn balloon with a tail, its
       three dots filling in turn. Distinct from the comic style's balloon above
       — that one is a heavy-outline rectangle with a hard corner, this is a
       rounded cloud with a wobbling edge, and the dots fade rather than
       stepping, because a pencil dot does not switch on. */
    return (
      <span className="reasoning-sketch-bubble" data-active={active ? "true" : undefined} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <path
            className="reasoning-sketch-bubble-shell"
            d="M5.5 4.5h13a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.5v-3.5a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 5.5 4.5z"
          />
          {[0, 1, 2].map((index) => (
            <circle
              key={index}
              className="reasoning-sketch-bubble-dot"
              cx={8 + index * 4}
              cy={10}
              r={1.5}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    );
  }

  if (motion === "comic-bubble") {
    /* A speech balloon with its three dots filling in turn — the comic's own
       way of drawing "someone is about to speak". Heavy outline, because in
       this style the line *is* the style. */
    return (
      <span className="reasoning-bubble" data-active={active ? "true" : undefined} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <path
            className="reasoning-bubble-shell"
            d="M4 4.5h16v11H9.5L5.5 20v-4.5H4z"
          />
          {[0, 1, 2].map((index) => (
            <circle
              key={index}
              className="reasoning-bubble-dot"
              cx={8 + index * 4}
              cy={10}
              r={1.6}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    );
  }

  if (motion === "quest-torch") {
    /* A flame, which is the one thing a quest log animates. Two shapes: an
       outer body that leans and a bright core that lags, because a flame read
       as one shape scaling looks like a throbbing leaf. */
    return (
      <span className="reasoning-torch" data-active={active ? "true" : undefined} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <path className="reasoning-torch-body" d="M12 3c3.2 3.4 5 6 5 8.6A5 5 0 0 1 7 11.6C7 9 8.8 6.4 12 3z" />
          <path className="reasoning-torch-core" d="M12 8.4c1.5 1.7 2.3 3 2.3 4.3a2.3 2.3 0 0 1-4.6 0c0-1.3.8-2.6 2.3-4.3z" />
          <path className="reasoning-torch-stem" d="M10.4 18.4h3.2M11 21h2" />
        </svg>
      </span>
    );
  }

  if (motion === "quest-rune") {
    /* Eight ticks on a circle, lighting one at a time in steps rather than
       sweeping — a rune circle being read, not a spinner. */
    return (
      <span className="reasoning-rune" data-active={active ? "true" : undefined} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          <circle className="reasoning-rune-ring" cx="12" cy="12" r="8.5" />
          {Array.from({ length: 8 }, (_, index) => (
            <line
              key={index}
              className="reasoning-rune-tick"
              x1="12"
              y1="2.6"
              x2="12"
              y2="5.4"
              transform={`rotate(${index * 45} 12 12)`}
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    );
  }

  if (motion === "quest-coins") {
    /* Three coins stacking, the top one dropping in and the pile settling. The
       clearest "something is accumulating" this style has. */
    return (
      <span className="reasoning-coins" data-active={active ? "true" : undefined} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
          {[0, 1, 2].map((index) => (
            <ellipse
              key={index}
              className="reasoning-coin"
              cx="12"
              cy={17.5 - index * 4}
              rx="6.5"
              ry="2.6"
              style={{ "--i": index } as CSSProperties}
            />
          ))}
        </svg>
      </span>
    );
  }
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

import { motion, useReducedMotion } from "motion/react";
import { FileCode2, PanelRight, TerminalSquare } from "lucide-react";

import type { OutputSource } from "../../../schema/agentuxConfig";
import type { OutputFrameCopy } from "./types";

export function OutputSourceSwitch({
  source,
  copy,
  onChange,
}: {
  source: OutputSource;
  copy: OutputFrameCopy;
  onChange: (source: OutputSource) => void;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <div className="output-source-switch" role="group" aria-label={copy.titleArtifactPrefix}>
      <button
        type="button"
        aria-label={copy.titleArtifactPrefix}
        aria-pressed={source === "artifact"}
        data-active={source === "artifact"}
        title={copy.subtitleArtifactPreview}
        onClick={() => onChange("artifact")}
      >
        {source === "artifact" ? <SourcePill reduced={reducedMotion} /> : null}
        <FileCode2 size={15} />
        <span className="output-source-label">{copy.sourceArtifact}</span>
      </button>
      <button
        type="button"
        aria-label={copy.titleConsole}
        aria-pressed={source === "console"}
        data-active={source === "console"}
        title={copy.consoleLogs}
        onClick={() => onChange("console")}
      >
        {source === "console" ? <SourcePill reduced={reducedMotion} /> : null}
        <TerminalSquare size={15} />
        <span className="output-source-label">{copy.sourceConsole}</span>
      </button>
    </div>
  );
}

/**
 * The moving background behind the active source tab.
 *
 * A shared `layoutId` is what makes this slide: motion sees the same element leave one button
 * and arrive in the other, and interpolates the box between them. The previous version gave
 * each button its own `background` and cross-faded — two fades read as a jump, because nothing
 * ever travels.
 *
 * Spring rather than a duration: the distance changes with the label widths (and with locale —
 * "Artifact" / "产物" / "アーティファクト" are three different widths), and a fixed duration
 * makes the short trip feel slow and the long one feel rushed.
 *
 * `border-radius: inherit` in CSS, not a value here: the minimal style preset swaps the
 * switch's radius, and a hardcoded pill would keep the pill round inside a square control.
 */
function SourcePill({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.span
      className="output-source-pill"
      layoutId="output-source-pill"
      aria-hidden="true"
      transition={
        reduced
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
      }
    />
  );
}

export function ExpandOutputIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M29.8652 7.32129V14.4404C29.8652 15.1523 29.3906 15.627 28.6787 15.627C27.9668 15.627 27.4922 15.1523 27.4922 14.4404V10.1689L21.2036 16.4575C20.9663 16.6948 20.7292 16.8135 20.373 16.8135C20.0171 16.8135 19.7798 16.6948 19.5425 16.4575C19.43 16.3504 19.3404 16.2215 19.2793 16.0788C19.2181 15.936 19.1865 15.7823 19.1865 15.627C19.1865 15.4716 19.2181 15.3179 19.2793 15.1751C19.3404 15.0324 19.43 14.9035 19.5425 14.7964L25.8311 8.50781H21.5596C20.8477 8.50781 20.373 8.0332 20.373 7.32129C20.373 6.60938 20.8477 6.13477 21.5596 6.13477H28.6787C28.7974 6.13477 29.0347 6.13477 29.1533 6.25342C29.3906 6.37207 29.6279 6.60938 29.7466 6.84668C29.8652 6.96533 29.8652 7.20264 29.8652 7.32129ZM14.7964 19.5425L8.50781 25.8311V21.5596C8.50781 20.8477 8.0332 20.373 7.32129 20.373C6.60938 20.373 6.13477 20.8477 6.13477 21.5596V28.6787C6.13477 28.7974 6.13477 29.0347 6.25342 29.1533C6.37207 29.3906 6.60938 29.6279 6.84668 29.7466C6.96533 29.8652 7.20264 29.8652 7.32129 29.8652H14.4404C15.1523 29.8652 15.627 29.3906 15.627 28.6787C15.627 27.9668 15.1523 27.4922 14.4404 27.4922H10.1689L16.4575 21.2036C16.57 21.0965 16.6596 20.9676 16.7207 20.8249C16.7819 20.6821 16.8135 20.5284 16.8135 20.373C16.8135 20.2177 16.7819 20.064 16.7207 19.9212C16.6596 19.7785 16.57 19.6496 16.4575 19.5425C16.3504 19.43 16.2215 19.3404 16.0788 19.2793C15.936 19.2181 15.7823 19.1865 15.627 19.1865C15.4716 19.1865 15.3179 19.2181 15.1751 19.2793C15.0324 19.3404 14.9035 19.43 14.7964 19.5425Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function RightSidebarIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="-1.3" y="1.3" width="27.4" height="27.4" rx="4.7" transform="matrix(-1 0 0 1 27.4 0)" stroke="currentColor" strokeWidth="2.6" />
      <rect width="2.6" height="27" transform="matrix(-1 0 0 1 20 2)" fill="currentColor" />
    </svg>
  );
}

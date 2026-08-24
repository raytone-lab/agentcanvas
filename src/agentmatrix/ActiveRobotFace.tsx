import { useId, type SVGProps } from "react";

/**
 * Active agent badge: a neon ring face inspired by soft sci-fi assistant lights.
 * The `size` prop controls the core size; the full SVG remains larger so the
 * glow has room to render.
 */
export function ActiveRobotFace({
  size = 46,
  active = true,
  className,
  ...rest
}: { size?: number; active?: boolean } & SVGProps<SVGSVGElement>) {
  const id = useId();
  const outerSize = (size * 74) / 46;
  const classes = ["active-robot-face", className].filter(Boolean).join(" ");
  const auraGradientId = `${id}-active-aura`;
  const ringGradientId = `${id}-active-ring`;
  const ringAltGradientId = `${id}-active-ring-alt`;
  const faceGradientId = `${id}-active-face`;
  const eyeGradientId = `${id}-active-eyes`;

  return (
    <svg
      viewBox="0 0 74 74"
      width={outerSize}
      height={outerSize}
      className={classes}
      data-active={active}
      role="img"
      {...rest}
    >
      <defs>
        <radialGradient id={auraGradientId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--avatar-active-cyan, #DDD6FE)" stopOpacity="0.36" />
          <stop offset="48%" stopColor="var(--avatar-active-violet, #7C3AED)" stopOpacity="0.2" />
          <stop offset="100%" stopColor="var(--avatar-active-cyan, #DDD6FE)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={ringGradientId} x1="19" y1="15" x2="56" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--avatar-active-violet, #7C3AED)" />
          <stop offset="47%" stopColor="var(--avatar-active-blue, #8B5CF6)" />
          <stop offset="100%" stopColor="var(--avatar-active-cyan, #DDD6FE)" />
        </linearGradient>
        <linearGradient id={ringAltGradientId} x1="54" y1="17" x2="19" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--avatar-active-cyan, #DDD6FE)" stopOpacity="0.92" />
          <stop offset="58%" stopColor="var(--avatar-active-blue, #8B5CF6)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--avatar-active-violet, #7C3AED)" stopOpacity="0.92" />
        </linearGradient>
        <radialGradient id={faceGradientId} cx="48%" cy="36%" r="70%">
          <stop offset="0%" stopColor="var(--avatar-active-face-top, #09242D)" />
          <stop offset="64%" stopColor="var(--avatar-active-face, #020909)" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <linearGradient id={eyeGradientId} x1="30" y1="26" x2="45" y2="47" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--avatar-active-cyan, #DDD6FE)" />
          <stop offset="1" stopColor="var(--avatar-active-blue, #8B5CF6)" />
        </linearGradient>
      </defs>

      <circle cx="37" cy="37" r="29" fill="var(--avatar-bg, var(--surface-panel))" />
      <circle className="active-robot-face-ripple active-robot-face-ripple-inner" cx="37" cy="37" r="31" fill={`url(#${auraGradientId})`} />
      <circle className="active-robot-face-ripple active-robot-face-ripple-outer" cx="37" cy="37" r="37" fill={`url(#${auraGradientId})`} />

      <g className="active-robot-face-core">
        <circle className="active-robot-face-glow-ring" cx="37" cy="37" r="20.9" fill="none" stroke={`url(#${ringGradientId})`} strokeWidth="5.4" strokeLinecap="round" />
        <circle className="active-robot-face-orbit" cx="37" cy="37" r="22.6" fill="none" stroke={`url(#${ringAltGradientId})`} strokeWidth="2" strokeLinecap="round" strokeDasharray="64 22 7 28" />
        <circle cx="37" cy="37" r="17.2" fill={`url(#${faceGradientId})`} />
        <path className="active-robot-face-highlight" d="M23.8 32.4C26.4 24.8 31.9 21.5 39.2 22.1C33.7 22.8 28.5 25.9 24.8 34.2" fill="none" stroke="var(--avatar-active-cyan, #DDD6FE)" strokeOpacity="0.18" strokeWidth="2.1" strokeLinecap="round" />
        <g className="active-robot-face-eyes" fill={`var(--avatar-active-eye, url(#${eyeGradientId}))`}>
          <rect x="31.2" y="31.2" width="3.8" height="8.2" rx="1.9" />
          <rect x="39" y="31.2" width="3.8" height="8.2" rx="1.9" />
        </g>
      </g>
    </svg>
  );
}

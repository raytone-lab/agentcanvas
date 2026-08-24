import { useId, type SVGProps } from "react";

/**
 * Original "friendly orb" agent avatar — a glossy blue sphere with two eyes that
 * blink and gently float. Hand-built from scratch (plain SVG + CSS); it is NOT
 * derived from or a copy of any third-party mascot/asset.
 *
 * Rendered through the same icon slot as the other agent-avatar options, so it
 * accepts `size` (and any pass-through SVG props) like a lucide icon.
 */
export function OrbFace({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="orb-face"
      role="img"
      {...rest}
    >
      <defs>
        <radialGradient id={gid} cx="38%" cy="30%" r="78%">
          <stop offset="0%" stopColor="var(--avatar-orb-highlight, var(--surface-panel))" />
          <stop offset="46%" stopColor="var(--avatar-orb-mid, var(--accent-hover))" />
          <stop offset="100%" stopColor="var(--avatar-orb-base, var(--accent))" />
        </radialGradient>
      </defs>
      <g className="orb-face-body">
        <circle cx="12" cy="12" r="10" fill={`url(#${gid})`} />
        {/* glossy highlight */}
        <ellipse cx="8.8" cy="8.4" rx="3.1" ry="2.1" fill="var(--avatar-detail, var(--surface-panel))" opacity="0.32" />
        <g className="orb-face-eyes" fill="var(--avatar-detail, var(--surface-panel))">
          <rect className="orb-face-eye" x="8.3" y="9.9" width="1.8" height="4.2" rx="0.9" />
          <rect className="orb-face-eye" x="13.9" y="9.9" width="1.8" height="4.2" rx="0.9" />
        </g>
      </g>
    </svg>
  );
}

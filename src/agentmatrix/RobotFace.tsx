import { type SVGProps } from "react";

/**
 * Original animated robot agent avatar — a dark round badge with a friendly
 * cartoon robot whose eyes blink (plus a tiny idle float). Hand-built from
 * scratch (plain SVG + CSS); self-contained so it fills the avatar consistently.
 */
export function RobotFace({ size = 24, ...rest }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className="robot-face"
      role="img"
      {...rest}
    >
      <circle cx="12" cy="12" r="12" fill="var(--avatar-bg, #E6E9F0)" />
      <g className="robot-face-body-position">
        <g className="robot-face-body" transform="translate(-1.8 0.4) scale(1.15)">
          <rect className="robot-face-antenna" x="11.35" y="3.6" width="1.3" height="2.6" rx="0.65" fill="var(--avatar-fg-muted, #A9B2C7)" />
          <circle className="robot-face-antenna" cx="12" cy="3.2" r="1.05" fill="var(--avatar-fg-muted, #A9B2C7)" />
          <rect className="robot-face-head" x="5.8" y="6.4" width="12.4" height="10.6" rx="3.4" fill="var(--avatar-fg, #A9B2C7)" />
          <rect className="robot-face-highlight" x="7.4" y="7.8" width="6" height="1.6" rx="0.8" fill="var(--avatar-fg-muted, #A9B2C7)" opacity="0.7" />
          <g className="robot-face-eyes" fill="var(--avatar-eye, #ffffff)">
            <rect className="robot-face-eye" x="8.7" y="10.1" width="2.1" height="3.6" rx="1.05" />
            <rect className="robot-face-eye" x="13.2" y="10.1" width="2.1" height="3.6" rx="1.05" />
          </g>
        </g>
      </g>
    </svg>
  );
}

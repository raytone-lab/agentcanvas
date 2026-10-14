/**
 * Rail collapse/expand glyphs for the canvas sidebars.
 *
 * These live here (rather than inline in App.tsx) so the exported scaffold renders the
 * same chrome as the configurator — `components/common/**` is part of the export
 * closure, App.tsx is not.
 */

export function SidebarRailIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      // Half a unit of room round the box: the frame's stroke runs to the
      // very edge of 0–30, and the viewBox clipped its outer half-pixel —
      // the icon looked cut on one side at any zoom that is not 100%.
      viewBox="-0.5 -0.5 31 31"
      overflow="visible"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1.3" y="1.3" width="27.4" height="27.4" rx="4.7" stroke="currentColor" strokeWidth="2.6" />
      <rect x="10" y="2" width="2.6" height="27" fill="currentColor" />
    </svg>
  );
}

export function RightSidebarRailIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      // Half a unit of room round the box: the frame's stroke runs to the
      // very edge of 0–30, and the viewBox clipped its outer half-pixel —
      // the icon looked cut on one side at any zoom that is not 100%.
      viewBox="-0.5 -0.5 31 31"
      overflow="visible"
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

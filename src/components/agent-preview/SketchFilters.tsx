/**
 * The wobble the Handdrawn style is made of.
 *
 * `feTurbulence` generates noise; `feDisplacementMap` pushes every pixel of the
 * element sideways by however much noise sits under it. A 2px straight border
 * comes out as a 2px line that wanders — which is the difference between a pen
 * drawing and a flat black-line comic, and this product already has the latter
 * (漫画风).
 *
 * Why this is a component and not a stylesheet: `filter: url(#id)` is a
 * *reference*, so the `<filter>` has to exist in the document. Every other
 * `feTurbulence` in this codebase (`--sk-grain`, the Game style's noise) is a
 * data-URI used as a background *image*, which needs nothing in the DOM. This
 * one does.
 *
 * `public/*.svg#id` would have avoided the DOM entirely, and was rejected:
 * external filter references work in Chrome and Firefox but not dependably in
 * Safari, and in this style the wobble is not a decoration that can degrade.
 *
 * Rendered only when the Handdrawn style is active, so no other style pays for
 * it. Both shells mount it — the editor's `.preview-frame` and the generated
 * one in `scaffoldManifest.ts` — because an exported project needs it too.
 *
 * Two strengths, from the design: `sketchy` for the big containers and
 * `sketchy-light` for pills and bubbles, where a 3.5px displacement would read
 * as damage rather than as handwriting.
 */
export function SketchFilters() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      // Out of flow entirely: a zero-size inline SVG still takes a line box,
      // which put a stray gap at the top of the frame.
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        {/*
          The filter region has to be larger than the box. A displacement map
          moves pixels *outward* as well as inward, and the default region is
          the element's bounds — so the wobble on an edge was being clipped flat
          by the very filter that drew it.
        */}
        <filter id="sketchy" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="turbulence" baseFrequency="0.018 0.022" numOctaves="3" seed="5" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="sketchy-light" x="-4%" y="-8%" width="108%" height="116%">
          <feTurbulence type="turbulence" baseFrequency="0.022 0.028" numOctaves="2" seed="9" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

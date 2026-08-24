/**
 * Hero media for the landing page, produced from the running editor by the two scripts
 * in `scripts/`:
 *
 *   node scripts/capture-landing-demo.mjs    -> editor-demo.mp4  (real clicks, recorded)
 *   node scripts/capture-landing-shots.mjs   -> editor.png       (the video's poster)
 *
 * Files live in `public/landing/` and are referenced by absolute origin paths, the same
 * convention `src/export/scaffoldManifest.ts` uses for `public/` assets. Names stay clear
 * of `SCAFFOLD_PUBLIC_ASSETS`, which is fetched at export time.
 *
 * There is deliberately one piece of media on the page. Static per-component crops were
 * tried and dropped — a tool-call row is 478x30 in the real editor and a reasoning block
 * 478x88, so cropping to one component yields a thin fragment with half-cut neighbouring
 * text — and a recording of the actual interaction says more than a wall of stills.
 *
 * A missing file is not a build error: the video falls back to the poster, and the poster
 * falls back to a labelled frame.
 */

/** ~18s loop: pick a thinking motion, open the tool group, then recolour three themes. */
export const heroVideoSrc = "/landing/editor-demo.mp4";

/**
 * The light-theme still. Three jobs: the hero video's poster, the reduced-motion and
 * video-error fallback, and the base image the callout labels are drawn onto.
 */
export const heroPosterSrc = "/landing/editor.png";

/** The same editor state on a dark theme preset — the far side of the theme wipe. */
export const darkShotSrc = "/landing/editor-dark.png";

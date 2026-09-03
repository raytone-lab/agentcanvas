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
 *
 * `scripts/capture-editor-tour.mjs` is the third script, and it is the one the hero now uses.
 * It records a longer pass over every rail module and seeds `agentcanvas.locale` before the
 * app boots, so its output is in English; `capture-landing-demo.mjs` has no locale handling
 * at all, so `editor-demo.mp4` is whatever the editor defaults to, which is Chinese. An
 * English hero was wanted and the tour is the only English recording in the repo.
 *
 * That trade is worth stating: the tour is 39.5s and 724 kB against the demo's 18.5s and
 * 264 kB, and it sweeps every module rather than telling the demo's tighter story. Recording
 * the demo in English instead — copying the tour script's three lines of locale seeding —
 * would give the shorter cut back. Regenerate with `npm run capture:tour`.
 */

/** ~40s pass over all 11 rail modules, in English. */
export const heroVideoSrc = "/landing/editor-tour.mp4";

/**
 * The hero video's poster, and its fallback when the video errors or motion is reduced.
 *
 * A frame lifted straight out of `heroVideoSrc` rather than a separately captured still: a
 * poster from a different recording meant the first paint was in one language and the video
 * in another. Taken at 20s, where the transcript is settled — earlier frames catch the
 * typewriter mid-word, which reads as a truncation bug on a still.
 */
export const heroVideoPosterSrc = "/landing/editor-tour-poster.png";

/**
 * The light-theme still, and the near side of the theme wipe.
 *
 * Named for the job it still has. It used to double as the hero's poster, which is why it was
 * called `heroPosterSrc`; once the hero got a poster cut from its own video, that name pointed
 * at something it no longer did.
 */
export const lightShotSrc = "/landing/editor.png";

/** The same editor state on a dark theme preset — the far side of the theme wipe. */
export const darkShotSrc = "/landing/editor-dark.png";

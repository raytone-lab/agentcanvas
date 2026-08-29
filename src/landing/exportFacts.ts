/**
 * Facts about a generated export that the landing page states out loud.
 *
 * Not computed at runtime: the count comes from `createScaffoldExportSnapshot`, which lives in
 * the export pipeline — it globs source and reaches for `node:fs`, so it has no business in a
 * marketing bundle. `exportFacts.test.ts` asserts the constant against a real snapshot instead,
 * so a change to the manifest fails the suite rather than leaving a stale number on the page.
 */

/**
 * Every file a default export writes: the generated files, everything the source globs pull in,
 * the vendored packages, and the six binary assets under `public/`.
 *
 * Worth knowing why this is not the number of lines in the tree below it: the tree is a curated
 * view — it collapses `components/agent-preview/` to one row where the export writes 56 files
 * under `src/components/`. The design mock this section follows guessed "18", which is the tree's
 * visible row count and understates the real thing by an order of magnitude.
 */
export const EXPORT_FILE_COUNT = 180;

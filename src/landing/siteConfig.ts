/**
 * The two site-level URLs the landing page needs. Kept in one file so they are
 * trivial to swap without reading the page component.
 */

/**
 * TODO(owner): replace with the real repository URL before publishing.
 * Used by the hero's secondary CTA and the footer link.
 */
export const GITHUB_REPO_URL = "https://github.com/OWNER/REPO";

/**
 * The editor entry. A real file emitted by Vite's second HTML input (see
 * `vite.config.ts` → `build.rollupOptions.input.editor`), so it needs no host
 * rewrite rule. Hosts that strip `.html` will also serve it at `/editor`.
 */
export const EDITOR_URL = "/editor.html";

/**
 * The two site-level URLs the landing page needs. Kept in one file so they are
 * trivial to swap without reading the page component.
 */

/** Used by the navigation, CTAs, and footer source link. */
export const GITHUB_REPO_URL = "https://github.com/raytone-lab/agentcanvas";

/**
 * The editor entry. A real file emitted by Vite's second HTML input (see
 * `vite.config.ts` → `build.rollupOptions.input.editor`), so it needs no host
 * rewrite rule. Hosts that strip `.html` will also serve it at `/editor`.
 */
export const EDITOR_URL = "/editor.html";

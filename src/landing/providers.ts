/**
 * The provider list the landing page draws, mirroring `providerCatalog` in
 * `src/schema/agentuxConfig.ts`.
 *
 * Deliberately a copy rather than an import: `agentuxConfig` pulls in
 * `@agentmatrix/agentcanvas-contract`, which has no business inside a marketing bundle. The
 * duplication is held honest by `providers.test.ts`, which asserts id order, protocol and count
 * against the real catalog — so adding a tenth provider to the editor fails the suite until this
 * list is updated, instead of silently leaving the page understating what ships.
 *
 * `group` exists only here. The catalog has no such field; the split is an editorial one for the
 * left-hand ledger (hosted APIs / a localhost runtime / bring-your-own URL).
 */

export type LandingProviderId =
  | "openai"
  | "anthropic"
  | "gemini"
  | "openrouter"
  | "deepseek"
  | "z-ai"
  | "moonshot"
  | "local"
  | "custom";

export type LandingProviderGroup = "cloud" | "local" | "custom";

/**
 * Both protocols the runner dispatches on. `local` is `openai-compatible` too — Ollama speaks
 * that API on `localhost:11434`, so tagging it "local" would invent a third protocol and
 * contradict the "two protocols" fact stated directly below the grid.
 */
export type LandingProviderProtocol = "openai-compatible" | "anthropic";

export type LandingProvider = {
  id: LandingProviderId;
  protocol: LandingProviderProtocol;
  group: LandingProviderGroup;
};

export const landingProviders: readonly LandingProvider[] = [
  { id: "openai", protocol: "openai-compatible", group: "cloud" },
  { id: "anthropic", protocol: "anthropic", group: "cloud" },
  { id: "gemini", protocol: "openai-compatible", group: "cloud" },
  { id: "openrouter", protocol: "openai-compatible", group: "cloud" },
  { id: "deepseek", protocol: "openai-compatible", group: "cloud" },
  { id: "z-ai", protocol: "openai-compatible", group: "cloud" },
  { id: "moonshot", protocol: "openai-compatible", group: "cloud" },
  { id: "local", protocol: "openai-compatible", group: "local" },
  { id: "custom", protocol: "openai-compatible", group: "custom" },
];

export const landingProviderGroups: readonly LandingProviderGroup[] = ["cloud", "local", "custom"];

/** Zero-padded so the ledger's numbers line up as a column without a monospace font. */
export function providerGroupCount(group: LandingProviderGroup): string {
  return String(landingProviders.filter((provider) => provider.group === group).length).padStart(
    2,
    "0",
  );
}

/**
 * The one provider whose protocol differs from every other. Emphasised in the grid because it is
 * the single piece of information in there a reader needs to act on — everything else is one
 * protocol, so the exception is the point.
 */
export function isProtocolOutlier(provider: LandingProvider): boolean {
  return landingProviders.filter((other) => other.protocol === provider.protocol).length === 1;
}

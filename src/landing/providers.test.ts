import { describe, expect, it } from "vitest";

import { providerCatalog } from "../schema/agentuxConfig";
import { landingCopy } from "./copy";
import {
  isProtocolOutlier,
  landingProviders,
  providerGroupCount,
  type LandingProviderId,
} from "./providers";

/**
 * The landing page states, in public, exactly which providers ship preconfigured. That list is a
 * hand-written copy of `providerCatalog` (see the note in providers.ts for why it is not an
 * import), so it can drift the moment someone onboards a provider in the editor.
 *
 * These assertions are the tripwire. A tenth entry in the catalog, a renamed id, or a changed
 * protocol fails here — which is the whole point, because the alternative is a marketing page
 * that quietly understates or misstates the product.
 */
describe("landing provider list", () => {
  it("lists every provider in the editor's catalog, in the same order", () => {
    expect(landingProviders.map((provider) => provider.id)).toEqual(
      providerCatalog.map((provider) => provider.id),
    );
  });

  it("states each provider's real protocol", () => {
    for (const provider of landingProviders) {
      const source = providerCatalog.find((entry) => entry.id === provider.id);
      expect(source, `no catalog entry for ${provider.id}`).toBeDefined();
      expect(provider.protocol, `protocol drifted for ${provider.id}`).toBe(source?.protocol);
    }
  });

  it("claims only the two protocols the runner dispatches on", () => {
    expect(new Set(landingProviders.map((provider) => provider.protocol))).toEqual(
      new Set(["openai-compatible", "anthropic"]),
    );
  });

  it("tags the local runtime as openai-compatible, not as its own protocol", () => {
    // Ollama speaks the OpenAI API on localhost. "local" is the connection id, not a protocol —
    // presenting it as one would contradict the "two protocols" fact stated beside the grid.
    expect(landingProviders.find((provider) => provider.id === "local")?.protocol).toBe(
      "openai-compatible",
    );
  });

  it("emphasises anthropic alone, because it is the only provider on that protocol", () => {
    const outliers = landingProviders.filter(isProtocolOutlier).map((provider) => provider.id);
    expect(outliers).toEqual(["anthropic"]);
  });

  it("groups add up to the whole list", () => {
    const summed = ["cloud", "local", "custom"].reduce(
      (total, group) => total + Number(providerGroupCount(group as "cloud")),
      0,
    );
    expect(summed).toBe(landingProviders.length);
  });

  it("names every provider in both locales", () => {
    const ids = landingProviders.map((provider) => provider.id);
    for (const locale of ["zh", "en"] as const) {
      const names = landingCopy[locale].providers.names;
      for (const id of ids) {
        expect(names[id as LandingProviderId], `${locale} is missing a name for ${id}`).toBeTruthy();
      }
      expect(Object.keys(names).sort()).toEqual([...ids].sort());
    }
  });

  it("states the count both locales advertise from the list itself", () => {
    for (const locale of ["zh", "en"] as const) {
      // A hardcoded "9" in the copy would survive a tenth provider being added. The placeholder
      // forces the number to come from the list.
      expect(landingCopy[locale].providers.countNote).toContain("{count}");
    }
  });
});

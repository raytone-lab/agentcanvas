import type { AgentUXEvent } from "@agent-ux/protocol";
import type { ProviderConnection } from "./providers/providerCatalog";

export type AgentInput = {
  prompt: string;
  provider?: ProviderConnection;
  model?: string;
};

export type HarnessAdapter = {
  name: string;
  connect(input: AgentInput): AsyncIterable<AgentUXEvent>;
};

export const replayHarness: HarnessAdapter = {
  name: "replay",
  async *connect() {},
};

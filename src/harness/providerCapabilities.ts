import type { ProviderConnection, ProviderConnectionId } from "../schema/agentuxConfig";

export type ProviderChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ThinkingBudgetPreset = "low" | "medium" | "high";
export type ReasoningEffort = "low" | "medium" | "high";

export type ProviderRequestOptions = {
  thinkingBudget?: ThinkingBudgetPreset;
  reasoningEffort?: ReasoningEffort;
  temperature?: number;
  extras?: Record<string, unknown>;
};

export type ProviderRequestCapabilityLayer = {
  textStreaming: boolean;
  toolCallStreaming: boolean;
  structuredOutput: boolean;
  vision: boolean;
  requestParams: {
    thinkingBudget: boolean;
    reasoningEffort: boolean;
    temperature: boolean;
    extras: boolean;
  };
};

export type ProviderRequestParamStatus = {
  state: "applied" | "ui-only" | "unsupported";
  reason: string;
};

export type OpenAICompatibleChatBody = {
  model: string;
  stream: true;
  messages: readonly ProviderChatMessage[];
  temperature?: number;
  reasoning_effort?: ReasoningEffort;
  [key: string]: unknown;
};

const visionCapableProviderIds = new Set<ProviderConnectionId>(["openai", "gemini", "openrouter"]);
const reasoningEffortProviderIds = new Set<ProviderConnectionId>(["openai", "openrouter"]);

/**
 * The tools a live model is told it may call.
 *
 * Without these, a model never emits `tool_calls`, so the receiving code in
 * `LiveLlmPreviewRunner` (which has always handled them) never runs and a live session could
 * only ever fill the conversation surface — one of eight. A user who pasted their own key saw a
 * single text bubble where the composed design showed tool cards and an artifact panel, and
 * reasonably concluded the components were broken.
 *
 * The names are deliberately the canonical spellings from `TOOL_CONCEPT_ALIASES`
 * (`runtime/eventNormalizer.ts`): `ToolCallCard.resolveToolAction` matches on the tool name, so
 * advertising them under these names means the model's call lands on a designed card with no
 * rewriting anywhere. Adding a tool here whose name is outside that vocabulary would render an
 * un-designed generic row.
 *
 * Nothing executes these. The model's request and the approval prompt are real; the result is
 * not, and the card reports that rather than pretending otherwise.
 */
export const LIVE_MODEL_TOOLSET = [
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read a file from the workspace.",
      parameters: {
        type: "object",
        properties: { path: { type: "string", description: "Workspace-relative file path." } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Create or overwrite a file with the given contents.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Workspace-relative file path." },
          content: { type: "string", description: "Full file contents." },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "Replace a snippet inside an existing file.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          old_str: { type: "string", description: "Text to replace." },
          new_str: { type: "string", description: "Replacement text." },
        },
        required: ["path", "old_str", "new_str"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Run a shell command in the workspace.",
      parameters: {
        type: "object",
        properties: { command: { type: "string", description: "The command line to run." } },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search",
      description: "Search the workspace for a pattern.",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
] as const;

export function providerCapabilitiesForConnection(provider: ProviderConnection): ProviderRequestCapabilityLayer {
  const hostedOpenAICompatible = provider.protocol === "openai-compatible" && provider.id !== "local";
  const openAICompatible = provider.protocol === "openai-compatible";

  return {
    textStreaming: openAICompatible,
    toolCallStreaming: openAICompatible,
    structuredOutput: hostedOpenAICompatible,
    vision: visionCapableProviderIds.has(provider.id),
    requestParams: {
      thinkingBudget: false,
      reasoningEffort: reasoningEffortProviderIds.has(provider.id),
      temperature: openAICompatible,
      extras: hostedOpenAICompatible,
    },
  };
}

export function providerRequestParamStatus(
  provider: ProviderConnection,
  param: keyof ProviderRequestCapabilityLayer["requestParams"],
): ProviderRequestParamStatus {
  const supported = providerCapabilitiesForConnection(provider).requestParams[param];
  if (supported) {
    return { state: "applied", reason: `${param} is mapped by the ${provider.label} adapter.` };
  }
  if (param === "thinkingBudget") {
    return {
      state: "ui-only",
      reason: "No provider-specific adapter maps thinking budget yet.",
    };
  }
  return { state: "unsupported", reason: `${provider.label} does not declare ${param} support.` };
}

export function buildOpenAICompatibleChatBody(
  provider: ProviderConnection,
  messages: readonly ProviderChatMessage[],
  options: ProviderRequestOptions = {},
): OpenAICompatibleChatBody {
  const capabilities = providerCapabilitiesForConnection(provider);
  const body: OpenAICompatibleChatBody = {
    model: provider.defaultModel,
    stream: true,
    messages,
  };

  if (capabilities.requestParams.temperature && typeof options.temperature === "number") {
    body.temperature = options.temperature;
  }
  if (capabilities.requestParams.reasoningEffort && options.reasoningEffort) {
    body.reasoning_effort = options.reasoningEffort;
  }
  // Advertise the toolset so the model can ask to use one. `tool_choice: "auto"` leaves the
  // decision to the model — a plain question still gets a plain answer.
  if (capabilities.toolCallStreaming) {
    body.tools = LIVE_MODEL_TOOLSET;
    body.tool_choice = "auto";
  }
  if (capabilities.requestParams.extras && options.extras) {
    Object.assign(body, options.extras);
  }

  return body;
}

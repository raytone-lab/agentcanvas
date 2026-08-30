# Pi editor model synchronization

## Problem

AgentCanvas and the local Pi runtime currently keep independent provider state. Entering Pi mode reads Pi's existing session model and projects it back into the editor, so a locally configured Pi default such as Claude can replace the provider/model selected in AgentCanvas. This can make the composer show Claude even when the editor was configured for Z.ai/GLM.

## Decision

The AgentCanvas project is the source of truth. Before Pi mode is shown or a Pi prompt is sent, AgentCanvas sends the active provider connection, exact model ID, base URL, protocol, and session API key to the same-origin Pi host. The host dynamically registers that definition with Pi's `ModelRuntime`, then selects the registered model on the Pi session.

Provider/model selection must be exact. A missing or incompatible model produces an explicit error; the runtime must never silently retain or fall back to Claude. API keys remain in POST request bodies and process memory and are never placed in URLs or generated project files.

An omitted session key means “leave the current Pi process credential unchanged,” which keeps a configured model working across a browser refresh. Only an explicitly emptied key field clears the process credential. A Pi preflight failure is rendered as a durable conversation error as well as a toast, so sending can never look like a no-op.

## Runtime flow

1. Resolve the editor's enabled default provider.
2. Build a Pi provider definition using the editor provider ID, label, base URL, protocol, and configured models.
3. POST the definition and optional session key to the local Pi host.
4. Register or replace that provider in Pi's `ModelRuntime` and select the exact model.
5. Render the project provider/model choices in the editor; use Pi state only as runtime confirmation.
6. Repeat synchronization immediately before each prompt to prevent stale state.

The exported scaffold uses the same synchronization contract, so its provider settings control the actual Pi runtime in the same way.

## Protocol mapping

- `anthropic` -> `anthropic-messages`
- `openai-compatible`, `gemini`, and `ollama-native` -> `openai-completions`

The Gemini catalog currently uses Google's OpenAI-compatible endpoint, so the OpenAI-compatible transport is intentional.

## Failure behavior

- Required API key missing: configuration may be displayed, but a run is blocked with a clear credential error.
- Invalid provider/model/base URL: configuration fails and the prior Pi model is not presented as the editor selection.
- Provider rejects the request: the Pi event stream emits a visible run error.

## Verification

- Browser client tests ensure provider details and secrets are sent only in POST bodies.
- Host tests ensure custom provider configuration reaches the bridge and prompt execution uses the synchronized model.
- Pure synchronization tests cover Z.ai/GLM and protocol mapping.
- Full unit tests, production build, and exported-scaffold smoke tests must pass.

# Pi runtime integration design

## Outcome

AgentCanvas embeds Pi as a headless coding-agent runtime while continuing to render the
existing AgentUX components. Pi's TUI is never mounted. The editor and every exported project
use the same browser client and the same stateful `Pi event -> AgentUX event` adapter, so a
configured UI does not fork into a second implementation after export.

The editor remains the design-time authority: it chooses the allowed providers/models, the
default model, reasoning and tool presentation, and whether runtime selectors are visible.
An exported project receives those choices as defaults. At runtime its user may select only
the exported provider/model set. Credentials never enter the generated source or browser
bundle; Pi resolves its normal local credentials or receives session-only credentials through
the local server.

## Architecture

```text
AgentCanvas / exported React UI
  -> Pi browser client (HTTP + NDJSON event stream)
  -> local Node Pi host
  -> @earendil-works/pi-coding-agent SDK
  -> Pi AgentSession events
  -> stateful Pi adapter
  -> AgentUX events
  -> existing runtime, view model, slots, and UI components
```

The adapter maps `agent_start/agent_settled`, text and thinking block deltas, tool-call argument
deltas, tool execution start/update/end, retries, compaction, and terminal errors. Tool results
with file metadata additionally produce artifacts. Pi has no built-in permission popup, so the
host owns permission policy. A guarded tool emits `tool.call.awaiting_approval`, waits for the
browser decision, then either executes or returns a denied result.

## Runtime boundary

The browser never imports the Pi SDK because Pi owns filesystem, shell, credentials, sessions,
and Node-only dependencies. During AgentCanvas development, a Vite middleware hosts Pi under a
private local API. Exported projects include a small Node server with the same API and serve the
built React application. The public client API supports runtime state/model discovery, prompt
streaming, abort, model/thinking changes, session reset/listing, and approval decisions.

Pi currently requires Node 22.19 or newer. Generated projects declare this requirement and fail
with a readable startup error on older Node versions.

## Failure and safety behavior

- The working directory is fixed by the host at startup; browser requests cannot supply a path.
- API keys are redacted from state responses and event payloads.
- Only one active prompt runs per session; a second prompt is rejected or queued explicitly.
- Disconnecting the browser does not silently approve a tool. Pending approvals are denied.
- Abort closes open AgentUX text/reasoning/tool blocks with cancelled terminal states.
- Missing Pi credentials or models return a structured setup error while replay mode remains
  available for offline exhibition use.

## Verification

Pure adapter fixtures cover text, thinking, tools, errors, retries, compaction, and malformed
events. Host tests use a fake Pi session so they do not require credentials or network access.
UI tests verify live submission, model selection, stop, and approval callbacks. Export contract
tests require the Pi client, host, scripts, dependency, Node engine, and non-secret defaults.
The final gate is typecheck, the full unit suite, production build, and generated-project smoke
install/typecheck/build.

## Decision record

Use the SDK rather than scraping the TUI or spawning JSON mode. The SDK gives typed lifecycle
control, sessions, model switching, abort, and tool hooks in one Node process. RPC remains a
future isolation option because the browser-facing API and AgentUX adapter do not depend on how
the host obtains Pi events.

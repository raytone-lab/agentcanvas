# Driving an exported app with a real AI

You composed an interface in AgentCanvas and downloaded the zip. It runs, and a demo event
stream replays through it. This page is about the next step: making a real model or a real
agent drive it.

Read [EXPORT_CONTRACT.md](EXPORT_CONTRACT.md) instead if you are changing the configurator
itself. This page is for the person holding the exported project.

## The one seam

Every route below ends in the same place, and it is the only file you have to touch:

```
src/adapters/backendAdapter.ts
```

```
your backend / CLI / model API
  -> toStandardEvents(raw)          <- you implement this
  -> StandardEvent (AgentUX protocol)
  -> projector / view model
  -> slotRegistry -> the components you composed
```

Text, reasoning, the full tool-call lifecycle including approvals, artifacts, errors,
retries and interrupts are already rendered. Emit the matching standard event and the
existing component draws it. **Do not build new UI for a new backend** — if something does
not show up, the event you emitted is wrong, not the component.

Two switches control where events come from, both in `src/exported-project.ts`:

| field | values | meaning |
| --- | --- | --- |
| `runtime.transport` | `replay` \| `mock` \| `sse` | `replay`/`mock` read bundled fixtures. `sse` calls `liveEventSource()`. |
| `runtime.harness` | `agentux` \| `claude` \| `codex` \| `opencode` \| `pi` \| `custom` | Which vendor's output you are translating. Only used by the JSONL route below. |

Set `transport` to `"sse"` for every live route. An unconfigured `"sse"` export renders an
empty conversation on purpose — it will not silently fall back to demo data.

## Route 1 — an agentic CLI's JSONL (least work)

Claude Code, Codex and opencode already run the loop: they execute tools, ask for approvals
and write files. Their process is not in your browser, so you consume the JSON lines they
printed. **Mapping tables for all three ship inside your export** — you do not write the
translation.

```ts
import { importHarnessJsonl } from "../harness/adapters/jsonlImport";

const result = importHarnessJsonl(await file.text(), "claude");

if (result.ok) {
  onEvents(result.events);        // feed straight into the UI
  console.log(result.report);     // what mapped, what did not
} else {
  console.error(result.error);    // actionable, not a stack trace
}
```

`harness` is `"claude"` for Claude Code the CLI, `"codex"`, or `"opencode"`. `"agentux"`
means the lines are already standard events and only get validated. `"pi"` and `"custom"`
have no table — you want route 3.

For a live stream rather than a finished file, use the two pieces underneath:

```ts
import { parseHarnessLines, translateHarnessStream } from "../harness/adapters/tableDrivenAdapter";
import { mappingForHarness } from "../harness/adapters/registry";

const mapping = mappingForHarness("claude");
if (mapping) {
  const result = translateHarnessStream(parseHarnessLines(chunk), mapping);
  onEvents(result.events);
}
```

`TranslateResult` carries more than events: `producedNothing(result)` and
`formatTranslateReport(result)` tell you whether a table matched nothing, which is the
failure you actually hit when a vendor changes their output shape. Surface it rather than
rendering an empty transcript that looks like a working connection.

## Route 2 — a model API directly

One HTTP request to a model. **No tools are executed** — nothing runs commands or writes
files, so tool-call cards only appear if the model requests them and you execute them
yourself. This is the route for a chat-shaped product, not an agent that does work.

```ts
import { createAnthropicHarness } from "../harness/adapters/anthropicAdapter";

const harness = createAnthropicHarness({
  baseUrl: "/api/anthropic",   // your proxy — see the warning below
  model: "claude-sonnet-5",
  maxTokens: 4096,
});

for await (const event of harness.connect({ prompt })) {
  onEvents([event]);
}
```

`connect()` returns an `AsyncIterable<AgentUXEvent>`, so the adapter wrapper is a loop like
the one above.

> **Do not put an API key in the browser.** `baseUrl` is configurable precisely so it can
> point at a server you control that holds the key and forwards to the provider. Two
> separate reasons: a key shipped to the browser is a key you have published, and Anthropic
> blocks direct browser calls with CORS unless a specific opt-in header is sent — this
> package does not send it, so a browser pointed straight at `api.anthropic.com` fails
> regardless of the key.

## Route 3 — your own backend

For anything else: your own agent loop, LangGraph, a queue, a vendor with no table.

```ts
// src/adapters/backendAdapter.ts
export function liveEventSource(): LiveEventSource | null {
  return createSseEventSource({
    url: "/v1/sessions/current/events/stream",
    adapter: {
      toStandardEvents(raw) {
        // return [] for keep-alives and anything with no UI meaning
        return myTranslation(raw);
      },
    },
  });
}
```

`createSseEventSource` ships with the export and reads `text/event-stream` or
newline-delimited JSON. If your endpoint already emits AgentUX standard events, use the
provided `passthroughAdapter` and write no translation at all.

Emitting events by hand is easier with the writer than by building objects literally:

```ts
import { createEventWriter } from "../harness/adapters/eventWriter";

const writer = createEventWriter({ runId: "run-1" });
writer.runStarted({ title: "My agent" });
writer.reasoningDelta("Looking at the failing test first.");
writer.finishReasoning();
writer.toolStarted("t1", { name: "read_file", command: "src/index.ts" });
writer.toolResult("t1", { resultPreview: "42 lines" });
writer.toolFinished("t1", "success");
writer.textDelta("The test fails because the reducer drops the last action.");
writer.finishText();
writer.finishAll();          // closes anything still open, however the stream ended
writer.runFinished({ status: "success" });

onEvents(writer.events);
```

`finishAll()` is the one to remember: a stream that dies mid-tool leaves a card spinning
forever otherwise.

If your backend speaks the AgentMatrix protocol, `createBackendStreamSource` from
`./agentmatrix` plus `toAgentUXEvents` are bundled too.

## What stays inert until you wire something

In a fresh export these are deliberate no-ops, not bugs: submitting a prompt, stopping a
run, committing in the Git panel, and the provider test/fetch buttons. Everything visual is
real. Wiring a route above makes submit and stop meaningful; the Git panel and provider
settings are UI surfaces for a backend that reports those things.

## Checking your events against the UI

Before you have a backend, `replay`/`mock` plus the header dropdown walks every state the
components can draw — reasoning, tool call and result, approval, error, retry,
exhausted/terminal incidents, interrupts, artifacts, capability states. Use it as the
reference for what your `toStandardEvents` should produce: if a state renders under
`replay` but not under `sse`, the difference is in your translation.

The admission layer (`src/runtime/eventNormalizer.ts`, `eventContract.ts`,
`admissionReport.ts`) travels with the export for the same reason. It narrows a vendor
stream to what these components can render, and says so out loud when it cannot — check its
report before assuming an event was dropped silently.

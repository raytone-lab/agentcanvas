# Driving an exported app with a real AI

You composed an interface in AgentCanvas and downloaded the zip. It runs, and a demo event
stream replays through it. This page is about the next step: making a real model or a real
agent drive it.

Read [EXPORT_CONTRACT.md](EXPORT_CONTRACT.md) instead if you are changing the configurator
itself. This page is for the person holding the exported project.

## Pi is built in to both the editor and the export

AgentCanvas now embeds Pi as a headless local runtime. In the editor choose **Pi agent** from
the run-mode menu. In an exported package, `npm run dev` or `npm run preview` mounts the same
local Pi host automatically; submitting from the existing composer runs Pi and streams
AgentUX events into the same reasoning, tool, approval, artifact and error components.

The editor's provider/model selection is exported as the initial allowed configuration. An
export recipient can switch among those configured providers and models from the existing
composer/settings UI. A session API key stays in memory and is posted only to the same-origin
local Pi host; it is never written into the project, ZIP or browser bundle. Pi may also use its
normal local credential configuration. The generated package requires Node `>=22.19.0`.

The architectural constraints still matter:

- **Who executes tools?** A model API answers messages. It does not read files, run commands
  or write diffs. The tool-call cards, approval prompts and file diffs you composed can only
  be filled by something that actually runs an agent loop — and a browser tab cannot do that.
  Give an exported app nothing but a key and you get a chat window with the agent surfaces
  sitting empty.
- **Where does the key live?** In the browser it is the end user's own key and their own risk,
  and it only works where the provider allows browser calls — Anthropic blocks them by CORS
  unless an opt-in header is sent, which this package does not send. Behind your own endpoint,
  the key never reaches the browser and the CORS question disappears.

The routes below remain available when Pi is not the desired production backend. They all
converge on the same event seam, so replacing Pi does not require replacing UI components.

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
means the lines are already standard events and only get validated. Pi uses its dedicated
stateful SDK adapter rather than this table-driven import path; `"custom"` uses route 3.

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

## What still needs your product backend

Submitting, stopping, starting a new Pi session, model/provider selection, model discovery,
session-key configuration and tool approvals are operational in a fresh export. Product-level
Git commit/push behavior remains an integration point: the panel can display Git events emitted
by Pi, but publishing a repository or enforcing organization policy belongs to your backend.

## Checking your events against the UI

Before you have a backend, keep `replay`/`mock` and add `?devtools=1` to reveal the fixture
picker. It walks every state the components can draw — reasoning, tool call and result, approval, error, retry,
exhausted/terminal incidents, interrupts, artifacts, capability states. Use it as the
reference for what your `toStandardEvents` should produce: if a state renders under
`replay` but not under `sse`, the difference is in your translation.

The admission layer (`src/runtime/eventNormalizer.ts`, `eventContract.ts`,
`admissionReport.ts`) travels with the export for the same reason. It narrows a vendor
stream to what these components can render, and says so out loud when it cannot — check its
report before assuming an event was dropped silently.

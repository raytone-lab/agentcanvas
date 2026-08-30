# The built-in Pi runtime

AgentCanvas embeds [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) as a
local agent runtime. It is what makes the composed surfaces — reasoning, tool cards, approvals,
artifacts — fill with real work rather than replayed fixtures, in the configurator *and* in an
exported package, without the recipient writing an adapter.

This page is the detail behind the summary in
[CONNECTING_AI.md](CONNECTING_AI.md#pi-is-built-in-to-both-the-editor-and-the-export): what Pi
provides, where it runs, which events it produces, and where its boundaries are. Read it before
promising Pi to anyone.

## Why a runtime and not just a model key

A model API answers messages. It does not read files, run commands or write diffs. Everything
interesting you can compose in AgentCanvas — the tool-call lifecycle, the approval prompt, the
artifact panel — describes *work*, and work needs something running an agent loop with real
tools. A browser tab cannot be that thing.

Pi is that thing, shipped in the box. Give an export a key and nothing else, and the agent
surfaces sit empty; give it Pi and they fill.

## How it is wired

Four files, all of which travel with an export (`src/pi/**` is part of the export closure):

| file | runs where | job |
| --- | --- | --- |
| `src/pi/piVitePlugin.ts` | Vite (Node) | Mounts the host on `dev` and `preview` |
| `src/pi/piHost.ts` | Node | Owns Pi sessions, registers tools, gates approvals |
| `src/pi/piClient.ts` | browser | Same-origin client; never imports the SDK |
| `src/harness/adapters/piAdapter.ts` | either | Translates Pi's wire events to AgentUX events |

The browser bundle never contains the Pi SDK or a credential. The browser talks to
`/__agentcanvas/pi/*` on its own origin; the Node side holds the SDK and the key.

```
composer submit
  -> POST /__agentcanvas/pi/prompt        (browser, same origin)
  -> piHost: Pi session runs the loop     (Node)
  -> piAdapter: Pi wire events -> AgentUX canonical events
  -> NDJSON back to the browser, one event at a time
  -> replayAgentUXEvents -> view model -> the components you composed
```

## What Pi gives you

**Seven real tools**, registered per working directory (`piHost.ts`): `read`, `bash`, `edit`,
`write`, `grep`, `find`, `ls`. They are announced once per conversation as
`capability.attached` events, so `CapabilityTray` shows what the session can actually do
instead of an empty state.

**Approval gating**, in three modes matching the composer's permission control:

| mode | behaviour |
| --- | --- |
| `request` | Ask before any mutating tool (`write`, `edit`, `bash`, …) |
| `auto` | Ask only for a `bash` command judged risky |
| `allow-all` | Run without asking |

A gated call emits `tool.call.awaiting_approval` and blocks until the browser POSTs a decision
to `/__agentcanvas/pi/approval`.

**One in-memory session per conversation.** Browser conversation IDs map to a bounded map of Pi
sessions, so two conversations do not share history and starting a new one does not disturb the
other. Nothing is written to disk; a page reload starts over. This is deliberate — an exported
package should not silently accumulate transcripts of someone's work.

## Event coverage

Pi's translator is hand-written rather than table-driven, so it reaches surfaces the vendor
mapping tables cannot. It emits 23 of the 26 canonical AgentUX event types:

- run lifecycle: `run.started`, `run.finished`, `run.error`
- text: `text.started/delta/finished`, for the user's turn as well as the model's
- reasoning: `reasoning.status`, `reasoning.delta`, `reasoning.finished`
- tools: `started`, `args.delta`, `running`, `progress`, `awaiting_approval`, `result`,
  `error`, `finished`
- artifacts: `artifact.created/delta/finished`
- steps: `step.started/finished`
- capabilities: `capability.attached`

Deliberately absent, with reasons:

- `reasoning.summary` — `reasoning.delta` already displays under every non-`status` disclosure
  policy, so a summary event would be a second copy of the same text.
- `reasoning.private` — the raw/hidden split exists for backends that distinguish them. Pi does
  not; its thinking text is carried as `reasoning.delta` and whether it reaches the screen is
  decided by `reasoning.show`, exactly as for every other adapter.
- `run.awaiting_input` — `tool.call.awaiting_approval` already moves the run status to
  `awaiting_input` in the render core, so emitting both would be redundant.

For comparison, a harness onboarded through a mapping table (`codex`, `claude`, `opencode`) is
limited to the nine concepts in `MappedKind`, which cannot express approvals, progress,
argument streaming, plan steps or capabilities at all. That gap is a property of the table
format, not of those integrations being unfinished.

## Two things that will bite you

**1. Pi needs a Node process. A static build has none.**

`piRuntimePlugin` mounts in `configureServer` and `configurePreviewServer` only. So in an
exported package:

| how you run it | Pi |
| --- | --- |
| `npm run dev` | works |
| `npm run preview` | works |
| `npm run build` + static host (Vercel static, nginx, Pages) | **404s** — no Node side |

This is not an oversight. Mounting Pi in the client bundle would mean shipping the SDK and a
credential to the browser. A real deployment needs a Node server that mounts the same
middleware.

**2. Credentials never enter the project.**

A session key lives in browser memory and is POSTed to the same-origin host. It is not written
into `exported-project.ts`, the ZIP, or the bundle — `createScaffoldExportSnapshot` sanitizes
every provider before serializing, and a regression test injects a sentinel secret to prove it.
The field for an *environment variable name* accepts only names shaped like `OPENAI_API_KEY`;
pasting an actual key there is redirected to the password-style session-key field instead of
being stored.

## Which models

Any provider the configurator can describe, on two protocols:

- `openai-compatible` — OpenAI, Gemini, OpenRouter, DeepSeek, Z.ai, MoonShot, local models,
  or any custom endpoint. A third-party proxy is just a custom provider with its own base URL.
- `anthropic` — the Messages API.

The editor's provider/model selection exports as the initial allowed configuration; the
recipient switches among those from the composer.

## Verifying a change to this path

Rendering assertions, not event assertions, are what catch the failures that reach a screen.
Three suites carry the weight:

- `src/harness/adapters/vendorParity.test.tsx` — one conversation expressed in five backends
  (codex, claude-code, opencode, anthropic, **pi**), asserted on rendered markup: same
  component composition, **same surface order**, a designed card for every tool, and the
  approval question in the reader's language.
- The same file's "renders a streamed turn exactly like a replayed one" — feeding events one at
  a time through `appendPiConversationEvents` must produce byte-identical markup to replaying
  them at once. This is what makes live streaming safe to coalesce.
- `src/pi/piHost.test.ts` — conversation isolation against the real Pi SDK, with no model
  request.

Two lessons from real runs are worth keeping in mind when editing `piAdapter.ts`:

**An adapter has no locale, so it must not author prose.** It once built
`"Allow Pi to run bash?"` itself, which put an English sentence in the middle of a Chinese
screen. Emit the *fact* (which tool, which arguments); the components ask the question from
their dictionary.

**A real Pi stream identifies a tool call late.** The argument deltas arrive before the call has
an id or a name. Minting a placeholder to attach them to produced a second, un-designed card
that never resolved. Arguments are therefore buffered until identity is known — synthetic test
data that includes an id up front will not reproduce this, which is why the parity suite is fed
a stream shaped like a real one.

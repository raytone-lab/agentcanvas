# Ephemeral Pi Conversations Design

## Product contract

The editor and generated agent are temporary, real-runtime experiences. A user can enter a real
provider key, select Pi Agent, and exercise the assembled interface against a real model. No
account, database, or cloud persistence is required: conversations and credentials exist only for
the current page lifecycle and disappear after refresh.

The assembled component set remains the source of truth for presentation. Pi supplies runtime
events; AgentUX normalizes those events; the same selected components render the normalized stream
in both the editor and the generated project. Pi must not introduce a parallel chat UI.

## Conversation model

- The browser creates an opaque conversation ID and keeps a bounded list of temporary
  conversations in React memory.
- Sending another message appends a turn to the active conversation. It never clears the existing
  transcript or creates a sidebar row.
- `New conversation` creates and activates a new temporary conversation.
- Selecting a sidebar row restores that conversation's events and continues its existing Pi
  session.
- Refresh creates a new browser lifecycle and therefore an empty conversation list.
- The host keeps a bounded in-memory map from browser conversation IDs to Pi sessions. Pi's own
  session manager is explicitly in-memory, so no JSONL conversation history is written to disk.

## Event-stream contract

Each submitted user message is emitted as canonical AgentUX `text.started`, `text.delta`, and
`text.finished` events before Pi assistant/tool events. Events from successive Pi runs retain their
run IDs but are resequenced monotonically when appended to a conversation, because the renderer
orders its combined timeline by sequence number.

The UI renders only this canonical stream. Pi mode does not synthesize user bubbles from a separate
prompt-history array. This keeps text, reasoning state, tool calls, approvals, artifacts, Git output,
errors, and loading state in one deterministic projection.

Raw Pi thinking text is not exposed. Thinking boundaries map to reasoning status, while safe
summaries may be rendered only when Pi provides a separate summary signal. This preserves the
existing AgentUX disclosure contract.

## Editor/export parity

The generated React project uses the same temporary-conversation helper, conversation IDs, Pi
client calls, AgentUX events, and selected slot renderer as the editor. Provider/model configuration
is sent for the active conversation before a run. A generated project therefore reproduces the
configured UI against real Pi events without requiring AgentCanvas accounts or storage.

## Failure behavior

Configuration, connection, and model errors are appended to the active conversation as canonical
run errors and remain visible until the page is refreshed or the user starts/selects another
conversation. A failed turn does not erase earlier successful turns. Only one run may be active in
the visible UI; abort applies to that active conversation.

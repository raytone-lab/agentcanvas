# Export UI Parity and Devtools Design

## Product contract

The exported scaffold is the configured product, not a diagnostic rendering of it. Every
component and behavior selected in AgentCanvas must remain present in the package even when
its runtime data is empty. Data controls content; exported configuration controls structure.

For the session sidebar this means `sidebar.search` alone controls whether the search affordance
exists. An empty session adapter produces an empty result set, not a missing selected control.
Conversation rows still require real prompts supplied by the host, so the scaffold does not
invent history to make the search look populated.

## Development fixtures

Bundled fixture streams remain valuable for checking reasoning, tools, approvals, errors and
artifacts before a backend is connected. Their picker is developer tooling, not composed UI.
It therefore stays hidden during the normal `npm run dev` first run and appears only when the
URL explicitly includes `?devtools=1`. Automation and direct inspection may continue using
`?stream=<id>` without displaying any controls. Production builds never show the picker.

This preserves both needs: recipients see the product they configured, while developers retain
an intentional route to every fixture state. Regression tests pin the search affordance to the
exported config, verify no fake history is introduced, and require explicit devtools opt-in.

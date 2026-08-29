# Export Session Affordance Design

## Decision

An exported scaffold must not render fabricated conversation history when it has no real
session data source. Separately, a UI affordance explicitly selected in AgentCanvas must not
disappear merely because its data set is currently empty. The configurator may continue
showing localized sample sessions because it supplies both sample prompts and a handler.

## Component contract

`SessionSidebar` receives session prompts explicitly. An omitted or empty list, or a missing
selection handler, means that grouped history navigation is not rendered. The search trigger
is controlled only by `project.sidebar.search`: when selected it remains visible and opens the
real search surface, which is simply empty until the host supplies sessions. `New chat`,
collapse, and the footer remain available because they also have independent behavior.

The slot render context carries the same explicit session prompt list. `App.tsx` supplies the
localized preview prompts. The generated export shell supplies an empty list until a real
session adapter is connected. This keeps the reusable component free from assumptions about
whether it runs inside the configurator or a shipped agent.

## Safety and regression coverage

The change is intentionally narrow: it does not invent a mapping between fake titles and
unrelated replay streams, and it does not expose fixture data as product history. Component
tests verify that absent session data produces no clickable history while preserving the
selected search affordance, and that explicit session data still calls the selection handler.
The export contract verifies that the generated shell explicitly provides an empty list while
the selected component remains present.

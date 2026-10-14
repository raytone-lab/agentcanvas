import { providerCatalog, type AgentCanvasTemplate, type AgentFrontendProject } from "./agentuxConfig";
import {
  atlasThemePresetIds,
  gameThemePresetIds,
  minimalThemePresetIds,
  nativeThemePresetIds,
  pixelThemePresetIds,
  pixeldeskThemePresetIds,
  retroThemePresetIds,
  handdrawnThemePresetIds,
  inkwashThemePresetIds,
  studioThemePresetIds,
  themeTokens,
  workbuddyThemePresetIds,
  zineThemePresetIds,
  type ThemePresetId,
} from "../theme/themeTokens";

export type PresetGroupId =
  | "conversation"
  | "media-generation"
  | "sidebar"
  | "ux-effects"
  | "thinking-done"
  | "approval"
  | "tool-calls"
  | "blocks"
  | "composer"
  | "provider"
  | "output"
  | "delivery"
  | "interrupt"
  | "theme"
  | "git";

export type PresetOption = {
  id: string;
  label: string;
  description: string;
  section?: string;
  /** Theme cards only: the style whose palette this belongs to. */
  themeStyle?: string;
  /**
   * Named in the configurator but not built yet: the card renders dimmed and
   * inert with a "pending" badge instead of being left out.
   *
   * Absence is not legible. A reader who cannot find the choice-card modal
   * cannot tell whether they are looking in the wrong group or whether it does
   * not exist — so an unbuilt component that the product intends to have is
   * more useful on screen, marked, than missing. `isPresetOptionActive` already
   * answers false for any id without a preset action, so these never count as
   * selected and never reach `applyPresetOption`.
   */
  pending?: boolean;
};

export type PresetGroup = {
  id: PresetGroupId;
  label: string;
  options: PresetOption[];
};

const themeDirections: Record<ThemePresetId, string> = {
  "warm-graphite": "Dark graphite with amber warmth.",
  "cocoa-system": "Deep cocoa with rose-copper accents.",
  "forest-ember": "Deep green-black with warm gold.",
  "soft-glass": "Soft gray glass with deep navy.",
  "sand-workspace": "Warm white workspace with clay orange.",
  "apricot-agent": "Clean orange workspace with tangerine accents.",
  "cold-mono": "Cold black-and-white gray.",
  "slate-blue": "Cool blue console palette.",
  "cyan-grid": "Dark cyan-black technical palette.",
  "ice-white": "Cold white with ice blue.",
  "mist-blue": "Soft lavender surface with violet accent.",
  "polar-mono": "Very cold white-gray surface with deep navy accent.",
  "wb-light": "White canvas, neutral grays, near-black action.",
  "wb-dark": "Indigo-tinted panels on near-black canvas.",
  "swiss-international": "Pure white, one signal red, grotesque type.",
  "editorial-press": "Newsprint cream and ink black with vermilion, in serif.",
  "clay-pastel": "Pastel lavender and peach with rounded type.",
  "marble-gold": "Off-white stone with antique gold, in serif.",
  "wabi-sabi": "Muted warm greige with moss green.",
  "dev-terminal": "Phosphor green on near-black, mono throughout.",
  "scifi-hud": "Deep instrument navy with a cyan trace.",
  "oled-black": "True black with pure white action.",
  "arcade-crt": "Cabinet black under magenta and cyan neon.",
  "brutalist-concrete": "Raw concrete gray with safety yellow, in mono.",
  "studio-grape": "Violet columns on near-white, yellow chips, pure black outlines.",
  "zine-butter": "Kraft board, torn cream paper, tape accent, fibre texture.",
  "game-campfire": "Warm near-black lit by one gold, serif titles, parchment turns.",
  "pixel-slate": "Cool slate with phosphor green, monospace throughout, zero radius.",
  "studio-citrus": "White canvas, yellow columns, magenta chips at full brightness.",
  "studio-cobalt": "Cool blue columns with orange chips.",
  "studio-ink": "Near-black canvas with the outlines flipped to white.",
  "game-moonlit": "The same hall lit cold: blue-black with silver ornament.",
  "game-scriptorium": "Parchment board, brown ink ornament, rubric red.",
  "game-emberfall": "Deep red-black with copper ornament.",
  "pixel-gameboy": "The DMG's four olive tones, nothing else.",
  "pixel-amber": "Monochrome amber tube on near-black.",
  "pixel-overworld": "Overworld: warm cream ramp, black outlines, coin gold, pipe green.",
  "retro-paper": "Warm ivory paper, ink serif, fine grid and muted blue file states.",
  "ink-rice": "Unbleached rice paper, blue-black ink, one cinnabar seal.",
  "ink-mist": "A cooler sheet, as if the mountains had not cleared yet.",
  "ink-tea": "Paper steeped in tea: warmer pulp, browner ink.",
  "ink-night": "A stone rubbing — slate where the paper was, pale wash where the ink was.",
  "tech-glacier": "Ice behind a glass sheet, one bright blue.",
  "tech-steel": "Steel greys with the avatar shell's deep blue.",
  "tech-paper": "White sheet, #F6F6F6 rail, one black accent.",
  "tech-deep": "Navy screen, LED-white ink, a cyan status light.",
  "retro-linen": "A cooler, greyer stock — the same press, a different ream.",
  "retro-sepia": "Older paper, warmed through, with brown-black ink.",
  "retro-dusk": "Blue-grey paper and near-black ink: the darkest this style's fixed artwork takes.",
  "sketch-paper": "Cream paper, black ink outlines and one pale blue wash.",
  "sketch-grid": "A cooler sheet with biro-blue ink.",
  "sketch-kraft": "Brown pad, sepia ink, warm as a parcel.",
  "sketch-slate": "A blackboard: chalk lines on slate, the ink inverted.",
  "desk-bluegrey": "Blue-grey chrome, warm white document, navy ink.",
  "desk-steel": "Cooler grey chrome for the same desk.",
  "desk-parchment": "Beige-box era: warm chrome, brown ink.",
  "desk-night": "Night shift — pale ink on dark chrome.",
};

// Every style's schemes live in one section under a single header; the rail
// tags each card with the style that owns it (`data-theme-style`) and CSS shows
// only the active style's. Adding a style is an entry here plus its id list —
// no new CSS, which is what the old hardcoded hide-lists cost.
const themeOptions = [
  ...nativeThemePresetIds.map((id) => [id, "native"] as const),
  // The atlas schemes ride with Native rather than getting a style of their
  // own: `PresetStyleId` is a closed union of four, each with its own component
  // CSS, and "studio" is still a placeholder — so a fifth would be a style with
  // no rules behind it. Native is also the style the editor opens in, which
  // makes these reachable without a style switch first. Moving them is one line
  // here if they turn out to belong with Minimal's cooler geometry.
  ...atlasThemePresetIds.map((id) => [id, "native"] as const),
  ...minimalThemePresetIds.map((id) => [id, "illustrated"] as const),
  ...studioThemePresetIds.map((id) => [id, "studio"] as const),
  ...zineThemePresetIds.map((id) => [id, "zine"] as const),
  ...gameThemePresetIds.map((id) => [id, "game"] as const),
  ...pixelThemePresetIds.map((id) => [id, "pixel"] as const),
  ...pixeldeskThemePresetIds.map((id) => [id, "pixeldesk"] as const),
  ...inkwashThemePresetIds.map((id) => [id, "inkwash"] as const),
  ...retroThemePresetIds.map((id) => [id, "retro"] as const),
  ...handdrawnThemePresetIds.map((id) => [id, "handdrawn"] as const),
  ...workbuddyThemePresetIds.map((id) => [id, "workbuddy"] as const),
].map(([id, style]) => ({
  id,
  label: themeTokens[id].name,
  description: themeDirections[id],
  section: "Scaffold theme",
  themeStyle: style,
}));

/**
 * Group order is the left rail's order, which is two axes in sequence:
 * Structure (what the screen is when idle) then Event flow (what appears, in
 * turn order, once a run starts), then Appearance and Integration.
 *
 * Groups are the rail's icons; the sections inside them are the individual
 * components. That two-level split is why there are ~13 groups and not one per
 * component — a 68px rail seats about ten tiles.
 */
export const presetGroups: PresetGroup[] = [
  // ---- Structure ----------------------------------------------------------
  {
    id: "sidebar",
    label: "Left nav",
    options: [
      { id: "sidebar-visible", label: "Show sidebar", description: "Show the conversation-history sidebar in the product shell.", section: "Layout" },
      // Top to bottom, as the column reads. The title, the collapse control and
      // the conversation rows are options like the rest: they used to come with
      // the component, which put three unasked-for things on the canvas the
      // moment anything else in the column was picked.
      { id: "sidebar-title", label: "Title", description: "Show the project name at the top of the sidebar.", section: "Content" },
      { id: "sidebar-collapse", label: "Collapse control", description: "Show the control that collapses the sidebar.", section: "Content" },
      { id: "sidebar-new-button", label: "New chat", description: "Show the new-chat action at the top of the sidebar.", section: "Content" },
      { id: "sidebar-search", label: "Search", description: "Show a search field for filtering conversations.", section: "Content" },
      { id: "sidebar-sessions", label: "Conversation list", description: "Show the list of recent conversations.", section: "Content" },
      { id: "sidebar-row-icon", label: "Row marks", description: "Put an icon in front of every conversation in the list.", section: "Content" },
      { id: "sidebar-grouping", label: "Date groups", description: "Group sessions under Today and Earlier headers.", section: "Content" },
      { id: "sidebar-footer", label: "Version", description: "Show the current version at the bottom of the sidebar.", section: "Content" },
      { id: "workspace-switcher", label: "Workspace switcher", description: "Switch between workspaces from the sidebar.", section: "Content", pending: true },
    ],
  },
  {
    id: "conversation",
    label: "Chat area",
    options: [
      // Presence first, then what goes inside it. Without this the group could
      // only restyle a conversation that nothing was able to turn on: every
      // slot now starts disabled, and `ChatFrame` had no toggle at all, so the
      // centre column could never be filled.
      { id: "chat-visible", label: "Show conversation", description: "Show the conversation flow in the centre column.", section: "Layout" },
      { id: "speaker-labels", label: "Speaker labels", description: "Show YOU and AGENT labels on chat turns.", section: "Message chrome" },
      { id: "message-actions", label: "Message actions", description: "Expose role-specific copy, regenerate, and edit-rerun controls at message level.", section: "Recovery" },
    ],
  },
  {
    id: "composer",
    label: "Composer",
    options: [
      { id: "composer-visible", label: "Show composer", description: "Show the input field under the conversation.", section: "Layout" },
      { id: "upload", label: "Upload", description: "Expose file attachment for repo context, logs, and screenshots.", section: "Features" },
      { id: "mic", label: "Mic", description: "Add an optional voice input affordance without changing text flow.", section: "Features" },
      { id: "budget", label: "Thinking budget", description: "Keep reasoning budget visible for high-variance coding runs.", section: "Features" },
      { id: "model-config", label: "Model config", description: "Show the model selector in the composer toolbar.", section: "Features" },
      { id: "exec-progress", label: "Execution progress", description: "Dock the run's overall progress above the composer.", section: "Run status" },
      { id: "task-list", label: "Task list", description: "List the run's steps above the composer, foldable.", section: "Run status" },
      { id: "prompt-shortcuts", label: "Prompt chips", description: "Offer reusable prompts without turning the composer into a library.", section: "Shortcuts" },
      { id: "mention-picker", label: "@ mentions", description: "Typing @ opens a picker for files and connectors.", section: "Shortcuts", pending: true },
      { id: "slash-command-palette", label: "/ commands", description: "Typing / opens a palette of skills and commands.", section: "Shortcuts", pending: true },
    ],
  },
  {
    id: "output",
    label: "Right panel",
    options: [
      { id: "output-visible", label: "Show output panel", description: "Show the output/artifact panel in the product shell.", section: "Layout" },
      { id: "workspace-files", label: "Workspace files", description: "Show the files the run touched in the right panel.", section: "Panel content" },
    ],
  },
  // ---- Event flow, in turn order ------------------------------------------
  {
    id: "ux-effects",
    label: "Thinking",
    options: [
      { id: "thinking-wave", label: "Dots", description: "Animated thinking dots in the chat flow.", section: "Motion" },
      { id: "thinking-pulse", label: "Infinity trail", description: "An infinity-path motion for active reasoning.", section: "Motion" },
      { id: "thinking-shimmer", label: "Shimmer text", description: "A light sweep across the Thinking text.", section: "Motion" },
      { id: "thinking-orbit", label: "Orbit dot", description: "A compact dot orbit inspired by ring loaders.", section: "Motion" },
      { id: "thinking-orb-s1", label: "Lattice wave", description: "A 3 by 3 lattice that radiates from the center.", section: "Motion" },
      { id: "thinking-orb-b5", label: "Focus handoff", description: "Layered dots crossing the focal plane in a soft handoff.", section: "Motion" },
      { id: "thinking-orb-m2", label: "Expanding ring", description: "Eight dots expanding and collapsing through a rotating ring.", section: "Motion" },
      // Appended, not inserted: `styleKitOptionIds` takes the Nth option of
      // each exclusive section, so a new entry earlier in the list would
      // change what every style opens with.
      /* The id says hourglass and the drawing is a cogwheel, which is
         deliberate: the id is persisted in saved projects and in every export,
         and renaming it would be a migration for a picture change. The Game
         style now draws this as its painted cog turning — the hourglass SVG is
         still the fallback for any other surface that asks for this motion. */
      { id: "thinking-hourglass", label: "Turning cog", description: "The painted cogwheel turns while the span is open.", section: "Motion" },
      /*
       * The per-style motions, appended for the same reason the hourglass was:
       * the kit takes the Nth option of an exclusive section, so inserting
       * earlier would change what every style opens with.
       *
       * Each is offered only in the style it was drawn for — see
       * `STYLE_MOTION_OPTIONS`. Listed here in one place because this is the
       * schema, and the schema is not per style.
       */
      { id: "thinking-comic-halftone", label: "Halftone swell", description: "Four halftone dots swelling left to right, the way a comic fills a panel.", section: "Motion" },
      { id: "thinking-comic-inkblot", label: "Ink blot", description: "One heavy ink blot beating against its own outline.", section: "Motion" },
      { id: "thinking-comic-bubble", label: "Speech balloon", description: "A balloon whose three dots fill in turn, before anyone speaks.", section: "Motion" },
      { id: "thinking-comic-flip", label: "Flip panel", description: "A square turning a quarter at a time, showing its filled face.", section: "Motion" },
      { id: "thinking-quest-torch", label: "Torch", description: "A flame that leans and recovers, with a core that lags behind it.", section: "Motion" },
      { id: "thinking-quest-rune", label: "Rune circle", description: "Eight ticks on a ring, lighting one at a time as the circle is read.", section: "Motion" },
      { id: "thinking-quest-coins", label: "Coin stack", description: "Coins dropping onto a pile that settles under each one.", section: "Motion" },
      { id: "thinking-pixel-cursor", label: "Block cursor", description: "A block cursor blinking on the grid, on and off with no fade.", section: "Motion" },
      { id: "thinking-pixel-bars", label: "Loading bars", description: "Three bars filling cell by cell, then starting over.", section: "Motion" },
      { id: "thinking-pixel-spin", label: "Cell spin", description: "Four cells lighting round a square, one whole cell per step.", section: "Motion" },
      { id: "thinking-pixel-bricks", label: "Brick fill", description: "Five bricks laying themselves left to right.", section: "Motion" },
      { id: "thinking-sketch-bubble", label: "Thought balloon", description: "A drawn balloon whose three dots fill in turn.", section: "Motion" },
      { id: "thinking-sketch-pencil", label: "Pencil stroke", description: "A pencil drawing one line across, over and over.", section: "Motion" },
      { id: "thinking-sketch-blot", label: "Ink blot", description: "A blot of ink spreading into the paper.", section: "Motion" },
      { id: "thinking-sketch-page", label: "Page turn", description: "A page corner lifting and falling back.", section: "Motion" },
      { id: "thinking-tech-matrix", label: "LED matrix", description: "A 3×3 LED matrix lighting cell by cell, like the avatar's face.", section: "Motion" },
      { id: "thinking-tech-signal", label: "Signal bars", description: "Four bars rising and falling like a signal meter.", section: "Motion" },
      { id: "thinking-tech-scan", label: "Scan line", description: "A short cursor sweeping a hairline baseline, back and forth.", section: "Motion" },
      { id: "thinking-tech-segments", label: "Segment load", description: "Four segments filling in turn, then clearing — the progress rail's language.", section: "Motion" },
      { id: "thinking-ink-drop", label: "Ink drop", description: "A drop of ink spreading into the paper, then the next one.", section: "Motion" },
      { id: "thinking-ink-stroke", label: "Brush stroke", description: "One brush stroke written across and left to dry.", section: "Motion" },
      { id: "thinking-ink-ripple", label: "Ripple", description: "Ink rings spreading outward, as on water in a landscape.", section: "Motion" },
      { id: "thinking-ink-seal", label: "Seal", description: "A cinnabar seal pressed down, with a little give.", section: "Motion" },
      { id: "thinking-retro-watch", label: "Pocket watch", description: "A watch hand stepping round its dial, one mark at a time.", section: "Motion" },
      { id: "thinking-retro-record", label: "Record", description: "A grooved record turning, its label and one glint going round.", section: "Motion" },
      { id: "thinking-retro-metronome", label: "Metronome", description: "A metronome arm swinging over its base, weight and all.", section: "Motion" },
      { id: "thinking-retro-telegraph", label: "Telegraph tape", description: "Morse marks — dash, dot, dash, dot — punched along a tape.", section: "Motion" },
      /*
       * How the block behaves once the span closes, and how its text arrives.
       *
       * These configure the same component and the reader configures it once,
       * so they sit with the motions rather than in a group of their own —
       * 思考中 needs the fold, the title and the writing rhythm as much as the
       * closed state does. 思考完成 keeps its place in the flow as a
       * placeholder for what is specific to the settled block.
       */
      { id: "reasoning-auto-collapse", label: "Auto collapse", description: "Keep reasoning compact after the run while preserving expansion controls.", section: "Disclosure" },
      { id: "reasoning-expanded", label: "Expanded by default", description: "Open the reasoning block when the workflow benefits from inspection.", section: "Disclosure" },
      { id: "summary-first", label: "Summary before details", description: "Show a safe public reasoning summary before tool and code details. This is not raw chain-of-thought.", section: "Disclosure" },
      // The first of a set: one presentation for the closed block, with room
      // for more. It names the wait it replaced rather than the activity that
      // is over — 已思考（用时 11 秒）, not 思考中.
      // `reasoning-done-timed` was here, as the lone "Done style" card. It has
      // moved to the 思考完成 group, where the rest of the settled-block axes
      // now live — and it no longer carries the left rule with it, which is its
      // own option there.
      { id: "thinking-bars", label: "Text cycle", description: "No glyph: the status text itself cycles through the stages of the wait.", section: "Done style" },
      /*
       * Moved out of Motion, which is now glyphs only.
       *
       * Its own description gives the reason: "no glyph — the status text
       * itself cycles". It was the one entry in a list of indicators that was
       * not an indicator, so Motion answers "which mark shows the wait" and
       * this answers "what the block does instead", which is the question Done
       * style asks.
       *
       * It still writes `theme.motion.reasoning`, the same field the glyphs
       * write, so picking it replaces whichever glyph was set — which is the
       * intended meaning of choosing it. That overlap is also why it is in
       * `KIT_EXCLUDED_OPTION_IDS`: see styleKit.ts.
       */
      // How the reasoning text arrives. The answer's own rhythm is in Delivery;
      // this is the same choice for the thinking, which had none.
      { id: "reasoning-writing-smooth", label: "Smooth stream", description: "Fade the reasoning in as one steady stream.", section: "Text loading" },
      { id: "reasoning-writing-typewriter", label: "Typewriter", description: "Write the reasoning out character by character.", section: "Text loading" },
      { id: "reasoning-writing-chunked", label: "Chunked", description: "Reveal the reasoning in readable phrase chunks.", section: "Text loading" },
      { id: "reasoning-status-only", label: "Status only", description: "Show only the current reasoning state for the lowest-noise scaffold.", section: "Visibility" },
      { id: "reasoning-public-summary", label: "Public summary", description: "Show developer-safe summary text without exposing hidden reasoning.", section: "Visibility" },
      { id: "reasoning-model-thinking", label: "Model's own thinking", description: "Show the reasoning the model actually streamed, for providers that send it.", section: "Visibility" },
      { id: "plan-card", label: "Plan card", description: "In plan mode, list the steps for the reader to confirm or amend before the run starts.", section: "Plan mode", pending: true },
    ],
  },
  {
    /*
     * The same block after the span has closed, held open as a placeholder.
     *
     * Everything it used to carry — the fold, the title, the writing rhythm —
     * turned out to belong to the component as a whole rather than to its
     * settled state, so it all moved to 思考中 and the reader configures the
     * block in one place. The stage keeps its place in the flow because the
     * protocol has it (`REASONING_END` is its own event) and there is work
     * specific to it still to design: the summary row, the kept history, the
     * per-段 timing.
     */
    id: "thinking-done",
    label: "Thought process",
    options: [
      /*
       * Three axes, which is what this group was missing — it held one dimmed
       * card and nothing else, and the schema comment on `doneStyle` said as
       * much ("more to come; this is the first of the set").
       *
       * `reasoning-done-summary-row` was that dimmed card. It is gone rather
       * than built: an extra line summarising the block is the same information
       * the *title* can carry, and "Conclusion" below does it without spending
       * a second row on it.
       */
      // What the closed title says. Single-select: one title.
      { id: "reasoning-done-label", label: "Plain label", description: "Title the settled block with a word — 已思考 — and nothing about the wait.", section: "Done title" },
      { id: "reasoning-done-timed", label: "Thought for N seconds", description: "Name the wait the title replaced: 已思考（用时 11 秒）.", section: "Done title" },
      { id: "reasoning-done-counted", label: "Segment count", description: "Count the passes instead of the seconds: 已思考 · 3 段. How much it considered, rather than how long it took.", section: "Done title" },
      { id: "reasoning-done-conclusion", label: "Conclusion", description: "Make the title the conclusion itself, so the block can be read without opening it.", section: "Done title" },

      // What is left on screen. Single-select.
      { id: "reasoning-done-expandable", label: "Keep, foldable", description: "The thinking stays, behind the chevron.", section: "Settled body" },
      { id: "reasoning-done-title-only", label: "Title only", description: "Drop the thinking once the span closes; the title is all that remains.", section: "Settled body" },
      { id: "reasoning-done-first-line", label: "Peek one line", description: "Leave the first line showing, faded, so the gist reads without a click.", section: "Settled body" },

      // Additive.
      { id: "reasoning-done-rule", label: "Left rule", description: "Rule the settled thinking off down its left edge, marking it as quoted rather than said.", section: "Settled body" },
    ],
  },
  {
    // The decision point: the run is blocked and the reader has to answer.
    // Sits between Thinking and Tool calls because that is where it interrupts.
    id: "approval",
    label: "Approval",
    options: [
      { id: "model-tools", label: "Ask approval", description: "Show the composer approval affordance beside model selection.", section: "Tool approval" },
      { id: "tool-approval-inline", label: "Inline approval", description: "Ask above the composer with a compact numbered prompt: Yes, Always, No, or type an answer.", section: "Tool approval" },
      { id: "tool-approval-hidden", label: "External approval", description: "Ask above the composer with a full permission card that also shows the tool's arguments.", section: "Tool approval" },
      { id: "choice-card-modal", label: "Choice cards", description: "Blocking modal with 2-4 options, a recommended default, and a free-text escape hatch.", section: "Decision point", pending: true },
      { id: "sandbox-permission", label: "Sandbox permission", description: "Blocking confirm for a command, showing the command text and its risk level.", section: "Decision point", pending: true },
      { id: "hook-intercept-banner", label: "Hook intercept", description: "Non-blocking banner when a submit hook rejects the message.", section: "Decision point", pending: true },
    ],
  },
  {
    id: "tool-calls",
    label: "Tool calls",
    options: [
      { id: "command-cards", label: "Collapsed cards", description: "Show tool calls as collapsed rows with an expand control for inspecting details.", section: "Tool display" },
      { id: "compact-chips", label: "Expanded rows", description: "Show tool calls expanded by default without a disclosure button.", section: "Tool display" },
      { id: "timeline-rail", label: "Timeline detail", description: "Show expanded tool calls with a 1px timeline rail on the left.", section: "Tool display" },
      { id: "tool-detail-full", label: "Input and output", description: "Show safe tool arguments and visible results inside expanded tools.", section: "Details" },
      { id: "tool-detail-output-only", label: "Output only", description: "Hide tool arguments and keep only the result surface visible.", section: "Details" },
      // Behavior shipped in presetActions but had no card in any group, so it
      // was unreachable from the UI.
      { id: "tool-progress-bar", label: "Progress bar", description: "Show step-of-total progress for a multi-step run above the composer.", section: "Progress" },
      { id: "subagent-card", label: "Sub-agent card", description: "A tool card variant for a delegated agent: its name, task, and status.", section: "Variants", pending: true },
      { id: "background-task-toast", label: "Background task", description: "Non-blocking notice when a backgrounded task finishes.", section: "Variants", pending: true },
    ],
  },
  {
    id: "blocks",
    label: "Outcomes",
    options: [
      { id: "error-collapse", label: "Error collapse", description: "Toggle user-safe error copy with debug detail kept out of the main chat.", section: "Failure states" },
      { id: "context-usage-meter", label: "Context meter", description: "Show context-window usage beside the composer and fold older messages at the limit.", section: "Limits", pending: true },
    ],
  },

  /**
   * Stopping a run and picking it back up. Named but unbuilt, like the other
   * placeholders: the list of event flows should be complete even where the
   * components are not, so a gap reads as "not yet" rather than "never
   * considered".
   */
  {
    id: "interrupt",
    label: "Interrupt",
    options: [
      { id: "stop-button", label: "Stop button", description: "Turn the send control into a stop control while a turn is running.", section: "Stopping", pending: true },
      { id: "stopped-state", label: "Stopped state", description: "Mark a turn the reader cut short, keeping whatever it had produced.", section: "Stopping", pending: true },
      { id: "retry-turn", label: "Retry turn", description: "Re-run the reader's last message from the turn that failed or was stopped.", section: "Picking it up", pending: true },
      { id: "resume-turn", label: "Resume", description: "Continue a stopped turn from where it left off instead of starting over.", section: "Picking it up", pending: true },
    ],
  },

  {
    id: "media-generation",
    label: "Generating",
    options: [
      { id: "media-image-grid", label: "Grid sweep", description: "Generated image loader with a stable grid and shimmer pass.", section: "Image loading" },
      { id: "media-image-blur", label: "Dot flicker", description: "Generated image loader with a tiled dot field that flickers irregularly while the image resolves.", section: "Image loading" },
      { id: "media-image-palette", label: "Blur flow", description: "Generated image loader with a soft blurred gradient that drifts while the image resolves.", section: "Image loading" },
      { id: "media-image-layers", label: "Glow loading", description: "Generated image loader with a soft full-surface glow animation.", section: "Image loading" },
      { id: "media-audio-skeleton", label: "Skeleton loading", description: "Audio loader with soft horizontal skeleton bars before revealing an audio player demo.", section: "Audio loading" },
      { id: "media-audio-waveform", label: "Audio wave", description: "Audio loader with animated waveform bars before revealing an audio player demo.", section: "Audio loading" },
      { id: "media-video-storyboard", label: "Grid sweep", description: "Video loader reusing the image grid-sweep style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-cinema", label: "Dot flicker", description: "Video loader reusing the image dot-flicker style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-timeline", label: "Blur flow", description: "Video loader reusing the image blur-flow style before revealing a video player demo.", section: "Video loading" },
      { id: "media-video-frames", label: "Glow loading", description: "Video loader reusing the image glow-loading style before revealing a video player demo.", section: "Video loading" },
    ],
  },
  {
    // Everything the agent hands back: how the text is written out, and what
    // the artifact turns into. The old `render` group lived here in spirit but
    // was filtered out of the rail, so its renderers were unreachable.
    id: "delivery",
    label: "Delivery",
    options: [
      { id: "writing-smooth", label: "Smooth stream", description: "Render assistant text as a steady stream without extra ceremony.", section: "Writing" },
      { id: "writing-typewriter", label: "Typewriter", description: "Use a measured character-by-character writing rhythm for focused chat.", section: "Writing" },
      { id: "writing-chunked", label: "Chunked", description: "Reveal output in readable phrase chunks for long-form answers.", section: "Writing" },
      { id: "output-source-artifact", label: "Latest artifact", description: "Use the newest AgentUX artifact as the output source.", section: "Source" },
      { id: "output-source-console", label: "Console logs", description: "Use run and tool output logs instead of artifact content.", section: "Source" },
      { id: "renderer-auto", label: "Auto renderer", description: "Pick code, diff, markdown, preview, or data from artifact metadata.", section: "Artifact renderer" },
      { id: "renderer-code", label: "Code", description: "Render code artifacts with copyable developer formatting.", section: "Artifact renderer" },
      { id: "renderer-diff", label: "Diff", description: "Render patch artifacts with stable gutters and change markers.", section: "Artifact renderer" },
      { id: "renderer-markdown", label: "Markdown", description: "Render markdown artifacts as structured document output.", section: "Artifact renderer" },
      { id: "renderer-preview", label: "HTML / app preview", description: "Render visual or document artifacts as a preview surface.", section: "Artifact renderer" },
      { id: "renderer-data", label: "Data / form", description: "Render structured data, forms, and JSON-backed artifacts.", section: "Artifact renderer" },
      { id: "code-block-actions", label: "Code block actions", description: "Copy, apply, and edit controls on a code block in the reply.", section: "In-reply", pending: true },
      { id: "inline-visualization", label: "Inline chart", description: "Render a chart or diagram as its own card in the reply. Mermaid and KaTeX already render inside markdown.", section: "In-reply", pending: true },
    ],
  },
  // ---- Appearance, then integration ---------------------------------------
  {
    id: "theme",
    label: "Theme",
    options: themeOptions,
  },
  {
    id: "provider",
    label: "Model",
    options: [
      {
        id: "provider-settings-launcher",
        label: "Settings gear",
        description: "Add a bottom-left provider settings launcher to the generated agent UI.",
        section: "Provider UI",
      },
      ...providerCatalog.map((provider) => ({
        id: `provider-${provider.id}`,
        label: provider.label,
        description: provider.description,
        section: provider.kind === "custom" ? "Custom provider" : provider.id === "local" ? "Local runtime" : "Hosted providers",
      })),
    ],
  },
  {
    id: "git",
    label: "Git",
    options: [
      { id: "git-visible", label: "Show Git panel", description: "Show the Git panel in the product shell.", section: "Layout" },
      { id: "branch-status", label: "Branch status", description: "Show current branch, dirty state, and ahead/behind summary.", section: "Review" },
      { id: "changed-files", label: "Changed files", description: "Show a compact file list with per-file change state.", section: "Review" },
      { id: "diff-preview", label: "Diff preview", description: "Keep a bounded inline diff in the utility panel.", section: "Review" },
      { id: "commit-message", label: "Commit message", description: "Suggest commit copy without changing action permissions.", section: "Commit" },
      { id: "commit-action", label: "Commit action", description: "Allow the scaffold UI to expose a commit command.", section: "Commit" },
    ],
  },
];

export function templateSupportsGit(template: AgentCanvasTemplate): boolean {
  return template === "coding" || template === "tool-heavy";
}

export function presetGroupsForTemplate(template: AgentCanvasTemplate): PresetGroup[] {
  return presetGroups.filter((group) => group.id !== "git" || templateSupportsGit(template));
}

export function presetGroupsForProject(project: AgentFrontendProject): PresetGroup[] {
  return presetGroupsForTemplate(project.template);
}

export function resolvePresetGroupSelection(
  selectedGroup: PresetGroupId,
  template: AgentCanvasTemplate,
): PresetGroupId {
  const visibleGroups = presetGroupsForTemplate(template);
  return visibleGroups.some((group) => group.id === selectedGroup) ? selectedGroup : (visibleGroups[0]?.id ?? "conversation");
}

export function projectPresetSummary(project: AgentFrontendProject): string[] {
  return [
    project.template,
    project.runtime.harness,
    project.providers.defaultProviderId,
    project.theme.motion.writing,
    project.theme.motion.reasoning,
    project.theme.motion.toolCall,
    project.output.source,
    project.output.artifactRenderer,
    project.output.surface,
    project.mediaGeneration.imageStyle,
    project.mediaGeneration.audioStyle,
    project.mediaGeneration.videoStyle,
    project.runtime.transport,
  ];
}

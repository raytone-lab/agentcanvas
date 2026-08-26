# Export Session Affordance Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Prevent exported scaffolds from displaying inert fabricated conversation history while preserving interactive sample sessions in the configurator preview.

**Architecture:** Make session prompts an explicit `SessionSidebar` and `SlotRenderContext` input. The configurator supplies localized preview prompts; the generated shell supplies an empty list until a real session store is integrated. Search and grouped history render only when prompts exist.

**Tech Stack:** React 19, TypeScript, Vitest, React DOM/jsdom, Vite.

---

### Task 1: Pin the component behavior

**Files:**
- Create: `src/components/agent-preview/SessionSidebar.test.tsx`
- Modify: `src/components/agent-preview/SessionSidebar.tsx`

**Step 1: Write the failing tests**

Add a jsdom test that renders the sidebar without `sessionPrompts` and asserts that no sample
history or search button appears. Add a second test with one explicit prompt and a spy handler;
click the row and assert that the handler receives the prompt.

**Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/components/agent-preview/SessionSidebar.test.tsx`

Expected: FAIL because `SessionSidebar` still reads fabricated prompts from localized copy.

**Step 3: Implement the minimal component contract**

Add `sessionPrompts?: readonly string[]`, default it to an empty list, and render search/history
only when the list is non-empty. Keep `New chat`, collapse, and footer behavior unchanged.

**Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/agent-preview/SessionSidebar.test.tsx`

Expected: PASS.

### Task 2: Thread the data through the slot registry

**Files:**
- Modify: `src/slots/slotRegistry.tsx`
- Modify: `src/App.tsx`

**Step 1: Add the typed context field**

Add `sessionPrompts?: readonly string[]` to `SlotRenderContext` and pass it to
`SessionSidebar` from the registry.

**Step 2: Preserve the configurator preview**

Set `sessionPrompts: copy.workspace.sessionSidebar.sessions` in the configurator's
`slotContext`, alongside its existing `onSelectSession` implementation.

**Step 3: Run targeted rendering tests**

Run: `npx vitest run src/slots/slotRegistry.test.tsx src/components/agent-preview/SessionSidebar.test.tsx`

Expected: PASS.

### Task 3: Make the generated export honest

**Files:**
- Modify: `src/export/scaffoldManifest.ts`
- Modify: `src/export/exportContract.test.ts`

**Step 1: Write the failing export contract assertion**

Require the generated `slotContext` to contain `sessionPrompts: []` and to omit fabricated
session selection wiring.

**Step 2: Run the contract test to verify it fails**

Run: `npx vitest run src/export/exportContract.test.ts`

Expected: FAIL because the generated shell does not yet declare its session data.

**Step 3: Implement the generated-shell assignment**

Add `sessionPrompts: []` near `previewPrompt: ""` in `AGENT_SHELL_SOURCE`, with a comment
explaining that real session history must come from an adapter rather than localized demo copy.

**Step 4: Run the export contract test**

Run: `npx vitest run src/export/exportContract.test.ts`

Expected: PASS.

### Task 4: Verify the repository and generated artifact

**Files:**
- Verify only.

**Step 1:** Run `npx vitest run` and expect all tests to pass.

**Step 2:** Run `npm run typecheck` and expect exit code 0.

**Step 3:** Run `npm run build` and expect exit code 0.

**Step 4:** Generate/open a fresh exported scaffold and confirm the shipped sidebar has no
fabricated history while the AgentCanvas editor preview still shows interactive sample sessions.


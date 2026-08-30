# Ephemeral Pi Conversations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make real Pi runs behave like a client-quality, page-lifetime chat while preserving exact AgentUX component/event rendering in both the editor and exported project.

**Architecture:** Keep conversation metadata and canonical events in browser memory, keyed by opaque conversation IDs. Keep a bounded host-side map of in-memory Pi sessions keyed by the same IDs. Append and globally resequence each turn's canonical events before projecting them through the existing AgentUX runtime.

**Tech Stack:** React, TypeScript, AgentUX canonical events, Pi SDK, Vitest, Vite.

---

### Task 1: Add pure ephemeral conversation state

**Files:**
- Create: `src/pi/piConversationState.ts`
- Test: `src/pi/piConversationState.test.ts`

1. Define temporary conversation and sidebar item types.
2. Add helpers to create, title, append/resequence, update, and bound conversations.
3. Test two appended turns, stable event identity/run IDs, global sequence order, title derivation,
   switching, and history bounds.

### Task 2: Put user turns into the canonical Pi stream

**Files:**
- Modify: `src/harness/adapters/piAdapter.ts`
- Modify: `src/harness/adapters/piAdapter.test.ts`
- Modify: `src/pi/piHost.ts`
- Modify: `src/pi/piHost.test.ts`

1. Add an adapter operation that emits canonical user text lifecycle events.
2. Emit those events before invoking Pi for every prompt.
3. Stop mapping raw Pi thinking deltas to visible reasoning content; retain safe reasoning status.
4. Test event order and ensure raw thinking text is absent.

### Task 3: Support multiple bounded, in-memory Pi sessions

**Files:**
- Modify: `src/pi/piClient.ts`
- Modify: `src/pi/piClient.test.ts`
- Modify: `src/pi/piHost.ts`
- Modify: `src/pi/piHost.test.ts`

1. Add optional `conversationId` to configuration, prompt, new-session, and state operations.
2. Replace the single host bridge with a bounded conversation-ID-to-bridge map.
3. Ensure creating/resetting one conversation does not dispose another.
4. Use Pi's in-memory session manager rather than disk-backed session storage.
5. Test isolation, continuation, reset, and disposal bounds.

### Task 4: Wire temporary conversations into the editor

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/agent-preview/SessionSidebar.tsx`
- Modify: `src/components/agent-preview/SessionSidebar.test.tsx`
- Modify: `src/slots/slotRegistry.tsx`

1. Replace per-prompt sidebar state with ID-based temporary conversations.
2. Append each Pi turn to the active conversation instead of clearing `runEvents`.
3. Switch conversations without submitting a prompt; make `New conversation` the only creator.
4. Pass conversation IDs through Pi configure, prompt, and reset operations.
5. In Pi mode, render user bubbles solely from canonical events.
6. Reset derived artifact/Git selections when switching while allowing them to repopulate from the
   selected conversation's event history.

### Task 5: Mirror the behavior in exported projects

**Files:**
- Modify: `src/export/scaffoldManifest.ts`
- Modify: `src/export/exportContract.test.ts`
- Modify: `src/landing/exportFacts.ts` if the exported file count changes

1. Export the conversation-state helper.
2. Use the same ID-based temporary conversation logic in the generated shell.
3. Append/resequence events and pass the active conversation ID to Pi APIs.
4. Verify the generated shell contains no per-submit event clearing or fabricated Pi history.

### Task 6: End-to-end verification

**Files:**
- Modify only if failures reveal a contract mismatch.

1. Run focused Pi adapter, host, client, sidebar, and export-contract tests.
2. Run `npm test`.
3. Run `npm run build`.
4. Run `npm run test:export-smoke`.
5. Start an isolated local host and verify two browser conversation IDs receive distinct in-memory
   Pi session IDs without invoking a paid model request.

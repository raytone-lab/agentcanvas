import type { AgentUXEvent } from "@agent-ux/protocol";
import { agentUXEventBuilders } from "@agent-ux/protocol";

/**
 * The canonical events for a Pi turn that failed.
 *
 * A failed turn still has to read as a turn: the prompt on screen, then the error under it.
 * Emitting only the error leaves the user looking at a message that answers nothing visible.
 *
 * Written once because the configurator (`App.tsx`) and the generated export
 * (`export/scaffoldManifest.ts`) each run their own Pi turn loop, and this was built twice with
 * two different sets of details — one always attached a user turn, the other computed sequence
 * numbers differently. Two copies of "what a failure looks like" is two things to keep in step,
 * and the promise the product makes is that the export behaves like the editor.
 */
export function piErrorTurnEvents(input: {
  message: string;
  /**
   * Include a user turn for this prompt.
   *
   * Left out when the turn already put the prompt on screen — appending a second one would show
   * the question twice. That is the difference between failing during configuration (nothing
   * emitted yet, so the prompt is needed) and failing mid-run (already there).
   */
  prompt?: string;
  code?: string;
  runId?: string;
  now?: number;
}): AgentUXEvent[] {
  const runId = input.runId ?? `pi_error_${Date.now().toString(36)}`;
  const ts = input.now ?? Date.now();
  const code = input.code ?? "pi_runtime_error";
  const events: AgentUXEvent[] = [];
  // `appendPiConversationEvents` renumbers by position on arrival, so these are the order within
  // this batch rather than a claim about the conversation.
  const meta = (suffix: string, messageId?: string) => ({
    id: `${runId}_${suffix}`,
    runId,
    seq: events.length + 1,
    ts: ts + events.length,
    ...(messageId ? { messageId } : {}),
  });

  const prompt = input.prompt?.trim();
  if (prompt) {
    // Opening the run belongs with the prompt: together they mean "this turn never got going".
    // Failing mid-run has already emitted `run.started`, and a second one would reopen a run
    // that the transcript shows as under way.
    events.push(agentUXEventBuilders.runStarted(meta("started"), { title: "Pi session" }));
    const messageId = `${runId}_user`;
    const textId = `${messageId}_text`;
    events.push(agentUXEventBuilders.textStarted(meta("user_started", messageId), {
      textId,
      role: "user",
      format: "plain",
    }));
    events.push(agentUXEventBuilders.textDelta(meta("user_delta", messageId), { textId, delta: prompt }));
    events.push(agentUXEventBuilders.textFinished(meta("user_finished", messageId), { textId }));
  }

  events.push(agentUXEventBuilders.runError(meta("error"), {
    code,
    message: input.message,
    userMessage: input.message,
  }));

  return events;
}

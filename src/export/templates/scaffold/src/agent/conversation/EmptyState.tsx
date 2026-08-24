import agentuxConfig from "../../../agentux.config";

export function EmptyState() {
  if (agentuxConfig.conversation.emptyState === "suggested-prompts") {
    return <div data-empty-state="suggested-prompts"><button type="button">Inspect current context</button><button type="button">Draft a response</button><button type="button">Summarize recent work</button></div>;
  }

  if (agentuxConfig.conversation.emptyState === "capability-hints") {
    return <div data-empty-state="capability-hints"><span>Files</span><span>Tools</span><span>Output</span></div>;
  }

  return <div data-empty-state={agentuxConfig.conversation.emptyState}>Start a conversation.</div>;
}

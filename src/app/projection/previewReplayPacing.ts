import type { AgentUXEvent } from "../../agentux";

export function initialPreviewRevealCount(nextEvents: AgentUXEvent[]): number {
  const firstVisibleIndex = nextEvents.findIndex((event) => event.type !== "run.started");
  if (firstVisibleIndex < 0) {
    return Math.min(1, nextEvents.length);
  }
  return Math.min(firstVisibleIndex + 1, nextEvents.length);
}

export function previewReplayDelay(event: AgentUXEvent): number {
  if (event.type === "reasoning.delta" || event.type === "tool.call.args.delta") return 220;
  if (event.type === "reasoning.summary") return 760;
  if (event.type === "reasoning.finished") return 480;
  if (event.type === "tool.call.started" || event.type === "tool.call.running") return 420;
  if (event.type === "tool.call.result") return 680;
  if (event.type.startsWith("artifact.")) return 360;
  if (event.type === "text.delta") return 520;
  if (event.type === "run.finished") return 240;
  return 320;
}

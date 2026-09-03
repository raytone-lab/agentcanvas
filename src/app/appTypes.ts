import type { AgentFrontendProject } from "../schema/agentuxConfig";

export type SurfaceMode = "builder" | "saved-preview";
/**
 * Mirrors `PreviewRunMode` in `preview-runner/runModeState.ts`. It was missing `"harness"`,
 * which is why the harness branch there was unreachable: the run-mode indicator had a case for
 * it, but no code could ever set the value.
 */
export type RunMode = "replay" | "live" | "pi" | "harness";
export type WritingMode = AgentFrontendProject["theme"]["motion"]["writing"];
export type MessageActionKey = keyof AgentFrontendProject["conversation"]["messageActions"];

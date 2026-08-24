/**
 * AgentMatrix standard layer — public barrel.
 *
 * This module replaces the legacy `@agent-ux/*` protocol with the AgentMatrix
 * public Session Event model: protocol types, the Session projector, the mock
 * SSE simulator, the live backend client (glue), the swappable icon registry,
 * and the React bindings.
 */

export * from "./protocol";
export * from "./viewModel";
export { projectSession, textOfBlocks, type StreamingState } from "./projector";
export {
  buildFrameTimeline,
  createMockStreamSource,
  fixtureDurableEvents,
  type FrameHandlers,
  type FrameSource,
  type MockStreamOptions,
} from "./mockSse";
export {
  AgentMatrixClient,
  createBackendStreamSource,
  createMockClient,
  type AgentMatrixClientOptions,
  type BackendStreamOptions,
  type ClientStatus,
  type OutboundTransport,
  type SessionSnapshot,
} from "./client";
export { useAgentMatrixSession, type SessionControls } from "./useSession";
export * from "./icons";
export { ActiveRobotFace } from "./ActiveRobotFace";
export { IconSetProvider, IconStyleProvider, StateIcon, useIconSet, useIconStyle } from "./IconSetContext";
export { SCENARIOS, scenarioById, type Scenario, type ScenarioId } from "./fixtures";
export { toAgentUXEvents, type LegacyEvent, type AdapterOptions } from "./legacyAdapter";
export { stateDemoEvents } from "./stateDemo";

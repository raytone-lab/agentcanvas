/**
 * React binding for the AgentMatrix client.
 *
 * `useSyncExternalStore` guarantees the projected snapshot stays consistent
 * across concurrent renders. The hook owns nothing about SSE — it only reflects
 * the client store.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

import type { AgentMatrixClient, SessionSnapshot } from "./client";

export type SessionControls = {
  connect: () => void;
  disconnect: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
};

export function useAgentMatrixSession(
  client: AgentMatrixClient,
  options: { autoConnect?: boolean } = {},
): SessionSnapshot & { controls: SessionControls } {
  const snapshot = useSyncExternalStore(
    useCallback((cb) => client.subscribe(cb), [client]),
    () => client.getSnapshot(),
    () => client.getSnapshot(),
  );

  const autoConnect = options.autoConnect ?? true;
  const startedRef = useRef(false);
  useEffect(() => {
    if (!autoConnect) return;
    if (!startedRef.current) {
      startedRef.current = true;
      client.connect();
    }
    // Only the auto-connecting owner tears the stream down; read-only
    // subscribers (e.g. a status chrome) must not kill the shared client.
    return () => {
      client.disconnect();
      startedRef.current = false;
    };
  }, [client, autoConnect]);

  const controls: SessionControls = {
    connect: useCallback(() => client.connect(), [client]),
    disconnect: useCallback(() => client.disconnect(), [client]),
    pause: useCallback(() => client.pause(), [client]),
    resume: useCallback(() => client.resume(), [client]),
    reset: useCallback(() => client.reset(), [client]),
  };

  return { ...snapshot, controls };
}

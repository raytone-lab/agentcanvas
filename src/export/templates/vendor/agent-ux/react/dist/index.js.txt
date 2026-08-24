import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createAgentUXRuntime } from "../../runtime/dist/index.js";
import { createAgentUXViewModel } from "../../render-core/dist/index.js";

export function useAgentUXRuntime(initialEvents = []) {
  return useMemo(() => createAgentUXRuntime(initialEvents), []);
}

export function useAgentUXViewModel(runtime, options = {}) {
  const state = useSyncExternalStore(
    runtime.subscribe,
    runtime.getState,
    runtime.getState,
  );
  return useMemo(() => createAgentUXViewModel(state, options), [state, options]);
}

export function useAgentUXReplay(events = [], options = {}) {
  const runtime = useAgentUXRuntime();
  useEffect(() => {
    runtime.replay(events);
  }, [runtime, events]);
  const state = useSyncExternalStore(
    runtime.subscribe,
    runtime.getState,
    runtime.getState,
  );
  const viewModel = useMemo(() => createAgentUXViewModel(state, options), [state, options]);
  return { runtime, state, viewModel };
}

export function useAgentUXMessageSplit(text, options = {}) {
  const maxChunkLength = options.maxChunkLength ?? 120;
  return useMemo(() => {
    const value = String(text ?? "");
    if (!value) {
      return [];
    }
    const chunks = [];
    for (let index = 0; index < value.length; index += maxChunkLength) {
      chunks.push(value.slice(index, index + maxChunkLength));
    }
    return chunks;
  }, [text, maxChunkLength]);
}

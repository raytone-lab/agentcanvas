import { parseAgentUXEvent } from "../../protocol/dist/index.js";

export function parseAgentUXEventJSONL(raw) {
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => parseAgentUXEvent(line));
}

export function replayAgentUXEvents(events) {
  return {
    events: [...(events ?? [])].map((event) => parseAgentUXEvent(event)).sort(compareEvents),
  };
}

export function createAgentUXRuntime(initialEvents = []) {
  let state = replayAgentUXEvents(initialEvents);
  const listeners = new Set();

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    replay(events) {
      state = replayAgentUXEvents(events);
      notify();
      return state;
    },
    append(event) {
      state = replayAgentUXEvents([...state.events, parseAgentUXEvent(event)]);
      notify();
      return state;
    },
    reset() {
      state = replayAgentUXEvents([]);
      notify();
      return state;
    },
    getState() {
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function compareEvents(a, b) {
  return (a.seq ?? 0) - (b.seq ?? 0) || (a.ts ?? 0) - (b.ts ?? 0) || String(a.id).localeCompare(String(b.id));
}

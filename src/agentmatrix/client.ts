/**
 * AgentMatrix client — the glue layer.
 *
 * A single store that consumes a `FrameSource` (mock OR live backend SSE),
 * maintains the durable EventLog plus active ephemeral deltas, and re-projects
 * a stable `SessionViewModel` on every frame. UI subscribes to the snapshot;
 * it never sees SSE, cursors, or correlation.
 *
 * The exact same client drives the mock demo and a real deployment — only the
 * source differs. `createBackendStreamSource` opens a real SSE/stream endpoint
 * that emits the identical `StreamFrame` wire shape, so an exported project
 * connects to the platform with no projection changes.
 */

import { createMockStreamSource, type FrameSource, type MockStreamOptions } from "./mockSse";
import type {
  AnyDurableEvent,
  DeltaStreamFrame,
  EventFixture,
  StreamFrame,
} from "./protocol";
import { projectSession, type StreamingState } from "./projector";
import { emptySessionViewModel, type SessionViewModel } from "./viewModel";

export type ClientStatus = "idle" | "streaming" | "paused" | "done" | "error";

export type SessionSnapshot = {
  viewModel: SessionViewModel;
  status: ClientStatus;
  error?: unknown;
};

export type OutboundTransport = {
  sendUserMessage?: (text: string) => Promise<void> | void;
  confirmTool?: (
    toolCallId: string,
    result: "allow_once" | "allow_always" | "deny" | "cancel",
    denyMessage?: string,
  ) => Promise<void> | void;
  interrupt?: () => Promise<void> | void;
};

export type AgentMatrixClientOptions = {
  source: FrameSource;
  transport?: OutboundTransport;
};

export class AgentMatrixClient {
  private source: FrameSource;
  private transport?: OutboundTransport;
  private durable: AnyDurableEvent[] = [];
  private deltas: DeltaStreamFrame[] = [];
  private seenSequences = new Set<number>();
  private status: ClientStatus = "idle";
  private error: unknown;
  private listeners = new Set<() => void>();
  private snapshot: SessionSnapshot;

  constructor(options: AgentMatrixClientOptions) {
    this.source = options.source;
    this.transport = options.transport;
    this.snapshot = { viewModel: emptySessionViewModel(), status: "idle" };
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): SessionSnapshot {
    return this.snapshot;
  }

  connect(): void {
    this.status = "streaming";
    this.source.start({
      onFrame: (frame) => this.applyFrame(frame),
      onDone: () => {
        this.status = "done";
        // Discard any unfinished temporary deltas on stream close.
        this.deltas = [];
        this.recompute();
      },
      onError: (err) => {
        this.status = "error";
        this.error = err;
        this.recompute();
      },
    });
    this.recompute();
  }

  disconnect(): void {
    this.source.stop();
    this.status = "idle";
    // On disconnect, discard unfinished deltas and converge from durable history.
    this.deltas = [];
    this.recompute();
  }

  pause(): void {
    this.source.pause();
    this.status = "paused";
    this.recompute();
  }

  resume(): void {
    this.source.resume();
    this.status = "streaming";
    this.recompute();
  }

  reset(): void {
    this.source.stop();
    this.durable = [];
    this.deltas = [];
    this.seenSequences.clear();
    this.status = "idle";
    this.error = undefined;
    this.recompute();
  }

  // --- outbound (client -> agent) ------------------------------------------

  async sendUserMessage(text: string): Promise<void> {
    await this.transport?.sendUserMessage?.(text);
  }

  async confirmTool(
    toolCallId: string,
    result: "allow_once" | "allow_always" | "deny" | "cancel",
    denyMessage?: string,
  ): Promise<void> {
    await this.transport?.confirmTool?.(toolCallId, result, denyMessage);
  }

  async interrupt(): Promise<void> {
    await this.transport?.interrupt?.();
  }

  // --- frame handling -------------------------------------------------------

  private applyFrame(frame: StreamFrame): void {
    if (frame.frame_type === "delta") {
      this.deltas.push(frame);
    } else {
      const event = frame.event;
      // Deduplicate by durable sequence (reconnect-safe).
      if (!this.seenSequences.has(event.sequence)) {
        this.seenSequences.add(event.sequence);
        this.durable.push(event);
      }
      // A durable Event replaces the temporary blocks it previewed.
      if (frame.stable_ordinal) {
        this.deltas = this.deltas.filter((d) => d.target_stable_ordinal !== frame.stable_ordinal);
      }
    }
    this.recompute();
  }

  private recompute(): void {
    const streaming: StreamingState = { deltas: this.deltas };
    this.snapshot = {
      viewModel: projectSession(this.durable, streaming),
      status: this.status,
      error: this.error,
    };
    for (const listener of this.listeners) listener();
  }
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export function createMockClient(
  fixture: EventFixture,
  options?: MockStreamOptions,
  transport?: OutboundTransport,
): AgentMatrixClient {
  return new AgentMatrixClient({
    source: createMockStreamSource(fixture, options),
    transport,
  });
}

export type BackendStreamOptions = {
  /** Full SSE/stream URL, e.g. `/v1/sessions/{id}/events/stream`. */
  url: string;
  /** Optional auth + content headers. Never persist tokens in components. */
  headers?: Record<string, string>;
  /** Resume cursor: the last durable `sequence` already applied. */
  fromSequence?: number;
  /** Injected fetch (tests / proxies). Defaults to global fetch. */
  fetcher?: typeof fetch;
  signal?: AbortSignal;
};

/**
 * Live backend source. Reads a `text/event-stream` (or newline-delimited JSON)
 * response where each `data:` line is a JSON `StreamFrame`. This is the seam an
 * exported project wires to the real AgentMatrix platform.
 */
export function createBackendStreamSource(options: BackendStreamOptions): FrameSource {
  const fetcher = options.fetcher ?? fetch;
  let controller: AbortController | null = null;
  let running = false;
  let handlers: import("./mockSse").FrameHandlers | null = null;

  async function run() {
    if (!handlers) return;
    controller = new AbortController();
    const signal = options.signal
      ? anySignal([options.signal, controller.signal])
      : controller.signal;
    try {
      const url = withCursor(options.url, options.fromSequence);
      const res = await fetcher(url, {
        method: "GET",
        headers: { Accept: "text/event-stream", ...(options.headers ?? {}) },
        signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`AgentMatrix stream failed: ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (running) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n|\r?\n/);
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.startsWith("data:") ? part.slice(5).trim() : part.trim();
          if (!line || line === "[DONE]") continue;
          try {
            const frame = JSON.parse(line) as StreamFrame;
            handlers.onFrame(frame);
          } catch {
            // Ignore keep-alive / comment lines.
          }
        }
      }
      handlers.onDone?.();
    } catch (err) {
      if (running) handlers?.onError?.(err);
    } finally {
      running = false;
    }
  }

  return {
    start(next) {
      handlers = next;
      running = true;
      void run();
    },
    stop() {
      running = false;
      controller?.abort();
    },
    pause() {
      // Server streams cannot be paused mid-flight; stop and rely on resume-by-cursor.
      running = false;
      controller?.abort();
    },
    resume() {
      if (running) return;
      running = true;
      void run();
    },
    isRunning() {
      return running;
    },
  };
}

function withCursor(url: string, fromSequence?: number): string {
  if (fromSequence == null) return url;
  const join = url.includes("?") ? "&" : "?";
  return `${url}${join}after_sequence=${fromSequence}`;
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      break;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

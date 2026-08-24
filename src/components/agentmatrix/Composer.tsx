/**
 * Composer with a compact incident/status surface.
 *
 * The composer reflects Session state supplied by the projector: locked while a
 * turn is open or during a blocking incident, read-only when the Session is
 * terminal/deleted, and it surfaces the single blocking incident inline near
 * the input (Activity may be closed).
 */

import { useState } from "react";
import { Send, Square } from "lucide-react";

import { StateIcon, sessionLifecycleSlot } from "../../agentmatrix";
import type { SessionViewModel } from "../../agentmatrix";
import { IncidentCard } from "./SidePanels";

export function Composer({
  vm,
  onSend,
  onInterrupt,
}: {
  vm: SessionViewModel;
  onSend?: (text: string) => void;
  onInterrupt?: () => void;
}) {
  const [text, setText] = useState("");
  const running = vm.lifecycle === "running" || vm.lifecycle === "rescheduling";
  const blocking = vm.blockingIncident?.composerLocked ?? false;
  const readOnly = vm.readOnly;
  const locked = readOnly || blocking;

  function submit() {
    if (!text.trim() || locked || running) return;
    onSend?.(text.trim());
    setText("");
  }

  return (
    <div className="am-composer" data-locked={locked} data-readonly={readOnly}>
      {vm.blockingIncident ? (
        <IncidentCard incident={vm.blockingIncident} compact />
      ) : null}

      <div className="am-composer-status">
        <StateIcon slot={sessionLifecycleSlot(vm.lifecycle)} size={13} />
        <span>{lifecycleLabel(vm)}</span>
      </div>

      <div className="am-composer-input" data-disabled={locked}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          placeholder={
            readOnly
              ? "Session is read-only"
              : blocking
                ? "Waiting for the incident to resolve…"
                : "Message the agent (⌘↵ to send)"
          }
          rows={2}
          disabled={locked}
        />
        {running ? (
          <button type="button" className="am-composer-stop" onClick={() => onInterrupt?.()}>
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="am-composer-send"
            onClick={submit}
            disabled={locked || !text.trim()}
          >
            <Send size={14} />
            Send
          </button>
        )}
      </div>
    </div>
  );
}

function lifecycleLabel(vm: SessionViewModel): string {
  switch (vm.lifecycle) {
    case "initializing":
      return "Initializing session";
    case "running":
      return "Agent is working…";
    case "idle":
      return "Idle · ready for a new turn";
    case "requires_action":
      return "Waiting for your action";
    case "rescheduling":
      return "Retry scheduled…";
    case "terminated":
      return "Session terminated";
    case "deleted":
      return "Session deleted";
    default:
      return vm.lifecycle;
  }
}

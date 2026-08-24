import { Copy, Pencil, RotateCcw } from "lucide-react";
import agentuxConfig from "../../../agentux.config";

export function MessageActions({ role }: { role: "user" | "assistant" }) {
  const actions = agentuxConfig.conversation.messageActions;
  if (role === "user") {
    return <div data-message-actions={role}><button aria-label="Copy prompt" hidden={!(actions.userCopy ?? actions.copy)} type="button"><Copy size={14} /></button><button aria-label="Edit prompt and rerun" hidden={!(actions.userEdit ?? actions.edit)} type="button"><Pencil size={14} /></button><span className="message-action-time" hidden={!actions.userTime} aria-label="Show prompt time">09:47</span></div>;
  }

  return <div data-message-actions={role}><button aria-label="Copy response" hidden={!(actions.agentCopy ?? actions.copy)} type="button"><Copy size={14} /></button><button aria-label="Regenerate response" hidden={!(actions.agentRegenerate ?? actions.regenerate)} type="button"><RotateCcw size={14} /></button><button aria-label="Edit response" hidden={!actions.agentEdit} type="button"><Pencil size={14} /></button><span className="message-action-time" hidden={!actions.agentTime} aria-label="Show response time">09:48</span></div>;
}

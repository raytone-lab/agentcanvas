import { Copy, Pencil, RotateCcw } from "lucide-react";
import type { ReactElement } from "react";

import { useCopy } from "../../../i18n/LocaleContext";
import type { AgentFrontendProject } from "../../../schema/agentuxConfig";
import { IconTooltip } from "../../common/IconTooltip";

type MessageActionRole = "user" | "assistant";

export function MessageActions({ project, role }: { project: AgentFrontendProject; role: MessageActionRole }) {
  const copy = useCopy();
  const { messageActions } = project.conversation;
  type MessageAction = { id: string; label: string; icon?: ReactElement; timeText?: string };
  const compactActions = (items: Array<MessageAction | undefined>) =>
    items.filter((action): action is MessageAction => Boolean(action));
  const actions = role === "user"
    ? compactActions([
      (messageActions.userCopy ?? messageActions.copy)
        ? { id: "copy", label: copy.chat.message.actions.copyPrompt, icon: <Copy size={14} /> }
        : undefined,
      (messageActions.userEdit ?? messageActions.edit)
        ? { id: "edit", label: copy.chat.message.actions.editPromptAndRerun, icon: <Pencil size={14} /> }
        : undefined,
      messageActions.userTime
        ? { id: "time", label: copy.chat.message.actions.promptTime, timeText: "09:47" }
        : undefined,
    ])
    : compactActions([
      (messageActions.agentCopy ?? messageActions.copy)
        ? { id: "copy", label: copy.chat.message.actions.copyResponse, icon: <Copy size={14} /> }
        : undefined,
      (messageActions.agentRegenerate ?? messageActions.regenerate)
        ? { id: "regenerate", label: copy.chat.message.actions.regenerateResponse, icon: <RotateCcw size={14} /> }
        : undefined,
      messageActions.agentEdit
        ? { id: "edit", label: copy.chat.message.actions.editResponse, icon: <Pencil size={14} /> }
        : undefined,
      messageActions.agentTime
        ? { id: "time", label: copy.chat.message.actions.responseTime, timeText: "09:48" }
        : undefined,
    ]);

  if (actions.length === 0) {
    return null;
  }

  return (
    <div
      className="message-actions"
      data-message-actions={role}
      data-preview-anchor={role === "user" ? "user-message-actions" : "agent-message-actions"}
      aria-label={role === "user" ? copy.chat.message.actions.userActionsLabel : copy.chat.message.actions.agentActionsLabel}
    >
      {actions.map((action) => action.timeText ? (
        <span key={action.id} className="message-action-time" aria-label={action.label}>
          {action.timeText}
        </span>
      ) : (
        <IconTooltip key={action.id} label={action.label}>
          <button className="message-action-icon" aria-label={action.label} type="button">
            {action.icon}
          </button>
        </IconTooltip>
      ))}
    </div>
  );
}

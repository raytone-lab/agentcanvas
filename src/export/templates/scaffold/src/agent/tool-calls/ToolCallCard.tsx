import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import agentuxConfig from "../../../agentux.config";

export type ToolCallCardProps = {
  title?: string;
  preview?: string;
  status?: string;
  input?: string;
  output?: string;
  approvalPrompt?: string;
  awaitingApproval?: boolean;
};

function ApprovalActions() {
  return <div data-approval-actions aria-label="Tool approval actions"><button type="button" data-variant="primary">Approve</button><button type="button">Always</button><button type="button" data-variant="ghost">Deny</button></div>;
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "error") return <AlertCircle size={15} data-tool-icon="error" />;
  if (status === "running" || status === "awaiting_approval") return <Loader2 size={15} data-tool-icon="running" />;
  return <CheckCircle2 size={15} data-tool-icon="success" />;
}

export function ToolCallCard({
  title = "Tool call",
  preview = "Awaiting result",
  status,
  input = "{}",
  output = "No result yet",
  approvalPrompt = "Approve this tool call?",
  awaitingApproval = false,
}: ToolCallCardProps) {
  const toolCalls = agentuxConfig.toolCalls;
  const showInput = toolCalls.detail === "full";
  const showOutput = toolCalls.detail === "full" || toolCalls.detail === "output-only";
  const showProgress = toolCalls.progress === "bar" && (status === "running" || status === "awaiting_approval");
  // Approval only surfaces when this specific tool is actually waiting for a decision.
  const showInlineApproval = toolCalls.approval === "inline" && awaitingApproval;

  return <section data-tool-call-card data-tool-style={agentuxConfig.theme.motion.toolCall} data-tool-detail={toolCalls.detail} data-tool-status={status}>
    <div data-tool-header><StatusIcon status={status} /><strong>{title}</strong><span>{preview}</span></div>
    {showProgress ? <div data-tool-progress><span /></div> : null}
    {showInlineApproval ? <div data-inline-approval><Clock3 size={14} /><span>{approvalPrompt}</span><ApprovalActions /></div> : null}
    {showInput ? <pre data-tool-block="input">{input}</pre> : null}
    {showOutput ? <pre data-tool-block="output">{output}</pre> : null}
  </section>;
}

export function ExternalApprovalSurface({ title = "Tool approval", prompt = "Approve this tool call?" }: { title?: string; prompt?: string }) {
  if (agentuxConfig.toolCalls.approval !== "hidden") {
    return null;
  }

  return <aside data-external-approval><Clock3 size={14} /><strong>{title}</strong><span>{prompt}</span><ApprovalActions /></aside>;
}

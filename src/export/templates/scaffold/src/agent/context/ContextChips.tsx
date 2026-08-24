import { FileText, Image } from "lucide-react";
import agentuxConfig from "../../../agentux.config";

export function ContextChips() {
  return <div data-context-chips>{agentuxConfig.context.attachmentChips ? <><span><FileText size={13} />SearchInput.tsx</span><span><Image size={13} />screenshot.png</span></> : null}</div>;
}

import type { CSSProperties } from "react";
import agentuxConfig from "../../../agentux.config";

function streamTextStyle(text: string): CSSProperties {
  return { "--stream-chars": Math.max(1, text.length) } as CSSProperties;
}

export function WritingStream({ text }: { text: string }) {
  return <p className="stream-text" data-writing-motion={agentuxConfig.theme.motion.writing} style={streamTextStyle(text)} aria-live="polite">{text}</p>;
}

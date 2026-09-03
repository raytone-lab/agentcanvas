import type { OutputSource } from "../../../schema/agentuxConfig";
import type { ConcreteArtifactRenderer, OutputFrameCopy } from "./types";

export function outputTitle(source: OutputSource, renderer: ConcreteArtifactRenderer, copy: OutputFrameCopy): string {
  if (source === "console") {
    return copy.titleConsole;
  }
  return `${copy.titleArtifactPrefix}${rendererLabel(renderer, copy)}`;
}

export function rendererLabel(renderer: ConcreteArtifactRenderer, copy: OutputFrameCopy): string {
  return copy.rendererLabels[renderer];
}

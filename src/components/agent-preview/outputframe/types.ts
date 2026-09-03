import type { ArtifactRenderer, OutputSource } from "../../../schema/agentuxConfig";
import type { UiCopy } from "../../../i18n/uiCopy";

export type ConcreteArtifactRenderer = Exclude<ArtifactRenderer, "auto">;
export type OutputFrameCopy = UiCopy["workspace"]["outputFrame"];
export type { OutputSource };

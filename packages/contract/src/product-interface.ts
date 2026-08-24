import {
  canvasExperienceFromExperience,
  completeAgentCanvasExperienceV2,
  withCanvasExperience,
} from "./defaults.js";
import {
  applyExperiencePresetOption,
  experiencePresetGroupsForExperience,
  isExperiencePresetOptionActive,
  toggleExperiencePresetOption,
  type ExperienceCapabilityFlags,
  type ExperiencePresetGroup,
} from "./presets.js";
import type {
  AgentCanvasExperienceV2,
  AgentCanvasStylesheetLayer,
} from "./types.js";

/**
 * Expose the authoritative v1 preset registry against a v2 product value.
 * Hosts should use these helpers instead of duplicating Canvas state rules.
 */
export function productInterfacePresetGroups(
  value: AgentCanvasExperienceV2,
  capabilities?: Partial<ExperienceCapabilityFlags>,
): ExperiencePresetGroup[] {
  return experiencePresetGroupsForExperience(
    canvasExperienceFromExperience(value),
    capabilities,
  );
}

export function applyProductInterfacePresetOption(
  value: AgentCanvasExperienceV2,
  optionId: string,
): AgentCanvasExperienceV2 {
  return withCanvasExperience(
    value,
    applyExperiencePresetOption(
      canvasExperienceFromExperience(value),
      optionId,
    ),
  );
}

export function toggleProductInterfacePresetOption(
  value: AgentCanvasExperienceV2,
  optionId: string,
): AgentCanvasExperienceV2 {
  return withCanvasExperience(
    value,
    toggleExperiencePresetOption(
      canvasExperienceFromExperience(value),
      optionId,
    ),
  );
}

export function isProductInterfacePresetOptionActive(
  value: AgentCanvasExperienceV2,
  optionId: string,
): boolean {
  return isExperiencePresetOptionActive(
    canvasExperienceFromExperience(value),
    optionId,
  );
}

/**
 * Return logical stylesheet bindings only. Resolution, validation of the
 * referenced bytes, CSP, and preview isolation remain host responsibilities.
 */
export function productInterfaceStylesheetReferences(
  value: AgentCanvasExperienceV2,
): ReadonlyArray<{ assetId: string; layer: AgentCanvasStylesheetLayer }> {
  return completeAgentCanvasExperienceV2(value).extensions.stylesheets.map(
    (reference) => ({ ...reference }),
  );
}

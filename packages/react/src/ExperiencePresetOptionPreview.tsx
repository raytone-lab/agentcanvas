import {
  applyExperiencePresetOption,
  completeAgentCanvasExperience,
  experiencePresetGroupsForExperience,
  isExperiencePresetOptionActive,
} from "@agentmatrix/agentcanvas-contract";

import { ExperiencePreview } from "./ExperiencePreview.js";
import type { ExperiencePresetOptionPreviewProps } from "./types.js";

/** Render an approved registry option without exposing builder-only preview state. */
export function ExperiencePresetOptionPreview({
  value,
  optionId,
  capabilities,
  label,
  ...props
}: ExperiencePresetOptionPreviewProps) {
  const complete = completeAgentCanvasExperience(value);
  const option = experiencePresetGroupsForExperience(complete, capabilities)
    .flatMap((group) => group.options)
    .find((entry) => entry.id === optionId);
  if (!option) {
    return (
      <ExperiencePreview
        {...props}
        value={value}
        capabilities={capabilities}
        label={label}
        error={
          props.error ??
          `Preset option is unavailable for this host: ${optionId}`
        }
      />
    );
  }

  const previewValue = isExperiencePresetOptionActive(complete, optionId)
    ? complete
    : applyExperiencePresetOption(complete, optionId);

  return (
    <ExperiencePreview
      {...props}
      value={previewValue}
      capabilities={capabilities}
      label={label ?? option.label}
    />
  );
}

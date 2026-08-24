import {
  canvasExperienceFromExperience,
  withCanvasExperience,
} from "@agentmatrix/agentcanvas-contract";

import type { ProductInterfaceContractAdapterProps } from "./types.js";

/**
 * Lets hosts compose their UX-owned Brand/Welcome controls around the existing
 * Canvas Studio without changing that Studio's structure, styling, or motion.
 */
export function ProductInterfaceContractAdapter({
  value,
  onChange,
  children,
}: ProductInterfaceContractAdapterProps) {
  return children({
    canvasValue: canvasExperienceFromExperience(value),
    onCanvasChange: (canvasValue) =>
      onChange(withCanvasExperience(value, canvasValue)),
  });
}

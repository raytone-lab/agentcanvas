import type { AgentProductInterface } from "../schema/agentuxConfig";

const managedVariables = [
  "surface-canvas",
  "surface-panel",
  "surface-raised",
  "surface-inset",
  "surface-hover",
  "text-primary",
  "text-secondary",
  "text-muted",
  "text-inverse",
  "border-subtle",
  "border-strong",
  "accent",
  "accent-hover",
  "success",
  "warning",
  "danger",
  "focus-color",
  "font-ui",
  "font-display",
  "font-mono",
  "agent-product-base-size",
  "agent-product-heading-scale",
  "agent-product-spacing-scale",
  "agent-product-radius-scale",
  "agent-product-border-scale",
] as const;

/** Apply only the bounded v2 semantic overrides to an isolated product preview. */
export function applyProductDesign(
  product: AgentProductInterface,
  root: HTMLElement,
): void {
  for (const variable of managedVariables) root.style.removeProperty(`--${variable}`);
  root.style.removeProperty("color-scheme");
  if (product.design.colorMode === "light" || product.design.colorMode === "dark") {
    root.style.setProperty("color-scheme", product.design.colorMode);
  } else if (product.design.colorMode === "system") {
    root.style.setProperty("color-scheme", "light dark");
  }

  const colors = product.design.colors ?? {};
  const variables: Record<string, string | number | undefined> = {
    "surface-canvas": colors.canvas,
    "surface-panel": colors.panel,
    "surface-raised": colors.raised,
    "surface-inset": colors.inset,
    "surface-hover": colors.hover,
    "text-primary": colors.text,
    "text-secondary": colors.textSecondary,
    "text-muted": colors.textMuted,
    "text-inverse": colors.actionText,
    "border-subtle": colors.border,
    "border-strong": colors.borderStrong,
    accent: colors.action,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
    "focus-color": colors.focus,
    "font-ui": product.design.typography?.fontUi,
    "font-display": product.design.typography?.fontDisplay,
    "font-mono": product.design.typography?.fontMono,
    "agent-product-base-size": product.design.typography?.baseSize
      ? `${product.design.typography.baseSize}px`
      : undefined,
    "agent-product-heading-scale": product.design.typography?.headingScale,
    "agent-product-spacing-scale": product.design.geometry?.spacingScale,
    "agent-product-radius-scale": product.design.geometry?.radiusScale,
    "agent-product-border-scale": product.design.geometry?.borderScale,
  };

  if (product.brand.accent.kind === "custom") {
    variables.accent = product.brand.accent.color;
    variables["accent-hover"] = product.brand.accent.color;
  }
  if (product.brand.corners === "rounded") variables["agent-product-radius-scale"] = 1.35;
  if (product.brand.corners === "square") variables["agent-product-radius-scale"] = 0;

  for (const [variable, value] of Object.entries(variables)) {
    if (value !== undefined) root.style.setProperty(`--${variable}`, String(value));
  }
}

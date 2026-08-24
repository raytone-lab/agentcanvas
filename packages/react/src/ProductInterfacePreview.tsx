import {
  AGENTCANVAS_EXPERIENCE_V1,
  canvasExperienceFromExperience,
  completeAgentCanvasExperienceV2,
  type AgentCanvasBrandMarkV2,
  type AgentCanvasDesignTokensV2,
} from "@agentmatrix/agentcanvas-contract";
import type { CSSProperties, ReactNode } from "react";

import { ExperiencePreview } from "./ExperiencePreview.js";
import { copy, EmbedRoot, localeValue } from "./shared.js";
import type {
  AgentCanvasSemanticTokens,
  ProductInterfacePreviewProps,
} from "./types.js";

export function ProductInterfacePreview({
  value,
  fixture,
  resolveBrandAsset,
  locale: localeProp,
  ...props
}: ProductInterfacePreviewProps) {
  if (value.contractVersion === AGENTCANVAS_EXPERIENCE_V1)
    return (
      <ExperiencePreview
        value={value}
        fixture={fixture}
        locale={localeProp}
        {...props}
      />
    );

  const complete = completeAgentCanvasExperienceV2(value);
  const messages = copy[localeValue(localeProp)];
  const canvas = canvasExperienceFromExperience(complete);
  const semanticTokens = semanticTokensForProductInterface(
    complete.design,
    complete.brand.accent.kind === "custom"
      ? complete.brand.accent.color
      : undefined,
  );
  const style = {
    ...productInterfaceStyle(complete.design, complete.brand.corners),
    ...props.style,
  } as CSSProperties;
  const productTokens = { ...props.semanticTokens, ...semanticTokens };
  const productFixture = {
    ...fixture,
    title: fixture?.title ?? complete.brand.displayName,
    welcomeTitle: complete.welcome.headline,
    welcomeDescription: complete.welcome.supportingText,
    suggestedPrompts: complete.welcome.showSuggestedPrompts
      ? complete.welcome.suggestedPrompts
      : [],
    messages: fixture?.messages ?? [],
  };

  if (complete.surface.mode === "custom") {
    return (
      <EmbedRoot
        className={props.className}
        style={style}
        semanticTokens={productTokens}
      >
        <section
          className="agentcanvas-state"
          aria-label={props.label ?? messages.customUi}
          data-agentcanvas-contract="agentcanvas-experience-v2"
          data-agentcanvas-surface="custom"
        >
          <strong>{complete.brand.displayName}</strong>
          <p>{complete.welcome.headline}</p>
          <small>{messages.customUiHint}</small>
        </section>
      </EmbedRoot>
    );
  }

  return (
    <ExperiencePreview
      {...props}
      value={canvas}
      fixture={productFixture}
      locale={localeProp}
      style={style}
      semanticTokens={productTokens}
      presentation={{
        displayName: complete.brand.displayName,
        mark: productInterfaceBrandMark(complete.brand.mark, resolveBrandAsset),
        showPoweredBy: complete.brand.showPoweredBy,
        showSuggestedPrompts: complete.welcome.showSuggestedPrompts,
        colorMode: complete.design.colorMode,
      }}
    />
  );
}

export function productInterfaceBrandMark(
  mark: AgentCanvasBrandMarkV2,
  resolveBrandAsset: ProductInterfacePreviewProps["resolveBrandAsset"],
): ReactNode {
  if (mark.kind === "asset")
    return (
      resolveBrandAsset?.(mark.assetId) ?? (
        <span data-agentcanvas-brand-asset={mark.assetId} aria-hidden="true" />
      )
    );
  return (
    <span data-agentcanvas-brand-mark={mark.id} aria-hidden="true">
      {builtinMarkText[mark.id]}
    </span>
  );
}

const builtinMarkText = {
  sparkles: "✦",
  "messages-square": "▣",
  bot: "◇",
  terminal: ">_",
  search: "⌕",
  chart: "▥",
} as const;

export function semanticTokensForProductInterface(
  design: AgentCanvasDesignTokensV2,
  brandAccent?: string,
): Partial<AgentCanvasSemanticTokens> {
  const colors = design.colors ?? {};
  const typography = design.typography ?? {};
  const geometry = design.geometry ?? {};
  const tokens: Partial<AgentCanvasSemanticTokens> = {
    ...colors,
    action: colors.action ?? brandAccent,
    fontUi: typography.fontUi,
    fontDisplay: typography.fontDisplay,
    fontMono: typography.fontMono,
    baseSize:
      typography.baseSize === undefined
        ? undefined
        : `${typography.baseSize}px`,
    headingScale:
      typography.headingScale === undefined
        ? undefined
        : String(typography.headingScale),
    spacingScale:
      geometry.spacingScale === undefined
        ? undefined
        : String(geometry.spacingScale),
    radiusScale:
      geometry.radiusScale === undefined
        ? undefined
        : String(geometry.radiusScale),
    borderScale:
      geometry.borderScale === undefined
        ? undefined
        : String(geometry.borderScale),
  };
  return Object.fromEntries(
    Object.entries(tokens).filter(([, value]) => value !== undefined),
  ) as Partial<AgentCanvasSemanticTokens>;
}

export function productInterfaceStyle(
  design: AgentCanvasDesignTokensV2,
  corners: "theme" | "rounded" | "square",
): CSSProperties {
  const colorScheme =
    design.colorMode === "light" || design.colorMode === "dark"
      ? design.colorMode
      : design.colorMode === "system"
        ? "light dark"
        : undefined;
  return {
    colorScheme,
    ...(corners === "theme"
      ? {}
      : {
          "--agentcanvas-radius-scale": corners === "square" ? "0" : "1.35",
        }),
  } as CSSProperties;
}

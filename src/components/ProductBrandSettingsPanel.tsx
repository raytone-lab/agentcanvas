import {
  agentCanvasBuiltinMarks,
  agentCanvasStylesheetLayers,
  type AgentCanvasBrandMarkV2,
  type AgentCanvasBuiltinMark,
  type AgentCanvasStylesheetLayer,
} from "@agentmatrix/agentcanvas-contract";
import { useEffect, useId, useState, type CSSProperties } from "react";

import { Input, Select, Switch } from "./ui";
import type { AgentFrontendProject } from "../schema/agentuxConfig";

const markGlyphs: Record<AgentCanvasBuiltinMark, string> = {
  sparkles: "✦",
  "messages-square": "▣",
  bot: "◇",
  terminal: ">_",
  search: "⌕",
  chart: "▥",
};

const accentChoices = [
  ["#4f46e5", "Indigo"],
  ["#0f9f94", "Teal"],
  ["#db2777", "Pink"],
  ["#ea580c", "Orange"],
  ["#334155", "Graphite"],
] as const;

const typefaces = [
  ["", "Theme default"],
  ["Inter, ui-sans-serif, system-ui, sans-serif", "Inter / system sans"],
  ["Georgia, serif", "Serif"],
  ["ui-monospace, monospace", "Monospace"],
] as const;

export function ProductBrandSettingsPanel({
  project,
  locale,
  onChange,
}: {
  project: AgentFrontendProject;
  locale: "en" | "zh";
  onChange: (product: AgentFrontendProject["product"]) => void;
}) {
  const product = project.product;
  const brand = product.brand;
  const typography = product.design.typography ?? {};
  const colors = product.design.colors ?? {};
  const copy = locale === "zh" ? zh : en;

  const updateBrand = (patch: Partial<typeof brand>) =>
    onChange({ ...product, brand: { ...brand, ...patch } });
  const updateMark = (mark: AgentCanvasBrandMarkV2) => updateBrand({ mark });

  return (
    <div className="product-settings" data-preview-anchor="brand">
      <section className="product-settings-section">
        <h3>{copy.identity}</h3>
        <label className="product-field">
          <span>{copy.displayName}</span>
          <Input
            value={brand.displayName}
            maxLength={128}
            onChange={(event) =>
              updateBrand({ displayName: event.target.value })
            }
          />
        </label>

        <div className="product-field">
          <span>{copy.mark}</span>
          <div
            className="product-mark-picker"
            role="group"
            aria-label={copy.mark}
          >
            {agentCanvasBuiltinMarks.map((id) => (
              <button
                key={id}
                type="button"
                aria-label={id}
                title={id}
                aria-pressed={
                  brand.mark.kind === "builtin" && brand.mark.id === id
                }
                onClick={() => updateMark({ kind: "builtin", id })}
              >
                {markGlyphs[id]}
              </button>
            ))}
          </div>
          {brand.mark.kind === "asset" ? (
            <small className="product-asset-note">
              {copy.logicalAsset}: <code>{brand.mark.assetId}</code>
              <button
                type="button"
                onClick={() => updateMark({ kind: "builtin", id: "sparkles" })}
              >
                {copy.useBuiltin}
              </button>
            </small>
          ) : null}
        </div>

        <LogicalAssetField
          label={copy.brandAsset}
          hint={copy.brandAssetHint}
          invalidHint={copy.invalidAsset}
          value={brand.mark.kind === "asset" ? brand.mark.assetId : ""}
          onValidChange={(assetId) =>
            updateMark(
              assetId
                ? { kind: "asset", assetId }
                : { kind: "builtin", id: "sparkles" },
            )
          }
        />

        <div className="product-field">
          <span>{copy.accent}</span>
          <div
            className="product-swatches"
            role="group"
            aria-label={copy.accent}
          >
            <button
              className="product-swatch product-swatch-theme"
              type="button"
              title={copy.themeAccent}
              aria-label={copy.themeAccent}
              aria-pressed={brand.accent.kind === "theme"}
              onClick={() => updateBrand({ accent: { kind: "theme" } })}
            >
              ◐
            </button>
            {accentChoices.map(([color, label]) => (
              <button
                className="product-swatch"
                key={color}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={
                  brand.accent.kind === "custom" && brand.accent.color === color
                }
                style={{ "--product-swatch": color } as CSSProperties}
                onClick={() =>
                  updateBrand({ accent: { kind: "custom", color } })
                }
              />
            ))}
            <label className="product-custom-color" title={copy.customColor}>
              <input
                type="color"
                aria-label={copy.customColor}
                value={
                  brand.accent.kind === "custom"
                    ? brand.accent.color.slice(0, 7)
                    : "#4f46e5"
                }
                onChange={(event) =>
                  updateBrand({
                    accent: { kind: "custom", color: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="product-settings-section">
        <h3>{copy.presentation}</h3>
        <label className="product-field">
          <span>{copy.corners}</span>
          <Select
            value={brand.corners}
            onChange={(event) =>
              updateBrand({
                corners: event.target.value as typeof brand.corners,
              })
            }
          >
            <option value="theme">{copy.themeDefault}</option>
            <option value="rounded">{copy.rounded}</option>
            <option value="square">{copy.square}</option>
          </Select>
        </label>
        <Switch
          checked={brand.showPoweredBy}
          label={copy.attribution}
          onCheckedChange={(showPoweredBy) => updateBrand({ showPoweredBy })}
        />
      </section>

      <details className="product-advanced">
        <summary>{copy.advanced}</summary>
        <div className="product-advanced-body">
          <label className="product-field">
            <span>{copy.colorMode}</span>
            <Select
              value={product.design.colorMode ?? "theme"}
              onChange={(event) =>
                onChange({
                  ...product,
                  design: {
                    ...product.design,
                    colorMode: event.target.value as NonNullable<
                      typeof product.design.colorMode
                    >,
                  },
                })
              }
            >
              <option value="theme">{copy.themeDefault}</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </Select>
          </label>
          <label className="product-field">
            <span>{copy.typeface}</span>
            <Select
              value={typography.fontUi ?? ""}
              onChange={(event) =>
                onChange({
                  ...product,
                  design: {
                    ...product.design,
                    typography: {
                      ...typography,
                      fontUi: event.target.value || undefined,
                      fontDisplay: event.target.value || undefined,
                    },
                  },
                })
              }
            >
              {typefaces.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </label>
          <OptionalColor
            label={copy.canvasColor}
            value={colors.canvas}
            fallback="#f5f5f7"
            onChange={(canvas) =>
              onChange({
                ...product,
                design: { ...product.design, colors: { ...colors, canvas } },
              })
            }
          />
          <OptionalColor
            label={copy.textColor}
            value={colors.text}
            fallback="#0f0f10"
            onChange={(text) =>
              onChange({
                ...product,
                design: { ...product.design, colors: { ...colors, text } },
              })
            }
          />
          <div className="product-stylesheet-assets">
            <span>{copy.stylesheets}</span>
            <small>{copy.stylesheetsHint}</small>
            {product.extensions.stylesheets.map((stylesheet, index) => (
              <div
                className="product-stylesheet-row"
                key={`${stylesheet.layer}:${index}`}
              >
                <Select
                  aria-label={`${copy.stylesheetLayer} ${index + 1}`}
                  value={stylesheet.layer}
                  onChange={(event) =>
                    onChange(
                      updateProductStylesheet(product, index, {
                        ...stylesheet,
                        layer: event.target.value as AgentCanvasStylesheetLayer,
                      }),
                    )
                  }
                >
                  {agentCanvasStylesheetLayers.map((layer) => (
                    <option key={layer} value={layer}>
                      {layer}
                    </option>
                  ))}
                </Select>
                <LogicalAssetField
                  compact
                  label={`${copy.stylesheetAsset} ${index + 1}`}
                  invalidHint={copy.invalidAsset}
                  value={stylesheet.assetId}
                  onValidChange={(assetId) => {
                    if (assetId)
                      onChange(
                        updateProductStylesheet(product, index, {
                          ...stylesheet,
                          assetId,
                        }),
                      );
                  }}
                />
                <button
                  type="button"
                  aria-label={`${copy.removeStylesheet} ${index + 1}`}
                  onClick={() =>
                    onChange({
                      ...product,
                      extensions: {
                        ...product.extensions,
                        stylesheets: product.extensions.stylesheets.filter(
                          (_candidate, candidateIndex) =>
                            candidateIndex !== index,
                        ),
                      },
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="product-add-stylesheet"
              type="button"
              disabled={product.extensions.stylesheets.length >= 8}
              onClick={() =>
                onChange({
                  ...product,
                  extensions: {
                    ...product.extensions,
                    stylesheets: [
                      ...product.extensions.stylesheets,
                      {
                        assetId: nextProductStylesheetID(product),
                        layer: "overrides",
                      },
                    ],
                  },
                })
              }
            >
              + {copy.addStylesheet}
            </button>
          </div>
          <p className="product-extension-note">{copy.extensionNote}</p>
        </div>
      </details>
    </div>
  );
}

const safeLogicalAssetID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function LogicalAssetField({
  label,
  hint,
  invalidHint,
  value,
  compact = false,
  onValidChange,
}: {
  label: string;
  hint?: string;
  invalidHint: string;
  value: string;
  compact?: boolean;
  onValidChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const hintID = useId();
  useEffect(() => setDraft(value), [value]);
  const valid = draft.length === 0 || safeLogicalAssetID.test(draft);
  return (
    <label
      className={
        compact
          ? "product-logical-asset product-logical-asset-compact"
          : "product-field product-logical-asset"
      }
    >
      <span className={compact ? "visually-hidden" : undefined}>{label}</span>
      <Input
        aria-label={label}
        aria-describedby={hint || !valid ? hintID : undefined}
        invalid={!valid}
        autoComplete="off"
        maxLength={64}
        value={draft}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next.length === 0 || safeLogicalAssetID.test(next))
            onValidChange(next);
        }}
      />
      {hint || !valid ? (
        <small id={hintID}>{valid ? hint : invalidHint}</small>
      ) : null}
    </label>
  );
}

function updateProductStylesheet(
  product: AgentFrontendProject["product"],
  index: number,
  stylesheet: { assetId: string; layer: AgentCanvasStylesheetLayer },
): AgentFrontendProject["product"] {
  return {
    ...product,
    extensions: {
      ...product.extensions,
      stylesheets: product.extensions.stylesheets.map(
        (candidate, candidateIndex) =>
          candidateIndex === index ? stylesheet : candidate,
      ),
    },
  };
}

function nextProductStylesheetID(
  product: AgentFrontendProject["product"],
): string {
  const used = new Set(
    product.extensions.stylesheets.map((stylesheet) => stylesheet.assetId),
  );
  let ordinal = product.extensions.stylesheets.length + 1;
  while (used.has(`stylesheet-${ordinal}`)) ordinal += 1;
  return `stylesheet-${ordinal}`;
}

function OptionalColor({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string;
  value: string | undefined;
  fallback: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div className="product-field product-optional-color">
      <Switch
        checked={value !== undefined}
        label={label}
        onCheckedChange={(enabled) => onChange(enabled ? fallback : undefined)}
      />
      {value ? (
        <input
          type="color"
          aria-label={label}
          value={value.slice(0, 7)}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  );
}

const en: Record<string, string> = {
  identity: "Identity",
  displayName: "Product display name",
  mark: "Built-in mark",
  logicalAsset: "Logical asset",
  useBuiltin: "Use built-in mark",
  brandAsset: "Logical brand asset ID",
  brandAssetHint:
    "A host-resolved identifier only; URLs, paths, and image bytes are not stored here.",
  invalidAsset:
    "Use 1–64 letters, numbers, underscores, or hyphens; start with a letter.",
  accent: "Accent",
  themeAccent: "Theme accent",
  customColor: "Custom color",
  presentation: "Presentation",
  corners: "Corners",
  themeDefault: "Theme default",
  rounded: "Rounded",
  square: "Square",
  attribution: "Show Powered by AgentMatrix",
  advanced: "Advanced appearance",
  colorMode: "Color mode",
  typeface: "Typeface",
  canvasColor: "Custom canvas color",
  textColor: "Custom text color",
  stylesheets: "Stylesheet assets",
  stylesheetsHint:
    "Optional host-resolved CSS assets, applied only after host validation and isolation.",
  stylesheetLayer: "Cascade layer",
  stylesheetAsset: "Stylesheet asset ID",
  addStylesheet: "Add stylesheet asset",
  removeStylesheet: "Remove stylesheet",
  extensionNote:
    "Custom stylesheets are stored as logical asset IDs in the v2 contract. The host resolves and isolates their bytes; AgentCanvas never accepts raw scripts, HTML, or remote URLs.",
};

const zh: Record<keyof typeof en, string> = {
  identity: "产品标识",
  displayName: "产品显示名称",
  mark: "内置标识",
  logicalAsset: "逻辑素材",
  useBuiltin: "改用内置标识",
  brandAsset: "逻辑品牌素材 ID",
  brandAssetHint: "这里只保存由宿主解析的标识，不保存 URL、路径或图片内容。",
  invalidAsset: "使用 1–64 位字母、数字、下划线或连字符，并以字母开头。",
  accent: "强调色",
  themeAccent: "跟随主题",
  customColor: "自定义颜色",
  presentation: "展示",
  corners: "圆角",
  themeDefault: "跟随主题",
  rounded: "更圆润",
  square: "直角",
  attribution: "显示 Powered by AgentMatrix",
  advanced: "高级外观",
  colorMode: "颜色模式",
  typeface: "字体",
  canvasColor: "自定义画布颜色",
  textColor: "自定义文字颜色",
  stylesheets: "样式表素材",
  stylesheetsHint: "可选的宿主 CSS 素材，仅在宿主完成校验和隔离后应用。",
  stylesheetLayer: "层叠层级",
  stylesheetAsset: "样式表素材 ID",
  addStylesheet: "添加样式表素材",
  removeStylesheet: "移除样式表",
  extensionNote:
    "v2 只保存自定义样式表的逻辑素材 ID，由宿主解析并隔离其内容；AgentCanvas 不接受原始脚本、HTML 或远程 URL。",
};

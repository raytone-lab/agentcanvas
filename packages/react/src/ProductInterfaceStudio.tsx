import {
  agentCanvasBuiltinMarks,
  agentCanvasStylesheetLayers,
  canvasExperienceFromExperience,
  completeAgentCanvasExperienceV2,
  createDefaultAgentCanvasExperienceV2,
  withCanvasExperience,
  type AgentCanvasBuiltinMark,
  type AgentCanvasExperienceV2,
  type AgentCanvasStylesheetLayer,
} from "@agentmatrix/agentcanvas-contract";
import {
  useEffect,
  useId,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { ExperienceStudio } from "./ExperienceStudio.js";
import {
  productInterfaceBrandMark,
  semanticTokensForProductInterface,
} from "./ProductInterfacePreview.js";
import { ProductInterfacePreview } from "./ProductInterfacePreview.js";
import { copy, EmbedRoot, localeValue, statusContent } from "./shared.js";
import type {
  ExperiencePreviewFixture,
  ExperiencePreviewPresentation,
  ExperienceStudioScenario,
  ExperienceStudioViewport,
  ProductInterfaceStudioProps,
} from "./types.js";

type ProductGroup = "brand" | "welcome" | "canvas";

const productGroups: ProductGroup[] = ["brand", "welcome", "canvas"];
const viewports: ExperienceStudioViewport[] = ["desktop", "tablet", "mobile"];
const scenarios: ExperienceStudioScenario[] = [
  "completed",
  "welcome",
  "approval",
];
const accentChoices = [
  ["#4f46e5", "Indigo"],
  ["#0f9f94", "Teal"],
  ["#db2777", "Pink"],
  ["#ea580c", "Orange"],
  ["#334155", "Graphite"],
] as const;
const typefaces = [
  ["", "Theme default"],
  ["ui-sans-serif, system-ui, sans-serif", "System sans"],
  ["Georgia, serif", "Serif"],
  ["ui-monospace, monospace", "Monospace"],
] as const;
const markGlyphs: Record<AgentCanvasBuiltinMark, string> = {
  sparkles: "✦",
  "messages-square": "▣",
  bot: "◇",
  terminal: ">_",
  search: "⌕",
  chart: "▥",
};

/**
 * Canvas-native reference Studio for the v2 contract. It deliberately owns no
 * Workspace shell, route, save action, or authority UI. Product hosts that need
 * a different embedded composition should build that composition around
 * ProductInterfaceContractAdapter and ProductInterfacePreview.
 *
 * The Canvas view delegates to the established v1 Studio without restyling or
 * reimplementing its component behavior.
 */
export function ProductInterfaceStudio({
  value,
  onChange,
  resolveBrandAsset,
  previewFixture,
  style,
  locale: localeProp,
  disabled = false,
  readOnly = false,
  loading,
  error,
  migrationRequired,
  resetValue,
  initialScenario = "completed",
  initialViewport = "desktop",
  ...props
}: ProductInterfaceStudioProps) {
  const locale = localeValue(localeProp);
  const messages = copy[locale];
  const [group, setGroup] = useState<ProductGroup>("brand");
  const [scenario, setScenario] =
    useState<ExperienceStudioScenario>(initialScenario);
  const [viewport, setViewport] =
    useState<ExperienceStudioViewport>(initialViewport);
  const decoded = completeAgentCanvasExperienceV2(value);
  const complete = {
    ...decoded,
    surface: { mode: "agentcanvas" as const },
  };
  const status = statusContent(locale, loading, migrationRequired, error);
  const locked =
    disabled || readOnly || loading || migrationRequired || Boolean(error);
  const emit = (next: AgentCanvasExperienceV2) => {
    if (!locked)
      onChange({ ...next, surface: { mode: "agentcanvas" as const } });
  };
  const selectGroup = (next: ProductGroup) => {
    setGroup(next);
    if (next === "welcome") setScenario("welcome");
    if (next === "brand" && scenario === "welcome") setScenario("completed");
  };
  const design = complete.design;
  const accent =
    complete.brand.accent.kind === "custom"
      ? complete.brand.accent.color
      : undefined;
  const previewTokens = semanticTokensForProductInterface(design, accent);
  const presentation: ExperiencePreviewPresentation = {
    displayName: complete.brand.displayName,
    mark: productInterfaceBrandMark(complete.brand.mark, resolveBrandAsset),
    showPoweredBy: complete.brand.showPoweredBy,
    showSuggestedPrompts: complete.welcome.showSuggestedPrompts,
    colorMode: complete.design.colorMode,
  };
  const productFixture: ExperiencePreviewFixture = {
    ...previewFixture,
    title: previewFixture?.title ?? complete.brand.displayName,
    welcomeTitle: complete.welcome.headline,
    welcomeDescription: complete.welcome.supportingText,
    suggestedPrompts: complete.welcome.showSuggestedPrompts
      ? complete.welcome.suggestedPrompts
      : [],
  };

  return (
    <EmbedRoot
      className={props.className}
      style={style}
      semanticTokens={props.semanticTokens}
    >
      <section
        className="agentcanvas-product-studio"
        aria-label={messages.configure}
        aria-busy={loading || undefined}
      >
        {status ??
          (group === "canvas" ? (
            <CanvasStudioPage
              value={complete}
              emit={emit}
              group={group}
              selectGroup={selectGroup}
              messages={messages}
              locale={locale}
              locked={locked}
              reset={() =>
                emit(
                  resetValue ??
                    createDefaultAgentCanvasExperienceV2({
                      displayName: complete.brand.displayName,
                    }),
                )
              }
              props={props}
              disabled={disabled}
              readOnly={readOnly}
              loading={loading}
              error={error}
              migrationRequired={migrationRequired}
              fixture={productFixture}
              presentation={presentation}
              previewTokens={previewTokens}
            />
          ) : (
            <div className="agentcanvas-product-studio__body">
              <ProductGroupRail
                group={group}
                selectGroup={selectGroup}
                locked={locked}
                messages={messages}
                reset={() =>
                  emit(
                    resetValue ??
                      createDefaultAgentCanvasExperienceV2({
                        displayName: complete.brand.displayName,
                      }),
                  )
                }
              />
              <aside
                className="agentcanvas-product-studio__options"
                aria-label={messages[group]}
              >
                <header className="agentcanvas-product-studio__option-header">
                  <div>
                    <span>{messages.appSettings}</span>
                    <h3>{messages[group]}</h3>
                  </div>
                  <span>
                    {group === "brand" ? 4 : 3} {messages.controls}
                  </span>
                </header>
                {group === "brand" ? (
                  <BrandControls
                    value={complete}
                    emit={emit}
                    disabled={locked}
                    messages={messages}
                  />
                ) : (
                  <WelcomeControls
                    value={complete}
                    emit={emit}
                    disabled={locked}
                    messages={messages}
                  />
                )}
                <footer className="agentcanvas-product-studio__option-footer">
                  <ProductStudioIcon name="cube" />
                  {messages.controlsUsePrimitives}
                </footer>
              </aside>
              <ProductPreviewStage
                value={complete}
                locale={locale}
                capabilities={props.capabilities}
                fixture={productFixture}
                resolveBrandAsset={resolveBrandAsset}
                scenario={scenario}
                setScenario={setScenario}
                viewport={viewport}
                setViewport={setViewport}
                messages={messages}
              />
            </div>
          ))}
      </section>
    </EmbedRoot>
  );
}

function ProductGroupRail({
  group,
  selectGroup,
  locked,
  messages,
  reset,
}: {
  group: ProductGroup;
  selectGroup: (group: ProductGroup) => void;
  locked: boolean;
  messages: Messages;
  reset: () => void;
}) {
  return (
    <nav
      className="agentcanvas-product-studio__groups"
      aria-label={messages.configure}
    >
      <div className="agentcanvas-product-studio__rail-header">
        <div>
          <strong>
            AgentCanvas<span aria-hidden="true">．</span>
          </strong>
          <small>{messages.productUi} · v2</small>
        </div>
      </div>
      <span className="agentcanvas-product-studio__rail-heading">
        {messages.app}
      </span>
      {productGroups.slice(0, 2).map((candidate) => (
        <ProductGroupButton
          key={candidate}
          candidate={candidate}
          group={group}
          selectGroup={selectGroup}
          messages={messages}
        />
      ))}
      <span className="agentcanvas-product-studio__rail-heading agentcanvas-product-studio__rail-heading--spaced">
        {messages.uiUx}
      </span>
      <ProductGroupButton
        candidate="canvas"
        group={group}
        selectGroup={selectGroup}
        messages={messages}
      />
      <button
        type="button"
        className="agentcanvas-product-studio__reset"
        disabled={locked}
        onClick={reset}
      >
        <ProductStudioIcon name="reset" />
        {messages.resetInterface}
      </button>
    </nav>
  );
}

function ProductGroupButton({
  candidate,
  group,
  selectGroup,
  messages,
}: {
  candidate: ProductGroup;
  group: ProductGroup;
  selectGroup: (group: ProductGroup) => void;
  messages: Messages;
}) {
  return (
    <button
      type="button"
      aria-pressed={group === candidate}
      className="agentcanvas-product-studio__group"
      onClick={() => selectGroup(candidate)}
    >
      <span
        className="agentcanvas-product-studio__group-icon"
        data-tone={candidate}
        aria-hidden="true"
      >
        <ProductStudioIcon name={candidate} />
      </span>
      <span>{messages[candidate]}</span>
      {candidate === "canvas" ? (
        <small aria-hidden="true">
          <ProductStudioIcon name="external" />
        </small>
      ) : null}
    </button>
  );
}

function ProductPreviewStage({
  value,
  locale,
  capabilities,
  fixture,
  resolveBrandAsset,
  scenario,
  setScenario,
  viewport,
  setViewport,
  messages,
}: {
  value: ReturnType<typeof completeAgentCanvasExperienceV2>;
  locale: "en" | "zh-CN";
  capabilities: ProductInterfaceStudioProps["capabilities"];
  fixture: ExperiencePreviewFixture;
  resolveBrandAsset: ProductInterfaceStudioProps["resolveBrandAsset"];
  scenario: ExperienceStudioScenario;
  setScenario: (scenario: ExperienceStudioScenario) => void;
  viewport: ExperienceStudioViewport;
  setViewport: (viewport: ExperienceStudioViewport) => void;
  messages: Messages;
}) {
  const scenarioFixture = fixtureForScenario(fixture, scenario, messages);
  const previewValue =
    scenario === "welcome"
      ? withCanvasExperience(value, {
          ...canvasExperienceFromExperience(value),
          layout: {
            ...value.canvas.layout,
            slots: value.canvas.layout.slots.map((slot) =>
              slot.component === "OutputFrame" ||
              slot.component === "GitFrame" ||
              slot.component === "DebugDock"
                ? { ...slot, enabled: false }
                : slot,
            ),
          },
        })
      : value;
  return (
    <section
      className="agentcanvas-product-studio__stage"
      aria-label={messages.livePreview}
    >
      <div className="agentcanvas-product-studio__toolbar">
        <div className="agentcanvas-product-studio__scenario">
          <span className="agentcanvas-product-studio__live-dot" />
          <strong>{messages.livePreview}</strong>
          <select
            aria-label={messages.previewScenario}
            value={scenario}
            onChange={(event) =>
              setScenario(event.target.value as ExperienceStudioScenario)
            }
          >
            {scenarios.map((candidate) => (
              <option key={candidate} value={candidate}>
                {scenarioLabel(candidate, messages)}
              </option>
            ))}
          </select>
        </div>
        <div
          className="agentcanvas-product-studio__viewports"
          role="group"
          aria-label={messages.appPreview}
        >
          {viewports.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-label={viewportLabel(candidate, messages)}
              aria-pressed={viewport === candidate}
              onClick={() => setViewport(candidate)}
            >
              <ProductStudioIcon name={candidate} />
            </button>
          ))}
        </div>
      </div>
      <div
        className="agentcanvas-product-studio__preview-canvas"
        data-viewport={viewport}
      >
        <div className="agentcanvas-product-studio__browser">
          <div className="agentcanvas-product-studio__browser-bar">
            <span className="agentcanvas-product-studio__browser-dots">
              <i />
              <i />
              <i />
            </span>
            <span>{productAddress(value.brand.displayName)}</span>
            <button type="button" aria-label={messages.openPreview} disabled>
              <ProductStudioIcon name="external" />
            </button>
          </div>
          <ProductInterfacePreview
            value={previewValue}
            locale={locale}
            capabilities={capabilities}
            fixture={scenarioFixture}
            resolveBrandAsset={resolveBrandAsset}
            label={messages.appPreview}
          />
        </div>
      </div>
    </section>
  );
}

function CanvasStudioPage({
  value,
  emit,
  selectGroup,
  messages,
  locale,
  locked,
  reset,
  props,
  disabled,
  readOnly,
  loading,
  error,
  migrationRequired,
  fixture,
  presentation,
  previewTokens,
}: {
  value: ReturnType<typeof completeAgentCanvasExperienceV2>;
  emit: (value: AgentCanvasExperienceV2) => void;
  group: ProductGroup;
  selectGroup: (group: ProductGroup) => void;
  messages: Messages;
  locale: "en" | "zh-CN";
  locked: boolean;
  reset: () => void;
  props: Omit<ProductInterfaceStudioProps, "value" | "onChange">;
  disabled: boolean;
  readOnly: boolean;
  loading: boolean | undefined;
  error: ReactNode;
  migrationRequired: boolean | undefined;
  fixture: ExperiencePreviewFixture;
  presentation: ExperiencePreviewPresentation;
  previewTokens: ReturnType<typeof semanticTokensForProductInterface>;
}) {
  return (
    <div className="agentcanvas-product-studio__canvas-page">
      <header className="agentcanvas-product-studio__canvas-header">
        <div>
          <button type="button" onClick={() => selectGroup("brand")}>
            <ProductStudioIcon name="back" />
            {messages.productUi}
          </button>
          <span>/</span>
          <strong>{messages.canvas}</strong>
          <small>{messages.canvasPageHint}</small>
        </div>
        <div>
          <button type="button" disabled={locked} onClick={reset}>
            <ProductStudioIcon name="reset" />
            {messages.resetInterface}
          </button>
        </div>
      </header>
      <ExperienceStudio
        {...props}
        locale={locale}
        value={canvasExperienceFromExperience(value)}
        onChange={(canvas) => emit(withCanvasExperience(value, canvas))}
        disabled={disabled}
        readOnly={readOnly}
        loading={loading}
        error={error}
        migrationRequired={migrationRequired}
        previewFixture={fixture}
        previewPresentation={presentation}
        previewSemanticTokens={previewTokens}
      />
    </div>
  );
}

function BrandControls({ value, emit, disabled, messages }: ControlProps) {
  const typography = value.design.typography ?? {};
  const geometry = value.design.geometry ?? {};
  const colors = value.design.colors ?? {};
  const selectedBuiltinMark =
    value.brand.mark.kind === "builtin" ? value.brand.mark.id : undefined;
  return (
    <fieldset
      className="agentcanvas-product-studio__option-scroll"
      disabled={disabled}
    >
      <section className="agentcanvas-product-studio__option-section">
        <h4>{messages.identity}</h4>
        <div className="agentcanvas-product-studio__control-card">
          <label>
            <span>{messages.displayName}</span>
            <input
              value={value.brand.displayName}
              maxLength={128}
              onChange={(event) =>
                emit({
                  ...value,
                  brand: { ...value.brand, displayName: event.target.value },
                })
              }
            />
          </label>
        </div>
        <div className="agentcanvas-product-studio__control-card">
          <span className="agentcanvas-product-studio__control-label">
            {messages.builtinMark}
          </span>
          {value.brand.mark.kind === "asset" ? (
            <div className="agentcanvas-product-studio__asset-mark">
              <span>{value.brand.mark.assetId}</span>
              <button
                type="button"
                onClick={() =>
                  emit({
                    ...value,
                    brand: {
                      ...value.brand,
                      mark: { kind: "builtin", id: "sparkles" },
                    },
                  })
                }
              >
                {messages.useBuiltinMark}
              </button>
            </div>
          ) : (
            <div
              className="agentcanvas-product-studio__mark-picker"
              role="group"
              aria-label={messages.builtinMark}
            >
              {agentCanvasBuiltinMarks.map((mark) => (
                <button
                  key={mark}
                  type="button"
                  title={mark}
                  aria-label={mark}
                  aria-pressed={selectedBuiltinMark === mark}
                  onClick={() =>
                    emit({
                      ...value,
                      brand: {
                        ...value.brand,
                        mark: { kind: "builtin", id: mark },
                      },
                    })
                  }
                >
                  {markGlyphs[mark]}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="agentcanvas-product-studio__control-card">
          <LogicalAssetInput
            label={messages.logicalAssetId}
            hint={messages.logicalAssetHint}
            invalidHint={messages.invalidAssetId}
            value={
              value.brand.mark.kind === "asset" ? value.brand.mark.assetId : ""
            }
            onValidChange={(assetId) =>
              emit({
                ...value,
                brand: {
                  ...value.brand,
                  mark: assetId
                    ? { kind: "asset", assetId }
                    : {
                        kind: "builtin",
                        id: selectedBuiltinMark ?? "sparkles",
                      },
                },
              })
            }
          />
        </div>
        <div className="agentcanvas-product-studio__control-card">
          <span className="agentcanvas-product-studio__control-label">
            {messages.accent}
          </span>
          <div
            className="agentcanvas-product-studio__swatches"
            role="group"
            aria-label={messages.accent}
          >
            <button
              type="button"
              className="agentcanvas-product-studio__swatch agentcanvas-product-studio__swatch--theme"
              aria-label={messages.themeAccent}
              title={messages.themeAccent}
              aria-pressed={value.brand.accent.kind === "theme"}
              onClick={() =>
                emit({
                  ...value,
                  brand: { ...value.brand, accent: { kind: "theme" } },
                })
              }
            >
              <span>◐</span>
            </button>
            {accentChoices.map(([color, label]) => (
              <button
                key={color}
                type="button"
                className="agentcanvas-product-studio__swatch"
                style={{ "--agentcanvas-swatch": color } as CSSProperties}
                aria-label={label}
                title={label}
                aria-pressed={
                  value.brand.accent.kind === "custom" &&
                  value.brand.accent.color === color
                }
                onClick={() =>
                  emit({
                    ...value,
                    brand: {
                      ...value.brand,
                      accent: { kind: "custom", color },
                    },
                  })
                }
              />
            ))}
            <label className="agentcanvas-product-studio__custom-swatch">
              <span>{messages.customColor}</span>
              <input
                type="color"
                aria-label={messages.customColor}
                value={
                  value.brand.accent.kind === "custom"
                    ? value.brand.accent.color.slice(0, 7)
                    : "#4f46e5"
                }
                onChange={(event) =>
                  emit({
                    ...value,
                    brand: {
                      ...value.brand,
                      accent: { kind: "custom", color: event.target.value },
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
      </section>
      <section className="agentcanvas-product-studio__option-section">
        <h4>{messages.shape}</h4>
        <div className="agentcanvas-product-studio__control-card">
          <span className="agentcanvas-product-studio__control-label">
            {messages.corners}
          </span>
          <div
            className="agentcanvas-product-studio__segments"
            role="group"
            aria-label={messages.corners}
          >
            {(["theme", "rounded", "square"] as const).map((corners) => (
              <button
                key={corners}
                type="button"
                aria-pressed={value.brand.corners === corners}
                onClick={() =>
                  emit({
                    ...value,
                    brand: { ...value.brand, corners },
                  })
                }
              >
                {cornerLabel(corners, messages)}
              </button>
            ))}
          </div>
        </div>
        <ToggleRow
          label={messages.attribution}
          description={messages.attributionHint}
          checked={value.brand.showPoweredBy}
          onChange={(showPoweredBy) =>
            emit({
              ...value,
              brand: { ...value.brand, showPoweredBy },
            })
          }
        />
      </section>
      <details className="agentcanvas-product-studio__advanced">
        <summary>{messages.advancedAppearance}</summary>
        <div className="agentcanvas-product-studio__advanced-body">
          <label>
            <span>{messages.colorMode}</span>
            <select
              value={value.design.colorMode ?? "theme"}
              onChange={(event) =>
                emit({
                  ...value,
                  design: {
                    ...value.design,
                    colorMode: event.target.value as NonNullable<
                      typeof value.design.colorMode
                    >,
                  },
                })
              }
            >
              {(["theme", "light", "dark", "system"] as const).map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>{messages.typeface}</span>
            <select
              value={typography.fontUi ?? ""}
              onChange={(event) =>
                emit({
                  ...value,
                  design: {
                    ...value.design,
                    typography: {
                      ...typography,
                      fontUi: event.target.value || undefined,
                      fontDisplay: event.target.value || undefined,
                    },
                  },
                })
              }
            >
              {typefaces.map(([font, label]) => (
                <option key={font} value={font}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <OptionalColorControl
            label={messages.canvasColor}
            customLabel={messages.customColor}
            value={colors.canvas}
            fallback="#f5f5f7"
            onChange={(canvas) =>
              emit({
                ...value,
                design: {
                  ...value.design,
                  colors: { ...colors, canvas },
                },
              })
            }
          />
          <OptionalColorControl
            label={messages.textColor}
            customLabel={messages.customColor}
            value={colors.text}
            fallback="#0f0f10"
            onChange={(text) =>
              emit({
                ...value,
                design: {
                  ...value.design,
                  colors: { ...colors, text },
                },
              })
            }
          />
          <RangeControl
            label={messages.baseSize}
            value={typography.baseSize ?? 14}
            min={11}
            max={20}
            step={1}
            onChange={(baseSize) =>
              emit({
                ...value,
                design: {
                  ...value.design,
                  typography: { ...typography, baseSize },
                },
              })
            }
          />
          {(
            [
              ["spacingScale", messages.spacing, 0.75, 1.5],
              ["radiusScale", messages.radius, 0, 2],
              ["borderScale", messages.border, 0, 2],
            ] as const
          ).map(([key, label, min, max]) => (
            <RangeControl
              key={key}
              label={label}
              value={geometry[key] ?? 1}
              min={min}
              max={max}
              step={0.05}
              onChange={(next) =>
                emit({
                  ...value,
                  design: {
                    ...value.design,
                    geometry: { ...geometry, [key]: next },
                  },
                })
              }
            />
          ))}
          <div className="agentcanvas-product-studio__stylesheet-assets">
            <span>{messages.stylesheetAssets}</span>
            <small>{messages.stylesheetAssetsHint}</small>
            {value.extensions.stylesheets.map((stylesheet, index) => (
              <div
                className="agentcanvas-product-studio__stylesheet-row"
                key={`${stylesheet.layer}:${index}`}
              >
                <select
                  aria-label={`${messages.stylesheetLayer} ${index + 1}`}
                  value={stylesheet.layer}
                  onChange={(event) =>
                    emit(
                      updateStylesheet(value, index, {
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
                </select>
                <LogicalAssetInput
                  label={`${messages.logicalAssetId} ${index + 1}`}
                  hideLabel
                  invalidHint={messages.invalidAssetId}
                  value={stylesheet.assetId}
                  onValidChange={(assetId) => {
                    if (assetId)
                      emit(
                        updateStylesheet(value, index, {
                          ...stylesheet,
                          assetId,
                        }),
                      );
                  }}
                />
                <button
                  type="button"
                  aria-label={`${messages.removeStylesheet} ${index + 1}`}
                  onClick={() => emit(removeStylesheet(value, index))}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              className="agentcanvas-product-studio__add-stylesheet"
              type="button"
              disabled={value.extensions.stylesheets.length >= 8}
              onClick={() =>
                emit({
                  ...value,
                  extensions: {
                    ...value.extensions,
                    stylesheets: [
                      ...value.extensions.stylesheets,
                      {
                        assetId: nextStylesheetID(value),
                        layer: "overrides",
                      },
                    ],
                  },
                })
              }
            >
              + {messages.addStylesheet}
            </button>
          </div>
        </div>
      </details>
    </fieldset>
  );
}

const safeLogicalAssetID = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/;

function LogicalAssetInput({
  label,
  hint,
  invalidHint,
  value,
  hideLabel = false,
  onValidChange,
}: {
  label: string;
  hint?: string;
  invalidHint: string;
  value: string;
  hideLabel?: boolean;
  onValidChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const hintID = useId();
  useEffect(() => setDraft(value), [value]);
  const valid = draft.length === 0 || safeLogicalAssetID.test(draft);
  return (
    <label className="agentcanvas-product-studio__logical-asset">
      <span className={hideLabel ? "agentcanvas-visually-hidden" : undefined}>
        {label}
      </span>
      <input
        aria-label={label}
        aria-invalid={!valid || undefined}
        aria-describedby={hint || !valid ? hintID : undefined}
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

function updateStylesheet(
  value: ReturnType<typeof completeAgentCanvasExperienceV2>,
  index: number,
  stylesheet: { assetId: string; layer: AgentCanvasStylesheetLayer },
): AgentCanvasExperienceV2 {
  return {
    ...value,
    extensions: {
      ...value.extensions,
      stylesheets: value.extensions.stylesheets.map(
        (candidate, candidateIndex) =>
          candidateIndex === index ? stylesheet : candidate,
      ),
    },
  };
}

function removeStylesheet(
  value: ReturnType<typeof completeAgentCanvasExperienceV2>,
  index: number,
): AgentCanvasExperienceV2 {
  return {
    ...value,
    extensions: {
      ...value.extensions,
      stylesheets: value.extensions.stylesheets.filter(
        (_candidate, candidateIndex) => candidateIndex !== index,
      ),
    },
  };
}

function nextStylesheetID(
  value: ReturnType<typeof completeAgentCanvasExperienceV2>,
): string {
  const used = new Set(
    value.extensions.stylesheets.map((stylesheet) => stylesheet.assetId),
  );
  let ordinal = value.extensions.stylesheets.length + 1;
  while (used.has(`stylesheet-${ordinal}`)) ordinal += 1;
  return `stylesheet-${ordinal}`;
}

function WelcomeControls({ value, emit, disabled, messages }: ControlProps) {
  const promptHintID = useId();
  return (
    <fieldset
      className="agentcanvas-product-studio__option-scroll"
      disabled={disabled}
    >
      <section className="agentcanvas-product-studio__option-section">
        <h4>{messages.content}</h4>
        <div className="agentcanvas-product-studio__control-card">
          <label>
            <span>{messages.headline}</span>
            <input
              value={value.welcome.headline}
              maxLength={160}
              onChange={(event) =>
                emit({
                  ...value,
                  welcome: { ...value.welcome, headline: event.target.value },
                })
              }
            />
          </label>
        </div>
        <div className="agentcanvas-product-studio__control-card">
          <label>
            <span>{messages.supportingText}</span>
            <textarea
              value={value.welcome.supportingText}
              maxLength={512}
              onChange={(event) =>
                emit({
                  ...value,
                  welcome: {
                    ...value.welcome,
                    supportingText: event.target.value,
                  },
                })
              }
            />
          </label>
        </div>
      </section>
      <section className="agentcanvas-product-studio__option-section">
        <h4>{messages.suggestions}</h4>
        <ToggleRow
          label={messages.showSuggestedPrompts}
          description={messages.suggestedPromptsHint}
          checked={value.welcome.showSuggestedPrompts}
          onChange={(showSuggestedPrompts) =>
            emit({
              ...value,
              welcome: { ...value.welcome, showSuggestedPrompts },
            })
          }
        />
        <div className="agentcanvas-product-studio__control-card">
          <label>
            <span>{messages.suggestedPrompts}</span>
            <textarea
              value={value.welcome.suggestedPrompts.join("\n")}
              aria-describedby={promptHintID}
              disabled={!value.welcome.showSuggestedPrompts}
              onChange={(event) =>
                emit({
                  ...value,
                  welcome: {
                    ...value.welcome,
                    suggestedPrompts: event.target.value
                      .split("\n")
                      .map((prompt) => prompt.slice(0, 280))
                      .filter(Boolean)
                      .slice(0, 6),
                  },
                })
              }
            />
            <small id={promptHintID}>{messages.suggestedPromptsHint}</small>
          </label>
        </div>
      </section>
    </fieldset>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="agentcanvas-product-studio__toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <i />
      </button>
    </div>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label>
      <span>
        {label} · {value}
      </span>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function OptionalColorControl({
  label,
  customLabel,
  value,
  fallback,
  onChange,
}: {
  label: string;
  customLabel: string;
  value: string | undefined;
  fallback: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label>
      <span>{label}</span>
      <span className="agentcanvas-product-studio__optional-color">
        <input
          type="checkbox"
          checked={value !== undefined}
          onChange={(event) =>
            onChange(event.target.checked ? fallback : undefined)
          }
        />
        <span>{customLabel}</span>
        {value ? (
          <input
            type="color"
            aria-label={label}
            value={value.slice(0, 7)}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : null}
      </span>
    </label>
  );
}

function ProductStudioIcon({ name }: { name: ProductIconName }) {
  const paths: Record<ProductIconName, ReactNode> = {
    brand: (
      <>
        <path d="M12 3a9 9 0 1 0 9 9c0-1.2-.8-2-2-2h-2.5A2.5 2.5 0 0 1 14 7.5V5c0-1.2-.8-2-2-2z" />
        <path d="M7.5 11h.01M9.5 7.5h.01M14.5 16h.01" />
      </>
    ),
    welcome: (
      <>
        <path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4z" />
        <path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7z" />
      </>
    ),
    canvas: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16M9 9h12" />
      </>
    ),
    desktop: (
      <>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 22h8M12 18v4" />
      </>
    ),
    tablet: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
    mobile: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
    external: (
      <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    ),
    reset: <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />,
    back: <path d="m15 18-6-6 6-6" />,
    cube: (
      <>
        <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function fixtureForScenario(
  fixture: ExperiencePreviewFixture,
  scenario: ExperienceStudioScenario,
  messages: Messages,
): ExperiencePreviewFixture {
  if (scenario === "welcome") return { ...fixture, messages: [] };
  if (scenario !== "approval") return fixture;
  return {
    ...fixture,
    toolCall: {
      name: fixture.toolCall?.name ?? "analyze_files",
      summary: messages.approvalPrompt,
      status: "approval-required",
    },
  };
}

function scenarioLabel(
  scenario: ExperienceStudioScenario,
  messages: Messages,
): string {
  return {
    completed: messages.completedRun,
    welcome: messages.welcomeScreen,
    approval: messages.approvalNeeded,
  }[scenario];
}

function viewportLabel(
  viewport: ExperienceStudioViewport,
  messages: Messages,
): string {
  return {
    desktop: messages.desktopPreview,
    tablet: messages.tabletPreview,
    mobile: messages.mobilePreview,
  }[viewport];
}

function cornerLabel(
  corners: "theme" | "rounded" | "square",
  messages: Messages,
): string {
  return {
    theme: messages.themeCorners,
    rounded: messages.roundedCorners,
    square: messages.squareCorners,
  }[corners];
}

function productAddress(displayName: string): string {
  const slug = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${slug || "agent-app"}.agentmatrix.app`;
}

type ProductIconName =
  | ProductGroup
  | ExperienceStudioViewport
  | "external"
  | "reset"
  | "back"
  | "cube";

type Messages = (typeof copy)["en"] | (typeof copy)["zh-CN"];

type ControlProps = {
  value: ReturnType<typeof completeAgentCanvasExperienceV2>;
  emit: (value: AgentCanvasExperienceV2) => void;
  disabled: boolean;
  messages: Messages;
};

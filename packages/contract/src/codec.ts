import {
  AGENTCANVAS_EXPERIENCE_V1,
  AGENTCANVAS_EXPERIENCE_V2,
  agentCanvasBuiltinMarks,
  agentCanvasColorModes,
  agentCanvasRegions,
  agentCanvasSlotComponents,
  agentCanvasStylesheetLayers,
  agentCanvasSurfaceModes,
  agentCanvasTemplates,
  themePresetIds,
  type AgentCanvasExperience,
  type AgentCanvasExperienceV1,
  type AgentCanvasExperienceV2,
} from "./types.js";
import {
  completeAgentCanvasExperience,
  defaultAgentCanvasExperienceV2,
} from "./defaults.js";

export type ExperienceValidationIssue = {
  path: string;
  message: string;
};

export class ExperienceValidationError extends Error {
  readonly issues: ExperienceValidationIssue[];

  constructor(issues: ExperienceValidationIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "));
    this.name = "ExperienceValidationError";
    this.issues = issues;
  }
}

export class UnsupportedExperienceVersionError extends Error {
  readonly version: unknown;

  constructor(version: unknown) {
    super(
      `Unsupported AgentCanvas Experience contract version: ${String(version)}`,
    );
    this.name = "UnsupportedExperienceVersionError";
    this.version = version;
  }
}

const ROOT_KEYS = [
  "contractVersion",
  "template",
  "layout",
  "theme",
  "composer",
  "conversation",
  "sidebar",
  "context",
  "toolCalls",
  "reasoning",
  "blocks",
  "output",
  "export",
] as const;

const V2_ROOT_KEYS = [
  "contractVersion",
  "surface",
  "brand",
  "welcome",
  "canvas",
  "design",
  "extensions",
] as const;

export function validateAgentCanvasExperience(
  input: unknown,
): ExperienceValidationIssue[] {
  const issues: ExperienceValidationIssue[] = [];
  const root = objectValue(input, "$", ROOT_KEYS, issues);
  if (!root) return issues;

  enumValue(
    root.contractVersion,
    "$.contractVersion",
    [AGENTCANVAS_EXPERIENCE_V1],
    issues,
    true,
  );
  enumValue(root.template, "$.template", agentCanvasTemplates, issues, true);

  validateLayout(root.layout, issues);
  validateTheme(root.theme, issues);
  booleanObject(
    root.composer,
    "$.composer",
    [
      "fileUpload",
      "mic",
      "thinkingBudget",
      "modelSwitcher",
      "toolToggle",
      "promptShortcuts",
    ],
    issues,
  );
  validateConversation(root.conversation, issues);
  booleanObject(
    root.sidebar,
    "$.sidebar",
    ["newButton", "search", "grouping", "footer"],
    issues,
  );
  booleanObject(root.context, "$.context", ["attachmentChips"], issues);
  validateToolCalls(root.toolCalls, issues);
  validateReasoning(root.reasoning, issues);
  booleanObject(
    root.blocks,
    "$.blocks",
    ["codeDiff", "errorCollapse", "toolLogTail"],
    issues,
  );
  validateOutput(root.output, issues);
  validateExport(root.export, issues);

  return issues;
}

export function decodeAgentCanvasExperience(
  input: unknown,
): AgentCanvasExperienceV1 {
  const issues = validateAgentCanvasExperience(input);
  if (issues.length > 0) throw new ExperienceValidationError(issues);
  return JSON.parse(JSON.stringify(input)) as AgentCanvasExperienceV1;
}

export function parseAgentCanvasExperience(
  json: string,
): AgentCanvasExperienceV1 {
  const value = parseJSON(json);
  return decodeAgentCanvasExperience(value);
}

export function encodeAgentCanvasExperience(
  value: AgentCanvasExperienceV1,
): string {
  return stableStringify(decodeAgentCanvasExperience(value));
}

export function validateAgentCanvasExperienceV2(
  input: unknown,
): ExperienceValidationIssue[] {
  const issues: ExperienceValidationIssue[] = [];
  const root = objectValue(input, "$", V2_ROOT_KEYS, issues);
  if (!root) return issues;

  enumValue(
    root.contractVersion,
    "$.contractVersion",
    [AGENTCANVAS_EXPERIENCE_V2],
    issues,
    true,
  );
  validateSurfaceV2(root.surface, issues);
  validateBrandV2(root.brand, issues);
  validateWelcomeV2(root.welcome, issues);
  validateCanvasV2(root.canvas, issues);
  validateDesignV2(root.design, issues);
  validateExtensionsV2(root.extensions, issues);
  return issues;
}

export function decodeAgentCanvasExperienceV2(
  input: unknown,
): AgentCanvasExperienceV2 {
  const issues = validateAgentCanvasExperienceV2(input);
  if (issues.length > 0) throw new ExperienceValidationError(issues);
  return clone(input) as AgentCanvasExperienceV2;
}

export function parseAgentCanvasExperienceV2(
  json: string,
): AgentCanvasExperienceV2 {
  return decodeAgentCanvasExperienceV2(parseJSON(json));
}

export function encodeAgentCanvasExperienceV2(
  value: AgentCanvasExperienceV2,
): string {
  return stableStringify(decodeAgentCanvasExperienceV2(value));
}

export function validateSupportedAgentCanvasExperience(
  input: unknown,
): ExperienceValidationIssue[] {
  if (!isRecord(input)) return [{ path: "$", message: "must be an object" }];
  if (input.contractVersion === AGENTCANVAS_EXPERIENCE_V1)
    return validateAgentCanvasExperience(input);
  if (input.contractVersion === AGENTCANVAS_EXPERIENCE_V2)
    return validateAgentCanvasExperienceV2(input);
  return [
    {
      path: "$.contractVersion",
      message: `must be one of: ${AGENTCANVAS_EXPERIENCE_V1}, ${AGENTCANVAS_EXPERIENCE_V2}`,
    },
  ];
}

export function decodeSupportedAgentCanvasExperience(
  input: unknown,
): AgentCanvasExperience {
  if (!isRecord(input))
    throw new ExperienceValidationError([
      { path: "$", message: "must be an object" },
    ]);
  if (input.contractVersion === AGENTCANVAS_EXPERIENCE_V1)
    return decodeAgentCanvasExperience(input);
  if (input.contractVersion === AGENTCANVAS_EXPERIENCE_V2)
    return decodeAgentCanvasExperienceV2(input);
  throw new UnsupportedExperienceVersionError(input.contractVersion);
}

export function parseSupportedAgentCanvasExperience(
  json: string,
): AgentCanvasExperience {
  return decodeSupportedAgentCanvasExperience(parseJSON(json));
}

export function encodeSupportedAgentCanvasExperience(
  value: AgentCanvasExperience,
): string {
  return value.contractVersion === AGENTCANVAS_EXPERIENCE_V2
    ? encodeAgentCanvasExperienceV2(value)
    : encodeAgentCanvasExperience(value);
}

export function migrateAgentCanvasExperience(
  input: unknown,
  targetVersion:
    | typeof AGENTCANVAS_EXPERIENCE_V1
    | typeof AGENTCANVAS_EXPERIENCE_V2 = AGENTCANVAS_EXPERIENCE_V1,
): AgentCanvasExperience {
  if (
    targetVersion !== AGENTCANVAS_EXPERIENCE_V1 &&
    targetVersion !== AGENTCANVAS_EXPERIENCE_V2
  ) {
    throw new UnsupportedExperienceVersionError(targetVersion);
  }
  if (!isRecord(input)) throw new UnsupportedExperienceVersionError(undefined);
  if (input.contractVersion === targetVersion)
    return decodeSupportedAgentCanvasExperience(input);
  if (
    input.contractVersion === AGENTCANVAS_EXPERIENCE_V1 &&
    targetVersion === AGENTCANVAS_EXPERIENCE_V2
  ) {
    const v1 = completeAgentCanvasExperience(
      decodeAgentCanvasExperience(input),
    );
    const { contractVersion: _version, ...canvas } = clone(v1);
    return decodeAgentCanvasExperienceV2({
      ...clone(defaultAgentCanvasExperienceV2),
      canvas,
    });
  }
  throw new UnsupportedExperienceVersionError(input.contractVersion);
}

export const supportedExperienceMigrations: readonly {
  from: string;
  to: string;
}[] = [
  {
    from: AGENTCANVAS_EXPERIENCE_V1,
    to: AGENTCANVAS_EXPERIENCE_V2,
  },
];

function validateSurfaceV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  const surface = objectValue(value, "$.surface", ["mode"], issues);
  if (!surface) return;
  enumValue(
    surface.mode,
    "$.surface.mode",
    agentCanvasSurfaceModes,
    issues,
    true,
  );
}

function validateBrandV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  const brand = objectValue(
    value,
    "$.brand",
    ["displayName", "mark", "accent", "corners", "showPoweredBy"],
    issues,
  );
  if (!brand) return;
  textValue(brand.displayName, "$.brand.displayName", 1, 128, issues, true);
  const mark = objectValue(
    brand.mark,
    "$.brand.mark",
    ["kind", "id", "assetId"],
    issues,
  );
  if (mark) {
    enumValue(
      mark.kind,
      "$.brand.mark.kind",
      ["builtin", "asset"],
      issues,
      true,
    );
    if (mark.kind === "builtin") {
      enumValue(
        mark.id,
        "$.brand.mark.id",
        agentCanvasBuiltinMarks,
        issues,
        true,
      );
      if (mark.assetId !== undefined)
        issues.push({
          path: "$.brand.mark.assetId",
          message: "is not supported for a builtin mark",
        });
    } else if (mark.kind === "asset") {
      safeId(mark.assetId, "$.brand.mark.assetId", issues, true);
      if (mark.id !== undefined)
        issues.push({
          path: "$.brand.mark.id",
          message: "is not supported for an asset mark",
        });
    }
  }
  const accent = objectValue(
    brand.accent,
    "$.brand.accent",
    ["kind", "color"],
    issues,
  );
  if (accent) {
    enumValue(
      accent.kind,
      "$.brand.accent.kind",
      ["theme", "custom"],
      issues,
      true,
    );
    if (accent.kind === "custom")
      colorValue(accent.color, "$.brand.accent.color", issues, true);
    else if (accent.kind === "theme" && accent.color !== undefined)
      issues.push({
        path: "$.brand.accent.color",
        message: "is not supported for a theme accent",
      });
  }
  enumValue(
    brand.corners,
    "$.brand.corners",
    ["theme", "rounded", "square"],
    issues,
    true,
  );
  booleanValue(brand.showPoweredBy, "$.brand.showPoweredBy", issues, true);
}

function validateWelcomeV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  const welcome = objectValue(
    value,
    "$.welcome",
    ["headline", "supportingText", "suggestedPrompts", "showSuggestedPrompts"],
    issues,
  );
  if (!welcome) return;
  textValue(welcome.headline, "$.welcome.headline", 1, 160, issues, true);
  textValue(
    welcome.supportingText,
    "$.welcome.supportingText",
    0,
    512,
    issues,
    true,
  );
  if (welcome.suggestedPrompts === undefined) {
    issues.push({ path: "$.welcome.suggestedPrompts", message: "is required" });
  } else {
    arrayValue(
      welcome.suggestedPrompts,
      "$.welcome.suggestedPrompts",
      6,
      true,
      issues,
      (item, path) => textValue(item, path, 1, 280, issues, true),
    );
  }
  booleanValue(
    welcome.showSuggestedPrompts,
    "$.welcome.showSuggestedPrompts",
    issues,
    true,
  );
}

function validateCanvasV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  const allowed = ROOT_KEYS.filter((key) => key !== "contractVersion");
  const canvas = objectValue(value, "$.canvas", allowed, issues);
  if (!canvas) return;
  const nestedIssues = validateAgentCanvasExperience({
    ...canvas,
    contractVersion: AGENTCANVAS_EXPERIENCE_V1,
  });
  for (const issue of nestedIssues) {
    if (issue.path === "$.contractVersion") continue;
    issues.push({
      ...issue,
      path: issue.path === "$" ? "$.canvas" : `$.canvas${issue.path.slice(1)}`,
    });
  }
}

function validateDesignV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const design = objectValue(
    value,
    "$.design",
    ["colorMode", "colors", "typography", "geometry"],
    issues,
  );
  if (!design) return;
  enumValue(
    design.colorMode,
    "$.design.colorMode",
    agentCanvasColorModes,
    issues,
  );
  if (design.colors !== undefined) {
    const colorKeys = [
      "canvas",
      "panel",
      "raised",
      "inset",
      "hover",
      "text",
      "textSecondary",
      "textMuted",
      "border",
      "borderStrong",
      "action",
      "actionText",
      "success",
      "warning",
      "danger",
      "focus",
    ];
    const colors = objectValue(
      design.colors,
      "$.design.colors",
      colorKeys,
      issues,
    );
    if (colors)
      for (const key of colorKeys)
        colorValue(colors[key], `$.design.colors.${key}`, issues);
  }
  if (design.typography !== undefined) {
    const typography = objectValue(
      design.typography,
      "$.design.typography",
      ["fontUi", "fontDisplay", "fontMono", "baseSize", "headingScale"],
      issues,
    );
    if (typography) {
      for (const key of ["fontUi", "fontDisplay", "fontMono"])
        fontFamilyValue(typography[key], `$.design.typography.${key}`, issues);
      numberValue(
        typography.baseSize,
        "$.design.typography.baseSize",
        11,
        20,
        issues,
      );
      numberValue(
        typography.headingScale,
        "$.design.typography.headingScale",
        0.9,
        2,
        issues,
      );
    }
  }
  if (design.geometry !== undefined) {
    const geometry = objectValue(
      design.geometry,
      "$.design.geometry",
      ["spacingScale", "radiusScale", "borderScale"],
      issues,
    );
    if (geometry) {
      numberValue(
        geometry.spacingScale,
        "$.design.geometry.spacingScale",
        0.75,
        1.5,
        issues,
      );
      numberValue(
        geometry.radiusScale,
        "$.design.geometry.radiusScale",
        0,
        2,
        issues,
      );
      numberValue(
        geometry.borderScale,
        "$.design.geometry.borderScale",
        0,
        2,
        issues,
      );
    }
  }
}

function validateExtensionsV2(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const extensions = objectValue(
    value,
    "$.extensions",
    ["stylesheets"],
    issues,
  );
  if (!extensions || extensions.stylesheets === undefined) return;
  arrayValue(
    extensions.stylesheets,
    "$.extensions.stylesheets",
    8,
    true,
    issues,
    (item, path) => {
      const stylesheet = objectValue(item, path, ["assetId", "layer"], issues);
      if (!stylesheet) return;
      safeId(stylesheet.assetId, `${path}.assetId`, issues, true);
      enumValue(
        stylesheet.layer,
        `${path}.layer`,
        agentCanvasStylesheetLayers,
        issues,
        true,
      );
    },
  );
}

function validateLayout(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const layout = objectValue(
    value,
    "$.layout",
    ["regions", "slots", "mainSize", "rightPanelSize", "bottomDockSize"],
    issues,
  );
  if (!layout) return;
  if (layout.regions !== undefined) {
    arrayValue(
      layout.regions,
      "$.layout.regions",
      6,
      true,
      issues,
      (item, path) => enumValue(item, path, agentCanvasRegions, issues),
    );
  }
  if (layout.slots !== undefined) {
    arrayValue(
      layout.slots,
      "$.layout.slots",
      32,
      false,
      issues,
      (item, path) => {
        const slot = objectValue(
          item,
          path,
          ["id", "region", "component", "enabled"],
          issues,
        );
        if (!slot) return;
        safeId(slot.id, `${path}.id`, issues, true);
        enumValue(
          slot.region,
          `${path}.region`,
          agentCanvasRegions,
          issues,
          true,
        );
        enumValue(
          slot.component,
          `${path}.component`,
          agentCanvasSlotComponents,
          issues,
          true,
        );
        booleanValue(slot.enabled, `${path}.enabled`, issues, true);
      },
    );
  }
  numberValue(layout.mainSize, "$.layout.mainSize", 1, 100, issues);
  numberValue(layout.rightPanelSize, "$.layout.rightPanelSize", 0, 100, issues);
  numberValue(layout.bottomDockSize, "$.layout.bottomDockSize", 0, 100, issues);
}

function validateTheme(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const theme = objectValue(
    value,
    "$.theme",
    ["preset", "density", "radius", "motion"],
    issues,
  );
  if (!theme) return;
  enumValue(theme.preset, "$.theme.preset", themePresetIds, issues);
  enumValue(
    theme.density,
    "$.theme.density",
    ["compact", "comfortable"],
    issues,
  );
  numberValue(theme.radius, "$.theme.radius", 0, 32, issues);
  if (theme.motion === undefined) return;
  const motion = objectValue(
    theme.motion,
    "$.theme.motion",
    ["reasoning", "writing", "toolCall", "writingParams"],
    issues,
  );
  if (!motion) return;
  enumValue(
    motion.reasoning,
    "$.theme.motion.reasoning",
    ["minimal", "pulse", "wave", "terminal", "shimmer", "bars", "orbit"],
    issues,
  );
  enumValue(
    motion.writing,
    "$.theme.motion.writing",
    ["smooth-stream", "typewriter", "chunked"],
    issues,
  );
  enumValue(
    motion.toolCall,
    "$.theme.motion.toolCall",
    ["card", "timeline", "inline", "drawer"],
    issues,
  );
  if (motion.writingParams === undefined) return;
  const params = objectValue(
    motion.writingParams,
    "$.theme.motion.writingParams",
    ["streamWps", "typeCps", "chunkSize", "chunkIntervalMs"],
    issues,
  );
  if (!params) return;
  numberValue(
    params.streamWps,
    "$.theme.motion.writingParams.streamWps",
    1,
    240,
    issues,
  );
  numberValue(
    params.typeCps,
    "$.theme.motion.writingParams.typeCps",
    1,
    1000,
    issues,
  );
  numberValue(
    params.chunkSize,
    "$.theme.motion.writingParams.chunkSize",
    1,
    200,
    issues,
    true,
  );
  numberValue(
    params.chunkIntervalMs,
    "$.theme.motion.writingParams.chunkIntervalMs",
    0,
    5000,
    issues,
    true,
  );
}

function validateConversation(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const conversation = objectValue(
    value,
    "$.conversation",
    [
      "speakerLabels",
      "userAvatar",
      "agentAvatar",
      "messageActions",
      "emptyState",
    ],
    issues,
  );
  if (!conversation) return;
  for (const key of ["speakerLabels", "userAvatar", "agentAvatar"] as const) {
    booleanValue(conversation[key], `$.conversation.${key}`, issues);
  }
  booleanObject(
    conversation.messageActions,
    "$.conversation.messageActions",
    ["copy", "regenerate", "edit"],
    issues,
  );
  enumValue(
    conversation.emptyState,
    "$.conversation.emptyState",
    ["minimal", "suggested-prompts", "capability-hints"],
    issues,
  );
}

function validateToolCalls(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const toolCalls = objectValue(
    value,
    "$.toolCalls",
    ["detail", "progress", "approval"],
    issues,
  );
  if (!toolCalls) return;
  enumValue(
    toolCalls.detail,
    "$.toolCalls.detail",
    ["full", "output-only", "summary"],
    issues,
  );
  enumValue(
    toolCalls.progress,
    "$.toolCalls.progress",
    ["status-icon", "bar"],
    issues,
  );
  enumValue(
    toolCalls.approval,
    "$.toolCalls.approval",
    ["inline", "hidden"],
    issues,
  );
}

function validateReasoning(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const reasoning = objectValue(
    value,
    "$.reasoning",
    ["show", "collapse", "expandable"],
    issues,
  );
  if (!reasoning) return;
  enumValue(
    reasoning.show,
    "$.reasoning.show",
    ["status", "summary", "thinking"],
    issues,
  );
  enumValue(
    reasoning.collapse,
    "$.reasoning.collapse",
    ["auto", "manual", "summary-first", "expanded"],
    issues,
  );
  booleanValue(reasoning.expandable, "$.reasoning.expandable", issues);
}

function validateOutput(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const output = objectValue(
    value,
    "$.output",
    ["source", "artifactRenderer", "surface", "supportedArtifactRenderers"],
    issues,
  );
  if (!output) return;
  enumValue(output.source, "$.output.source", ["artifact", "console"], issues);
  enumValue(
    output.artifactRenderer,
    "$.output.artifactRenderer",
    ["auto", "code", "diff", "markdown", "preview", "data"],
    issues,
  );
  enumValue(
    output.surface,
    "$.output.surface",
    ["right-panel", "overlay"],
    issues,
  );
  if (output.supportedArtifactRenderers !== undefined) {
    arrayValue(
      output.supportedArtifactRenderers,
      "$.output.supportedArtifactRenderers",
      5,
      true,
      issues,
      (item, path) =>
        enumValue(
          item,
          path,
          ["code", "diff", "markdown", "preview", "data"],
          issues,
        ),
    );
  }
  if (
    typeof output.artifactRenderer === "string" &&
    output.artifactRenderer !== "auto" &&
    ["code", "diff", "markdown", "preview", "data"].includes(
      output.artifactRenderer,
    ) &&
    Array.isArray(output.supportedArtifactRenderers) &&
    !output.supportedArtifactRenderers.includes(output.artifactRenderer)
  ) {
    issues.push({
      path: "$.output.artifactRenderer",
      message: "must be included in $.output.supportedArtifactRenderers",
    });
  }
}

function validateExport(
  value: unknown,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const exportValue = objectValue(
    value,
    "$.export",
    ["target", "includeHarnessAdapter"],
    issues,
  );
  if (!exportValue) return;
  enumValue(exportValue.target, "$.export.target", ["vite-react"], issues);
  booleanValue(
    exportValue.includeHarnessAdapter,
    "$.export.includeHarnessAdapter",
    issues,
  );
}

function booleanObject(
  value: unknown,
  path: string,
  keys: readonly string[],
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  const object = objectValue(value, path, keys, issues);
  if (!object) return;
  for (const key of keys) booleanValue(object[key], `${path}.${key}`, issues);
}

function objectValue(
  value: unknown,
  path: string,
  allowedKeys: readonly string[],
  issues: ExperienceValidationIssue[],
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    issues.push({ path, message: "must be an object" });
    return undefined;
  }
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key))
      issues.push({ path: `${path}.${key}`, message: "is not supported" });
  }
  return value;
}

function enumValue(
  value: unknown,
  path: string,
  allowed: readonly string[],
  issues: ExperienceValidationIssue[],
  required = false,
): void {
  if (value === undefined && !required) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    issues.push({ path, message: `must be one of: ${allowed.join(", ")}` });
  }
}

function booleanValue(
  value: unknown,
  path: string,
  issues: ExperienceValidationIssue[],
  required = false,
): void {
  if (value === undefined && !required) return;
  if (typeof value !== "boolean")
    issues.push({ path, message: "must be a boolean" });
}

function numberValue(
  value: unknown,
  path: string,
  minimum: number,
  maximum: number,
  issues: ExperienceValidationIssue[],
  integer = false,
): void {
  if (value === undefined) return;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum ||
    (integer && !Number.isInteger(value))
  ) {
    issues.push({
      path,
      message: `must be ${integer ? "an integer" : "a number"} between ${minimum} and ${maximum}`,
    });
  }
}

function textValue(
  value: unknown,
  path: string,
  minimumLength: number,
  maximumLength: number,
  issues: ExperienceValidationIssue[],
  required = false,
): void {
  if (value === undefined && !required) return;
  if (
    typeof value !== "string" ||
    value.length < minimumLength ||
    value.length > maximumLength ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  ) {
    issues.push({
      path,
      message: `must be text between ${minimumLength} and ${maximumLength} characters`,
    });
  }
}

function colorValue(
  value: unknown,
  path: string,
  issues: ExperienceValidationIssue[],
  required = false,
): void {
  if (value === undefined && !required) return;
  if (
    typeof value !== "string" ||
    !/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)
  ) {
    issues.push({ path, message: "must be a 6 or 8 digit hex color" });
  }
}

function fontFamilyValue(
  value: unknown,
  path: string,
  issues: ExperienceValidationIssue[],
): void {
  if (value === undefined) return;
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 160 ||
    /[;{}@]|url\s*\(/i.test(value) ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    issues.push({
      path,
      message:
        "must be a safe font-family value without CSS statements or URLs",
    });
  }
}

function safeId(
  value: unknown,
  path: string,
  issues: ExperienceValidationIssue[],
  required = false,
): void {
  if (value === undefined && !required) return;
  if (
    typeof value !== "string" ||
    !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(value)
  ) {
    issues.push({ path, message: "must be a safe identifier" });
  }
}

function arrayValue(
  value: unknown,
  path: string,
  maxItems: number,
  unique: boolean,
  issues: ExperienceValidationIssue[],
  validateItem: (item: unknown, path: string) => void,
): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "must be an array" });
    return;
  }
  if (value.length > maxItems)
    issues.push({ path, message: `must contain at most ${maxItems} items` });
  if (
    unique &&
    new Set(value.map((item) => stableStringify(item))).size !== value.length
  ) {
    issues.push({ path, message: "must contain unique items" });
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      issues.push({ path: `${path}[${index}]`, message: "must be present" });
      continue;
    }
    validateItem(value[index], `${path}[${index}]`);
  }
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value))
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function parseJSON(json: string): unknown {
  try {
    return JSON.parse(json) as unknown;
  } catch (error) {
    throw new ExperienceValidationError([
      {
        path: "$",
        message: error instanceof Error ? error.message : "Invalid JSON",
      },
    ]);
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

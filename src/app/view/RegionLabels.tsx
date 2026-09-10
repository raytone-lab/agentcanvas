import { layerContentsForProject } from "../projection/presetRailData";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { AppLocale } from "../../i18n/uiCopy";
import type { PresetGroupId } from "../../schema/presets";

/**
 * The canvas region names, drawn above their columns.
 *
 * Overlaid on the preview frame rather than nested inside each column: the
 * columns are produced by three different mechanisms (a fixed-width sidebar, a
 * resizable `PanelGroup`, and a solo stack when the right column is folded), so
 * there is no single place inside them all to put a label. Positioning the row
 * over the frame keeps one label per column regardless of which mechanism is
 * live, and keeps the labels out of the components' own layout.
 *
 * An empty column is the case that matters — it has nothing in it to say which
 * column it is, which is exactly when you need to know where the next component
 * will land.
 *
 * Widths mirror the frame's: the sidebar is a fixed 236px and main/right split
 * the remainder by `mainSize`/`rightPanelSize`, the same numbers the panels use.
 */
export function RegionLabels({
  project,
  locale,
  selectedLayerId,
  rightPanelVisible,
  selectedComponentItems,
}: {
  project: AgentFrontendProject;
  locale: AppLocale;
  selectedLayerId: string | null;
  rightPanelVisible: boolean;
  /** Counted in the label badge, same as the Layers tree counts them. */
  selectedComponentItems: readonly { id: string; groupId: PresetGroupId; label: string }[];
}) {
  const layers = layerContentsForProject(project, locale, selectedComponentItems).filter((layer) =>
    layer.id === "right" ? rightPanelVisible : layer.id === "left" || layer.id === "center",
  );
  if (layers.length === 0) return null;

  const { mainSize, rightPanelSize } = project.layout;
  const template = layers
    .map((layer) => {
      if (layer.id === "left") return "var(--session-width, 236px)";
      if (layer.id === "center") return `${mainSize}fr`;
      return `${rightPanelSize}fr`;
    })
    .join(" ");

  return (
    <div className="region-labels" style={{ gridTemplateColumns: template }} aria-hidden="true">
      {layers.map((layer) => (
        <span
          className="region-label"
          key={layer.id}
          data-layer={layer.id}
          data-active={layer.id === selectedLayerId}
        >
          {layer.label[locale]}
          {layer.children.length > 0 ? (
            <span className="region-label-count">{layer.children.length}</span>
          ) : null}
        </span>
      ))}
    </div>
  );
}

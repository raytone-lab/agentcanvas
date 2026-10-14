import type { CSSProperties } from "react";

import { Box, Frame } from "lucide-react";

import { layerContentsForProject } from "../projection/presetRailData";
import type { SelectedComponentItem } from "../projection/selectedComponents";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { AppLocale } from "../../i18n/uiCopy";

/**
 * The File destination's panel: the canvas regions as a layer list.
 *
 * Rows come from `layersForProject`, the same rule the canvas and the region
 * labels use, so the three cannot disagree — deleting 左栏 used to remove it
 * from the canvas and leave it listed here. A column with nothing *in* it is
 * still a row: an untouched project reads as three empty columns rather than as
 * nothing at all.
 *
 * Selecting a layer only moves the selection. It deliberately does not toggle
 * the region: hiding a column is a layout edit, and conflating "I am looking at
 * this" with "I am removing this" is how a layer list becomes dangerous to
 * click. The selection is what the canvas highlights and what later
 * direct-manipulation editing will hang off.
 */
export function LayersPanel({
  project,
  locale,
  selectedLayerId,
  onSelectLayer,
  selectedSlotId,
  onSelectSlot,
  selectedComponentItems,
  pickedOptionIds,
  layersLabel,
}: {
  project: AgentFrontendProject;
  locale: AppLocale;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  /**
   * The enabled preset options. They are the modules *inside* each component —
   * a new-chat button, a search field — so they are rows under the column too,
   * not a separate list somewhere else.
   */
  selectedComponentItems: readonly SelectedComponentItem[];
  /** Clicked options; a variant-only pick is invisible to the project. */
  pickedOptionIds: readonly string[];
  layersLabel: string;
}) {
  const layers = layerContentsForProject(project, locale, selectedComponentItems, pickedOptionIds);

  return (
    <div className="layers-panel">
      <div className="layers-panel-section">
        <span className="layers-panel-section-title">{layersLabel}</span>
        <ul className="layers-list">
          {layers.map((layer) => {
            const active = layer.id === selectedLayerId;
            return (
              <li key={layer.id}>
                <button
                  type="button"
                  className="layers-row"
                  data-active={active}
                  aria-pressed={active}
                  onClick={() => onSelectLayer(layer.id)}
                >
                  <span className="layers-row-icon" aria-hidden="true">
                    <Frame size={14} />
                  </span>
                  <span className="layers-row-name">{layer.label[locale]}</span>
                  {/*
                   * Always a count, zero included.
                   *
                   * It used to be hidden below one, which on an untouched
                   * project left the three columns carrying no information at
                   * all — three identical rows, no numbers, and a mark that
                   * only means something once there is an axis under it. A
                   * muted zero is the one thing that says "this column is
                   * empty" rather than leaving the reader to infer it from
                   * nothing being there.
                   */}
                  <span
                    className="layers-row-count"
                    data-empty={layer.children.length === 0 ? "true" : undefined}
                  >
                    {layer.children.length}
                  </span>
                </button>
                {/* What is in this column. Nothing is rendered when a column is
                    empty rather than an "empty" placeholder per row: with every
                    column empty on first open, three placeholders would be the
                    loudest thing in the panel. */}
                {layer.children.length > 0 ? (
                  /*
                   * `--axis-index` is how the axis down the left of this list
                   * knows how long its solid segment is.
                   *
                   * The segment runs from the column's own mark to the picked
                   * row and has to *animate* between two rows, so its height
                   * cannot be a per-row border — a border-style flip is
                   * instant, and there is no CSS expression for "the distance
                   * to my selected sibling". The index is the one fact only
                   * the component has; every length is derived from it in CSS
                   * (`--axis-pitch`), so the two cannot drift.
                   *
                   * `data-axis` is separate from the index because 0 is a
                   * real answer — the first row picked — and an unset axis
                   * has to be distinguishable from it.
                   */
                  <ul
                    className="layers-children"
                    data-axis={
                      layer.children.some((child) => child.id === selectedSlotId)
                        ? "on"
                        : undefined
                    }
                    style={
                      {
                        "--axis-index": String(
                          layer.children.findIndex((child) => child.id === selectedSlotId),
                        ),
                      } as CSSProperties
                    }
                  >
                    {layer.children.map((child) => (
                      <li key={child.id}>
                        <button
                          type="button"
                          className="layers-row layers-row--child"
                          data-kind={child.kind}
                          data-active={child.id === selectedSlotId}
                          aria-pressed={child.id === selectedSlotId}
                          onClick={() => onSelectSlot(child.id)}
                        >
                          <span className="layers-row-icon" aria-hidden="true">
                            <Box size={13} />
                          </span>
                          <span className="layers-row-name">{child.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

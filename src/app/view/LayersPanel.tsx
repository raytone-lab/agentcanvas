import { useEffect, useRef, useState } from "react";
import { Box, Frame } from "lucide-react";

import { layerContentsForProject } from "../projection/presetRailData";
import type { SelectedComponentItem } from "../projection/selectedComponents";
import type { AgentFrontendProject } from "../../schema/agentuxConfig";
import type { AppLocale } from "../../i18n/uiCopy";

/**
 * The File destination's panel: the canvas regions as a layer list.
 *
 * Rows come from `layout.regions` via `layersForRegions`, not from what happens
 * to be rendered — which is the point. A region with nothing in it is still a
 * layer, so an untouched project reads as three empty columns rather than as
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
  onRenameProject,
  selectedComponentItems,
  title,
  layersLabel,
}: {
  project: AgentFrontendProject;
  locale: AppLocale;
  selectedLayerId: string | null;
  onSelectLayer: (layerId: string) => void;
  selectedSlotId: string | null;
  onSelectSlot: (slotId: string) => void;
  onRenameProject: (name: string) => void;
  /**
   * The enabled preset options. They are the modules *inside* each component —
   * a new-chat button, a search field — so they are rows under the column too,
   * not a separate list somewhere else.
   */
  selectedComponentItems: readonly SelectedComponentItem[];
  /** Shown while the project has no name, like Figma's "Untitled". */
  title: string;
  layersLabel: string;
}) {
  const layers = layerContentsForProject(project, locale, selectedComponentItems);

  return (
    <div className="layers-panel">
      <div className="layers-panel-head">
        <ProjectTitle name={project.name} placeholder={title} onRename={onRenameProject} />
      </div>

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
                  {layer.children.length > 0 ? (
                    <span className="layers-row-count">{layer.children.length}</span>
                  ) : null}
                </button>
                {/* What is in this column. Nothing is rendered when a column is
                    empty rather than an "empty" placeholder per row: with every
                    column empty on first open, three placeholders would be the
                    loudest thing in the panel. */}
                {layer.children.length > 0 ? (
                  <ul className="layers-children">
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

/**
 * The project name: a label that turns into a field when clicked.
 *
 * Bound to `project.name`, which the export already uses for the generated
 * package and README — so renaming here is renaming the thing, not relabelling
 * the panel. Blank shows the localised placeholder rather than an empty row.
 *
 * Escape restores the name it had on entry; Enter and blur commit. The draft is
 * local state so a half-typed name never reaches the project — the canvas and
 * the export read `project.name`, and streaming every keystroke into it would
 * put "Coding Ag" in a package name.
 */
function ProjectTitle({
  name,
  placeholder,
  onRename,
}: {
  name: string;
  placeholder: string;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Selected on entry, as in the reference: the common case is replacing the
    // name, not appending to it.
    input.select();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className="layers-panel-title"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        {name.trim().length > 0 ? name : placeholder}
      </button>
    );
  }

  const commit = () => {
    onRename(draft.trim());
    setEditing(false);
  };

  return (
    <input
      ref={inputRef}
      className="layers-panel-title-input"
      value={draft}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          return;
        }
        if (event.key === "Escape") {
          setDraft(name);
          setEditing(false);
        }
      }}
    />
  );
}

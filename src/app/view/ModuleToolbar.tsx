import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import type { UiCopy } from "../../i18n/uiCopy";

/** Gap between the module's top edge and the toolbar sitting above it. */
const GAP = 8;

/**
 * Edit / delete for the selected canvas module.
 *
 * Positioned in the canvas surface rather than inside the zoom wrapper, from
 * client rects. Two reasons: it stays a constant size at every zoom level
 * (inside the wrapper it would scale with the canvas, and a toolbar at 25% is
 * unusable), and it sits outside `.preview-frame`, whose capture-phase
 * suppression would otherwise swallow its own clicks.
 *
 * The cost of client-rect positioning is that it has to be recomputed when the
 * canvas scrolls, zooms or resizes — which is what the observers below are for.
 */
export function ModuleToolbar({
  copy,
  target,
  surfaceRef,
  zoom,
  canDelete,
  onEdit,
  onDelete,
}: {
  copy: UiCopy;
  /** CSS selector for the selected module, or null when nothing is selected. */
  target: string | null;
  surfaceRef: { current: HTMLElement | null };
  /**
   * Canvas zoom, as a dependency rather than something this reads.
   *
   * A `ResizeObserver` cannot see it: CSS `zoom` scales the rendered box while
   * the layout box stays the same size, so the observer never fires and the
   * toolbar stayed where it was while the module moved under it — measured at
   * 200%.
   */
  zoom: number;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [box, setBox] = useState<{ left: number; top: number; below: boolean } | null>(null);

  const measure = useCallback(() => {
    const surface = surfaceRef.current;
    const toolbar = toolbarRef.current;
    if (!surface || !toolbar || !target) {
      setBox(null);
      return;
    }
    // The first matching element: a module can appear more than once (the date
    // headings), and the toolbar belongs to the first one down the page.
    const module = surface.querySelector(target);
    if (!module) {
      setBox(null);
      return;
    }
    const moduleRect = module.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const height = toolbar.offsetHeight || 32;
    const left = moduleRect.left - surfaceRect.left + surface.scrollLeft;
    const above = moduleRect.top - surfaceRect.top + surface.scrollTop - height - GAP;
    // Flip below when there is no room above, so a module at the very top of
    // the canvas does not push the toolbar out of view.
    const below = above < 0;
    setBox({
      left: Math.max(0, left),
      top: below ? moduleRect.bottom - surfaceRect.top + surface.scrollTop + GAP : above,
      below,
    });
  }, [surfaceRef, target, zoom]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!target) return;
    const surface = surfaceRef.current;
    // Zoom changes the frame's rendered size, scrolling moves it, and a window
    // resize does both.
    const observer = new ResizeObserver(measure);
    if (surface) observer.observe(surface);
    const frame = surface?.querySelector(".preview-frame");
    if (frame) observer.observe(frame);
    surface?.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      surface?.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, surfaceRef, target]);

  if (!target) return null;

  return (
    <div
      ref={toolbarRef}
      className="module-toolbar"
      data-placement={box?.below ? "below" : "above"}
      // Hidden until measured, or it flashes at 0,0 on the first paint.
      style={box ? { left: `${box.left}px`, top: `${box.top}px` } : { opacity: 0 }}
      role="toolbar"
      aria-label={copy.shell.editor.moduleToolbarAria}
    >
      <button type="button" className="module-toolbar-button" onClick={onEdit}>
        <Pencil size={13} aria-hidden="true" />
        {copy.shell.editor.moduleEdit}
      </button>
      {canDelete ? (
        <button
          type="button"
          className="module-toolbar-button"
          data-tone="danger"
          onClick={onDelete}
        >
          <Trash2 size={13} aria-hidden="true" />
          {copy.shell.editor.moduleDelete}
        </button>
      ) : null}
    </div>
  );
}

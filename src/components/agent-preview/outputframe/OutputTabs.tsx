import { X } from "../../../agentmatrix/uiIcons";
import { useEffect, useRef } from "react";

import type { OutputFrameCopy } from "./types";
import type { OutputPanelItem } from "./panelItem";
import { languageFromTitle, outputItemIcon, outputItemRenderKind } from "./renderKind";
import { renderOpenedOutputBody } from "./openedItemBody";

export function OutputTabs({
  items,
  activeId,
  onSelectOpenItem,
  onCloseOpenItem,
}: {
  items: readonly OutputPanelItem[];
  activeId: string;
  onSelectOpenItem?: (id: string) => void;
  onCloseOpenItem?: (id: string) => void;
}) {
  const activeTabRef = useRef<HTMLDivElement | null>(null);

  const stripRef = useRef<HTMLDivElement | null>(null);

  /*
   * Bring the open tab into view by scrolling the strip, and only the strip,
   * only as far as it takes.
   *
   * It was `scrollIntoView({ inline: "center" })`, which did two things wrong.
   * Centring cut the first tab mid-word when two did not fit ("ration.wav"),
   * and `scrollIntoView` scrolls *every* scrollable ancestor — including the
   * right panel's clipped card, which it slid 2px sideways and so cut the left
   * edge off everything in it.
   */
  useEffect(() => {
    const strip = stripRef.current;
    const tab = activeTabRef.current;
    if (!strip || !tab) return;
    const frame = requestAnimationFrame(() => {
      // The strip's right edge fades out over 34px (the mask), so "visible"
      // stops short of it.
      const fade = 34;
      const left = tab.offsetLeft;
      const right = left + tab.offsetWidth;
      let next = strip.scrollLeft;
      if (left < strip.scrollLeft) next = left;
      else if (right > strip.scrollLeft + strip.clientWidth - fade) next = right - strip.clientWidth + fade;
      if (next !== strip.scrollLeft) strip.scrollTo?.({ left: Math.max(0, next), behavior: "smooth" });
    });
    // After layout, not during: the tabs shrink to fit first, and measuring
    // before that scrolled a strip that no longer needed it.
    return () => cancelAnimationFrame(frame);
  }, [activeId, items.length]);

  return (
    <div
      className="output-tabs"
      role="tablist"
      aria-label="Opened output"
      ref={stripRef}
      // Written to the element rather than kept in state: it only switches the
      // left-edge fade in CSS, and a re-render per scroll frame buys nothing.
      onScroll={(event) => {
        const strip = event.currentTarget;
        strip.dataset.scrolled = strip.scrollLeft > 1 ? "true" : "false";
      }}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <div
            key={item.id}
            ref={active ? activeTabRef : undefined}
            className="output-tab"
            data-active={active}
          >
            <button
              className="output-tab-main"
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelectOpenItem?.(item.id)}
            >
              {outputItemIcon(item)}
              <span className="output-tab-title">{item.title}</span>
            </button>
            {onCloseOpenItem ? (
              <button
                className="output-tab-close"
                type="button"
                aria-label={`Close ${item.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onCloseOpenItem(item.id);
                }}
              >
                <X size={12} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function OpenedOutputItem({ item, copy }: { item: OutputPanelItem; copy: OutputFrameCopy }) {
  const language = item.language ?? languageFromTitle(item.title);
  const renderKind = outputItemRenderKind(item);
  return (
    <div className="opened-output-item" data-kind={item.kind} data-render-kind={renderKind}>
      <div className="artifact-title">
        {outputItemIcon(item, 16)}
        <span>{item.title}</span>
        {/* The subtitle is the full path. For a file at the root it is the
            name again, and the row read "teaser.mp4 teaser.mp4 mp4". */}
        {item.subtitle && item.subtitle !== item.title ? <em>{item.subtitle}</em> : null}
        <code>{language}</code>
      </div>
      {renderOpenedOutputBody(item, renderKind, language, copy)}
    </div>
  );
}

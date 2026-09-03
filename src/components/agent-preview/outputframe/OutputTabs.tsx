import { X } from "lucide-react";
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

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [activeId]);

  return (
    <div className="output-tabs" role="tablist" aria-label="Opened output">
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
        {item.subtitle ? <em>{item.subtitle}</em> : null}
        <code>{language}</code>
      </div>
      {renderOpenedOutputBody(item, renderKind, language, copy)}
    </div>
  );
}

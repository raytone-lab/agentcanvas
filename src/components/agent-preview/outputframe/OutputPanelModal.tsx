import { X } from "lucide-react";
import { useEffect } from "react";

import { useCopy } from "../../../i18n/LocaleContext";
import type { OutputPanelItem } from "./panelItem";
import { outputItemModalRenderer } from "./renderKind";
import { outputTitle } from "./labels";
import { OpenedOutputItem, OutputTabs } from "./OutputTabs";

export function OutputPanelModal({
  items,
  activeId,
  onSelectItem,
  onCloseItem,
  onClose,
}: {
  items: readonly OutputPanelItem[];
  activeId?: string;
  onSelectItem?: (id: string) => void;
  onCloseItem?: (id: string) => void;
  onClose: () => void;
}) {
  const copy = useCopy();
  const c = copy.workspace.outputFrame;
  const activeItem = items.find((item) => item.id === activeId) ?? items[items.length - 1];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!activeItem) {
    return null;
  }

  return (
    <>
      <div className="artifact-expand-backdrop" aria-hidden="true" onClick={onClose} />
      <section
        className="utility-card artifact-frame output-modal-frame"
        data-expanded="true"
        data-output-modal="true"
        data-output-source="artifact"
        role="dialog"
        aria-modal="true"
        aria-label={outputTitle("artifact", outputItemModalRenderer(activeItem), c)}
      >
        <header className="utility-header">
          <div>
            <h3>{outputTitle("artifact", outputItemModalRenderer(activeItem), c)}</h3>
          </div>
          <div className="utility-header-actions">
            <button
              className="rail-icon-btn"
              type="button"
              aria-label="Close output"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="artifact-content opened-output">
          {items.length > 1 ? (
            <OutputTabs
              items={items}
              activeId={activeItem.id}
              onSelectOpenItem={onSelectItem}
              onCloseOpenItem={onCloseItem}
            />
          ) : null}
          <OpenedOutputItem item={activeItem} copy={c} />
        </div>
      </section>
    </>
  );
}

import { useMenuPresence } from "./useMenuPresence";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { SidebarToggleIcon } from "../../components/agent-preview/SessionSidebar";
import { Dialog, DialogContent } from "../../components/ui/dialog";
import type { UiCopy } from "../../i18n/uiCopy";

/**
 * The product mark, and the menu behind it.
 *
 * The mark sits at the top of the rail card, which is where the reader's eye
 * starts, and it is also the way out of the editor: home, and preferences. The
 * language switch used to live beside it as a permanent control — it is in
 * preferences now, because it is set once a session and was the second-widest
 * thing in the chrome.
 */
/**
 * The landing page. Relative, because the editor (editor.html) and the landing page
 * (index.html) ship side by side in one build — so this holds wherever the site is
 * mounted, at a domain root or under a path.
 */
const HOME_HREF = "./";

export function ShellBrand({
  copy,
  title,
  onOpenPreferences,
  hasUnsavedWork = false,
  collapsed = false,
  onToggleCollapsed,
  /** Own floating card, for the surfaces with no rail to sit in. */
  floating = false,
}: {
  copy: UiCopy;
  /**
   * The project's name, composed by the shell because it is editable. It sits
   * beside the mark rather than over the rail's panel: it names the thing being
   * configured, and that panel is only one of the ways to configure it.
   */
  title?: ReactNode;
  onOpenPreferences: () => void;
  /**
   * Whether the canvas holds work that leaving would lose. The editor keeps no
   * save of its own, so Home asks first when this is true and goes straight
   * there when the canvas is still empty.
   */
  hasUnsavedWork?: boolean;
  /** Whether the rail below this row is folded away. */
  collapsed?: boolean;
  /** Omitted on the surfaces with no rail to fold. */
  onToggleCollapsed?: () => void;
  floating?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const menu = useMenuPresence(menuOpen);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    // Pointer rather than blur: the menu's own buttons take focus as they are
    // pressed, and a blur handler closes it before the click lands.
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="shell-brand" data-floating={floating ? "true" : undefined}>
      <div className="brand-menu-anchor" ref={menuRef}>
        <button
          type="button"
          className="brand-trigger"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <img className="brand-logo" src="/brand-mark.png" alt={copy.shell.brand.title} />
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {/* Held mounted for its exit (`useMenuPresence`), so it closes with the
            same motion the model picker's menu does instead of vanishing. */}
        {menu.mounted ? (
          <div
            className="brand-menu"
            role="menu"
            aria-label={copy.shell.brandMenu.ariaLabel}
            data-state={menu.state}
          >
            {/* A real link to the landing page, so it opens in a new tab on
                middle- or cmd-click like any other link. A plain click on a
                canvas with picks on it asks first: nothing here is saved. */}
            <a
              href={HOME_HREF}
              className="brand-menu-item"
              role="menuitem"
              onClick={(event) => {
                setMenuOpen(false);
                if (!hasUnsavedWork || event.metaKey || event.ctrlKey || event.shiftKey) return;
                event.preventDefault();
                setConfirmLeave(true);
              }}
            >
              {copy.shell.brandMenu.home}
            </a>
            <button
              type="button"
              className="brand-menu-item"
              role="menuitem"
              onClick={() => {
                setMenuOpen(false);
                onOpenPreferences();
              }}
            >
              {copy.shell.brandMenu.settings}
            </button>
          </div>
        ) : null}
      </div>
      <Dialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <DialogContent
          title={copy.shell.brandMenu.leaveTitle}
          description={copy.shell.brandMenu.leaveBody}
          width={400}
        >
          <div className="incomplete-dialog-actions">
            <button type="button" className="secondary-button" onClick={() => setConfirmLeave(false)}>
              {copy.shell.brandMenu.leaveStay}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                window.location.href = HOME_HREF;
              }}
            >
              {copy.shell.brandMenu.leaveGo}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {title ? <div className="shell-brand-title">{title}</div> : null}
      {/* Folds the rail away to this row, so the canvas gets the width. The
          same control the canvas's own sidebar uses for the same job, because
          it is the same job. */}
      {onToggleCollapsed ? (
        <button
          type="button"
          className="rail-icon-btn rail-collapse"
          aria-label={collapsed ? copy.shell.presetRail.expand : copy.shell.presetRail.collapse}
          aria-expanded={!collapsed}
          onClick={onToggleCollapsed}
        >
          <SidebarToggleIcon size={15} />
        </button>
      ) : null}
    </div>
  );
}

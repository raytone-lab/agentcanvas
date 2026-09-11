import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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
export function ShellBrand({
  copy,
  onOpenPreferences,
  /** Own floating card, for the surfaces with no rail to sit in. */
  floating = false,
}: {
  copy: UiCopy;
  onOpenPreferences: () => void;
  floating?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
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
        {menuOpen ? (
          <div className="brand-menu" role="menu" aria-label={copy.shell.brandMenu.ariaLabel}>
            {/* A placeholder until there is a home page to return to. It is here
                so the menu's shape is settled before that exists; the row will
                carry the link and nothing else about it changes. */}
            <button
              type="button"
              className="brand-menu-item"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
            >
              {copy.shell.brandMenu.home}
            </button>
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
    </div>
  );
}

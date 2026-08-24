/**
 * State gallery.
 *
 * Renders one card per standardized state that a preset group's components can
 * be in. Each card previews the state's icon with its motion (spin/pulse), a
 * tone color, the standard event/field name, and the 3-5 swappable icon
 * options for that state — so icon replacement lives in-context, per state.
 */

import { ICON_OPTIONS, useIconSet, useIconStyle, type IconSlot } from "../../agentmatrix";

export type StateCardAnim = "spin" | "pulse" | "none";
export type StateCardTone = "neutral" | "success" | "warning" | "danger" | "info";

export type StateCard = {
  slot: IconSlot;
  title: string;
  /** Standard event type / field name this state maps to. */
  code: string;
  anim?: StateCardAnim;
  tone?: StateCardTone;
  /** When set, the card shows a show/hide checkbox bound to this project flag. */
  toggleKey?: string;
};

export function StateGallery({
  cards,
  activeCode,
  isSelected,
  onSelect,
  onPickIcon,
  onDeselect,
}: {
  cards: StateCard[];
  /** The state currently shown live in the preview (highlights its card). */
  activeCode?: string | null;
  /** Overrides the highlight logic (e.g. avatar cards reflect their enable flag). */
  isSelected?: (card: StateCard) => boolean;
  /** Click the card body — toggles / selects the state. */
  onSelect?: (card: StateCard) => void;
  /** Click an icon tile — pick that icon (and, for avatars, enable the card). */
  onPickIcon?: (card: StateCard) => void;
  /** Re-click the already-selected icon — deselect / disable the card. */
  onDeselect?: (card: StateCard) => void;
}) {
  const { iconSet, setSlot } = useIconSet();
  const iconStyle = useIconStyle();

  return (
    <div className="am-states">
      {cards.map((card, index) => {
        const chosen = iconSet[card.slot] ?? ICON_OPTIONS[card.slot][0].id;
        const selected = isSelected ? isSelected(card) : activeCode != null && activeCode === card.code;
        return (
          <div className="am-state-cell" key={`${card.slot}-${index}`}>
            <div
              className="am-state-card"
              data-tone={card.tone ?? "neutral"}
              data-selected={selected}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(card)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(card);
                }
              }}
              title={onSelect ? "Preview this state live" : undefined}
            >
              <div className="am-state-options" data-slot={card.slot} role="group" aria-label={`${card.title} icon`}>
                {ICON_OPTIONS[card.slot].map((option) => {
                  const OptionIcon = iconStyle === "bold" && option.bold ? option.bold : option.Icon;
                  const iconProps = iconStyle === "bold"
                    ? { strokeWidth: 2.1 }
                    : {};
                  const isToggleCard = Boolean(card.toggleKey);
                  // Avatar cards are enable/disable toggles, so their icon
                  // border only shows when enabled. Other state rows always
                  // show their current icon choice; the unset default is first.
                  const active = chosen === option.id && (!isToggleCard || selected);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="am-state-option"
                      data-option-id={option.id}
                      data-active={active}
                      title={option.label}
                      aria-pressed={active}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (active) {
                          // Re-click the selected icon → deselect → card off, no
                          // avatar in the canvas.
                          onDeselect?.(card);
                        } else {
                          setSlot(card.slot, option.id);
                          // Pick this icon, enable the card, and preview it.
                          (onPickIcon ?? onSelect)?.(card);
                        }
                      }}
                    >
                      <OptionIcon size={14} {...iconProps} />
                    </button>
                  );
                })}
              </div>
            </div>
            <span className="am-state-name">{card.title}</span>
          </div>
        );
      })}
    </div>
  );
}

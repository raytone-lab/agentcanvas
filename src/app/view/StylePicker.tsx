import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import type { PresetStyleId } from "../../schema/agentuxConfig";
import {
  selectablePresetStyleOptions,
  styleCardOptions,
  styleCardThemeIds,
} from "../projection/presetRailData";
import { themeTokens, type ThemePresetId } from "../../theme/themeTokens";
import {
  contrastRatio,
  resolveThemeTokens,
  themeRoleColor,
  type ThemeColorOverrides,
  type ThemeColorRole,
} from "../../theme/customTheme";
import { ColorPopover } from "./ColorPopover";

/**
 * The style picker: a chip that says what is worn, and the cards behind it.
 *
 * It has been in three places, and the reason it settled here is worth keeping:
 * a round inside the rail's Theme destination, where picking a whole style sat
 * three clicks inside "assemble one part at a time"; then a round as a floating
 * card centred over the canvas, which put the product's *second* entry path in
 * the middle of its output. Here it is opposite the rail — build it up on the
 * left, pick a ready-made look on the right.
 *
 * The chip is the collapsed form (one control wide, which is all the control row
 * has); `StyleCards` below is what it opens, and the same list fills the panel
 * section. The grid of bare swatches that used to be here, plus the confirm
 * sheet it opened, are both gone — see `StyleCards`.
 */
export function StyleChip({
  copy,
  locale,
  selectedPresetStyle,
  selectedThemeId,
  onApply,
  onExpand,
}: {
  copy: UiCopy;
  locale: AppLocale;
  selectedPresetStyle: PresetStyleId;
  selectedThemeId: string;
  onApply: (styleId: PresetStyleId, themeId: ThemePresetId) => void;
  /**
   * What the chip does instead of dropping its own menu.
   *
   * The chip only ever appears in the *folded* canvas panel, and that panel's
   * own section is this same list of cards — so a menu hanging off the chip
   * put the style picker on screen a second time, over the thing it
   * duplicates. Given that, the chip reads better as "the style being worn,
   * and the way back to choosing one": it unfolds the panel, where the cards
   * and their Apply buttons already are.
   *
   * The menu stays for a caller with no panel to unfold.
   */
  onExpand?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);
  const current =
    selectablePresetStyleOptions.find((style) => style.id === selectedPresetStyle) ??
    selectablePresetStyleOptions[0];

  // Same dismissal contract as the rail's popovers: a pointer outside, or Esc.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && holder.current?.contains(target)) return;
      setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="style-chip-holder" ref={holder}>
      <button
        type="button"
        className="style-chip"
        aria-label={copy.shell.editor.chooseStyle}
        aria-expanded={onExpand ? undefined : open}
        aria-haspopup={onExpand ? undefined : "true"}
        data-style={current.id}
        data-open={!onExpand && open ? "true" : undefined}
        onClick={onExpand ? onExpand : () => setOpen((value) => !value)}
      >
        {/*
          * The style's own card art, cropped square.
          *
          * It had been rendering as an empty box, and the reason is worth
          * keeping: the image was in CSS, one rule per style, each keyed on
          * `.style-bar-tab[data-style="…"] .style-bar-swatch` — an ancestor
          * from the old style bar, which this chip replaced. The rules stayed,
          * matched nothing, and the swatch fell back to its bare border.
          *
          * Set from the component instead, the way the cards do it, so it
          * cannot drift per style and a style added tomorrow arrives with its
          * picture. `cover` and a centred position do the crop — the plate is
          * 566×248 and this is 22px square, so what shows is the middle third.
          *
          * Only for a style that has a plate: `styleCardOptions` is the list
          * that guarantees one (`App.test.tsx` asserts the file for every entry
          * in it). 空白 is deliberately absent — it keeps the dashed empty frame
          * that says "nothing chosen yet" — and so is any hidden style a saved
          * project might still be wearing.
          */}
        <span
          className="style-bar-swatch"
          aria-hidden="true"
          style={
            styleCardOptions.some((style) => style.id === current.id)
              ? { backgroundImage: `url("/style-card/${current.id}.png")` }
              : undefined
          }
        />
        <span className="style-chip-name">{current.label[locale]}</span>
        <span className="style-chip-caret" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </button>
      {open && !onExpand ? (
        <div className="style-chip-menu" aria-label={copy.shell.editor.chooseStyle}>
          {/* The same cards as the panel. The menu used to be a grid of
              swatches that opened a confirm sheet; a card carries its own
              colourways and its own Apply, so the menu closes when one is
              applied and nothing is layered over the canvas. */}
          <StyleCards
            copy={copy}
            locale={locale}
            selectedPresetStyle={selectedPresetStyle}
            selectedThemeId={selectedThemeId}
            onApply={(styleId, themeId) => {
              setOpen(false);
              onApply(styleId, themeId);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * Every style as a tile, for the folded canvas panel's column.
 *
 * Plate over name, the same shape as the rail's destinations across the
 * canvas. The names are not decoration: six plates at 36px are six small
 * pictures, and which of them is 水墨 and which is 复古 is not a question a
 * thumbnail answers — a tooltip answers it one at a time, which is no use when
 * the reason to look at the column is to compare.
 *
 * ─── A click unfolds the panel. It does not apply the style. ───
 *
 * It applied directly for one round, which read as the obvious thing: a plate
 * you can see, one click, worn. Changed on request, and the reason holds up —
 * switching style brings the style's own components with it, the cards carry
 * an Apply button precisely so that is a deliberate act, and a 36px target in
 * a column you are scrolling is the easiest thing in the product to hit by
 * accident. So the column is an index, not a switch: it shows what there is
 * and which one is worn, and hands over to the cards.
 *
 * Which also makes every tile here do what the chip above them does, and that
 * is the point — the whole folded card unfolds, whatever you reach for.
 */
export function StyleRailThumbs({
  copy,
  locale,
  selectedPresetStyle,
  onExpand,
}: {
  copy: UiCopy;
  locale: AppLocale;
  selectedPresetStyle: PresetStyleId;
  /** Unfolds the canvas panel, where the cards and their Apply buttons are. */
  onExpand: () => void;
}) {
  return (
    <div className="style-rail" role="group" aria-label={copy.shell.editor.chooseStyle}>
      {styleCardOptions.map((style) => {
        const active = style.id === selectedPresetStyle;
        const label = style.label[locale];
        return (
          <button
            key={style.id}
            type="button"
            className="style-rail-tile"
            data-style={style.id}
            data-active={active ? "true" : undefined}
            // `aria-pressed` would say this button toggles the style, and it
            // does not — it opens the panel. The worn one is named instead.
            aria-current={active ? "true" : undefined}
            title={label}
            onClick={onExpand}
          >
            <span
              className="style-rail-thumb"
              aria-hidden="true"
              style={{ backgroundImage: `url("/style-card/${style.id}.png")` }}
            />
            <span className="style-rail-name">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The style cards (pure view).
 *
 * The shape is the one in the reference recording: a column of cards, each
 * resting as a preview image with its name under it, and — while the pointer is
 * on it — opening *in place* to show what can be chosen inside it and a button
 * that applies it. The cards below are pushed down rather than covered.
 *
 * Three departures from the reference, all asked for:
 *
 *   - It opens onto **colourways only**. The reference also offers fonts; here
 *     the font is part of the style (`stylePalettes.test.ts` holds each style to
 *     one font across its four colourways), so there is nothing to choose.
 *   - Four swatches, and they are *selectable*: the first is the default, the
 *     reader can take another, and nothing happens on the canvas until Apply.
 *     Hovering a row of cards must not repaint the canvas four times.
 *   - One button. Apply switches the style and the picked colourway in a single
 *     step — the confirm sheet that used to follow is gone, because the button
 *     on the card is the confirmation.
 *
 * 空白 is not in the list: it is where the editor opens, so it has nothing to
 * offer here (`styleCardOptions`).
 *
 * Opening is CSS — `:hover, :focus-within` — rather than React state, so a
 * keyboard reaching a swatch or the button opens the same card without a second
 * code path to keep in step.
 */
export function StyleCards({
  copy,
  locale,
  selectedPresetStyle,
  selectedThemeId,
  onApply,
  colorOverrides,
  onColorChange,
  onColorReset,
}: {
  copy: UiCopy;
  locale: AppLocale;
  selectedPresetStyle: PresetStyleId;
  selectedThemeId: string;
  onApply: (styleId: PresetStyleId, themeId: ThemePresetId) => void;
  /** The project's repainted colourways; the dots show these. */
  colorOverrides?: ThemeColorOverrides;
  /** Given, a picked swatch's dots open a colour editor for that colour. */
  onColorChange?: (themeId: ThemePresetId, role: ThemeColorRole, hex: string) => void;
  onColorReset?: (themeId: ThemePresetId) => void;
}) {
  /*
   * Which dot's editor is open: the colourway, the colour in it, and where the
   * dot is on screen to open from.
   */
  const [editing, setEditing] = useState<{ themeId: ThemePresetId; role: ThemeColorRole; anchor: DOMRect } | null>(null);
  /*
   * The pick per card, until Apply. Keyed by style so moving along the column
   * and coming back finds the swatch where it was left, and seeded lazily: a
   * card the reader has not touched offers its first colourway, except the one
   * being worn, which offers the colourway that is on the canvas.
   */
  const [picked, setPicked] = useState<Partial<Record<PresetStyleId, ThemePresetId>>>({});
  const c = copy.shell.editor.styleSwitch;

  return (
    <div className="style-cards">
      {styleCardOptions.map((style) => {
        const themes = styleCardThemeIds(style.id);
        const worn = style.id === selectedPresetStyle;
        const fallback = (worn && themes.includes(selectedThemeId as ThemePresetId)
          ? (selectedThemeId as ThemePresetId)
          : themes[0]);
        const chosen = picked[style.id] ?? fallback;
        return (
          <div
            className="style-card"
            key={style.id}
            data-style={style.id}
            data-worn={worn || undefined}
            // Held open while one of its colours is being edited: the editor
            // floats outside the card, and moving onto it would otherwise
            // fold the very swatch being repainted.
            data-editing={editing && themes.includes(editing.themeId) ? "true" : undefined}
          >
            {/* The same plate twice, at two sizes: the big one at rest, and a
                thumbnail that takes its place beside the name while the card is
                open — which is what the reference recording does, and what the
                first pass of this card left out.
                Two boxes rather than one that resizes, because the plate moves
                from its own row into the name's row: a grid area cannot be
                animated, but each box collapsing and expanding can.
                The art is named here rather than in `app.css` on purpose: that
                stylesheet ships inside every exported project, and an export
                has no style picker — a `url()` there would pack six editor
                screenshots into the reader's download. */}
            <div
              className="style-card-art"
              aria-hidden="true"
              style={{ backgroundImage: `url("/style-card/${style.id}.png")` }}
            />
            <div className="style-card-head">
              <div
                className="style-card-thumb"
                aria-hidden="true"
                style={{ backgroundImage: `url("/style-card/${style.id}.png")` }}
              />
              <span className="style-card-name">{style.label[locale]}</span>
              {worn ? <span className="style-card-worn">{c.inUse}</span> : null}
            </div>
            {/* The wrapper is what makes the open/close animate: a grid row
                going `0fr → 1fr` needs a single child to clip, and that beats
                a `max-height` picked to match whatever is inside today. */}
            <div className="style-card-body">
              <div className="style-card-body-inner">
              <div className="style-card-row">
                <span className="style-card-row-label">{c.palette}</span>
                <div className="style-card-swatches">
                  {themes.map((themeId) => {
                    const tokens = resolveThemeTokens(themeId, colorOverrides);
                    const active = themeId === chosen;
                    const editable = active && onColorChange !== undefined;
                    const custom = Boolean(colorOverrides?.[themeId] && Object.keys(colorOverrides[themeId] ?? {}).length > 0);
                    return (
                      <button
                        key={themeId}
                        type="button"
                        className="style-card-swatch"
                        data-active={active || undefined}
                        data-editable={editable || undefined}
                        data-custom={custom || undefined}
                        aria-pressed={active}
                        aria-label={tokens.name}
                        title={editable ? `${tokens.name} · ${c.colorEditHint}` : tokens.name}
                        /* A colourway is more than one colour, so the swatch
                           shows four: the canvas, the panel, the accent and the
                           ink, in that order. It was a single dot — canvas and
                           panel split on the diagonal with the accent in the
                           corner — which read as "a colour" rather than as "a
                           palette", and two palettes that share a paper looked
                           identical.
                           Drawn from the palette's own tokens, so it cannot
                           drift from what applying it actually does. */
                        style={{
                          "--sw-canvas": tokens.surface.canvas,
                          "--sw-panel": tokens.surface.panel,
                          "--sw-accent": tokens.accent.action,
                          "--sw-ink": tokens.text.primary,
                        } as CSSProperties}
                        onClick={() => setPicked((current) => ({ ...current, [style.id]: themeId }))}
                      >
                        {/* Four dots rather than one banded pill: a palette is
                            four colours, and four bands inside a single shape
                            read as one striped object. Asked for by example. */}
                        {/* Picked, each dot is the way into that colour: a
                            click on a dot of the chosen colourway opens its
                            editor instead of re-picking the swatch. */}
                        {(["canvas", "panel", "accent", "ink"] as const).map((role) => (
                          <span
                            key={role}
                            className="style-card-dot"
                            data-role={role}
                            data-editing={editing?.themeId === themeId && editing.role === role ? "true" : undefined}
                            onClick={
                              editable
                                ? (event) => {
                                    event.stopPropagation();
                                    // Anchored at the dot's height but the card's left
                                    // edge, so the editor opens clear of the whole
                                    // card — its other swatches and its Apply key.
                                    const dot = event.currentTarget.getBoundingClientRect();
                                    const card = event.currentTarget.closest(".style-card")?.getBoundingClientRect();
                                    setEditing({
                                      themeId,
                                      role,
                                      anchor: new DOMRect(card?.left ?? dot.left, dot.top, dot.width, dot.height),
                                    });
                                  }
                                : undefined
                            }
                          />
                        ))}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                type="button"
                className="primary-button style-card-apply"
                onClick={() => onApply(style.id, chosen)}
              >
                {c.apply}
              </button>
              </div>
            </div>
          </div>
        );
      })}
      {editing && onColorChange ? (() => {
        const tokens = resolveThemeTokens(editing.themeId, colorOverrides);
        const contrast =
          editing.role === "accent"
            ? contrastRatio(tokens.accent.action, tokens.text.inverse)
            : editing.role === "canvas"
              ? undefined
              : contrastRatio(tokens.text.primary, tokens.surface.panel);
        return (
          <ColorPopover
            role={editing.role}
            value={themeRoleColor(tokens, editing.role)}
            anchor={editing.anchor}
            copy={{
              roles: c.colorRoles,
              suggested: c.colorSuggested,
              hex: c.colorHex,
              contrast: c.colorContrast,
              contrastLow: c.colorContrastLow,
              reset: c.colorReset,
              close: c.colorClose,
            }}
            contrast={contrast}
            canReset={Boolean(colorOverrides?.[editing.themeId])}
            onChange={(hex) => onColorChange(editing.themeId, editing.role, hex)}
            onReset={() => onColorReset?.(editing.themeId)}
            onClose={() => setEditing(null)}
          />
        );
      })() : null}
    </div>
  );
}

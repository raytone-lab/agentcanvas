/**
 * State gallery.
 *
 * Renders one card per standardized state that a preset group's components can
 * be in. Each card previews the state's icon with its motion (spin/pulse), a
 * tone color, the standard event/field name, and the 3-5 swappable icon
 * options for that state — so icon replacement lives in-context, per state.
 */

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

import {
  ICON_OPTIONS,
  OptionIcon,
  UPLOADED_AVATAR_ID,
  readAvatarFile,
  useIconSet,
  type IconSlot,
} from "../../agentmatrix";
import { useLocale } from "../../i18n/LocaleContext";
import type { AppLocale } from "../../i18n/locales";
import { applyTheme } from "../../theme/applyTheme";
import { themeTokens, type ThemePresetId } from "../../theme/themeTokens";
import { styleAvatarOptionIds } from "../../app/projection/presetRailData";
import { locateSlotOnCanvas } from "../../app/projection/previewScroll";
import type { PresetStyleId } from "../../schema/agentuxConfig";

/** Said under a tile when the canvas has nowhere to show what was picked. */
const LOCATE_COPY: Record<AppLocale, string> = {
  zh: "画布当前没有展示这一项",
  en: "Not shown on the canvas right now",
  ja: "いまのキャンバスには表示されていません",
};

const UPLOAD_COPY: Record<AppLocale, { upload: string; uploaded: string; remove: string }> = {
  zh: { upload: "上传头像", uploaded: "我的头像", remove: "移除头像" },
  en: { upload: "Upload avatar", uploaded: "My avatar", remove: "Remove avatar" },
  ja: { upload: "アバターをアップロード", uploaded: "マイアバター", remove: "アバターを削除" },
};

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
  pickedSlots,
  stylePreset,
  themePreset,
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
  /**
   * Slots whose icon the reader has actually chosen.
   *
   * Every slot has an icon — a tool card has to draw something — so "the
   * current icon" is never empty and every row used to open with its first
   * tile ringed. That read as a dozen picks the reader had not made, and the
   * canvas showed none of them. Passing the slots that were really chosen keeps
   * the ring meaning what it says. Undefined leaves the old behaviour, for
   * galleries where the current icon is the useful thing to show.
   */
  pickedSlots?: readonly string[];
  /**
   * Narrows the avatar rows to the four this style offers.
   *
   * Only the avatar slots are affected; every other state row shows its full
   * set, because those are functional glyphs that any style can wear. Omitted
   * leaves every row unfiltered — the galleries that are not in the styled rail
   * do not have a style to speak for.
   */
  stylePreset?: PresetStyleId;
  /**
   * The project's palette, scoped to this gallery and nowhere else in the rail.
   *
   * `App.tsx` gives the configurator chrome a neutral scheme on purpose, so its
   * controls are never tinted by a preview accent, and applies the project's
   * theme only to the canvas. Correct for the rail — and wrong for these tiles,
   * which are pictures of the canvas rather than controls: in 漫画风 they drew
   * the style's black-outline rule in the editor's light grey, and in 游戏风 its
   * gold rule in the editor's navy.
   *
   * Applying it here keeps both true: the tiles resolve the style's tokens, the
   * panel around them stays neutral.
   */
  themePreset?: ThemePresetId;
}) {
  const { iconSet, setSlot } = useIconSet();
  const { locale } = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  /*
   * After a pick, show the reader where it went: ring what the slot draws on
   * the canvas, or say under the card that nothing there draws it. Keyed by a
   * counter so picking the same card twice replays the note.
   */
  const [unlocated, setUnlocated] = useState<{ slot: string; key: number } | null>(null);
  const locate = (slot: string) => {
    void locateSlotOnCanvas(slot).then((found) => {
      setUnlocated(found ? null : { slot, key: Date.now() });
    });
  };

  useEffect(() => {
    if (themePreset && rootRef.current) {
      applyTheme(themeTokens[themePreset], rootRef.current);
    }
  }, [themePreset]);

  return (
    <div className="am-states" ref={rootRef}>
      {cards.map((card, index) => {
        /*
         * The allow-list names ids; the options are objects. Filtering the
         * options by the list rather than mapping the list to options keeps the
         * registry as the source of order, and means a name in the table that
         * no longer exists drops out quietly instead of rendering a hole.
         */
        const allowed = stylePreset ? styleAvatarOptionIds(stylePreset, card.slot) : undefined;
        const options = allowed
          ? ICON_OPTIONS[card.slot].filter((option) => allowed.includes(option.id))
          : ICON_OPTIONS[card.slot];
        // Falls back to the *filtered* first option, not the registry's. With
        // the registry's, a style whose gallery excludes the first entry would
        // ring nothing and report a current icon that is not on screen.
        const chosen = iconSet[card.slot] ?? options[0]?.id ?? ICON_OPTIONS[card.slot][0].id;
        const selected = isSelected ? isSelected(card) : activeCode != null && activeCode === card.code;
        return (
          <div className="am-state-cell" key={`${card.slot}-${index}`}>
            <div
              className="am-state-card"
              data-tone={card.tone ?? "neutral"}
              data-selected={selected}
              role="button"
              tabIndex={0}
              onClick={() => {
                onSelect?.(card);
                if (onSelect) locate(card.slot);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(card);
                  if (onSelect) locate(card.slot);
                }
              }}
              title={onSelect ? "Preview this state live" : undefined}
            >
              <div className="am-state-options" data-slot={card.slot} role="group" aria-label={`${card.title} icon`}>
                {options.map((option) => {
                  const isToggleCard = Boolean(card.toggleKey);
                  // Avatar cards are enable/disable toggles, so their icon
                  // border only shows when enabled. Other state rows always
                  // show their current icon choice; the unset default is first.
                  /*
                   * An enabled toggle card counts as chosen, even with no click
                   * behind it.
                   *
                   * `pickedSlots` exists so a row does not open with its first
                   * tile ringed: every slot always holds an icon, so "the
                   * current icon" is never empty, and a dozen rings read as a
                   * dozen picks the reader had not made — *while the canvas
                   * showed none of them*. That last clause is the whole reason,
                   * and the avatars are its exact inverse. They are on from the
                   * first frame in every style, so the canvas **is** drawing the
                   * face, and the gallery was the only place that disagreed:
                   * reported as "明明已经在画布上展示头像了，为什么左侧…头像那里相
                   * 应的头像没有被选中".
                   *
                   * `selected` is what makes this honest rather than a second
                   * default: for these cards it reads
                   * `project.conversation.userAvatar` / `agentAvatar`
                   * (`isStateCardSelected`), the same flag the canvas renders
                   * from. Turn the card off and the ring goes with it.
                   *
                   * Scoped to toggle cards, so the tool-call rows the gate was
                   * written for still open unringed.
                   */
                  /*
                   * Ticked when the tile *is* what the canvas draws, which is
                   * the whole job of a gallery.
                   *
                   * The gate above also had to pass, and `pickedSlots` starts
                   * empty and only grows when the reader clicks a tile — so a
                   * gallery opened with nothing ringed while the canvas was
                   * already drawing `chosen`. Most visible in 人机协作 and
                   * 运行状态, because nobody has usually been into those, and
                   * reported twice: 左侧栏相应的 icon 要是被选中的状态.
                   *
                   * `chosen` is the same resolution the canvas makes —
                   * `iconSet[slot]` falling back to the first offered option,
                   * exactly as `resolveIcon` does — so the ring and the mark on
                   * screen cannot disagree.
                   *
                   * Toggle cards keep the old behaviour in full: an avatar card
                   * that is switched off must not show a ringed face, and
                   * `selected` is what says it is on.
                   */
                  const pickedThisSlot = pickedSlots === undefined
                    || pickedSlots.includes(card.slot)
                    || (isToggleCard && selected);
                  const active = chosen === option.id
                    && (isToggleCard ? selected && pickedThisSlot : true);
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
                          locate(card.slot);
                        }
                      }}
                    >
                      {/* Drawn the way the *current style* draws it, not as
                          the lucide component behind the option. In 像素风 these
                          tiles used to be four smooth outlines while the canvas
                          drew pixel glyphs — a preview of a different icon set
                          than the one being chosen from. */}
                      <OptionIcon slot={card.slot} option={option.id} size={14} />
                    </button>
                  );
                })}
                {/* The reader's own picture, after the four defaults. Only in
                    the styled rail, which is the one place a reader configures
                    their side of the conversation. */}
                {card.slot === "author.user" && stylePreset ? (
                  <AvatarUploadTile
                    active={chosen === UPLOADED_AVATAR_ID && (card.toggleKey ? selected : true)}
                    onPicked={() => {
                      (onPickIcon ?? onSelect)?.(card);
                      locate(card.slot);
                    }}
                    onDeselect={() => onDeselect?.(card)}
                  />
                ) : null}
              </div>
            </div>
            <span className="am-state-name">{card.title}</span>
            {unlocated?.slot === card.slot ? (
              <span className="am-state-locate-note" key={unlocated.key} role="status">
                {LOCATE_COPY[locale] ?? LOCATE_COPY.zh}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

/**
 * The upload tile: a "+" until a picture is chosen, then the picture itself,
 * picked and un-picked like any other tile. The corner × removes it and puts
 * the "+" back, which is also how a reader replaces it.
 */
function AvatarUploadTile({
  active,
  onPicked,
  onDeselect,
}: {
  active: boolean;
  onPicked: () => void;
  onDeselect: () => void;
}) {
  const { uploadedAvatar, setUploadedAvatar, setSlot } = useIconSet();
  const { locale } = useLocale();
  const copy = UPLOAD_COPY[locale] ?? UPLOAD_COPY.zh;
  const inputRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  const choose = () => {
    setSlot("author.user", UPLOADED_AVATAR_ID);
    onPicked();
  };

  return (
    <div className="am-avatar-upload" data-filled={Boolean(uploadedAvatar)}>
      <button
        type="button"
        className="am-state-option am-avatar-upload-tile"
        data-option-id={UPLOADED_AVATAR_ID}
        data-active={active}
        aria-pressed={uploadedAvatar ? active : undefined}
        aria-busy={reading || undefined}
        title={uploadedAvatar ? copy.uploaded : copy.upload}
        aria-label={uploadedAvatar ? copy.uploaded : copy.upload}
        onClick={(e) => {
          e.stopPropagation();
          if (!uploadedAvatar) inputRef.current?.click();
          else if (active) onDeselect();
          else choose();
        }}
      >
        {uploadedAvatar ? (
          <OptionIcon slot="author.user" option={UPLOADED_AVATAR_ID} size={14} />
        ) : (
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>
      {uploadedAvatar ? (
        <button
          type="button"
          className="am-avatar-upload-remove"
          title={copy.remove}
          aria-label={copy.remove}
          onClick={(e) => {
            e.stopPropagation();
            setUploadedAvatar(null);
            // The App-level correction puts the slot back on the style's
            // default once the id points at nothing.
          }}
        >
          <X size={9} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onClick={(e) => e.stopPropagation()}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setReading(true);
          try {
            setUploadedAvatar(await readAvatarFile(file));
            choose();
          } catch {
            /* Not an image the browser can decode; the tile stays a "+". */
          } finally {
            setReading(false);
          }
        }}
      />
    </div>
  );
}

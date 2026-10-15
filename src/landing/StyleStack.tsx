import { useState, type CSSProperties } from "react";

import { themeTokens, type ThemePresetId } from "../theme/themeTokens";
import { landingStyleKeys, type LandingCopy, type LandingStyleKey } from "./copy";
import styleShots from "./styleShots.json";

type StyleShot = (typeof styleShots)[number];

const SHOTS = new Map<string, StyleShot>(styleShots.map((entry) => [entry.style, entry]));

/**
 * One full-screen card per style, stacked: each card is `position: sticky; top: 0`, so the
 * next one slides up over it. The stacking is plain CSS and holds without JavaScript; the
 * scroll-linked parts (the screen standing up as its card arrives, the covered card
 * sinking and dimming) are added by the page's ScrollTrigger and are absent under reduced
 * motion.
 *
 * A card is the style's own place: its ground is the style's canvas colour and its ink the
 * style's text colour, read from the theme tokens, so 游戏风's card is the one dark card on
 * the page because 游戏风 is the one dark style — not because a section wanted contrast.
 */
export function StyleStack({ copy }: { copy: LandingCopy["stage"] }) {
  return (
    <>
      {landingStyleKeys.map((key, index) => (
        <StyleCard key={key} styleKey={key} index={index} copy={copy} />
      ))}
    </>
  );
}

function StyleCard({ styleKey, index, copy }: { styleKey: LandingStyleKey; index: number; copy: LandingCopy["stage"] }) {
  const shot = SHOTS.get(styleKey);
  const [active, setActive] = useState(0);
  if (!shot) return null;
  const palettes = shot.palettes;
  // The card is the palette's place, so it follows the chip: picking 石拓 turns the whole
  // card to slate, not just the screen on it.
  const opening = themeTokens[palettes[active].id as ThemePresetId];
  const total = landingStyleKeys.length;
  const name = copy.styles[styleKey].name;

  return (
    <section
      className="lp-stack-card lp-style-card"
      data-style={styleKey}
      data-appearance={opening.appearance}
      aria-labelledby={`lp-style-${styleKey}`}
      style={
        {
          "--card-ground": opening.surface.canvas,
          "--card-panel": opening.surface.panel,
          "--card-ink": opening.text.primary,
          "--card-ink-2": opening.text.secondary,
          "--card-accent": opening.accent.action,
        } as CSSProperties
      }
    >
      <div className="lp-stack-inner">
        <div className="lp-style-copy">
          <p className="lp-style-index">
            {copy.styleIndex.replace("{index}", String(index + 1).padStart(2, "0")).replace("{total}", String(total).padStart(2, "0"))}
          </p>
          <h3 className="lp-style-name lp-display" id={`lp-style-${styleKey}`}>
            {name}
          </h3>
          <p className="lp-style-line">{copy.styles[styleKey].line}</p>
          <div className="lp-style-palettes" role="group" aria-label={`${name} · ${copy.paletteLabel}`}>
            <span className="lp-style-palettes-label">{copy.paletteLabel}</span>
            <div className="lp-style-chips">
              {palettes.map((palette, paletteIndex) => {
                const tokens = themeTokens[palette.id as ThemePresetId];
                return (
                  <button
                    key={palette.id}
                    type="button"
                    className="lp-style-chip"
                    aria-pressed={paletteIndex === active}
                    title={palette.name}
                    onClick={() => setActive(paletteIndex)}
                    style={
                      {
                        "--chip-a": tokens.surface.canvas,
                        "--chip-b": tokens.accent.action,
                      } as CSSProperties
                    }
                  >
                    <span className="lp-style-chip-swatch" aria-hidden="true" />
                    <span className="lp-style-chip-name">{palette.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <figure className="lp-style-stage">
          <div className="lp-style-screen">
            {palettes.map((palette, paletteIndex) => (
              <img
                key={palette.id}
                src={palette.src}
                alt={paletteIndex === active ? copy.shotAlt.replace("{style}", name).replace("{palette}", palette.name) : ""}
                aria-hidden={paletteIndex === active ? undefined : true}
                data-active={paletteIndex === active || undefined}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </figure>
      </div>
      <div className="lp-stack-dim" aria-hidden="true" />
    </section>
  );
}

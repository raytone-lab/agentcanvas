import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

import { themeTokens, type ThemePresetId } from "../theme/themeTokens";
import type { LandingCopy, LandingStyleKey } from "./copy";
import styleShots from "./styleShots.json";

type StyleShot = (typeof styleShots)[number];

/** How long each style holds the stage before the next one comes up, in ms. */
const DWELL = 3200;

/**
 * Every style in one place: a stage, and an index rail under it.
 *
 * This replaced one full-screen card per style. That stack was a good way to meet six
 * styles and a bad way to meet thirty — the page would grow by a screen per style and the
 * last one would be a minute of scrolling away. Here the page cost is fixed: one screen,
 * however many styles the manifest lists, and the rail scrolls sideways instead.
 *
 * The stage plays through the styles on its own while it is on screen, the active thumb's
 * underline filling as the dwell runs out. It stops for good the moment the reader picks
 * something (a thumb, a palette, an arrow), because from then on the choice is theirs; it
 * also pauses while the pointer or focus is on the rail, and has its own pause button
 * (WCAG 2.2.2). Under reduced motion it never starts.
 *
 * The section's ground is the active palette's canvas colour, as on the old cards: picking
 * 石拓 turns the whole screen to slate, not just the picture.
 */
export function StyleBrowser({ copy }: { copy: LandingCopy["stage"] }) {
  const shots = styleShots as StyleShot[];
  const [index, setIndex] = useState(0);
  const [palettes, setPalettes] = useState<Record<string, number>>({});
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [layers, setLayers] = useState<{ key: number; src: string; kind: "style" | "palette" }[]>(() => [
    { key: 0, src: shots[0].palettes[0].src, kind: "style" },
  ]);
  const layerKey = useRef(0);
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);

  const shot = shots[index];
  const paletteIndex = palettes[shot.style] ?? 0;
  const palette = shot.palettes[paletteIndex];
  const tokens = themeTokens[palette.id as ThemePresetId];
  const styleCopy = copy.styles[shot.style as LandingStyleKey];
  const name = styleCopy?.name ?? shot.name;
  const paletteTotal = shots.reduce((sum, entry) => sum + entry.palettes.length, 0);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.6 });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // The picture changes by layering, never by swapping one `src`: the new screen comes in
  // over the old one, and the old one is dropped once it is covered.
  useEffect(() => {
    setLayers((current) => {
      const top = current[current.length - 1];
      if (top?.src === palette.src) return current;
      layerKey.current += 1;
      const kind = top && shots.some((entry) => entry.style === shot.style && entry.palettes.some((p) => p.src === top.src)) ? "palette" : "style";
      return [...current.slice(-1), { key: layerKey.current, src: palette.src, kind }];
    });
  }, [palette.src, shot.style, shots]);

  // The next style's opening screen is fetched while this one is on stage.
  useEffect(() => {
    const next = shots[(index + 1) % shots.length];
    const image = new Image();
    image.src = next.palettes[palettes[next.style] ?? 0].src;
  }, [index, palettes, shots]);

  // Keep the active thumb in the rail's view — the rail, not the page, is what scrolls.
  useEffect(() => {
    const rail = railRef.current;
    const thumb = rail?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (!rail || !thumb) return;
    const left = thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [index]);

  const choose = (next: number) => {
    setPlaying(false);
    setIndex((next + shots.length) % shots.length);
  };

  const onRailKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    let target: number | undefined;
    if (step) target = index + step;
    if (event.key === "Home") target = 0;
    if (event.key === "End") target = shots.length - 1;
    if (target === undefined) return;
    event.preventDefault();
    const wrapped = (target + shots.length) % shots.length;
    choose(wrapped);
    railRef.current?.querySelector<HTMLElement>(`[data-index="${wrapped}"]`)?.focus();
  };

  const counter = copy.styleIndex
    .replace("{index}", String(index + 1).padStart(2, "0"))
    .replace("{total}", String(shots.length).padStart(2, "0"));

  return (
    <section
      ref={rootRef}
      className="lp-stack-card lp-browser"
      data-appearance={tokens.appearance}
      data-playing={playing ? "true" : "false"}
      data-running={playing && inView ? "true" : undefined}
      aria-roledescription="carousel"
      aria-label={copy.browserLabel}
      style={
        {
          "--card-ground": tokens.surface.canvas,
          "--card-panel": tokens.surface.panel,
          "--card-ink": tokens.text.primary,
          "--card-ink-2": tokens.text.secondary,
          "--card-accent": tokens.accent.action,
          "--dwell": `${DWELL}ms`,
        } as CSSProperties
      }
    >
      <div className="lp-stack-inner lp-browser-inner">
        <div className="lp-browser-copy" id="lp-browser-panel" role="tabpanel" aria-labelledby={`lp-browser-tab-${index}`}>
          <p className="lp-browser-count">
            <span>{counter}</span>
            <span aria-hidden="true">·</span>
            <span>
              {copy.stylesCount.replace("{styles}", String(shots.length)).replace("{palettes}", String(paletteTotal))}
            </span>
          </p>
          {/* Keyed by style, so the name is a fresh element that rises into its mask each
              time — the same entrance as the hero's lines. */}
          <h3 className="lp-browser-name lp-display" aria-live="polite">
            <span className="lp-line">
              <span className="lp-line-inner" key={shot.style}>
                {name}
              </span>
            </span>
          </h3>
          <p className="lp-browser-line" key={`line-${shot.style}`}>
            {styleCopy?.line}
          </p>
          <div className="lp-style-palettes" role="group" aria-label={`${name} · ${copy.paletteLabel}`}>
            <span className="lp-style-palettes-label">{copy.paletteLabel}</span>
            <div className="lp-style-chips">
              {shot.palettes.map((entry, chipIndex) => {
                const chip = themeTokens[entry.id as ThemePresetId];
                return (
                  <button
                    key={entry.id}
                    type="button"
                    className="lp-style-chip"
                    aria-pressed={chipIndex === paletteIndex}
                    onClick={() => {
                      setPlaying(false);
                      setPalettes((current) => ({ ...current, [shot.style]: chipIndex }));
                    }}
                    style={{ "--chip-a": chip.surface.canvas, "--chip-b": chip.accent.action } as CSSProperties}
                  >
                    <span className="lp-style-chip-swatch" aria-hidden="true" />
                    <span className="lp-style-chip-name">{entry.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <figure className="lp-style-stage lp-browser-stage">
          <div className="lp-browser-screen">
            {layers.map((layer, layerIndex) => (
              <img
                key={layer.key}
                src={layer.src}
                alt={
                  layerIndex === layers.length - 1
                    ? copy.shotAlt.replace("{style}", name).replace("{palette}", palette.name)
                    : ""
                }
                aria-hidden={layerIndex === layers.length - 1 ? undefined : true}
                data-kind={layer.kind}
                data-entering={layerIndex === layers.length - 1 && layers.length > 1 ? "true" : undefined}
                onAnimationEnd={() => setLayers((current) => current.slice(-1))}
                decoding="async"
                draggable={false}
              />
            ))}
          </div>
        </figure>

        <div className="lp-browser-dock">
          <div
            className="lp-browser-rail"
            ref={railRef}
            role="tablist"
            aria-label={copy.styleListLabel}
            onKeyDown={onRailKey}
          >
            {shots.map((entry, thumbIndex) => {
              const active = thumbIndex === index;
              const thumbName = copy.styles[entry.style as LandingStyleKey]?.name ?? entry.name;
              return (
                <button
                  key={entry.style}
                  type="button"
                  role="tab"
                  id={`lp-browser-tab-${thumbIndex}`}
                  aria-selected={active}
                  aria-controls="lp-browser-panel"
                  tabIndex={active ? 0 : -1}
                  data-index={thumbIndex}
                  className="lp-browser-thumb"
                  onClick={() => choose(thumbIndex)}
                >
                  <span className="lp-browser-thumb-shot">
                    <img src={entry.palettes[0].src} alt="" loading="lazy" decoding="async" draggable={false} />
                  </span>
                  <span className="lp-browser-thumb-name">{thumbName}</span>
                  <span className="lp-browser-thumb-meter" aria-hidden="true">
                    {active ? (
                      <span
                        key={`${index}-${playing}`}
                        className="lp-browser-thumb-fill"
                        onAnimationEnd={() => setIndex((current) => (current + 1) % shots.length)}
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="lp-browser-controls">
            <button
              type="button"
              className="lp-browser-control"
              aria-label={playing ? copy.autoplayPause : copy.autoplayPlay}
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
            </button>
            <button type="button" className="lp-browser-control" aria-label={copy.prevStyle} onClick={() => choose(index - 1)}>
              <ChevronLeft size={17} aria-hidden="true" />
            </button>
            <button type="button" className="lp-browser-control" aria-label={copy.nextStyle} onClick={() => choose(index + 1)}>
              <ChevronRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

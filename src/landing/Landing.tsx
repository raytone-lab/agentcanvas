import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CirclePlay,
  Download,
  FileText,
  Lock,
  Network,
  MessagesSquare,
  PanelLeft,
  PanelsTopLeft,
  PenLine,
  Shield,
  Sparkles,
  Star,
  Type,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { appVersionLabel } from "../appVersion";
import { useLocale } from "../i18n/LocaleContext";
import { minimalThemePresetIds, nativeThemePresetIds, themeTokens } from "../theme/themeTokens";
import { EXPORT_FILE_COUNT } from "./exportFacts";
import { FileList } from "./FileList";
import { LocaleSwitch } from "./LocaleSwitch";
import { RunSteps } from "./RunSteps";
import { SlidingTabs } from "./SlidingTabs";
import { ThemeCompare } from "./ThemeCompare";
// `.ui-button` only — importing the `components/ui` barrel would pull Radix dialog,
// popover, dropdown and friends into the landing bundle for two anchors.
import "../components/ui/button.css";
import { landingCopy, landingPartKeys, type LandingPartKey } from "./copy";
import { providerMark } from "./providerMarks";
import {
  isProtocolOutlier,
  landingProviderGroups,
  landingProviders,
  providerGroupCount,
} from "./providers";
import { heroPosterSrc, heroVideoSrc } from "./shots";
import { EDITOR_URL, GITHUB_REPO_URL } from "./siteConfig";
import "./landing.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** One icon per event family, in the order `events.rows` declares them. */
const EVENT_ICON: readonly LucideIcon[] = [CirclePlay, Type, Network, Wrench, Shield, FileText];

/** Same icon each surface carries in the editor's own preset rail (App.tsx). */
const PART_ICON: Record<LandingPartKey, LucideIcon> = {
  sessions: PanelLeft,
  chat: MessagesSquare,
  thinking: Sparkles,
  tools: Wrench,
  output: PanelsTopLeft,
  composer: PenLine,
};

/**
 * Lucide dropped brand marks, so this one glyph is inline (DESIGN.md §7.5 unifies on
 * Lucide for *iconography*; a wordmark is not in that set). Single path, currentColor.
 */
function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-2.92-.88-2.92-2.75 0-.83.3-1.51.79-2.04-.08-.2-.35-1 .07-2.07 0 0 .64-.2 2.1.78a7.3 7.3 0 0 1 1.91-.26c.65 0 1.3.09 1.91.26 1.46-.99 2.1-.78 2.1-.78.42 1.07.15 1.87.07 2.07.49.53.79 1.21.79 2.04 0 1.88-1.14 2.55-2.93 2.75.29.25.55.74.55 1.5 0 1.08-.01 1.96-.01 2.23 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  );
}

/** Screenshot frame that degrades to a labelled placeholder when the file is absent. */
function Shot({
  src,
  alt,
  missingLabel,
  loading = "lazy",
}: {
  src: string;
  alt: string;
  missingLabel: string;
  loading?: "eager" | "lazy";
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="lp-shot">
      {failed ? (
        <div className="lp-shot-missing">
          <strong>{missingLabel}</strong>
          <code>public{src}</code>
        </div>
      ) : (
        <img src={src} alt={alt} loading={loading} decoding="async" onError={() => setFailed(true)} />
      )}
    </div>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (typeof matchMedia !== "function") {
      return;
    }
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/**
 * The recorded editor demo.
 *
 * Falls back to the poster still in two cases: the viewer asked for reduced motion, or
 * the video failed to load. The pause control is not optional decoration — the clip
 * autoplays and loops well past five seconds, which WCAG 2.2.2 says must be stoppable.
 */
function HeroDemo({
  videoSrc,
  posterSrc,
  alt,
  pauseLabel,
  playLabel,
  missingLabel,
}: {
  videoSrc: string;
  posterSrc: string;
  alt: string;
  pauseLabel: string;
  playLabel: string;
  missingLabel: string;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const [failed, setFailed] = useState(false);
  const [playing, setPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (reducedMotion || failed) {
    return <Shot src={posterSrc} alt={alt} missingLabel={missingLabel} loading="eager" />;
  }

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPlaying(true);
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="lp-shot lp-shot--video">
      <video
        ref={videoRef}
        src={videoSrc}
        poster={posterSrc}
        aria-label={alt}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
      <button
        type="button"
        className="lp-media-toggle"
        onClick={toggle}
        aria-label={playing ? pauseLabel : playLabel}
      >
        {playing ? (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <rect x="2" y="1.5" width="3" height="9" rx="1" />
            <rect x="7" y="1.5" width="3" height="9" rx="1" />
          </svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path d="M3 1.8 10 6 3 10.2Z" />
          </svg>
        )}
      </button>
    </div>
  );
}

/**
 * A paint chip per theme, built from the real token values in `src/theme/themeTokens.ts`.
 *
 * Two bands only: page canvas and accent. A three-band version including `surface.panel`
 * was tried and dropped — in every light theme the canvas and panel are within a few
 * percent of each other (#F4F6FA against #FFFFFF, say), so the middle band carried no
 * information and the chip read as a white rectangle with a stripe. Canvas and accent are
 * the two values that actually tell the themes apart.
 *
 * Values may be `color-mix()` expressions, so they are handed to CSS as custom properties
 * rather than parsed here.
 */
function ThemeSwatch({ id }: { id: keyof typeof themeTokens }) {
  const theme = themeTokens[id];
  return (
    <li className="lp-theme">
      <span
        className="lp-theme-chip"
        aria-hidden="true"
        style={{
          ["--chip-canvas" as string]: theme.surface.canvas,
          ["--chip-accent" as string]: theme.accent.action,
        }}
      >
        <i data-band="canvas" />
        <i data-band="accent" />
      </span>
      <span className="lp-theme-name">{theme.name}</span>
    </li>
  );
}

export function Landing() {
  const { locale, setLocale } = useLocale();
  const copy = landingCopy[locale];
  const [scrolled, setScrolled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * Scroll motion, deliberately limited to two things: ledger rows entering, and the
   * callout labels landing on the screenshot one after another. Nothing ambient, nothing
   * looping, nothing decorative — the reference this page is modelled on treats a pulsing
   * dot as a defect, and DESIGN.md §7.1 caps motion at 240ms with no bounce.
   *
   * The hidden state is set from JS rather than CSS on purpose: if the bundle fails, the
   * page renders as plain visible content instead of a blank column.
   */
  useGSAP(
    () => {
      const ANIMATED = ".lp-reveal, .lp-map-row";
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(ANIMATED, { opacity: 0, y: 10 });

        const reveal = (batch: Element[]) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.24,
            ease: "power2.out",
            stagger: 0.05,
            overwrite: true,
          });

        // `top bottom`: reveal as soon as any part of a row enters the viewport. A later
        // start looks better in a slow scroll but leaves rows blank for anyone who lands
        // mid-page or jumps by anchor.
        ScrollTrigger.batch(ANIMATED, { start: "top bottom", once: true, onEnter: reveal });

        /**
         * The hero video and the two compare stills load after mount and change the page
         * height, which leaves every trigger below them measuring against a stale layout —
         * the documented cause of "content never appears". Refresh on each media load, and
         * again on window load.
         */
        const refresh = () => ScrollTrigger.refresh();
        const mediaEls = gsap.utils.toArray<HTMLElement>("img, video", rootRef.current);
        mediaEls.forEach((el) => el.addEventListener("load", refresh, { once: true }));
        mediaEls.forEach((el) => el.addEventListener("loadeddata", refresh, { once: true }));
        window.addEventListener("load", refresh, { once: true });

        /**
         * Failsafe. Hiding content and waiting for a scroll trigger means any missed
         * refresh leaves the page blank, which is a far worse outcome than a missing
         * entrance animation. After a beat, anything still hidden is simply shown.
         */
        const failsafe = window.setTimeout(() => {
          const stuck = gsap.utils
            .toArray<HTMLElement>(ANIMATED, rootRef.current)
            .filter((el) => Number(getComputedStyle(el).opacity) < 0.9);
          if (stuck.length > 0) {
            gsap.set(stuck, { opacity: 1, y: 0, clearProps: "transform" });
          }
        }, 1500);

        return () => {
          window.clearTimeout(failsafe);
          window.removeEventListener("load", refresh);
          mediaEls.forEach((el) => {
            el.removeEventListener("load", refresh);
            el.removeEventListener("loadeddata", refresh);
          });
        };
      });

      // Reduced motion: no entrance at all, everything simply present.
      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(ANIMATED, { opacity: 1, y: 0 });
      });

      return () => media.revert();
    },
    { scope: rootRef },
  );

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // `<html lang>` is set by LocaleProvider, which covers both entry points.

  return (
    <div className="lp-page" ref={rootRef}>
      <a className="lp-skip" href="#lp-main">
        {copy.nav.skipToContent}
      </a>

      {/* Floating capsules rather than a full-width bar: the page's ground stays visible
          behind them, which is what keeps a sticky header from feeling like chrome. */}
      <header className="lp-header" data-scrolled={scrolled}>
        <div className="lp-shell lp-header-inner">
          <a className="lp-brand" href="/">
            AgentCanvas<span>{copy.brandSuffix}</span>
          </a>
          {/* No enclosing capsule and no solid pill for GitHub: a language switch and one
              link do not need two layers of container to be findable. */}
          <div className="lp-nav">
            <LocaleSwitch
              locale={locale}
              onChange={setLocale}
              ariaLabel={copy.nav.localeAria}
              labels={{ zh: copy.nav.localeZh, en: copy.nav.localeEn, ja: copy.nav.localeJa }}
            />
            <a
              className="lp-nav-github"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={copy.nav.github}
            >
              <GithubMark size={14} />
              <span>{copy.nav.github}</span>
            </a>
          </div>
        </div>
      </header>

      <main id="lp-main">
        <section className="lp-shell lp-hero">
          <p className="lp-kicker">
            {copy.hero.eyebrowTags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </p>
          <h1 className="lp-hero-title">{copy.hero.title}</h1>
          <p className="lp-hero-lede">{copy.hero.lede}</p>
          <div className="lp-hero-actions">
            <a className="ui-button lp-cta" data-variant="primary" data-size="lg" href={EDITOR_URL}>
              {copy.hero.primaryCta}
              <ArrowRight size={16} aria-hidden="true" />
            </a>
            <a
              className="ui-button lp-cta"
              data-variant="secondary"
              data-size="lg"
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
            >
              <Star size={16} aria-hidden="true" />
              {copy.hero.secondaryCta}
            </a>
          </div>
          <p className="lp-hero-note">{copy.hero.note}</p>
          <figure className="lp-hero-shot">
            <HeroDemo
              videoSrc={heroVideoSrc}
              posterSrc={heroPosterSrc}
              alt={copy.hero.shotAlt}
              pauseLabel={copy.hero.demoPause}
              playLabel={copy.hero.demoPlay}
              missingLabel={copy.shotMissing}
            />
            <figcaption>{copy.hero.demoCaption}</figcaption>
          </figure>
        </section>

        {/* 1 — Strip. Lowest weight on the page and headingless on purpose: the video
            above just demonstrated this flow, so these three only need to name it. */}
        <section className="lp-strip" aria-labelledby="lp-strip-title">
          {/* The group needs a name for assistive tech even though the design wants no
              visible heading here — and the step titles must sit below it, not become
              three more peers of the real section headings. */}
          <h2 className="lp-sr-only" id="lp-strip-title">
            {copy.how.title}
          </h2>
          <ol className="lp-shell lp-strip-inner">
            {copy.how.steps.map((step) => (
              <li key={step.title}>
                {/* No "01 / 02 / 03" markers: <ol> already carries the order, and the
                    printed numerals are a stock generated-landing-page tell. */}
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 2 — Two-column ledger of hairline rows. This was a heading-left /
            content-right split, which left the aside column empty for most of its
            height once the six real rows were in place. */}
        <section className="lp-section">
          <div className="lp-shell">
            <h2 className="lp-section-title">{copy.parts.title}</h2>
            <p className="lp-section-lede">{copy.parts.lede}</p>
            {/* No screenshot here. The hero already shows this editor in motion; a static
                full-width shot of the same screen directly below it said nothing new. */}
            <ul className="lp-cards">
              {landingPartKeys.map((key) => {
                const part = copy.parts.items[key];
                const Icon = PART_ICON[key];
                return (
                  <li className="lp-card lp-reveal" key={key}>
                    {/* A 16px glyph on the title's line, not a filled tile above it. The
                        dark-rounded-square-over-centred-text card is the stock template
                        shape, and the tile was the loudest thing in it. */}
                    <div className="lp-card-head">
                      <Icon size={16} aria-hidden="true" />
                      <h3>{part.name}</h3>
                    </div>
                    {/* The real file in src/components/agent-preview/, as plain monospace.
                        It was a grey pill; a chip around a filename is decoration. */}
                    <code className="lp-card-ref">{part.component}</code>
                    <p>{part.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 3 — The page's technical anchor, and the only contained surface below the
            hero. Providers live in its footer because pasting a key is how you feed it
            real events, not a separate topic. */}
        <section className="lp-section">
          <div className="lp-shell">
            <h2 className="lp-section-title">{copy.events.title}</h2>
            <p className="lp-section-lede">{copy.events.lede}</p>
            {/* Stages joined by rules, the last one in ink: the claim as one line. */}
            <ol className="lp-flow">
              {copy.events.flow.map((stage) => (
                <li key={stage.label}>
                  <span className="lp-flow-label">{stage.label}</span>
                  {stage.file ? <code>{stage.file}</code> : null}
                </li>
              ))}
            </ol>

            {/*
              * One table, not a rail beside a table.
              *
              * The rail and the rows were two parallel six-item lists in separate panes:
              * the rail's items were evenly spaced, the rows were content-height, so item
              * N never sat level with row N and the correspondence they were meant to show
              * was the one thing the layout denied. As the table's first column it aligns
              * by construction — which is what a table is for — and the hover pairing the
              * rail needed to imply it becomes unnecessary.
              */}
            <div className="lp-mapper">
              <table className="lp-map">
                <thead>
                  <tr>
                    <th scope="col">{copy.events.columnCategory}</th>
                    <th scope="col">{copy.events.columnEvent}</th>
                    <th scope="col">{copy.events.columnMapping}</th>
                    <th scope="col">{copy.events.columnTarget}</th>
                  </tr>
                </thead>
                <tbody>
                  {copy.events.rows.map((row, index) => {
                    const Icon = EVENT_ICON[index] ?? CirclePlay;
                    return (
                      <tr key={row.events.join()} data-zebra={index % 2 === 1 ? "true" : undefined}>
                        <th scope="row">
                          <span className="lp-map-icon" aria-hidden="true">
                            <Icon size={15} />
                          </span>
                          {/* Name only. A live count would go stale against a list that
                              is still growing, and it was the least useful line in the
                              densest cell. */}
                          <span className="lp-map-family">{row.label}</span>
                        </th>
                        <td>
                          <span className="lp-map-events">
                            {row.events.map((event) => (
                              <code key={event}>{event}</code>
                            ))}
                          </span>
                        </td>
                        <td className="lp-map-arrow">
                          {/* Drawn, not typed, so it does not depend on a font shipping
                              the glyph. */}
                          <svg viewBox="0 0 56 8" width="56" height="8" fill="none" aria-hidden="true">
                            <path
                              d="M0 4h50m0 0-5-3.5m5 3.5-5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </td>
                        <td>
                          <strong className="lp-map-target">{row.component}</strong>
                          <span className="lp-map-note">{row.ui}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Providers used to be a footer strip inside the event panel, where it read as an
            afterthought. It is its own short block now. */}
        <section className="lp-section lp-section--tight">
          <div className="lp-shell">
            <div className="lp-head">
              <div>
                <h2 className="lp-section-title">{copy.providers.title}</h2>
                <p className="lp-section-lede">{copy.providers.lede}</p>
              </div>
              <p className="lp-head-note">
                {copy.providers.countNote.replace("{count}", String(landingProviders.length))}
              </p>
            </div>

            {/* One card: ledger strip, then the grid, then the two facts. The ledger sat in a
                left column until it was pointed out that three rows beside a three-row grid
                leaves a tall empty well underneath — as a strip it has no spare height to
                leave empty. It stays inert: filtering it would drop the grid to a single cell
                for two of the three groups. */}
            <div className="lp-providers">
              <dl className="lp-providers-ledger">
                {landingProviderGroups.map((group) => (
                  <div key={group}>
                    <dt>{copy.providers.groups[group]}</dt>
                    <dd>{providerGroupCount(group)}</dd>
                  </div>
                ))}
              </dl>
              <ul className="lp-providers-grid">
                {landingProviders.map((provider) => (
                  <li key={provider.id} data-outlier={isProtocolOutlier(provider) || undefined}>
                    <span className="lp-provider-mark">{providerMark[provider.id]}</span>
                    <span className="lp-provider-name">{copy.providers.names[provider.id]}</span>
                    <span className="lp-provider-protocol">{provider.protocol}</span>
                  </li>
                ))}
              </ul>
              <dl className="lp-providers-facts">
                <div>
                  <Network aria-hidden="true" />
                  <dt>
                    <span>01</span>
                    {copy.providers.protocolLabel}
                  </dt>
                  <dd>{copy.providers.protocolNote}</dd>
                </div>
                <div>
                  <Lock aria-hidden="true" />
                  <dt>
                    <span>02</span>
                    {copy.providers.keyLabel}
                  </dt>
                  <dd>{copy.providers.keyNote}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* 4 — The page's one change of ground colour, carrying its most visual content. */}
        <section className="lp-band">
          <div className="lp-shell">
            <h2 className="lp-section-title">{copy.themes.title}</h2>
            <p className="lp-section-lede">{copy.themes.lede}</p>
            <ThemeCompare
              label={copy.themes.compareLabel}
              lightBadge={copy.themes.compareLight}
              darkBadge={copy.themes.compareDark}
              lightAlt={copy.themes.compareLightAlt}
              darkAlt={copy.themes.compareDarkAlt}
            />
            <p className="lp-note">{copy.themes.compareHint}</p>
            <SlidingTabs
              label={copy.themes.tabsLabel}
              items={[
                {
                  value: "native",
                  label: copy.themes.groupNative,
                  content: (
                    <ul className="lp-themes">
                      {nativeThemePresetIds.map((id) => (
                        <ThemeSwatch id={id} key={id} />
                      ))}
                    </ul>
                  ),
                },
                {
                  value: "minimal",
                  label: copy.themes.groupMinimal,
                  content: (
                    <ul className="lp-themes">
                      {minimalThemePresetIds.map((id) => (
                        <ThemeSwatch id={id} key={id} />
                      ))}
                    </ul>
                  ),
                },
              ]}
            />
            <p className="lp-note">{copy.themes.styleNote}</p>
          </div>
        </section>

        {/* 5 — Named files first, the full tree folded away behind a disclosure. */}
        <section className="lp-section">
          <div className="lp-shell">
            {/* Title and lede left, the two install commands parked top-right — the one thing on
                this page a visitor takes away with them, so it sits above the detail. */}
            <div className="lp-head lp-head--steps">
              <div>
                <h2 className="lp-section-title">{copy.exported.title}</h2>
                <p className="lp-section-lede">{copy.exported.lede}</p>
              </div>
              <RunSteps
                steps={copy.exported.steps}
                copyLabel={copy.exported.copyLabel}
                copiedLabel={copy.exported.copiedLabel}
              />
            </div>

            <FileList
              label={copy.exported.coreLabel}
              files={copy.exported.coreFiles}
              tree={copy.exported.tree}
              expandLabel={copy.exported.expandLabel}
              expandNote={copy.exported.expandNote.replace(
                "{count}",
                String(EXPORT_FILE_COUNT),
              )}
              expandAction={copy.exported.expandAction}
              collapseAction={copy.exported.collapseAction}
            />

            <ul className="lp-scripts" aria-label={copy.exported.scriptsLabel}>
              {copy.exported.scripts.map((script) => (
                <li key={script.name}>
                  <code>npm run {script.name}</code>
                </li>
              ))}
            </ul>
            <p className="lp-note lp-note--wide">{copy.exported.treeNote}</p>
          </div>
        </section>

        {/* 6 — Narrow single column of hairline rows: the quietest, densest block, right
            before the page asks for the click. */}
        <section className="lp-section">
          <div className="lp-shell">
            <h2 className="lp-section-title">{copy.limits.title}</h2>
            {/* Label left, prose right, one row each. Three equal columns of running text
                gave the three boundaries no hierarchy and no rhythm. */}
            <dl className="lp-limits">
              {copy.limits.items.map((item) => (
                <div className="lp-reveal" key={item.title}>
                  <dt>{item.title}</dt>
                  <dd>{item.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 7 — The closing ask. The page previously ran out into the footer with no
            second CTA anywhere after the hero. */}
        <section className="lp-closing">
          <div className="lp-shell">
            <h2>{copy.closing.title}</h2>
            <p>{copy.closing.body}</p>
            <div className="lp-hero-actions">
              <a className="ui-button lp-cta" data-variant="primary" data-size="lg" href={EDITOR_URL}>
                {copy.closing.primaryCta}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
              <a
                className="ui-button lp-cta"
                data-variant="secondary"
                data-size="lg"
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
              >
                <Star size={16} aria-hidden="true" />
                {copy.closing.secondaryCta}
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-shell lp-footer-inner">
          <span className="lp-version">AgentCanvas {appVersionLabel}</span>
          <div className="lp-footer-links">
            <a className="lp-link" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
              <GithubMark size={14} />
              {copy.footer.github}
            </a>
            <a className="lp-link" href={EDITOR_URL}>
              <Download size={14} aria-hidden="true" />
              {copy.footer.openEditor}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

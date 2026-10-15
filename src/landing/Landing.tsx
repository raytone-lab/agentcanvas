import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import {
  ArrowRight,
  ArrowUpRight,
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
import { EXPORT_FILE_COUNT } from "./exportFacts";
import { FileList } from "./FileList";
import { LocaleSwitch } from "./LocaleSwitch";
import { RunSteps } from "./RunSteps";
import { ScreenWall } from "./ScreenWall";
import { Statement } from "./Statement";
import { StyleStack } from "./StyleStack";
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
import { EDITOR_URL, GITHUB_REPO_URL } from "./siteConfig";
import "./landing.css";
import "./landing-stage.css";

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

/**
 * A display line as unbreakable phrases: the browser may wrap only *between* phrases, so a
 * headline never breaks inside a word group — CJK otherwise wraps after any character
 * ("组一 / 个 Agent").
 */
function Phrases({ phrases }: { phrases: readonly string[] }) {
  return (
    <>
      {phrases.map((phrase, index) => (
        <span className="lp-phrase" key={index}>
          {phrase}
        </span>
      ))}
    </>
  );
}

export function Landing() {
  const { locale, setLocale } = useLocale();
  const copy = landingCopy[locale];
  const stage = copy.stage;
  const [scrolled, setScrolled] = useState(false);
  const [wallPaused, setWallPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /*
   * Smooth scroll, driven by GSAP's ticker so Lenis and ScrollTrigger read the same frame —
   * two clocks is the usual source of a one-frame jump at a scrubbed boundary. Not created
   * under reduced motion: native scrolling is the honest answer there.
   */
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // In-page anchors go through Lenis too, or they jump while everything else glides.
    const onClick = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const target = document.querySelector(link.getAttribute("href") ?? "");
      if (!target) return;
      event.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -72 });
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  /**
   * Every scroll-linked motion on the page, and what each one says:
   *
   *   screen stands up    a style card's screen rises from 22° to face the reader as the card
   *                       arrives — "here is this one, shown to you"
   *   covered card sinks  the card being covered slides up 12% inside its own frame and dims,
   *                       so only one style is ever in front
   *   wall pauses         the hero's drift stops once the hero is covered
   *   statement lights    the one sentence brightens piece by piece with the scroll
   *   rows enter          ledger rows below fade up once, in batches
   *
   * Hidden starting states are set here, never in CSS, so a failed bundle leaves a plain
   * readable page rather than a blank one.
   */
  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>(".lp-stack-card");
        cards.forEach((card, index) => {
          const screen = card.querySelector(".lp-style-stage");
          if (screen && index > 0) {
            gsap.fromTo(
              screen,
              { rotateX: 22, yPercent: 10, transformPerspective: 1600, transformOrigin: "50% 100%" },
              {
                rotateX: 0,
                yPercent: 0,
                ease: "none",
                scrollTrigger: { trigger: card, start: "top bottom", end: "top top", scrub: true },
              },
            );
          }
          const next = cards[index + 1];
          if (!next) return;
          const inner = card.querySelector(".lp-stack-inner");
          const dim = card.querySelector(".lp-stack-dim");
          const cover = { trigger: next, start: "top bottom", end: "top top", scrub: true };
          if (inner) gsap.to(inner, { yPercent: -12, ease: "none", scrollTrigger: cover });
          if (dim) gsap.fromTo(dim, { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: cover });
        });

        if (cards[1]) {
          ScrollTrigger.create({
            trigger: cards[1],
            start: "top top",
            onEnter: () => setWallPaused(true),
            onLeaveBack: () => setWallPaused(false),
          });
        }

        const pieces = gsap.utils.toArray<HTMLElement>(".lp-statement-piece");
        if (pieces.length) {
          gsap.fromTo(
            pieces,
            { opacity: 0.16 },
            {
              opacity: 1,
              ease: "none",
              stagger: 0.12,
              scrollTrigger: { trigger: ".lp-statement", start: "top top", end: "bottom bottom", scrub: true },
            },
          );
        }

        const ANIMATED = ".lp-reveal, .lp-map-row";
        gsap.set(ANIMATED, { opacity: 0, y: 24 });
        ScrollTrigger.batch(ANIMATED, {
          start: "top bottom",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, overwrite: true }),
        });

        // Images settle the layout after mount; triggers measured before that are stale.
        const refresh = () => ScrollTrigger.refresh();
        const mediaEls = gsap.utils.toArray<HTMLElement>("img", rootRef.current);
        mediaEls.forEach((el) => el.addEventListener("load", refresh, { once: true }));
        window.addEventListener("load", refresh, { once: true });
        // Anything a missed refresh left hidden is shown after a beat — a missing entrance is
        // a far smaller failure than a blank block.
        const failsafe = window.setTimeout(() => {
          const stuck = gsap.utils
            .toArray<HTMLElement>(ANIMATED, rootRef.current)
            .filter((el) => Number(getComputedStyle(el).opacity) < 0.9 && el.getBoundingClientRect().top < window.innerHeight);
          if (stuck.length) gsap.set(stuck, { opacity: 1, y: 0, clearProps: "transform" });
        }, 1800);

        return () => {
          window.clearTimeout(failsafe);
          window.removeEventListener("load", refresh);
          mediaEls.forEach((el) => el.removeEventListener("load", refresh));
        };
      });

      media.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set(".lp-reveal, .lp-map-row, .lp-statement-piece", { opacity: 1, y: 0 });
      });

      return () => media.revert();
    },
    { scope: rootRef, dependencies: [locale] },
  );

  /*
   * The header takes the tone of what is under it. Over a dark card (游戏风, or any card
   * switched to a dark palette) a paper-glass bar reads as a grey stripe, so it turns to ink
   * glass. Read from whatever sits just below the bar, on scroll and after a palette click.
   */
  const [headerTone, setHeaderTone] = useState<"light" | "dark">("light");
  useEffect(() => {
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 8);
        const under = document.elementFromPoint(window.innerWidth / 2, 80);
        const card = under?.closest<HTMLElement>(".lp-stack-card");
        setHeaderTone(card?.dataset.appearance === "dark" ? "dark" : "light");
      });
    };
    read();
    window.addEventListener("scroll", read, { passive: true });
    document.addEventListener("click", read);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", read);
      document.removeEventListener("click", read);
    };
  }, []);

  // `<html lang>` is set by LocaleProvider, which covers both entry points.

  return (
    <div className="lp-page" ref={rootRef}>
      <a className="lp-skip" href="#lp-main">
        {copy.nav.skipToContent}
      </a>

      <header className="lp-header" data-scrolled={scrolled} data-tone={headerTone}>
        <div className="lp-shell lp-header-inner">
          <a className="lp-brand" href="/">
            <img className="lp-brand-mark" src="/agent-canvas-mark.svg" alt="" aria-hidden="true" />
            <span className="lp-brand-name">Agent Canvas</span>
          </a>
          <nav className="lp-sections" aria-label="Sections">
            <a href="#lp-styles">{stage.navStyles}</a>
            <a href="#lp-parts">{stage.navParts}</a>
            <a href="#lp-events">{stage.navEvents}</a>
            <a href="#lp-export">{stage.navExport}</a>
          </nav>
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
        {/* The stack: the hero, the styles' introduction and the six style cards are one
            pile of full-screen cards, each sliding up over the last — every hand-off on this
            half of the page is the same gesture. */}
        <div className="lp-stack">
          <section className="lp-stack-card lp-hero-card" aria-labelledby="lp-hero-title">
            <ScreenWall label={stage.wallAlt} paused={wallPaused} />
            <div className="lp-hero-scrim" aria-hidden="true" />
            <div className="lp-stack-inner lp-hero-inner">
              <p className="lp-kicker lp-rise" style={{ animationDelay: "0ms" }}>
                {copy.hero.eyebrowTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </p>
              <h1 className="lp-hero-heading lp-display" id="lp-hero-title">
                {stage.heroTitle.map((phrase, index) => (
                  <span className="lp-line" key={index}>
                    <span className="lp-line-inner" style={{ animationDelay: `${120 + index * 90}ms` }}>
                      {phrase}
                    </span>
                  </span>
                ))}
              </h1>
              <p className="lp-hero-lede lp-rise" style={{ animationDelay: "420ms" }}>
                {copy.hero.lede}
              </p>
              <div className="lp-hero-actions lp-rise" style={{ animationDelay: "500ms" }}>
                <a className="lp-button" data-variant="solid" href={EDITOR_URL}>
                  {copy.hero.primaryCta}
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
                <a className="lp-button" data-variant="ghost" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                  <Star size={16} aria-hidden="true" />
                  {copy.hero.secondaryCta}
                </a>
              </div>
              <p className="lp-hero-note lp-rise" style={{ animationDelay: "560ms" }}>
                {copy.hero.note}
              </p>
            </div>
            <div className="lp-stack-dim" aria-hidden="true" />
          </section>

          <section className="lp-stack-card lp-intro-card" id="lp-styles" aria-labelledby="lp-styles-title">
            <div className="lp-stack-inner lp-intro-inner">
              <p className="lp-eyebrow">{stage.stylesKicker}</p>
              <h2 className="lp-intro-title lp-display" id="lp-styles-title">
                <Phrases phrases={stage.stylesTitle} />
              </h2>
              <p className="lp-intro-lede">{stage.stylesLede}</p>
            </div>
            <div className="lp-stack-dim" aria-hidden="true" />
          </section>

          <StyleStack copy={stage} />
        </div>

        <Statement text={stage.statement} locale={locale} />

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
        <section className="lp-section" id="lp-parts">
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
        <section className="lp-section" id="lp-events">
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

        {/* 5 — Named files first, the full tree folded away behind a disclosure. */}
        <section className="lp-section" id="lp-export">
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

        <section className="lp-finale">
          <div className="lp-shell">
            <h2 className="lp-finale-title lp-display">
              <Phrases phrases={stage.closingTitle} />
            </h2>
            <p className="lp-finale-body">{copy.closing.body}</p>
            <div className="lp-hero-actions">
              <a className="lp-button" data-variant="solid" data-size="xl" href={EDITOR_URL}>
                {copy.closing.primaryCta}
                <ArrowUpRight size={18} aria-hidden="true" />
              </a>
              <a className="lp-button" data-variant="ghost" data-size="xl" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
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

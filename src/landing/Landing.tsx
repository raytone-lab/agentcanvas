import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import Lenis from "lenis";
import { ArrowRight, ArrowUpRight, Download, Star } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import { appVersionLabel } from "../appVersion";
import { useLocale } from "../i18n/LocaleContext";
import { EXPORT_FILE_COUNT } from "./exportFacts";
import { EventStream } from "./EventStream";
import { ExportTree } from "./ExportTree";
import { Limits } from "./Limits";
import { LocaleSwitch } from "./LocaleSwitch";
import { PartsAnatomy } from "./PartsAnatomy";
import { ModelProviders } from "./ModelProviders";
import { ScreenWall } from "./ScreenWall";
import { SplitHeadline } from "./SplitHeadline";
import { Statement } from "./Statement";
import { StyleBrowser } from "./StyleBrowser";
// `.ui-button` only — importing the `components/ui` barrel would pull Radix dialog,
// popover, dropdown and friends into the landing bundle for two anchors.
import "../components/ui/button.css";
import { landingCopy } from "./copy";
import { EDITOR_URL, GITHUB_REPO_URL } from "./siteConfig";
import "./landing.css";
import "./landing-stage.css";
import "./landing-chapters.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** The three steps, each pointing at the chapter that shows it. */
const CHAPTER_HREF = ["#lp-parts", "#lp-events", "#lp-export"] as const;

/**
 * Pointer position as `--mx` / `--my` on the element under it, for the surfaces whose hover
 * is a soft light that follows the pointer. One handler on the parent serves every child.
 */
function trackPointer(event: ReactPointerEvent<HTMLElement>) {
  const target = (event.target as HTMLElement).closest<HTMLElement>("[data-spot]");
  if (!target) return;
  const rect = target.getBoundingClientRect();
  target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
  target.style.setProperty("--my", `${event.clientY - rect.top}px`);
}

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
   *   screen stands up    the style browser's screen rises from 22° to face the reader as
   *                       its card arrives — "here they are, shown to you"
   *   covered card sinks  the card being covered slides up 12% inside its own frame and dims,
   *                       so only one card is ever in front
   *   wall pauses         the hero's drift stops once the hero is covered
   *   statement lights    the one sentence brightens piece by piece with the scroll
   *   blocks enter        chapter doors, ledger rows and limits fade up once, in batches
   *   tree unpacks        the export tree's lines arrive top to bottom, once, like a listing
   *
   * Two more live in their own components, because they own state: the anatomy's pinned
   * walk through the parts (PartsAnatomy) and the style browser's autoplay (StyleBrowser).
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
          // The card over the hero is glass: a dimmed hero would turn the glass grey.
          const seenThrough = next.classList.contains("lp-intro-card");
          const inner = card.querySelector(".lp-stack-inner");
          const dim = card.querySelector(".lp-stack-dim");
          const cover = { trigger: next, start: "top bottom", end: "top top", scrub: true };
          // Under glass, the hero's words fade as they are covered, so only the screen wall
          // shows through the frost — blurred type behind the new title reads as smudges.
          if (inner) gsap.to(inner, { yPercent: -12, opacity: seenThrough ? 0 : 1, ease: "none", scrollTrigger: cover });
          if (dim && !seenThrough) gsap.fromTo(dim, { opacity: 0 }, { opacity: 1, ease: "none", scrollTrigger: cover });
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

        const ANIMATED = ".lp-reveal";
        gsap.set(ANIMATED, { opacity: 0, y: 24 });
        ScrollTrigger.batch(ANIMATED, {
          start: "top bottom",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.06, overwrite: true }),
        });

        const treeLines = gsap.utils.toArray<HTMLElement>(".lp-ship-line");
        if (treeLines.length) {
          gsap.fromTo(
            treeLines,
            { opacity: 0, x: -10 },
            {
              opacity: 1,
              x: 0,
              duration: 0.5,
              ease: "power2.out",
              stagger: 0.03,
              clearProps: "transform",
              scrollTrigger: { trigger: ".lp-ship-panel", start: "top 80%", once: true },
            },
          );
        }

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
        gsap.set(".lp-reveal, .lp-statement-piece", { opacity: 1, y: 0 });
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
            {/* The card is a pane of frosted glass: as it slides up, the hero's screen wall
                stays visible through it, blurred — the same material as the header. */}
            <div className="lp-intro-frost" aria-hidden="true" />
            <div className="lp-stack-inner lp-intro-inner">
              <p className="lp-eyebrow">{stage.stylesKicker}</p>
              <SplitHeadline
                id="lp-styles-title"
                className="lp-intro-title lp-display"
                lines={stage.stylesTitle}
                locale={locale}
                effect="sides"
                trigger="view"
              />
              <p className="lp-intro-lede">{stage.stylesLede}</p>
            </div>
            <div className="lp-stack-dim" aria-hidden="true" />
          </section>

          <StyleBrowser copy={stage} />
        </div>

        <Statement text={stage.statement} locale={locale} />

        {/* The three steps, as the doors to the three chapters below — each one is the
            chapter's own opening line, so the strip is a table of contents that reads as
            the pitch. No "01 / 02 / 03": <ol> carries the order. */}
        <nav className="lp-chapters" aria-labelledby="lp-chapters-title">
          <h2 className="lp-sr-only" id="lp-chapters-title">
            {copy.how.title}
          </h2>
          <ol className="lp-shell lp-chapters-inner" onPointerMove={trackPointer}>
            {copy.how.steps.map((step, index) => (
              <li key={step.title} className="lp-reveal">
                <a className="lp-chapter" href={CHAPTER_HREF[index]} data-spot>
                  <span className="lp-chapter-title lp-display">{step.title}</span>
                  <span className="lp-chapter-body">{step.body}</span>
                  <ArrowRight className="lp-chapter-arrow" size={18} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <PartsAnatomy copy={copy.parts} stepLabel={copy.how.steps[0].title} />

        <section className="lp-section lp-chapter-section" id="lp-events">
          <div className="lp-shell">
            <p className="lp-eyebrow">{copy.how.steps[1].title}</p>
            <h2 className="lp-section-title">{copy.events.title}</h2>
            <p className="lp-section-lede">{copy.events.lede}</p>
            <EventStream copy={copy.events} />

            {/* Providers close the chapter: pasting a key is the other way to feed it events. */}
            <ModelProviders copy={copy.providers} title={<h3 className="lp-subtitle">{copy.providers.title}</h3>} />
          </div>
        </section>

        <section className="lp-section lp-chapter-section" id="lp-export">
          <div className="lp-shell">
            <p className="lp-eyebrow">{copy.how.steps[2].title}</p>
            <h2 className="lp-section-title">{copy.exported.title}</h2>
            <p className="lp-section-lede">{copy.exported.lede}</p>

            <ExportTree
              label={copy.exported.coreLabel}
              files={copy.exported.coreFiles}
              tree={copy.exported.tree}
              treeTitle={copy.exported.treeTitle}
              countNote={copy.exported.expandNote.replace("{count}", String(EXPORT_FILE_COUNT))}
              scriptsLabel={copy.exported.scriptsLabel}
              scripts={copy.exported.scripts}
              steps={copy.exported.steps}
              copyLabel={copy.exported.copyLabel}
              copiedLabel={copy.exported.copiedLabel}
            />
            <p className="lp-note lp-note--wide">{copy.exported.treeNote}</p>
          </div>
        </section>

        {/* 6 — Narrow single column of hairline rows: the quietest, densest block, right
            before the page asks for the click. */}
        <section className="lp-section">
          <div className="lp-shell">
            <h2 className="lp-section-title">{copy.limits.title}</h2>
            <Limits items={copy.limits.items} />
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

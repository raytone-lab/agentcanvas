import { useState, type CSSProperties, type ReactNode } from "react";
import { Lock, Network } from "lucide-react";

import { CountUp } from "./CountUp";
import type { LandingCopy } from "./copy";
import { providerMark } from "./providerMarks";
import {
  isProtocolOutlier,
  landingProviderGroups,
  landingProviders,
  providerGroupCount,
  type LandingProviderGroup,
} from "./providers";
import { useAutoplay } from "./useAutoplay";

/** How long each provider holds the "connected" state, in ms. */
const DWELL = 1500;

/**
 * Providers, at the page's own scale.
 *
 * Was a dense table-like card — nine 52px rows of small type — the one block on the page
 * still set like a settings panel. Now: the count as a display numeral beside the title,
 * nine large tiles, the groups as chips that pick their tiles out, and the two facts as
 * two open columns.
 *
 * The tiles take turns being "connected" on their own while on screen (a glass lift and a
 * live dot; the hidden dwell meter's `animationend` moves it on), and hold under the
 * pointer. Pointing at a group chip — or focusing it — lights that group's tiles and fades
 * the rest; clicking pins it until clicked again.
 */
export function ModelProviders({ copy, title }: { copy: LandingCopy["providers"]; title: ReactNode }) {
  const [active, setActive] = useState(0);
  const [hoverGroup, setHoverGroup] = useState<LandingProviderGroup | null>(null);
  const [pinnedGroup, setPinnedGroup] = useState<LandingProviderGroup | null>(null);
  const { ref, running } = useAutoplay<HTMLDivElement>(0.35);
  const group = hoverGroup ?? pinnedGroup;

  return (
    <div className="lp-models" ref={ref} data-running={running || undefined} style={{ "--dwell": `${DWELL}ms` } as CSSProperties}>
      <div className="lp-models-head">
        <div>
          {title}
          <p className="lp-section-lede">{copy.lede}</p>
        </div>
        {/* The numeral and its caption side by side across a hairline, the caption sitting
            on the numeral's baseline; the numeral counts up the first time it is seen. */}
        <p className="lp-models-count">
          <CountUp value={landingProviders.length} className="lp-display" />
          <span className="lp-models-count-label">{copy.countLabel}</span>
        </p>
      </div>

      <div className="lp-models-groups" role="group" aria-label={copy.title}>
        {landingProviderGroups.map((entry) => (
          <button
            key={entry}
            type="button"
            className="lp-models-chip"
            aria-pressed={pinnedGroup === entry}
            data-on={group === entry || undefined}
            onPointerEnter={() => setHoverGroup(entry)}
            onPointerLeave={() => setHoverGroup(null)}
            onFocus={() => setHoverGroup(entry)}
            onBlur={() => setHoverGroup(null)}
            onClick={() => setPinnedGroup((current) => (current === entry ? null : entry))}
          >
            {copy.groups[entry]}
            <span>{providerGroupCount(entry)}</span>
          </button>
        ))}
      </div>

      <ul className="lp-models-grid" data-filtered={group ? "true" : undefined}>
        {landingProviders.map((provider, index) => {
          const isActive = index === active && !group;
          return (
            <li
              key={provider.id}
              data-outlier={isProtocolOutlier(provider) || undefined}
              data-active={isActive || undefined}
              data-in-group={group === provider.group || undefined}
              style={{ "--i": index } as CSSProperties}
              onPointerEnter={() => setActive(index)}
            >
              <span className="lp-models-mark" aria-hidden="true">
                {providerMark[provider.id]}
              </span>
              <span className="lp-models-protocol">{provider.protocol}</span>
              <span className="lp-models-name">{copy.names[provider.id]}</span>
              <span className="lp-models-live" aria-hidden="true" />
              <span className="lp-models-meter" aria-hidden="true">
                {index === active ? (
                  <span
                    key={active}
                    className="lp-models-fill"
                    onAnimationEnd={() => setActive((current) => (current + 1) % landingProviders.length)}
                  />
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      <dl className="lp-models-facts">
        <div>
          <Network aria-hidden="true" />
          <dt>{copy.protocolLabel}</dt>
          <dd>{copy.protocolNote}</dd>
        </div>
        <div>
          <Lock aria-hidden="true" />
          <dt>{copy.keyLabel}</dt>
          <dd>{copy.keyNote}</dd>
        </div>
      </dl>
    </div>
  );
}

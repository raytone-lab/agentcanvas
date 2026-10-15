import { useRef, useState, type CSSProperties } from "react";

import { RunSteps } from "./RunSteps";
import { useActiveTabInView, useAutoplay } from "./useAutoplay";

/** How long each core file stays lit in the tree, in ms. */
const DWELL = 2000;

/**
 * The exported project, in the same tab-and-panel card as the event mapping.
 *
 * The card's top band is the zip itself — its name, its file count, and the two commands
 * that run it — so the install steps sit on the card they belong to instead of floating
 * beside the title. Below, the five files a reader edits are equal-height tabs on the left,
 * and the full tree fills the panel on the right with the active file lit. It walks the
 * five on its own while on screen, holds under the pointer, and pointing at a tab (or a lit
 * line in the tree) jumps to it. The match is by file name, so the tabs and the tree cannot
 * point at different files.
 */
export function ExportTree({
  label,
  files,
  tree,
  treeTitle,
  countNote,
  scriptsLabel,
  scripts,
  steps,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  files: readonly { path: string; note: string }[];
  tree: string;
  treeTitle: string;
  countNote: string;
  scriptsLabel: string;
  scripts: readonly { name: string }[];
  steps: readonly string[];
  copyLabel: string;
  copiedLabel: string;
}) {
  const [active, setActive] = useState(0);
  const { ref, running } = useAutoplay<HTMLDivElement>(0.35);
  const tabsRef = useRef<HTMLDivElement>(null);
  useActiveTabInView(tabsRef, active);
  const lines = tree.split("\n");
  const fileOfLine = lines.map((line) => files.findIndex((file) => line.includes(` ${file.path}`) || line.endsWith(file.path)));

  return (
    <div className="lp-deck lp-ship" ref={ref} data-running={running || undefined} style={{ "--dwell": `${DWELL}ms` } as CSSProperties}>
      <div className="lp-deck-head">
        <div className="lp-ship-title">
          <code>{treeTitle}</code>
          <span>{countNote}</span>
        </div>
        <RunSteps steps={steps} copyLabel={copyLabel} copiedLabel={copiedLabel} />
      </div>

      <div className="lp-deck-body">
        <div className="lp-deck-tabs" ref={tabsRef} role="tablist" aria-label={label}>
          {files.map((file, index) => {
            const isActive = index === active;
            return (
              <button
                key={file.path}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls="lp-ship-panel"
                className="lp-deck-tab lp-ship-tab"
                onClick={() => setActive(index)}
              >
                <code className="lp-deck-tab-label">{file.path}</code>
                <span className="lp-ship-tab-note">{file.note}</span>
                <span className="lp-deck-meter" aria-hidden="true">
                  {isActive ? (
                    <span
                      key={active}
                      className="lp-deck-fill"
                      onAnimationEnd={() => setActive((current) => (current + 1) % files.length)}
                    />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>

        <div className="lp-deck-panel lp-ship-panel" id="lp-ship-panel" role="tabpanel">
          <pre>
            {lines.map((line, index) => {
              const file = fileOfLine[index];
              return (
                <span
                  key={index}
                  className="lp-ship-line"
                  data-core={file >= 0 || undefined}
                  data-hot={file >= 0 && file === active ? "true" : undefined}
                  onPointerEnter={file >= 0 ? () => setActive(file) : undefined}
                >
                  {line}
                  {"\n"}
                </span>
              );
            })}
          </pre>
        </div>
      </div>

      <ul className="lp-deck-foot" aria-label={scriptsLabel}>
        <li className="lp-deck-foot-label" aria-hidden="true">
          {scriptsLabel}
        </li>
        {scripts.map((script) => (
          <li key={script.name}>
            <code>npm run {script.name}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

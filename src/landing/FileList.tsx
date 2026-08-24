import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/**
 * Five core files, then a disclosure holding the full tree.
 *
 * The tree used to be the whole section: 18 monospace rows, most of them structural, with the
 * five files a reader actually edits buried among them. Naming those five and folding the rest
 * away puts the useful part first without dropping the detail for anyone who wants it.
 *
 * The rows are inert. The mock had a chevron and a hover tint on each one, which promise a
 * destination — there is nothing to navigate to, and the same promise was already removed from
 * the provider grid for the same reason. The disclosure is the one real control here, so it is
 * the only thing that reacts to a pointer.
 */
export function FileList({
  label,
  files,
  tree,
  expandLabel,
  expandNote,
  expandAction,
  collapseAction,
}: {
  label: string;
  files: readonly { path: string; note: string }[];
  tree: string;
  expandLabel: string;
  expandNote: string;
  expandAction: string;
  collapseAction: string;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;

      // `height: auto` is not animatable, so the tween runs to the measured content height and
      // then hands control back to `auto` — otherwise a locale switch or a font swap would leave
      // the panel pinned to a stale pixel height.
      if (open) {
        gsap.set(panel, { display: "block", height: "auto" });
        const target = panel.offsetHeight;
        gsap.fromTo(
          panel,
          { height: 0, opacity: 0 },
          {
            height: target,
            opacity: 1,
            duration: 0.42,
            ease: "power3.out",
            overwrite: true,
            onComplete: () => gsap.set(panel, { height: "auto" }),
          },
        );
      } else {
        gsap.to(panel, {
          height: 0,
          opacity: 0,
          duration: 0.32,
          ease: "power2.inOut",
          overwrite: true,
          onComplete: () => gsap.set(panel, { display: "none" }),
        });
      }
    },
    { dependencies: [open], scope: rootRef },
  );

  return (
    <div className="lp-files" ref={rootRef}>
      <h3 className="lp-files-label">{label}</h3>
      <ol className="lp-files-list">
        {files.map((file, index) => (
          <li key={file.path}>
            <span className="lp-files-index">{String(index + 1).padStart(2, "0")}</span>
            <code>{file.path}</code>
            <span className="lp-files-note">{file.note}</span>
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="lp-files-toggle"
        aria-expanded={open}
        aria-controls="lp-full-tree"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="lp-files-toggle-label">{expandLabel}</span>
        <span className="lp-files-toggle-sep" aria-hidden="true">
          ·
        </span>
        <span className="lp-files-toggle-count">{expandNote}</span>
        <span className="lp-files-toggle-sep" aria-hidden="true">
          ·
        </span>
        <span className="lp-files-toggle-action">{open ? collapseAction : expandAction}</span>
        <Plus aria-hidden="true" />
      </button>

      {/* Kept in the DOM and hidden, rather than mounted on open: the tween needs to measure it,
          and `aria-controls` needs a target that exists before the first click. */}
      <div className="lp-files-panel" id="lp-full-tree" ref={panelRef} hidden={undefined}>
        <pre className="lp-tree">{tree}</pre>
      </div>
    </div>
  );
}

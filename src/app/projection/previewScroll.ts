import {
  previewAnchorFallbacks,
  previewAnchorForPresetOption,
  type PreviewAnchor,
} from "../../preview/presetPreviewTarget";

/*
 * The flash is gone.
 *
 * Picking anything in the rail used to stamp `data-preview-focus="true"` on the
 * thing it changed for 1200ms, and the CSS drew a 2px accent outline plus a 5px
 * glow around it — so switching avatars put a box around the whole user turn,
 * which is what was reported.
 *
 * Removed rather than turned off once more: 原生风, 无障碍风 and the provider
 * sheet had each already overridden it back to `outline: none`, which is three
 * places saying the same thing about a mechanism nobody wanted. The rail
 * already answers "what did I just change?" twice over — the option is ticked,
 * and the canvas scrolls the changed thing into view, which is the half of this
 * that was useful and is kept below.
 */

function scrollNestedPreviewContainer(element: HTMLElement) {
  const scrollContainer = element.closest(".timeline-list, .preview-stack, .right-panel") as HTMLElement | null;
  if (!scrollContainer) {
    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    return;
  }

  const containerRect = scrollContainer.getBoundingClientRect();
  const elementRect = element.getBoundingClientRect();
  const centeredOffset = (containerRect.height - elementRect.height) / 2;
  const nextTop = scrollContainer.scrollTop + elementRect.top - containerRect.top - Math.max(12, centeredOffset);

  scrollContainer.scrollTo({
    top: Math.max(0, nextTop),
    behavior: "smooth",
  });
  element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
}

export function scrollPreviewToAnchor(anchor: PreviewAnchor) {
  const findTarget = () =>
    previewAnchorFallbacks(anchor)
      .map((candidate) => document.querySelector<HTMLElement>(`[data-preview-anchor="${candidate}"]`))
      .find((element): element is HTMLElement => Boolean(element));

  const scrollWhenReady = (attempt = 0) => {
    window.requestAnimationFrame(() => {
      const target = findTarget();
      if (!target) {
        if (attempt < 4) {
          window.setTimeout(() => scrollWhenReady(attempt + 1), 60);
        }
        return;
      }

      scrollNestedPreviewContainer(target);
    });
  };

  window.requestAnimationFrame(() => scrollWhenReady());
}

export function scrollPreviewToAnchorAfterPreviewUpdate(anchor: PreviewAnchor) {
  window.setTimeout(() => scrollPreviewToAnchor(anchor), 80);
}

export function scrollPreviewToToolActionAfterPreviewUpdate(action: string) {
  const scrollWhenReady = (attempt = 0) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`.tool-card[data-action="${action}"]`);
      if (!target) {
        if (attempt < 5) {
          window.setTimeout(() => scrollWhenReady(attempt + 1), 80);
        }
        return;
      }

      const scrollContainer = target.closest(".timeline-list, .preview-stack, .right-panel") as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        scrollContainer.scrollTo({
          top: Math.max(0, scrollContainer.scrollTop + targetRect.top - containerRect.top - 8),
          behavior: "smooth",
        });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      }
      if (attempt < 3) {
        window.setTimeout(() => scrollWhenReady(attempt + 1), 180);
      }
    });
  };

  window.setTimeout(() => scrollWhenReady(), 100);
}

/**
 * Scroll the canvas to the first element matching `selector`, once it exists.
 *
 * The tool-action version above, generalised: same retry (the target may not
 * have painted yet) and the same nearest-scroll-container rule.
 */
export function scrollPreviewToSelectorAfterPreviewUpdate(selector: string) {
  const scrollWhenReady = (attempt = 0) => {
    window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`.preview-frame ${selector}`);
      if (!target) {
        if (attempt < 8) window.setTimeout(() => scrollWhenReady(attempt + 1), 120);
        return;
      }
      const scrollContainer = target.closest(".timeline-list, .preview-stack, .right-panel") as HTMLElement | null;
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        scrollContainer.scrollTo({
          top: Math.max(0, scrollContainer.scrollTop + targetRect.top - containerRect.top - containerRect.height / 2 + targetRect.height / 2),
          behavior: "smooth",
        });
      } else {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    });
  };
  window.setTimeout(() => scrollWhenReady(), 100);
}

export function scrollPreviewToPreset(optionId: string) {
  scrollPreviewToAnchor(previewAnchorForPresetOption(optionId));
}

/**
 * Find what a rail pick changed on the canvas, scroll to it and ring it.
 *
 * Reported as "选完，我不知道我选择的东西在哪里": the galleries swap an icon
 * somewhere in three columns of preview, often a 14px glyph in a row the
 * reader had no reason to be looking at. Every slot-drawn icon is stamped with
 * `data-icon-slot` (`IconSetContext`), so the slot is enough to find it.
 *
 * Waits a beat first, because a pick also restreams the demo that shows the
 * state, and the element present at click time may be the one about to be
 * replaced; re-queries if the ringed element is swapped out mid-ring. Resolves
 * `false` when the canvas draws nothing for the slot, so the caller can say so.
 */
export function locateSlotOnCanvas(slot: string): Promise<boolean> {
  return new Promise((resolve) => {
    const find = () =>
      [...document.querySelectorAll<HTMLElement>(`.preview-frame [data-icon-slot="${CSS.escape(slot)}"]`)]
        .filter((icon) => !icon.closest(".am-states"))
        .filter((icon) => {
          const rect = icon.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .slice(0, 4);

    const attempt = (count: number) => {
      const icons = find();
      if (icons.length === 0) {
        // Up to ~15s: a pick restreams its demo at reading pace, and 运行状态
        // replays a whole turn — its failure rows arrive after the tool calls,
        // six to eleven seconds in. Measured, not guessed. The ring lands when
        // the row does, which reads as "here it is".
        if (count < 125) window.setTimeout(() => attempt(count + 1), 120);
        else resolve(false);
        return;
      }
      scrollNestedPreviewContainer(icons[0]);
      ringTargets(slot, icons);
      resolve(true);
    };
    window.setTimeout(() => attempt(0), 320);
  });
}

/** The row an icon belongs to: the first ancestor wide enough to read as one. */
function locateTarget(icon: HTMLElement): HTMLElement {
  const iconRect = icon.getBoundingClientRect();
  let node: HTMLElement | null = icon.parentElement;
  for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
    if (node.classList.contains("preview-frame")) break;
    const rect = node.getBoundingClientRect();
    if (rect.width >= Math.max(96, iconRect.width * 4) && rect.height <= Math.max(72, iconRect.height * 3)) {
      return node;
    }
  }
  return icon;
}

let activeRings: HTMLElement[] = [];

function ringTargets(slot: string, icons: HTMLElement[]) {
  for (const ring of activeRings) ring.remove();
  activeRings = [];
  let targets = icons.map(locateTarget);
  const rings = targets.map(() => {
    const ring = document.createElement("div");
    ring.className = "canvas-locate-ring";
    ring.setAttribute("aria-hidden", "true");
    document.body.appendChild(ring);
    return ring;
  });
  activeRings = rings;

  const started = performance.now();
  const follow = () => {
    if (activeRings !== rings) return;
    // The demo restream can replace the row under the ring; find it again.
    if (targets.some((target) => !target.isConnected)) {
      const fresh = [...document.querySelectorAll<HTMLElement>(`.preview-frame [data-icon-slot="${CSS.escape(slot)}"]`)]
        .filter((icon) => !icon.closest(".am-states"))
        .slice(0, rings.length);
      targets = rings.map((_, index) => (fresh[index] ? locateTarget(fresh[index]) : targets[index]));
    }
    targets.forEach((target, index) => {
      const rect = target.getBoundingClientRect();
      const pad = target.tagName.toLowerCase() === "svg" ? 5 : 3;
      Object.assign(rings[index].style, {
        left: `${rect.left - pad}px`,
        top: `${rect.top - pad}px`,
        width: `${rect.width + pad * 2}px`,
        height: `${rect.height + pad * 2}px`,
        display: rect.width > 0 ? "block" : "none",
      });
    });
    if (performance.now() - started < 1950) {
      window.requestAnimationFrame(follow);
    } else {
      for (const ring of rings) ring.remove();
      if (activeRings === rings) activeRings = [];
    }
  };
  follow();
}

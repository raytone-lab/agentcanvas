import {
  previewAnchorFallbacks,
  previewAnchorForPresetOption,
  type PreviewAnchor,
} from "../../preview/presetPreviewTarget";

let previewFocusId = 0;

function focusPreviewElement(element: HTMLElement) {
  previewFocusId += 1;
  const currentFocusId = String(previewFocusId);

  document.querySelectorAll<HTMLElement>("[data-preview-focus='true']").forEach((item) => {
    item.removeAttribute("data-preview-focus");
    item.removeAttribute("data-preview-focus-id");
  });
  element.setAttribute("data-preview-focus", "true");
  element.setAttribute("data-preview-focus-id", currentFocusId);
  window.setTimeout(() => {
    if (element.getAttribute("data-preview-focus-id") === currentFocusId) {
      element.removeAttribute("data-preview-focus");
      element.removeAttribute("data-preview-focus-id");
    }
  }, 1200);
}

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
      focusPreviewElement(target);
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
      focusPreviewElement(target);
      if (attempt < 3) {
        window.setTimeout(() => scrollWhenReady(attempt + 1), 180);
      }
    });
  };

  window.setTimeout(() => scrollWhenReady(), 100);
}

export function scrollPreviewToPreset(optionId: string) {
  scrollPreviewToAnchor(previewAnchorForPresetOption(optionId));
}

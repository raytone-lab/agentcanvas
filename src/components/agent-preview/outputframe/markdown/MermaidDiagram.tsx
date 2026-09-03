import { useEffect, useId, useState } from "react";

/**
 * Lazy mermaid diagram renderer.
 *
 * Mermaid is ~1MB and only needed when a document actually contains a diagram,
 * so it is dynamically imported on first use and never enters the main chunk.
 * Load and parse failures fall back to showing the diagram source — a diagram
 * the renderer cannot draw is still readable as code.
 */
export function MermaidDiagram({ code }: { code: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [state, setState] = useState<"pending" | "rendered" | "failed">("pending");
  const [svg, setSvg] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          fontFamily: "inherit",
        });
        const { svg: rendered } = await mermaid.render(`md-mermaid-${reactId}`, code);
        if (cancelled) return;
        setSvg(rendered);
        setState("rendered");
      } catch {
        if (!cancelled) {
          setState("failed");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, reactId]);

  if (state === "rendered" && svg !== undefined) {
    return (
      <span
        className="md-mermaid"
        data-mermaid-state="rendered"
        // Rendered by mermaid locally from the document's own diagram source,
        // with securityLevel "strict" (no click callbacks, no HTML labels).
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  if (state === "failed") {
    return (
      <span className="md-mermaid" data-mermaid-state="failed">
        <pre data-language="mermaid">{code}</pre>
      </span>
    );
  }

  return (
    <span className="md-mermaid" data-mermaid-state="pending" aria-busy="true">
      <span className="md-mermaid-placeholder" />
    </span>
  );
}

import type { AgentCanvasBrandMarkV2 } from "@agentmatrix/agentcanvas-contract";

const builtinMarkText = {
  sparkles: "✦",
  "messages-square": "▣",
  bot: "◇",
  terminal: ">_",
  search: "⌕",
  chart: "▥",
} as const;

/** Render only built-in marks in the standalone preview. Asset IDs stay logical. */
export function ProductBrandMark({ mark }: { mark: AgentCanvasBrandMarkV2 }) {
  if (mark.kind === "asset") {
    return <span className="product-brand-mark" data-brand-asset={mark.assetId} aria-hidden="true">◆</span>;
  }
  return (
    <span className="product-brand-mark" data-brand-mark={mark.id} aria-hidden="true">
      {builtinMarkText[mark.id]}
    </span>
  );
}

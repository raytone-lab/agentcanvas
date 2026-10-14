import type { AgentUXToolTimelineItem } from "@agent-ux/render-core";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { IconSetProvider } from "../../../agentmatrix";
import { ExternalApprovalSurface, InlineApprovalSurface } from "./approval";

const render = (node: React.ReactNode) => renderToStaticMarkup(<IconSetProvider>{node}</IconSetProvider>);

const tool = {
  kind: "tool",
  id: "t",
  name: "read_file",
  title: "Read project instructions",
  status: "awaiting_approval",
  approval: { prompt: "Allow reading AGENTS.md?", argsPreview: { path: "AGENTS.md" } },
} as AgentUXToolTimelineItem;

/**
 * Every 人机协作 gallery has to reach a mark on the card. They did not: the
 * replies drew no icon and there was no 取消 at all, so picking a tile in any
 * of those galleries changed nothing anywhere ("选择之后在哪里显示").
 */
describe("approval surfaces draw the 人机协作 marks", () => {
  for (const [name, markup] of [
    ["external", () => render(<ExternalApprovalSurface tool={tool} />)],
    ["inline", () => render(<InlineApprovalSurface tool={tool} />)],
  ] as const) {
    it(`${name}: one mark per reply, and a cancel key`, () => {
      const html = markup();
      for (const slot of ["permission.allow", "permission.allow_always", "permission.deny", "permission.cancel"]) {
        expect(html).toContain(`data-icon-slot="${slot}"`);
      }
      expect(html).toContain('class="approval-cancel"');
    });
  }

  it("external: the title wears 等待确认's mark", () => {
    expect(render(<ExternalApprovalSurface tool={tool} />)).toContain(
      'data-icon-slot="tool.pending_approval"',
    );
  });
});

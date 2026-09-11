import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { PresetOptionPreview } from "./PresetOptionPreview";
import { IconSetProvider } from "../agentmatrix";
import { LocaleProvider } from "../i18n/LocaleContext";
import { appVersionLabel } from "../appVersion";

function render(optionId: string) {
  return renderToStaticMarkup(
    <LocaleProvider>
      <IconSetProvider>
        <PresetOptionPreview optionId={optionId} />
      </IconSetProvider>
    </LocaleProvider>,
  );
}

describe("sidebar option cards", () => {
  it("shows the control itself rather than an abstraction of it", () => {
    // Four tiles of grey bars said the same thing as each other: a plus and a
    // line, a magnifier and a line, two lines, three lines.
    const newChat = render("sidebar-new-button");
    expect(newChat).toContain('data-kind="control"');
    expect(newChat).toContain("新建对话");
    expect(newChat).toContain("<svg");

    // The magnifier alone — in the sidebar that is all this option adds.
    const search = render("sidebar-search");
    expect(search).toContain('data-align="center"');
    expect(search).toContain("<svg");

    // Both headings, stacked: the grouping is those words.
    const grouping = render("sidebar-grouping");
    expect(grouping).toContain("今天");
    expect(grouping).toContain("更早");

    // The version the product actually prints, from the same constant, so the
    // card cannot show one the sidebar does not.
    expect(render("sidebar-footer")).toContain(appVersionLabel);
  });

  it("leaves the other groups' cards alone", () => {
    // A motion card is still a drawn tile; only these four changed.
    expect(render("thinking-wave")).not.toContain('data-kind="control"');
  });
});

import { describe, expect, it } from "vitest";

import { localizePreviewText, localizePreviewViewModel, localizeTimelineItem } from "./previewLocalization";

describe("preview localization", () => {
  it("localizes authored chrome and message text for replay by default", () => {
    const item = localizeTimelineItem(
      { kind: "tool", title: "Reading file", text: "What can you do?" },
      "zh",
    ) as Record<string, unknown>;

    expect(item.title).toBe("正在读取文件");
    expect(item.text).toBe("你都有什么功能？");
  });

  it("leaves the model's own prose alone when message text is opted out", () => {
    // The dictionary rewrites substrings, so a live reply containing a fixture phrase would be
    // partially translated mid-sentence. Live preview keeps the model's words verbatim.
    const item = localizeTimelineItem(
      { kind: "message", title: "Reading file", text: "I checked the file. Thinking about the next step." },
      "zh",
      { localizeMessageText: false },
    ) as Record<string, unknown>;

    expect(item.title).toBe("正在读取文件");
    expect(item.text).toBe("I checked the file. Thinking about the next step.");
  });

  it("localizes simulated tool-call copy that the configurator authored", () => {
    const item = localizeTimelineItem(
      {
        kind: "tool",
        userMessage: "The model sent tool arguments that could not be read.",
        approval: { prompt: "Approve the simulated tool call? Live LLM preview does not execute tools." },
      },
      "zh",
      { localizeMessageText: false },
    ) as Record<string, unknown>;

    expect(item.userMessage).toBe("模型发送的工具参数无法解析。");
    expect((item.approval as Record<string, unknown>).prompt).toBe(
      "允许这次模拟工具调用？Live LLM 预览不会真正执行工具。",
    );
  });

  it("passes the message-text option through the view model", () => {
    const viewModel = {
      title: "Normal turn",
      timeline: [{ kind: "message", text: "What can you do?" }],
    };

    const localized = localizePreviewViewModel(viewModel, "zh", { localizeMessageText: false });
    expect(localized.title).toBe("普通回合");
    expect((localized.timeline[0] as Record<string, unknown>).text).toBe("What can you do?");

    const fully = localizePreviewViewModel(viewModel, "zh");
    expect((fully.timeline[0] as Record<string, unknown>).text).toBe("你都有什么功能？");
  });

  it("is a no-op for the English locale regardless of options", () => {
    const viewModel = { title: "Normal turn", timeline: [{ kind: "message", text: "What can you do?" }] };
    expect(localizePreviewViewModel(viewModel, "en", { localizeMessageText: false })).toBe(viewModel);
  });
});

describe("localizePreviewText matcher", () => {
  it("keeps whole-string, substring and pass-through behaviour", () => {
    expect(localizePreviewText("Reading file", "zh")).toBe("正在读取文件");
    expect(localizePreviewText("Step: Reading file now", "zh")).toContain("正在读取文件");
    expect(localizePreviewText("Reading file", "en")).toBe("Reading file");
  });

  it("prefers the longest matching key", () => {
    // Guards the compiled matcher's longest-first ordering. The previous implementation looped
    // the table in insertion order, so which of two overlapping keys won was an accident of
    // declaration — a trap as soon as a second CJK table is added.
    expect(localizePreviewText("Patch SearchInput.tsx.", "zh")).toBe("修改 SearchInput.tsx。");
  });
});

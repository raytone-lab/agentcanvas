import { describe, expect, it } from "vitest";

import { RAIL_WITHHELD_GROUP_IDS, presetRailSections } from "../app/projection/presetRailData";
import { hasPresetAction } from "./presetActions";
import { presetGroups, presetGroupsForTemplate, resolvePresetGroupSelection } from "./presets";

/** Structure first, then event flow in turn order, then appearance and integration. */
const RAIL_ORDER = [
  "sidebar",
  "conversation",
  "composer",
  "output",
  "ux-effects",
  "approval",
  "tool-calls",
  "blocks",
  "interrupt",
  "media-generation",
  "delivery",
  "theme",
  "provider",
] as const;

describe("template preset groups", () => {
  it("keeps Git out of ordinary chat presets", () => {
    expect(presetGroupsForTemplate("chat").map((group) => group.id)).toEqual([...RAIL_ORDER]);
  });

  it("keeps Git available for the coding template", () => {
    expect(presetGroupsForTemplate("coding").map((group) => group.id)).toEqual([...RAIL_ORDER, "git"]);
  });

  it("moves a hidden selected group back to the first visible preset", () => {
    expect(resolvePresetGroupSelection("git", "chat")).toBe("sidebar");
    expect(resolvePresetGroupSelection("git", "coding")).toBe("git");
  });

  it("keeps every group reachable from the rail, or deliberately withheld", () => {
    // A group absent from every rail section has no row and so cannot be opened
    // — which is how the renderers stayed unreachable for a while. The only
    // allowed absences are the ones named in `RAIL_WITHHELD_GROUP_IDS`, which
    // says why.
    const railed = new Set(presetRailSections.flatMap((section) => section.groupIds));
    const unreachable = presetGroups
      .filter((group) => !railed.has(group.id))
      .map((group) => group.id);
    expect(unreachable).toEqual([...RAIL_WITHHELD_GROUP_IDS]);
  });

  it("gives every non-pending option a preset action, and no pending one", () => {
    // A card with no action is inert but looks live; a pending card is meant to
    // be inert, so the two must not be confused for each other.
    const inert = presetGroups
      .flatMap((group) => group.options)
      .filter((option) => !option.pending && !hasPresetAction(option.id))
      .map((option) => option.id);
    expect(inert).toEqual([]);

    const wired = presetGroups
      .flatMap((group) => group.options)
      .filter((option) => option.pending && hasPresetAction(option.id))
      .map((option) => option.id);
    expect(wired).toEqual([]);
  });

  it("keeps prompt context out of the primary preset menu", () => {
    expect(presetGroups.some((group) => String(group.id) === "context")).toBe(false);
    expect(presetGroups.flatMap((group) => group.options).map((option) => option.id)).not.toEqual(
      expect.arrayContaining(["working-set", "instruction-chips", "memory-panel", "clear-context"]),
    );
  });

  it("keeps the chat area to message chrome, with writing rhythm under delivery", () => {
    const conversation = presetGroups.find((group) => group.id === "conversation");
    const delivery = presetGroups.find((group) => group.id === "delivery");

    // Chrome is visible in an idle chat, so it is Structure; writing rhythm only
    // exists while a reply streams, so it is Event flow.
    // `chat-visible` leads: presence before appearance. Every slot starts
    // disabled now, so a group without a presence toggle can only restyle a
    // component nothing is able to turn on.
    expect(conversation?.options.map((option) => option.id)).toEqual([
      "chat-visible",
      "speaker-labels",
      "message-actions",
    ]);
    expect(conversation?.options.some((option) => option.id.includes("empty"))).toBe(false);
    expect(delivery?.options.filter((option) => option.id.startsWith("writing-")).map((option) => option.id)).toEqual([
      "writing-smooth",
      "writing-typewriter",
      "writing-chunked",
    ]);
  });

  it("keeps stop generation in composer run controls instead of message actions", () => {
    const conversation = presetGroups.find((group) => group.id === "conversation");
    const composer = presetGroups.find((group) => group.id === "composer");

    expect(conversation?.options.find((option) => option.id === "message-actions")?.description).not.toContain("stop");
    expect(composer?.options.map((option) => option.id)).toEqual([
      "composer-visible",
      "upload",
      "mic",
      "budget",
      "model-config",
      "prompt-shortcuts",
      "mention-picker",
      "slash-command-palette",
    ]);
  });

  it("gives the decision point its own group instead of a composer subsection", () => {
    const approval = presetGroups.find((group) => group.id === "approval");
    const composer = presetGroups.find((group) => group.id === "composer");

    expect(approval?.options.map((option) => option.id)).toEqual([
      "model-tools",
      "tool-approval-inline",
      "tool-approval-hidden",
      "choice-card-modal",
      "sandbox-permission",
      "hook-intercept-banner",
    ]);
    expect(composer?.options.some((option) => option.id.startsWith("tool-approval"))).toBe(false);
  });

  it("exposes mainstream providers as a primary left-rail menu", () => {
    const provider = presetGroups.find((group) => group.id === "provider");

    expect(provider?.options.map((option) => option.id)).toEqual([
      "provider-settings-launcher",
      "provider-openai",
      "provider-anthropic",
      "provider-gemini",
      "provider-openrouter",
      "provider-deepseek",
      "provider-z-ai",
      "provider-moonshot",
      "provider-local",
      "provider-custom",
    ]);
  });

  it("keeps the right panel region separate from what it delivers", () => {
    const tools = presetGroups.find((group) => group.id === "tool-calls");
    const blocks = presetGroups.find((group) => group.id === "blocks");
    const output = presetGroups.find((group) => group.id === "output");
    const delivery = presetGroups.find((group) => group.id === "delivery");

    expect(tools?.options.map((option) => option.id)).toEqual([
      "command-cards",
      "compact-chips",
      "timeline-rail",
      "tool-detail-full",
      "tool-detail-output-only",
      "tool-progress-bar",
      "subagent-card",
      "background-task-toast",
    ]);
    expect(blocks?.options.map((option) => option.id)).toEqual([
      "error-collapse",
      "context-usage-meter",
    ]);
    // The region only owns whether it exists; its contents are event flow.
    expect(output?.options.map((option) => option.id)).toEqual([
      "output-visible",
      "task-list",
      "exec-progress",
      "workspace-files",
    ]);
    expect(delivery?.options.filter((option) => !option.id.startsWith("writing-")).map((option) => option.id)).toEqual([
      "output-source-artifact",
      "output-source-console",
      "renderer-auto",
      "renderer-code",
      "renderer-diff",
      "renderer-markdown",
      "renderer-preview",
      "renderer-data",
      "code-block-actions",
      "inline-visualization",
    ]);
  });

  it("keeps Git review controls separate from commit permissions", () => {
    const git = presetGroups.find((group) => group.id === "git");

    expect(git?.options.map((option) => option.id)).toEqual([
      "git-visible",
      "branch-status",
      "changed-files",
      "diff-preview",
      "commit-message",
      "commit-action",
    ]);
  });
});

describe("interrupt flow", () => {
  it("names stopping and resuming even though they are unbuilt", () => {
    // The list of event flows should be complete where the components are not,
    // so a gap reads as "not yet" rather than "never considered". Stopping a
    // run had no place in the rail at all.
    const group = presetGroups.find((entry) => entry.id === "interrupt");
    expect(group?.options.map((option) => option.id)).toEqual([
      "stop-button",
      "stopped-state",
      "retry-turn",
      "resume-turn",
    ]);
    expect(group?.options.every((option) => option.pending)).toBe(true);
  });
});

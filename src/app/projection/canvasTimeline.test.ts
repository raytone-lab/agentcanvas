import { describe, expect, it } from "vitest";

import { canvasTimelineEvents } from "./canvasTimeline";
import { CANVAS_THINKING_MS, canvasReplayDelay } from "./canvasReplayPacing";
import { initialPreviewRevealCount } from "./previewReplayPacing";
import { chatCopy } from "../../i18n/copy/chat";

const types = (locale: "zh" | "en" | "ja" = "zh") =>
  canvasTimelineEvents({ locale }).map((event) => event.type);

/**
 * The canvas's reply.
 *
 * It used to be composed from what had been picked, and rendered as the state
 * an event stream ends in. Both changed at once, and the two halves live in
 * different files: this one decides *what* the reply contains, and
 * `useCanvasReplay` decides when each part of it appears. The tests below are
 * about the first half, plus the seam between them — the pacing this
 * composition assumes.
 */
describe("canvas reply composition", () => {
  it("holds one complete reply, in the order a reply arrives", () => {
    /*
     * The whole point of the change. Every block used to be conditional on a
     * group having been clicked, so the canvas showed half a reply: a reader
     * judging how a wait resolves into tool work into a delivery could not see
     * it until they had clicked in four separate places.
     */
    expect(types()).toEqual([
      "run.started",
      "text.started",
      "text.delta",
      "text.finished",
      "reasoning.status",
      "reasoning.delta",
      "reasoning.finished",
      "tool.call.started",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      // Five calls, one per tool action the product can show — view, edit,
      // validate, search, run command — so the canvas holds a row of each, and
      // each row draws the icon picked for *that* action in 工具调用.
      "tool.call.started",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "tool.call.started",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "tool.call.started",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "tool.call.started",
      "tool.call.running",
      "tool.call.result",
      "tool.call.finished",
      "artifact.created",
      "artifact.delta",
      "artifact.finished",
      "text.started",
      "text.delta",
      "text.finished",
      "artifact.created",
      // The media artifact's marker delta. See the note on the unfinished-media
      // test below for why it is a delta and never a `finished`.
      "artifact.delta",
      // The audio and video loaders, same shape as the image: created plus a
      // marker delta, never finished.
      "artifact.created",
      "artifact.delta",
      "artifact.created",
      "artifact.delta",
      /*
       * And a second exchange, which is where the run-state block lives now.
       * It used to be one `run.error` stapled to the end of the first reply —
       * a failure on a turn that had just delivered a document. The reader
       * asks again instead, and this turn carries the group's specimens: a
       * cancelled call, the three incident categories, the error itself, and
       * the interrupt.
       */
      /*
       * The second exchange: one failing run, read as a line.
       *
       * 写入 failed → why → two retries → a queued call cancelled with the run
       * → the sandbox closing → the reader stopping it. The three call results
       * (完成 / 失败 / 已取消) are shown *on the calls they happened to* rather
       * than as invented extra rows, which is what `sync_index` and
       * `fetch_docs` were.
       */
      "text.started",
      "text.delta",
      "text.finished",
      /*
       * No tool rows in the failing turn: the reason, two retries, the sandbox
       * closing, the reader stopping it. 完成 / 失败 / 已取消 had a call each
       * here to give their rail cards something to point at, and each was
       * already said by something else — the incidents are the failure, the
       * interrupt is the cancellation, and the first turn's delivery is the
       * completion.
       */
      "run.error",
      "run.error",
      "run.error",
      "run.error",
      "step.started",
      "step.finished",
      "run.finished",
    ]);
  });

  it("composes the same reply whatever the locale, and localises its words", () => {
    // The list is the content; only the strings in it are translated. A locale
    // that composed a different set of blocks would be a bug in the sample
    // data, not a translation.
    expect(types("en")).toEqual(types("zh"));
    expect(types("ja")).toEqual(types("zh"));

    const zh = canvasTimelineEvents({ locale: "zh" });
    const en = canvasTimelineEvents({ locale: "en" });
    const question = (events: ReturnType<typeof canvasTimelineEvents>) =>
      (events.find((event) => event.type === "text.delta")?.payload as { delta: string }).delta;
    expect(question(zh)).toBe("你都能帮我做什么呢？");
    expect(question(en)).toBe("What can you help me with?");
  });

  it("leaves the finished block unlabelled so it reports the wait it measured", () => {
    /*
     * This is what makes 已思考5秒 true rather than written down.
     *
     * `ReasoningBlock` prefers a producer's `label` over the duration it timed,
     * so the old sample label meant the canvas reported a fixed 11 秒 however
     * long the block had been open. With no label, the closed title is the
     * measured wait — and the wait is real, because the replay holds this event
     * back for `CANVAS_THINKING_MS`.
     */
    const finished = canvasTimelineEvents({ locale: "zh" }).find(
      (event) => event.type === "reasoning.finished",
    );
    expect(finished).toBeDefined();
    expect(finished?.payload).not.toHaveProperty("label");

    // And the copy the block falls back to has a seconds slot to fill, in every
    // locale — without it the fallback would render the placeholder.
    for (const [locale, copy] of Object.entries(chatCopy)) {
      expect(copy.reasoning.reasonedFor, `${locale} fallback`).toContain("{seconds}");
    }
  });

  it("opens the block as thinking, not as already planning", () => {
    // `running` is `status !== "done"`, so either value would animate — but the
    // canvas is staging a wait that the reader watches begin, and "planning" is
    // a later stage of one.
    const status = canvasTimelineEvents({ locale: "zh" }).find(
      (event) => event.type === "reasoning.status",
    );
    expect((status?.payload as { status: string }).status).toBe("thinking");
  });

  it("leaves the media artifact unfinished, which is what the loaders key on", () => {
    // There are no media events in the protocol: the image loaders watch for an
    // artifact with an image mime type that has not finished arriving. Finishing
    // it would turn the thing being configured into a plain picture.
    //
    // The delta is not a finish. It carries `media-generation:image`, which is
    // what makes the output panel show the picture the conversation is showing
    // instead of one chosen by hashing the file name.
    const artifacts = canvasTimelineEvents({ locale: "zh" }).filter((event) =>
      event.type.startsWith("artifact."),
    );
    const media = artifacts.filter(
      (event) => (event.payload as { artifactId: string }).artifactId === "art_canvas_media",
    );
    expect(media.map((event) => event.type)).toEqual(["artifact.created", "artifact.delta"]);
    expect((media[0].payload as { mimeType: string }).mimeType).toBe("image/png");
    expect((media[1].payload as { delta: string }).delta).toContain("media-generation:image");
  });

  it("emits a well-formed stream with stable ids and no moving clock", () => {
    const events = canvasTimelineEvents({ locale: "zh" });
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(events.map((event) => event.seq)).toEqual(events.map((_, index) => index + 1));
    // Composed twice, identical: a `Date.now()` in here would remount the
    // timeline under the reader's pointer on every render.
    expect(canvasTimelineEvents({ locale: "zh" })).toEqual(events);
  });

  it("is played back over time rather than drawn at once", () => {
    /*
     * The seam. This composition is only correct in company: it emits a
     * *finished* reply, and every mid-flight state in it — the wait counting up,
     * the tool card running — exists solely because the replay reveals the list
     * one event at a time.
     *
     * So the pacing is asserted here too. The five seconds belong to
     * `reasoning.finished` specifically, because the block's clock runs between
     * `reasoning.status` being revealed and this event being revealed; spread
     * across the three reasoning events it would not be the wait the reader
     * sees.
     */
    const events = canvasTimelineEvents({ locale: "zh" });
    const finished = events.find((event) => event.type === "reasoning.finished");
    expect(canvasReplayDelay(finished!)).toBe(CANVAS_THINKING_MS);
    expect(CANVAS_THINKING_MS).toBe(5_000);

    // Everything else is brisk. At the saved-run pacing this reply takes about
    // twelve seconds, which is too long to sit through on every edit.
    const others = events.filter((event) => event.type !== "reasoning.finished");
    for (const event of others) {
      expect(canvasReplayDelay(event), event.type).toBeLessThanOrEqual(240);
    }

    /*
     * The opening prefix is two events, and both should be free.
     *
     * `run.started` carries the title and draws nothing, so pausing before it
     * would be a blank frame at the top of every replay. The one after it opens
     * the reader's own message — and the reader's question was already there
     * before the agent replied, so animating it in would be staging the wrong
     * thing. Its text still types on, from the delta 140ms later.
     */
    expect(initialPreviewRevealCount(events)).toBe(2);
    expect(events[0].type).toBe("run.started");
    expect((events[1].payload as { role: string }).role).toBe("user");
  });
});

import type { CSSProperties, ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Activity, Code2, Download, GitBranch, Layers, Play, Settings2 } from "lucide-react";

export const productIntroMeta = {
  id: "AgentCanvasProductIntro",
  width: 1920,
  height: 1080,
  fps: 30,
  durationInFrames: 360,
} as const;

const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const easeInOut = Easing.bezier(0.45, 0, 0.55, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const colors = {
  ink: "#07100f",
  panel: "#f7fafc",
  panelWarm: "#fffaf0",
  text: "#eff8f6",
  muted: "#9fb6b5",
  teal: "#2f6f73",
  tealLight: "#83d2c5",
  lime: "#c8f36a",
  amber: "#f1c46d",
  border: "rgba(205, 229, 226, 0.24)",
};

const fontFamily = "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
const monoFamily = "SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";

const screenshots = {
  builder: "remotion/screenshots/builder-main.png",
  output: "remotion/screenshots/output-preset.png",
  git: "remotion/screenshots/git-preset.png",
  theme: "remotion/screenshots/theme-preset.png",
  debug: "remotion/screenshots/debug-view.png",
  mobile: "remotion/screenshots/mobile-builder.png",
};

const particles = Array.from({ length: 44 }, (_, index) => ({
  left: (index * 97) % 1920,
  top: (index * 173) % 1080,
  size: 2 + (index % 4),
  delay: index * 7,
  drift: 18 + (index % 5) * 9,
}));

export function AgentCanvasProductIntro() {
  return (
    <AbsoluteFill style={styles.root}>
      <MotionBackground />
      <Sequence from={0} durationInFrames={92} premountFor={30}>
        <IntroScene />
      </Sequence>
      <Sequence from={86} durationInFrames={112} premountFor={30}>
        <PresetScene />
      </Sequence>
      <Sequence from={184} durationInFrames={104} premountFor={30}>
        <RuntimeScene />
      </Sequence>
      <Sequence from={268} durationInFrames={92} premountFor={30}>
        <ExportScene />
      </Sequence>
      <Sequence from={330} durationInFrames={30} premountFor={30}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
}

function MotionBackground() {
  const frame = useCurrentFrame();
  const sweep = interpolate(frame % 120, [0, 120], [-520, 2080], clamp);
  const pulse = interpolate(Math.sin(frame / 18), [-1, 1], [0.28, 0.72]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.ink,
        backgroundImage:
          "radial-gradient(circle at 18% 18%, rgba(131, 210, 197, 0.18), transparent 28%), radial-gradient(circle at 78% 78%, rgba(241, 196, 109, 0.13), transparent 30%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundPosition: `0 0, 0 0, ${-frame * 0.35}px ${-frame * 0.18}px, ${-frame * 0.35}px ${-frame * 0.18}px`,
        backgroundSize: "auto, auto, 72px 72px, 72px 72px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: sweep,
          top: -180,
          width: 220,
          height: 1440,
          transform: "rotate(17deg)",
          background: `linear-gradient(90deg, transparent, rgba(131, 210, 197, ${0.18 + pulse * 0.22}), transparent)`,
          filter: "blur(12px)",
        }}
      />
      {particles.map((particle, index) => {
        const phase = ((frame + particle.delay) % 120) / 120;
        const opacity = interpolate(phase, [0, 0.18, 0.72, 1], [0, 0.85, 0.5, 0], clamp);
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left: particle.left + Math.sin((frame + index) / 28) * particle.drift,
              top: (particle.top + phase * 140) % 1120,
              width: particle.size,
              height: particle.size,
              borderRadius: 999,
              background: index % 3 === 0 ? colors.lime : colors.tealLight,
              boxShadow: `0 0 ${particle.size * 5}px currentColor`,
              color: index % 3 === 0 ? colors.lime : colors.tealLight,
              opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

function IntroScene() {
  const frame = useCurrentFrame();
  const headline = ease(frame, 8, 38);
  const shot = ease(frame, 24, 54);
  const exit = fade(frame, 64, 20);
  const lift = interpolate(headline, [0, 1], [42, 0]);
  const shotX = interpolate(shot, [0, 1], [260, 0]);
  const shotRotate = interpolate(shot, [0, 1], [8, -1.5]);

  return (
    <AbsoluteFill style={{ opacity: exit }}>
      <div
        style={{
          ...styles.stageLabel,
          opacity: headline,
          transform: `translateY(${lift}px)`,
        }}
      >
        AgentUX Scaffold Configurator
      </div>
      <div
        style={{
          ...styles.heroTitle,
          opacity: headline,
          transform: `translateY(${lift}px)`,
        }}
      >
        AgentCanvas
      </div>
      <div
        style={{
          ...styles.heroSubhead,
          opacity: headline,
          transform: `translateY(${lift * 0.7}px)`,
        }}
      >
        Start from a production-grade coding agent UI, tune UX presets, then export a runnable Vite + React package.
      </div>
      <div
        style={{
          position: "absolute",
          left: 104,
          top: 570,
          display: "flex",
          gap: 14,
          opacity: headline,
          transform: `translateY(${lift * 0.35}px)`,
        }}
      >
        <Metric icon={<Settings2 size={24} />} label="Preset driven" value="7 groups" />
        <Metric icon={<Layers size={24} />} label="Bounded regions" value="5 slots" />
        <Metric icon={<Download size={24} />} label="Export target" value="Vite TS" />
      </div>
      <ProductWindow
        image={screenshots.builder}
        title="AgentCanvas Builder"
        subtitle="Real scaffold preview"
        style={{
          left: 850,
          top: 176,
          width: 940,
          height: 590,
          opacity: shot,
          transform: `perspective(1600px) translateX(${shotX}px) rotateY(${shotRotate}deg) rotateZ(-1deg) scale(${0.88 + shot * 0.12})`,
        }}
      >
        <ScanHighlight frame={frame} />
      </ProductWindow>
    </AbsoluteFill>
  );
}

function PresetScene() {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 34);
  const cards = ease(frame, 18, 44);
  const exit = fade(frame, 86, 20);
  const drift = Math.sin(frame / 28) * 8;
  const presetItems = ["UX Effects", "Tool Calls", "Blocks", "Composer", "Output", "Git", "Theme"];
  const regionItems = ["main", "composer", "right-panel", "bottom-dock", "overlay"];

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, exit) }}>
      <SceneCaption
        eyebrow="MVP shape"
        title="Preset tuning, not a blank canvas"
        body="The builder stays schema-first and region-constrained, so generated files remain clean."
        frame={frame}
      />
      <div style={{ position: "absolute", left: 106, top: 330, width: 360 }}>
        {presetItems.map((item, index) => (
          <KineticPill
            key={item}
            delay={18 + index * 5}
            frame={frame}
            icon={index % 2 === 0 ? <Settings2 size={18} /> : <Code2 size={18} />}
          >
            {item}
          </KineticPill>
        ))}
      </div>
      <ProductWindow
        image={screenshots.output}
        title="Output preset"
        subtitle="Artifacts, code, and run preview"
        style={{
          left: 504,
          top: 238,
          width: 900,
          height: 576,
          opacity: cards,
          transform: `translateY(${interpolate(cards, [0, 1], [64, 0]) + drift}px) rotateZ(-1.4deg) scale(${0.9 + cards * 0.1})`,
        }}
      >
        <FeatureTag left={516} top={68} frame={frame} delay={48}>
          artifact frame
        </FeatureTag>
        <FeatureTag left={52} top={412} frame={frame} delay={64}>
          composer controls
        </FeatureTag>
      </ProductWindow>
      <div
        style={{
          position: "absolute",
          right: 128,
          top: 354,
          width: 332,
          opacity: cards,
          transform: `translateX(${interpolate(cards, [0, 1], [90, 0])}px)`,
        }}
      >
        <div style={styles.sidePanelTitle}>Allowed regions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {regionItems.map((item, index) => (
            <span
              key={item}
              style={{
                ...styles.regionChip,
                opacity: ease(frame, 38 + index * 4, 16),
                transform: `translateY(${interpolate(ease(frame, 38 + index * 4, 16), [0, 1], [20, 0])}px)`,
              }}
            >
              {item}
            </span>
          ))}
        </div>
        <div style={styles.ruleCard}>
          Exported runtime code consumes typed AgentUX view models. Builder chrome stays out of the package.
        </div>
      </div>
    </AbsoluteFill>
  );
}

function RuntimeScene() {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 32);
  const exit = fade(frame, 78, 20);
  const events = [
    "run.started",
    "reasoning.status",
    "tool.call.started",
    "tool.call.running",
    "artifact.created",
    "artifact.delta",
    "text.delta",
    "run.finished",
  ];
  const activeIndex = Math.min(events.length - 1, Math.max(0, Math.floor((frame - 18) / 8)));

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, exit) }}>
      <SceneCaption
        eyebrow="Runtime fidelity"
        title="Preview real agent states"
        body="Thinking, tool calls, output artifacts, Git state, and debug dock all project from canonical events."
        frame={frame}
      />
      <ProductWindow
        image={screenshots.debug}
        title="Debug dock"
        subtitle="Canonical events and view model"
        style={{
          left: 88,
          top: 296,
          width: 1018,
          height: 548,
          opacity: enter,
          transform: `translateX(${interpolate(enter, [0, 1], [-110, 0])}px) rotateZ(1deg)`,
        }}
      />
      <div
        style={{
          ...styles.eventPanel,
          opacity: enter,
          transform: `translateX(${interpolate(enter, [0, 1], [120, 0])}px)`,
        }}
      >
        <div style={styles.eventPanelHeader}>
          <Activity size={22} />
          AgentUX event stream
        </div>
        {events.map((event, index) => (
          <EventRow key={event} event={event} index={index} active={index <= activeIndex} frame={frame} />
        ))}
      </div>
      <div
        style={{
          ...styles.previewCard,
          opacity: ease(frame, 46, 22),
          transform: `translateY(${interpolate(ease(frame, 46, 22), [0, 1], [40, 0])}px)`,
        }}
      >
        <Play size={25} fill={colors.ink} />
        <div>
          <div style={styles.previewCardTitle}>Replay fixtures first</div>
          <div style={styles.previewCardBody}>External harnesses plug in after the render path is stable.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function ExportScene() {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 30);
  const exit = fade(frame, 56, 22);
  const files = [
    "agentux.config.ts",
    "src/harness/mockAdapter.ts",
    "src/components/ChatFrame.tsx",
    "src/components/ComposerFrame.tsx",
    "src/fixtures/agentux/coding-agent.events.jsonl",
  ];
  const commands = ["npm install", "npm run dev", "npm run typecheck"];

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, exit) }}>
      <SceneCaption
        eyebrow="The handoff"
        title="Download a real project"
        body="The export is not a manifest preview. It is a runnable scaffold developers can continue outside AgentCanvas."
        frame={frame}
      />
      <ProductWindow
        image={screenshots.git}
        title="Export-safe controls"
        subtitle="Git, diffs, and scaffold package"
        style={{
          left: 94,
          top: 320,
          width: 830,
          height: 520,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [80, 0])}px) rotateZ(-1deg)`,
        }}
      />
      <div
        style={{
          ...styles.packagePanel,
          opacity: ease(frame, 14, 26),
          transform: `translateX(${interpolate(ease(frame, 14, 26), [0, 1], [120, 0])}px)`,
        }}
      >
        <div style={styles.packageHeader}>
          <Download size={28} />
          <span>Export package</span>
        </div>
        <div style={styles.fileTree}>
          {files.map((file, index) => (
            <div
              key={file}
              style={{
                ...styles.fileRow,
                opacity: ease(frame, 28 + index * 5, 18),
                transform: `translateX(${interpolate(ease(frame, 28 + index * 5, 18), [0, 1], [32, 0])}px)`,
              }}
            >
              <span style={styles.fileDot} />
              {file}
            </div>
          ))}
        </div>
        <div style={styles.commandStrip}>
          {commands.map((command, index) => (
            <code
              key={command}
              style={{
                ...styles.command,
                opacity: ease(frame, 58 + index * 6, 14),
              }}
            >
              {command}
            </code>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const enter = ease(frame, 0, 20);
  const pulse = interpolate(Math.sin(frame / 7), [-1, 1], [0.92, 1.06]);

  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: enter }}>
      <div
        style={{
          width: 980,
          textAlign: "center",
          transform: `scale(${0.92 + enter * 0.08})`,
        }}
      >
        <div
          style={{
            ...styles.logoMark,
            margin: "0 auto 34px",
            transform: `scale(${pulse})`,
          }}
        >
          <Layers size={58} />
        </div>
        <div style={styles.outroTitle}>AgentCanvas</div>
        <div style={styles.outroBody}>Configure the agent frontend. Export real code.</div>
      </div>
    </AbsoluteFill>
  );
}

function SceneCaption(props: { eyebrow: string; title: string; body: string; frame: number }) {
  const progress = ease(props.frame, 0, 26);

  return (
    <div
      style={{
        position: "absolute",
        left: 104,
        top: 82,
        width: 980,
        opacity: progress,
        transform: `translateY(${interpolate(progress, [0, 1], [34, 0])}px)`,
      }}
    >
      <div style={styles.captionEyebrow}>{props.eyebrow}</div>
      <div style={styles.captionTitle}>{props.title}</div>
      <div style={styles.captionBody}>{props.body}</div>
    </div>
  );
}

function ProductWindow(props: {
  image: string;
  title: string;
  subtitle: string;
  style: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <div style={{ ...styles.productWindow, ...props.style }}>
      <div style={styles.windowBar}>
        <div style={styles.windowDots}>
          <span style={styles.windowDot} />
          <span style={styles.windowDot} />
          <span style={styles.windowDot} />
        </div>
        <div>
          <div style={styles.windowTitle}>{props.title}</div>
          <div style={styles.windowSubtitle}>{props.subtitle}</div>
        </div>
      </div>
      <div style={styles.windowImageWrap}>
        <Img src={staticFile(props.image)} style={styles.windowImage} />
        {props.children}
      </div>
    </div>
  );
}

function ScanHighlight(props: { frame: number }) {
  const x = interpolate((props.frame - 24) % 90, [0, 90], [-340, 1120], clamp);

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: -80,
        width: 170,
        height: 780,
        transform: "rotate(13deg)",
        background: "linear-gradient(90deg, transparent, rgba(200, 243, 106, 0.2), transparent)",
        filter: "blur(8px)",
      }}
    />
  );
}

function Metric(props: { icon: ReactNode; label: string; value: string }) {
  return (
    <div style={styles.metric}>
      <div style={styles.metricIcon}>{props.icon}</div>
      <div>
        <div style={styles.metricLabel}>{props.label}</div>
        <div style={styles.metricValue}>{props.value}</div>
      </div>
    </div>
  );
}

function KineticPill(props: { children: ReactNode; icon: ReactNode; frame: number; delay: number }) {
  const progress = ease(props.frame, props.delay, 20);

  return (
    <div
      style={{
        ...styles.kineticPill,
        opacity: progress,
        transform: `translateX(${interpolate(progress, [0, 1], [-60, 0])}px)`,
      }}
    >
      {props.icon}
      <span>{props.children}</span>
    </div>
  );
}

function FeatureTag(props: { children: ReactNode; frame: number; delay: number; left: number; top: number }) {
  const progress = ease(props.frame, props.delay, 18);

  return (
    <div
      style={{
        ...styles.featureTag,
        left: props.left,
        top: props.top,
        opacity: progress,
        transform: `scale(${0.82 + progress * 0.18})`,
      }}
    >
      {props.children}
    </div>
  );
}

function EventRow(props: { event: string; index: number; active: boolean; frame: number }) {
  const appear = ease(props.frame, 12 + props.index * 5, 16);
  const shimmer = props.active ? interpolate(Math.sin((props.frame + props.index * 8) / 8), [-1, 1], [0.12, 0.36]) : 0.08;

  return (
    <div
      style={{
        ...styles.eventRow,
        opacity: appear,
        color: props.active ? colors.text : colors.muted,
        background: props.active ? `rgba(131, 210, 197, ${shimmer})` : "rgba(255, 255, 255, 0.045)",
        borderColor: props.active ? "rgba(131, 210, 197, 0.5)" : "rgba(255, 255, 255, 0.08)",
        transform: `translateX(${interpolate(appear, [0, 1], [34, 0])}px)`,
      }}
    >
      <span style={styles.eventIndex}>{String(props.index + 1).padStart(2, "0")}</span>
      <code>{props.event}</code>
    </div>
  );
}

function ease(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
}

function fade(frame: number, start: number, duration: number) {
  return interpolate(frame, [start, start + duration], [1, 0], {
    ...clamp,
    easing: easeInOut,
  });
}

const styles = {
  root: {
    width: "100%",
    height: "100%",
    background: colors.ink,
    color: colors.text,
    fontFamily,
    overflow: "hidden",
  } satisfies CSSProperties,
  stageLabel: {
    position: "absolute",
    left: 104,
    top: 122,
    color: colors.tealLight,
    fontSize: 28,
    fontWeight: 760,
    letterSpacing: 0,
    textTransform: "uppercase",
  } satisfies CSSProperties,
  heroTitle: {
    position: "absolute",
    left: 98,
    top: 178,
    fontSize: 116,
    lineHeight: 0.92,
    fontWeight: 840,
    letterSpacing: 0,
  } satisfies CSSProperties,
  heroSubhead: {
    position: "absolute",
    left: 106,
    top: 334,
    width: 650,
    color: "#c8d9d8",
    fontSize: 32,
    lineHeight: 1.22,
    fontWeight: 560,
  } satisfies CSSProperties,
  metric: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    width: 210,
    minHeight: 92,
    border: `1px solid ${colors.border}`,
    borderRadius: 18,
    background: "rgba(255, 255, 255, 0.07)",
    boxShadow: "0 24px 70px rgba(0, 0, 0, 0.32)",
    padding: "18px 20px",
  } satisfies CSSProperties,
  metricIcon: {
    display: "grid",
    placeItems: "center",
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "rgba(131, 210, 197, 0.18)",
    color: colors.tealLight,
  } satisfies CSSProperties,
  metricLabel: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: 680,
  } satisfies CSSProperties,
  metricValue: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: 820,
  } satisfies CSSProperties,
  productWindow: {
    position: "absolute",
    border: "1px solid rgba(221, 236, 234, 0.34)",
    borderRadius: 24,
    overflow: "hidden",
    background: "rgba(247, 250, 252, 0.94)",
    boxShadow: "0 42px 120px rgba(0, 0, 0, 0.44), 0 0 0 1px rgba(131, 210, 197, 0.12)",
    transformOrigin: "50% 50%",
  } satisfies CSSProperties,
  windowBar: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    height: 62,
    padding: "0 22px",
    borderBottom: "1px solid rgba(7, 16, 15, 0.12)",
    background: "linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(238, 244, 244, 0.92))",
  } satisfies CSSProperties,
  windowDots: {
    display: "flex",
    gap: 8,
  } satisfies CSSProperties,
  windowDot: {
    display: "block",
    width: 11,
    height: 11,
    borderRadius: 999,
    background: "rgba(47, 111, 115, 0.32)",
  } satisfies CSSProperties,
  windowTitle: {
    color: "#111827",
    fontSize: 19,
    fontWeight: 820,
  } satisfies CSSProperties,
  windowSubtitle: {
    color: "#506171",
    fontSize: 14,
    fontWeight: 620,
  } satisfies CSSProperties,
  windowImageWrap: {
    position: "relative",
    width: "100%",
    height: "calc(100% - 62px)",
    overflow: "hidden",
    background: colors.panel,
  } satisfies CSSProperties,
  windowImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center top",
    display: "block",
  } satisfies CSSProperties,
  captionEyebrow: {
    color: colors.lime,
    fontSize: 22,
    fontWeight: 820,
    textTransform: "uppercase",
  } satisfies CSSProperties,
  captionTitle: {
    marginTop: 10,
    fontSize: 66,
    lineHeight: 1.03,
    fontWeight: 850,
    letterSpacing: 0,
  } satisfies CSSProperties,
  captionBody: {
    marginTop: 18,
    width: 840,
    color: "#c5d7d5",
    fontSize: 28,
    lineHeight: 1.26,
    fontWeight: 560,
  } satisfies CSSProperties,
  kineticPill: {
    display: "flex",
    alignItems: "center",
    gap: 13,
    height: 56,
    marginBottom: 12,
    border: `1px solid ${colors.border}`,
    borderRadius: 16,
    background: "rgba(255, 255, 255, 0.08)",
    color: colors.text,
    boxShadow: "0 22px 68px rgba(0, 0, 0, 0.24)",
    padding: "0 18px",
    fontSize: 22,
    fontWeight: 790,
  } satisfies CSSProperties,
  sidePanelTitle: {
    marginBottom: 20,
    color: colors.tealLight,
    fontSize: 24,
    fontWeight: 820,
  } satisfies CSSProperties,
  regionChip: {
    display: "inline-flex",
    alignItems: "center",
    height: 42,
    border: "1px solid rgba(131, 210, 197, 0.45)",
    borderRadius: 999,
    background: "rgba(131, 210, 197, 0.12)",
    color: colors.text,
    padding: "0 16px",
    fontFamily: monoFamily,
    fontSize: 17,
    fontWeight: 760,
  } satisfies CSSProperties,
  ruleCard: {
    marginTop: 24,
    border: "1px solid rgba(241, 196, 109, 0.42)",
    borderRadius: 18,
    background: "rgba(241, 196, 109, 0.12)",
    color: "#f6ead0",
    padding: "22px 24px",
    fontSize: 22,
    lineHeight: 1.28,
    fontWeight: 640,
  } satisfies CSSProperties,
  featureTag: {
    position: "absolute",
    border: "1px solid rgba(200, 243, 106, 0.7)",
    borderRadius: 999,
    background: "rgba(7, 16, 15, 0.84)",
    color: colors.lime,
    padding: "9px 15px",
    fontFamily: monoFamily,
    fontSize: 14,
    fontWeight: 800,
    textTransform: "uppercase",
    boxShadow: "0 0 34px rgba(200, 243, 106, 0.22)",
  } satisfies CSSProperties,
  eventPanel: {
    position: "absolute",
    right: 116,
    top: 286,
    width: 604,
    border: `1px solid ${colors.border}`,
    borderRadius: 24,
    background: "rgba(6, 15, 14, 0.82)",
    boxShadow: "0 42px 110px rgba(0, 0, 0, 0.42)",
    padding: 24,
  } satisfies CSSProperties,
  eventPanelHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    color: colors.tealLight,
    fontSize: 24,
    fontWeight: 820,
  } satisfies CSSProperties,
  eventRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    height: 48,
    marginTop: 9,
    border: "1px solid transparent",
    borderRadius: 12,
    padding: "0 15px",
    fontSize: 18,
  } satisfies CSSProperties,
  eventIndex: {
    color: colors.lime,
    fontFamily: monoFamily,
    fontSize: 14,
    fontWeight: 800,
  } satisfies CSSProperties,
  previewCard: {
    position: "absolute",
    left: 982,
    bottom: 122,
    display: "flex",
    alignItems: "center",
    gap: 18,
    width: 520,
    minHeight: 104,
    borderRadius: 22,
    background: colors.lime,
    color: colors.ink,
    padding: "22px 26px",
    boxShadow: "0 30px 90px rgba(200, 243, 106, 0.22)",
  } satisfies CSSProperties,
  previewCardTitle: {
    fontSize: 24,
    fontWeight: 850,
  } satisfies CSSProperties,
  previewCardBody: {
    marginTop: 5,
    fontSize: 18,
    lineHeight: 1.25,
    fontWeight: 640,
    color: "#1e3632",
  } satisfies CSSProperties,
  packagePanel: {
    position: "absolute",
    right: 126,
    top: 292,
    width: 718,
    border: `1px solid ${colors.border}`,
    borderRadius: 26,
    background: "rgba(247, 250, 252, 0.94)",
    color: "#101827",
    boxShadow: "0 42px 118px rgba(0, 0, 0, 0.36)",
    padding: 30,
  } satisfies CSSProperties,
  packageHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    color: colors.teal,
    fontSize: 30,
    fontWeight: 850,
  } satisfies CSSProperties,
  fileTree: {
    marginTop: 24,
    padding: 18,
    borderRadius: 18,
    background: "#eef3f5",
  } satisfies CSSProperties,
  fileRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    height: 42,
    color: "#273545",
    fontFamily: monoFamily,
    fontSize: 17,
    fontWeight: 720,
  } satisfies CSSProperties,
  fileDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: 999,
    background: colors.teal,
  } satisfies CSSProperties,
  commandStrip: {
    display: "flex",
    gap: 12,
    marginTop: 22,
  } satisfies CSSProperties,
  command: {
    display: "inline-flex",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    background: "#07100f",
    color: colors.tealLight,
    padding: "0 15px",
    fontFamily: monoFamily,
    fontSize: 16,
    fontWeight: 760,
  } satisfies CSSProperties,
  logoMark: {
    display: "grid",
    placeItems: "center",
    width: 132,
    height: 132,
    borderRadius: 32,
    background: "linear-gradient(135deg, rgba(131, 210, 197, 0.26), rgba(200, 243, 106, 0.2))",
    color: colors.lime,
    border: "1px solid rgba(200, 243, 106, 0.38)",
    boxShadow: "0 0 120px rgba(131, 210, 197, 0.3)",
  } satisfies CSSProperties,
  outroTitle: {
    fontSize: 96,
    lineHeight: 1,
    fontWeight: 880,
  } satisfies CSSProperties,
  outroBody: {
    marginTop: 22,
    color: "#c8d9d8",
    fontSize: 34,
    fontWeight: 620,
  } satisfies CSSProperties,
} as const;

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ImageLoader, type ImageLoaderVariant } from "generative-loaders";

import styles from "./ImageGeneration.module.css";

type ImageGenerationSize = "thumb" | "inline" | "canvas";

type ImageGenerationProps = {
  animate?: boolean;
  className?: string;
  decorative?: boolean;
  size?: ImageGenerationSize;
};

type ImageGenerationRevealProps = {
  alt: string;
  className?: string;
  imageSrc: string;
  size?: Exclude<ImageGenerationSize, "thumb">;
};

type MediaLoadingRevealProps = {
  children: ReactNode;
  className?: string;
  loaderStyle?: string;
  size?: Exclude<ImageGenerationSize, "thumb">;
};

type PackageImageLoaderBaseProps = {
  animate?: boolean;
  className?: string;
  decorative?: boolean;
  size?: number;
};

type PackageImageLoaderProps = PackageImageLoaderBaseProps & {
  radius?: number | string;
  tone: "pixel" | "skeleton";
  variant: ImageLoaderVariant;
};

type MediaLoaderVisualStyle = "grid" | "dot-flicker" | "blur-flow" | "pixel-grid" | "audio-skeleton" | "audio-wave";

const FLICKER_COLUMNS = 12;
const FLICKER_ROWS = 12;
const FLICKER_DOTS = Array.from({ length: FLICKER_COLUMNS * FLICKER_ROWS }, (_, index) => {
  const column = index % FLICKER_COLUMNS;
  const row = Math.floor(index / FLICKER_COLUMNS);
  const seed = (index * 47 + row * 23 + column * 31) % 97;
  const opacity = 0.18 + ((seed % 6) * 0.09);
  const peak = 0.56 + ((seed % 5) * 0.08);

  return {
    delay: (seed * 37 + row * 83 + column * 19) % 1800,
    duration: 1200 + ((seed * 29 + row * 43) % 1300),
    opacity: Number(opacity.toFixed(2)),
    peak: Number(Math.min(0.92, peak).toFixed(2)),
    size: 1.55 + ((seed + row + column) % 3) * 0.28,
  };
});

const AUDIO_WAVE_BARS = Array.from({ length: 22 }, (_, index) => {
  const seed = (index * 37 + 19) % 101;
  return {
    delay: -((seed * 17 + index * 43) % 900),
    height: 24 + ((seed + index * 13) % 62),
  };
});

export function ImageGeneration({
  animate = false,
  className,
  decorative = false,
  size = "canvas",
}: ImageGenerationProps) {
  return (
    <div
      className={[styles.igWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-size={size}
    >
      <span
        className={styles.igCanvas}
        role={decorative ? undefined : "img"}
        aria-hidden={decorative ? true : undefined}
        aria-label={decorative ? undefined : "Generating image"}
      >
        <span className={styles.igDots} aria-hidden="true" />
        <span className={styles.igGlow} aria-hidden="true" />
      </span>
    </div>
  );
}

export function ImageGenerationReveal({
  alt,
  className,
  imageSrc,
  size = "canvas",
}: ImageGenerationRevealProps) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setPhase("loading");
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, [imageSrc]);

  return (
    <div className={[styles.igReveal, className].filter(Boolean).join(" ")} data-phase={phase} data-size={size}>
      <ImageGeneration animate={phase === "loading"} decorative={phase === "ready"} size={size} />
      <img className={styles.igImage} src={imageSrc} alt={alt} />
    </div>
  );
}

export function mediaLoaderVisualStyle(style: string | undefined): MediaLoaderVisualStyle {
  switch (style) {
    case "skeleton":
    case "player":
    case "transcript":
      return "audio-skeleton";
    case "waveform":
    case "spectrum":
      return "audio-wave";
    case "blur":
    case "cinema":
      return "dot-flicker";
    case "palette":
    case "timeline":
      return "blur-flow";
    case "layers":
    case "frames":
      return "pixel-grid";
    case "storyboard":
    case "grid":
    default:
      return "grid";
  }
}

function PackageImageLoader({
  animate = false,
  className,
  decorative = false,
  radius,
  size = 192,
  tone,
  variant,
}: PackageImageLoaderProps) {
  return (
    <span
      className={[
        styles.coalesceWrap,
        tone === "pixel" ? styles.pixelCoalesceWrap : null,
        tone === "skeleton" ? styles.skeletonImageWrap : null,
        className,
      ].filter(Boolean).join(" ")}
      aria-hidden={decorative ? true : undefined}
      data-tone={tone}
    >
      <ImageLoader
        variant={variant}
        size={size}
        radius={radius ?? (tone === "pixel" ? "18%" : tone === "skeleton" ? "16%" : "22%")}
        paused={tone === "pixel" || tone === "skeleton" ? !animate : false}
        color="currentColor"
        label="Generating image"
      />
    </span>
  );
}

export function ImageDotFlickerLoader({
  animate = false,
  className,
  decorative = false,
  size = 192,
}: PackageImageLoaderBaseProps) {
  return (
    <span
      className={[styles.dotFlickerWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-variant="dot-flicker"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Generating image"}
      style={{ "--dot-loader-size": `${size}px` } as CSSProperties}
    >
      <span className={styles.dotFlickerField} aria-hidden="true">
        {FLICKER_DOTS.map((dot, index) => (
          <span
            key={index}
            className={styles.dotFlickerDot}
            style={{
              "--dot-delay": `-${dot.delay}ms`,
              "--dot-duration": `${dot.duration}ms`,
              "--dot-opacity": dot.opacity,
              "--dot-peak": dot.peak,
              "--dot-size": `${dot.size}px`,
            } as CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}

export function ImageGridSweepLoader({
  animate = false,
  className,
  decorative = false,
  size = 192,
}: PackageImageLoaderBaseProps) {
  return (
    <span
      className={[styles.gridSweepWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-variant="grid-sweep"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Generating image"}
      style={{ "--grid-sweep-size": `${size}px` } as CSSProperties}
    >
      <ImageGeneration animate={animate} decorative size="thumb" />
    </span>
  );
}

export function ImageBlurFlowLoader({
  animate = false,
  className,
  decorative = false,
  size = 192,
}: PackageImageLoaderBaseProps) {
  return (
    <span
      className={[styles.blurFlowWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-compact={size < 120 ? "true" : undefined}
      data-variant="blur-flow"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Generating image"}
      style={{ "--blur-flow-size": `${size}px` } as CSSProperties}
    >
      <span className={styles.blurFlowBlob} data-blob="blue" aria-hidden="true" />
      <span className={styles.blurFlowBlob} data-blob="cyan" aria-hidden="true" />
      <span className={styles.blurFlowBlob} data-blob="white" aria-hidden="true" />
      <span className={styles.blurFlowMist} aria-hidden="true" />
    </span>
  );
}

export function ImagePixelGridLoader(props: PackageImageLoaderBaseProps) {
  return <PackageImageLoader {...props} tone="pixel" variant="pixel-grid" />;
}

export function AudioSkeletonLoader({
  animate = false,
  className,
  decorative = false,
  size = 192,
}: PackageImageLoaderBaseProps) {
  return (
    <span
      className={[styles.audioSkeletonWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-variant="audio-skeleton"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Generating audio"}
      style={{ "--audio-loader-size": `${size}px` } as CSSProperties}
    >
      <span className={styles.audioSkeletonBars} aria-hidden="true">
        <span className={styles.audioSkeletonBar} />
        <span className={styles.audioSkeletonBar} />
      </span>
    </span>
  );
}

export function AudioWaveLoader({
  animate = false,
  className,
  decorative = false,
  size = 192,
}: PackageImageLoaderBaseProps) {
  return (
    <span
      className={[styles.audioWaveWrap, className].filter(Boolean).join(" ")}
      data-animate={animate ? "true" : undefined}
      data-variant="audio-wave"
      role={decorative ? undefined : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Generating audio"}
      style={{ "--audio-loader-size": `${size}px` } as CSSProperties}
    >
      <span className={styles.audioWaveBars} aria-hidden="true">
        {AUDIO_WAVE_BARS.map((bar, index) => (
          <span
            key={index}
            style={{
              "--audio-bar-delay": `${bar.delay}ms`,
              "--audio-bar-height": `${bar.height}%`,
            } as CSSProperties}
          />
        ))}
      </span>
    </span>
  );
}

export function MediaLoadingVisual({
  animate = false,
  className,
  decorative = false,
  size = 192,
  style,
}: PackageImageLoaderBaseProps & { style?: string }) {
  const visualStyle = mediaLoaderVisualStyle(style);
  if (visualStyle === "audio-skeleton") {
    return <AudioSkeletonLoader animate={animate} className={className} decorative={decorative} size={size} />;
  }
  if (visualStyle === "audio-wave") {
    return <AudioWaveLoader animate={animate} className={className} decorative={decorative} size={size} />;
  }
  if (visualStyle === "dot-flicker") {
    return <ImageDotFlickerLoader animate={animate} className={className} decorative={decorative} size={size} />;
  }
  if (visualStyle === "blur-flow") {
    return <ImageBlurFlowLoader animate={animate} className={className} decorative={decorative} size={size} />;
  }
  if (visualStyle === "pixel-grid") {
    return <ImagePixelGridLoader animate={animate} className={className} decorative={decorative} size={size} />;
  }
  return <ImageGridSweepLoader animate={animate} className={className} decorative={decorative} size={size} />;
}

export function MediaLoadingReveal({
  children,
  className,
  loaderStyle,
  size = "canvas",
}: MediaLoadingRevealProps) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setPhase("loading");
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, [loaderStyle]);

  return (
    <div
      className={[styles.coalesceReveal, styles.mediaLoadingReveal, className].filter(Boolean).join(" ")}
      data-loader-visual={mediaLoaderVisualStyle(loaderStyle)}
      data-phase={phase}
      data-size={size}
    >
      <MediaLoadingVisual animate={phase === "loading"} decorative={phase === "ready"} style={loaderStyle} />
      <div className={styles.mediaRevealContent}>{children}</div>
    </div>
  );
}

export function ImageDotFlickerReveal({
  alt,
  className,
  imageSrc,
  size = "canvas",
}: ImageGenerationRevealProps) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setPhase("loading");
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, [imageSrc]);

  return (
    <div
      className={[styles.coalesceReveal, styles.dotFlickerReveal, className].filter(Boolean).join(" ")}
      data-phase={phase}
      data-size={size}
    >
      <ImageDotFlickerLoader animate={phase === "loading"} decorative={phase === "ready"} />
      <img className={styles.igImage} src={imageSrc} alt={alt} />
    </div>
  );
}

export function ImageBlurFlowReveal({
  alt,
  className,
  imageSrc,
  size = "canvas",
}: ImageGenerationRevealProps) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setPhase("loading");
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, [imageSrc]);

  return (
    <div
      className={[styles.coalesceReveal, styles.blurFlowReveal, className].filter(Boolean).join(" ")}
      data-phase={phase}
      data-size={size}
    >
      <ImageBlurFlowLoader animate={phase === "loading"} decorative={phase === "ready"} />
      <img className={styles.igImage} src={imageSrc} alt={alt} />
    </div>
  );
}

export function ImagePixelGridReveal({
  alt,
  className,
  imageSrc,
  size = "canvas",
}: ImageGenerationRevealProps) {
  const [phase, setPhase] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    setPhase("loading");
    const timer = setTimeout(() => setPhase("ready"), 3000);
    return () => clearTimeout(timer);
  }, [imageSrc]);

  return (
    <div
      className={[styles.coalesceReveal, styles.pixelGridImageReveal, className].filter(Boolean).join(" ")}
      data-phase={phase}
      data-size={size}
    >
      <ImagePixelGridLoader animate={phase === "loading"} decorative={phase === "ready"} />
      <img className={styles.igImage} src={imageSrc} alt={alt} />
    </div>
  );
}

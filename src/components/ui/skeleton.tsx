import "./skeleton.css";

export type SkeletonProps = {
  shape?: "text" | "block" | "circle";
  width?: string | number;
  height?: string | number;
  className?: string;
  ref?: React.Ref<HTMLSpanElement>;
};

export function Skeleton({
  shape = "text",
  width,
  height,
  className,
  ref,
}: SkeletonProps) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={className ? `ui-skeleton ${className}` : "ui-skeleton"}
      data-shape={shape}
      style={{ width, height }}
    />
  );
}

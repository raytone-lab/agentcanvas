import type { ReactNode } from "react";
import "./badge.css";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type BadgeProps = {
  tone?: BadgeTone;
  size?: "sm" | "md";
  children?: ReactNode;
  className?: string;
  ref?: React.Ref<HTMLSpanElement>;
};

export function Badge({
  tone = "neutral",
  size = "md",
  children,
  className,
  ref,
}: BadgeProps) {
  return (
    <span
      ref={ref}
      className={className ? `ui-badge ${className}` : "ui-badge"}
      data-tone={tone}
      data-size={size}
    >
      {children}
    </span>
  );
}

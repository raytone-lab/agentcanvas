import type { ButtonHTMLAttributes, Ref } from "react";
import "./button.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  type,
  ref,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? "button"}
      className={className ? `ui-button ${className}` : "ui-button"}
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="ui-button-spinner" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

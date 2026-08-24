import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import "./icon-button.css";

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label"> & {
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "secondary";
  children?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
};

export function IconButton({
  label,
  size = "md",
  variant = "ghost",
  disabled,
  children,
  className,
  type,
  ref,
  ...rest
}: IconButtonProps) {
  return (
    <button
      {...rest}
      ref={ref}
      type={type ?? "button"}
      className={className ?? "ui-icon-button"}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      title={label}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

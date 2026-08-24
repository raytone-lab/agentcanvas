import type { SelectHTMLAttributes, ReactNode, Ref } from "react";
import "./select.css";

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  size?: "sm" | "md" | "lg";
  invalid?: boolean;
  children?: ReactNode;
  ref?: Ref<HTMLSelectElement>;
};

export function Select({
  size = "md",
  invalid,
  className,
  disabled,
  children,
  ref,
  ...rest
}: SelectProps) {
  return (
    <span
      className={["ui-select-wrap", className].filter(Boolean).join(" ")}
      data-size={size}
      data-invalid={invalid ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      <select
        ref={ref}
        className="ui-select"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        {...rest}
      >
        {children}
      </select>
      <svg
        className="ui-select-chevron"
        viewBox="0 0 12 12"
        width="12"
        height="12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M2.5 4.5 6 8l3.5-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

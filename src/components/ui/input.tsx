import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import "./input.css";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix"> & {
  size?: "sm" | "md" | "lg";
  prefix?: ReactNode;
  suffix?: ReactNode;
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
};

export function Input({
  size = "md",
  prefix,
  suffix,
  invalid,
  className,
  disabled,
  ref,
  ...rest
}: InputProps) {
  const input = (
    <input
      ref={ref}
      className={prefix || suffix ? "ui-input ui-input-inner" : ["ui-input", className].filter(Boolean).join(" ")}
      data-size={prefix || suffix ? undefined : size}
      data-invalid={!prefix && !suffix && invalid ? "true" : undefined}
      disabled={disabled}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );

  if (!prefix && !suffix) {
    return input;
  }

  return (
    <span
      className={["ui-input-wrap", className].filter(Boolean).join(" ")}
      data-size={size}
      data-invalid={invalid ? "true" : undefined}
      data-disabled={disabled ? "true" : undefined}
    >
      {prefix ? (
        <span className="ui-input-affix" data-side="prefix" aria-hidden="true">
          {prefix}
        </span>
      ) : null}
      {input}
      {suffix ? (
        <span className="ui-input-affix" data-side="suffix" aria-hidden="true">
          {suffix}
        </span>
      ) : null}
    </span>
  );
}

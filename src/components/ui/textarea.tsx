import type { TextareaHTMLAttributes, Ref } from "react";
import { useLayoutEffect, useRef } from "react";
import "./textarea.css";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  autoGrow?: boolean;
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
};

export function Textarea({
  autoGrow,
  invalid,
  className,
  value,
  defaultValue,
  disabled,
  ref,
  ...rest
}: TextareaProps) {
  const innerRef = useRef<HTMLTextAreaElement | null>(null);

  const setRef = (node: HTMLTextAreaElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") {
      ref(node);
    } else if (ref) {
      (ref as { current: HTMLTextAreaElement | null }).current = node;
    }
  };

  useLayoutEffect(() => {
    if (!autoGrow) return;
    const el = innerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [autoGrow, value, defaultValue]);

  return (
    <textarea
      ref={setRef}
      className={["ui-textarea", className].filter(Boolean).join(" ")}
      data-invalid={invalid ? "true" : undefined}
      data-autogrow={autoGrow ? "true" : undefined}
      aria-invalid={invalid || undefined}
      value={value}
      defaultValue={defaultValue}
      disabled={disabled}
      {...rest}
    />
  );
}

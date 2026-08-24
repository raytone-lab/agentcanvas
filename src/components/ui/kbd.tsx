import type { ReactNode } from "react";
import "./kbd.css";

export type KbdProps = {
  children?: ReactNode;
  className?: string;
  ref?: React.Ref<HTMLElement>;
};

export function Kbd({ children, className, ref }: KbdProps) {
  return (
    <kbd ref={ref} className={className ? `ui-kbd ${className}` : "ui-kbd"}>
      {children}
    </kbd>
  );
}

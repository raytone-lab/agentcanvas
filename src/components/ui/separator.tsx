import "./separator.css";

export type SeparatorProps = {
  orientation?: "horizontal" | "vertical";
  label?: string;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
};

export function Separator({
  orientation = "horizontal",
  label,
  className,
  ref,
}: SeparatorProps) {
  const cls = className ? `ui-separator ${className}` : "ui-separator";

  if (label && orientation === "horizontal") {
    return (
      <div
        ref={ref}
        className={cls}
        data-orientation={orientation}
        data-labelled="true"
        role="separator"
        aria-orientation={orientation}
        aria-label={label}
      >
        <span className="ui-separator-line" aria-hidden="true" />
        <span className="ui-separator-label">{label}</span>
        <span className="ui-separator-line" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cls}
      data-orientation={orientation}
      role="separator"
      aria-orientation={orientation}
    />
  );
}

import * as RadixSwitch from "@radix-ui/react-switch";
import "./switch.css";

export type SwitchProps = RadixSwitch.SwitchProps & {
  /** Optional adjacent text rendered inside a wrapping <label>. */
  label?: string;
  /** Control size. @default "md" */
  size?: "sm" | "md";
};

export function Switch({ label, size = "md", className, ...props }: SwitchProps) {
  const root = (
    <RadixSwitch.Root
      className={["ui-switch", className].filter(Boolean).join(" ")}
      data-size={size}
      {...props}
    >
      <RadixSwitch.Thumb className="ui-switch-thumb" />
    </RadixSwitch.Root>
  );

  if (label === undefined) {
    return root;
  }

  return (
    <label className="ui-switch-field" data-disabled={props.disabled ? "true" : undefined}>
      {root}
      <span className="ui-switch-label">{label}</span>
    </label>
  );
}

import * as RDropdown from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

import "./select.css";
import "./dropdown-menu.css";

export type SelectMenuOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export type SelectMenuProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SelectMenuOption[];
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  invalid?: boolean;
  align?: "start" | "center" | "end";
  /** Accessible label for the trigger (used when there is no visible <label>). */
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerLabel?: ReactNode;
  triggerContent?: ReactNode;
};

/**
 * The single dropdown primitive for the whole app. Unlike a native `<select>`
 * — whose open option list is unstyleable OS chrome — this renders the popup
 * as real DOM (Radix DropdownMenu radio group), so the open state matches the
 * design system. Never use a raw `<select>` for a user-facing picker; use this.
 */
export function SelectMenu({
  value,
  onValueChange,
  options,
  size = "md",
  disabled,
  invalid,
  align = "start",
  ariaLabel,
  placeholder = "Select…",
  className,
  triggerLabel,
  triggerContent,
}: SelectMenuProps) {
  const selected = options.find((option) => option.value === value);

  return (
    <RDropdown.Root>
      <span
        className={["ui-select-wrap", className].filter(Boolean).join(" ")}
        data-size={size}
        data-invalid={invalid ? "true" : undefined}
        data-disabled={disabled ? "true" : undefined}
      >
        <RDropdown.Trigger
          className="ui-select ui-select-menu-trigger"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
        >
          {triggerContent ?? (
            <span
              className="ui-select-menu-value"
              data-placeholder={selected ? undefined : "true"}
            >
              {triggerLabel ?? (selected ? selected.label : placeholder)}
            </span>
          )}
        </RDropdown.Trigger>
        <svg
          className="ui-select-chevron"
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" />
        </svg>
      </span>
      <RDropdown.Portal>
        <RDropdown.Content
          className="ui-dropdown-menu ui-select-menu-content"
          sideOffset={6}
          align={align}
          collisionPadding={12}
          sticky="always"
        >
          <RDropdown.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map((option) => (
              <RDropdown.RadioItem
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="ui-dropdown-menu__item ui-dropdown-menu__item--checkbox"
              >
                <span className="ui-dropdown-menu__indicator" aria-hidden="true">
                  <RDropdown.ItemIndicator>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M13.5 4.5 6.5 11.5 3 8" />
                    </svg>
                  </RDropdown.ItemIndicator>
                </span>
                <span className="ui-dropdown-menu__item-label">{option.label}</span>
              </RDropdown.RadioItem>
            ))}
          </RDropdown.RadioGroup>
        </RDropdown.Content>
      </RDropdown.Portal>
    </RDropdown.Root>
  );
}

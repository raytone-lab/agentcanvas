import * as RDropdown from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef } from "react";
import "./dropdown-menu.css";

export type DropdownMenuProps = RDropdown.DropdownMenuProps;

export function DropdownMenu(props: DropdownMenuProps) {
  return <RDropdown.Root {...props} />;
}

export type DropdownMenuTriggerProps = RDropdown.DropdownMenuTriggerProps;

export function DropdownMenuTrigger(props: DropdownMenuTriggerProps) {
  return <RDropdown.Trigger {...props} />;
}

export type DropdownMenuContentProps = RDropdown.DropdownMenuContentProps;

export function DropdownMenuContent({
  className,
  sideOffset = 6,
  align = "start",
  children,
  ...rest
}: DropdownMenuContentProps) {
  return (
    <RDropdown.Portal>
      <RDropdown.Content
        className={["ui-dropdown-menu", className].filter(Boolean).join(" ")}
        sideOffset={sideOffset}
        align={align}
        {...rest}
      >
        {children}
      </RDropdown.Content>
    </RDropdown.Portal>
  );
}

export type DropdownMenuItemProps = RDropdown.DropdownMenuItemProps & {
  /** Renders the item with destructive (danger) text color. */
  danger?: boolean;
};

export function DropdownMenuItem({
  className,
  danger,
  ...rest
}: DropdownMenuItemProps) {
  return (
    <RDropdown.Item
      className={["ui-dropdown-menu__item", className].filter(Boolean).join(" ")}
      data-danger={danger ? "true" : undefined}
      {...rest}
    />
  );
}

export type DropdownMenuSubProps = RDropdown.DropdownMenuSubProps;

export function DropdownMenuSub(props: DropdownMenuSubProps) {
  return <RDropdown.Sub {...props} />;
}

export type DropdownMenuSubTriggerProps = ComponentPropsWithoutRef<typeof RDropdown.SubTrigger>;

export function DropdownMenuSubTrigger({
  className,
  ...rest
}: DropdownMenuSubTriggerProps) {
  return (
    <RDropdown.SubTrigger
      className={["ui-dropdown-menu__item", "ui-dropdown-menu__sub-trigger", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export type DropdownMenuSubContentProps = ComponentPropsWithoutRef<typeof RDropdown.SubContent>;

export function DropdownMenuSubContent({
  className,
  sideOffset = 8,
  children,
  ...rest
}: DropdownMenuSubContentProps) {
  return (
    <RDropdown.Portal>
      <RDropdown.SubContent
        className={["ui-dropdown-menu", "ui-dropdown-menu__sub-content", className]
          .filter(Boolean)
          .join(" ")}
        sideOffset={sideOffset}
        {...rest}
      >
        {children}
      </RDropdown.SubContent>
    </RDropdown.Portal>
  );
}

export type DropdownMenuCheckboxItemProps =
  RDropdown.DropdownMenuCheckboxItemProps;

export function DropdownMenuCheckboxItem({
  className,
  children,
  ...rest
}: DropdownMenuCheckboxItemProps) {
  return (
    <RDropdown.CheckboxItem
      className={["ui-dropdown-menu__item", "ui-dropdown-menu__item--checkbox", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
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
      <span className="ui-dropdown-menu__item-label">{children}</span>
    </RDropdown.CheckboxItem>
  );
}

export type DropdownMenuSeparatorProps = RDropdown.DropdownMenuSeparatorProps;

export function DropdownMenuSeparator({
  className,
  ...rest
}: DropdownMenuSeparatorProps) {
  return (
    <RDropdown.Separator
      className={["ui-dropdown-menu__separator", className]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
}

export type DropdownMenuLabelProps = RDropdown.DropdownMenuLabelProps;

export function DropdownMenuLabel({ className, ...rest }: DropdownMenuLabelProps) {
  return (
    <RDropdown.Label
      className={["ui-dropdown-menu__label", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

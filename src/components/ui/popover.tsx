import * as RadixPopover from "@radix-ui/react-popover";
import "./popover.css";

/** Popover root (open/onOpenChange/defaultOpen passthrough to Radix). */
export const Popover = RadixPopover.Root;

/** Trigger element that toggles the popover. */
export const PopoverTrigger = RadixPopover.Trigger;

export type PopoverContentProps = {
  /** Alignment of the panel relative to the trigger. */
  align?: RadixPopover.PopoverContentProps["align"];
  /** Gap in px between trigger and panel (default 6). */
  sideOffset?: number;
  /** Fixed panel width in px; defaults to content width. */
  width?: number;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
};

/** Portalled floating panel anchored to its trigger. */
export function PopoverContent({
  align = "center",
  sideOffset = 6,
  width,
  children,
  ref,
}: PopoverContentProps) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        ref={ref}
        className="ui-popover"
        align={align}
        sideOffset={sideOffset}
        style={width != null ? { width } : undefined}
      >
        {children}
      </RadixPopover.Content>
    </RadixPopover.Portal>
  );
}

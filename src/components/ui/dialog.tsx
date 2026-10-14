import * as RadixDialog from "@radix-ui/react-dialog";
import "./dialog.css";

/** Dialog root (open/onOpenChange/defaultOpen passthrough to Radix). */
export const Dialog = RadixDialog.Root;

/** Trigger element that opens the dialog. */
export const DialogTrigger = RadixDialog.Trigger;

/** Programmatic close element (e.g. footer cancel button). */
export const DialogClose = RadixDialog.Close;

export type DialogContentProps = {
  /** Accessible title rendered in the header (Radix Title). */
  title: string;
  /** Optional muted description rendered under the title (Radix Description). */
  description?: string;
  /** Fixed panel width in px; defaults to a fluid responsive width. */
  width?: number;
  /** Extra class on the panel, for a dialog that styles its own contents. */
  className?: string;
  /** Extra class on the overlay — a dialog previewing the page behind it
      can ask for a lighter one. */
  overlayClassName?: string;
  children?: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
};

/** Portalled overlay + centered panel with header, optional description, and a close button. */
export function DialogContent({
  title,
  description,
  width,
  className,
  overlayClassName,
  children,
  ref,
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={["ui-dialog-overlay", overlayClassName].filter(Boolean).join(" ")} />
      <RadixDialog.Content
        ref={ref}
        className={["ui-dialog", className].filter(Boolean).join(" ")}
        style={width != null ? { width } : undefined}
      >
        <div className="ui-dialog-header">
          <RadixDialog.Title className="ui-dialog-title">{title}</RadixDialog.Title>
          {description != null && (
            <RadixDialog.Description className="ui-dialog-description">
              {description}
            </RadixDialog.Description>
          )}
        </div>
        <RadixDialog.Close className="ui-dialog-close" aria-label="Close dialog">
          <svg
            className="ui-dialog-close-icon"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 4 12 12 M12 4 4 12" />
          </svg>
        </RadixDialog.Close>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

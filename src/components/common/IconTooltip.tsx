import * as Tooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export type IconTooltipProps = {
  label: string;
  children: ReactNode;
};

export function IconTooltip({ label, children }: IconTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={250}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content className="tooltip-content" sideOffset={8}>
            {label}
            <Tooltip.Arrow className="tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

import * as RTabs from "@radix-ui/react-tabs";
import "./tabs.css";

export type TabsProps = RTabs.TabsProps;

export function Tabs({ className, ...rest }: TabsProps) {
  return (
    <RTabs.Root
      className={["ui-tabs", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

export type TabsListProps = RTabs.TabsListProps;

export function TabsList({ className, ...rest }: TabsListProps) {
  return (
    <RTabs.List
      className={["ui-tabs__list", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

export type TabsTriggerProps = RTabs.TabsTriggerProps;

export function TabsTrigger({ className, ...rest }: TabsTriggerProps) {
  return (
    <RTabs.Trigger
      className={["ui-tabs__trigger", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

export type TabsContentProps = RTabs.TabsContentProps;

export function TabsContent({ className, ...rest }: TabsContentProps) {
  return (
    <RTabs.Content
      className={["ui-tabs__content", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}

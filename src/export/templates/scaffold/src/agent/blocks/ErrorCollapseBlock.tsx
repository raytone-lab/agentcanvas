export type BlockModuleProps = { title?: string; children?: string };

export function ErrorCollapseBlock({ title = "ErrorCollapseBlock", children = "" }: BlockModuleProps) {
  return <section data-block-module="ErrorCollapseBlock"><strong>{title}</strong><pre>{children}</pre></section>;
}

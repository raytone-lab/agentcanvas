export type BlockModuleProps = { title?: string; children?: string };

export function CodeDiffBlock({ title = "CodeDiffBlock", children = "" }: BlockModuleProps) {
  return <section data-block-module="CodeDiffBlock"><strong>{title}</strong><pre>{children}</pre></section>;
}

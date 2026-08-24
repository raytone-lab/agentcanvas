export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function MarkdownOutput({ artifact }: OutputModuleProps) {
  return <section data-output-module="MarkdownOutput"><strong>{artifact?.title ?? "MarkdownOutput"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

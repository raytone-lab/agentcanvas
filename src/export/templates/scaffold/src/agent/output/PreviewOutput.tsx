export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function PreviewOutput({ artifact }: OutputModuleProps) {
  return <section data-output-module="PreviewOutput"><strong>{artifact?.title ?? "PreviewOutput"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function DiffOutput({ artifact }: OutputModuleProps) {
  return <section data-output-module="DiffOutput"><strong>{artifact?.title ?? "DiffOutput"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

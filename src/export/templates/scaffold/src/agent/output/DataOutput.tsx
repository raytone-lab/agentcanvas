export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function DataOutput({ artifact }: OutputModuleProps) {
  return <section data-output-module="DataOutput"><strong>{artifact?.title ?? "DataOutput"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

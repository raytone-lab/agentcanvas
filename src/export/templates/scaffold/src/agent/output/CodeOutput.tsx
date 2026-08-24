export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function CodeOutput({ artifact }: OutputModuleProps) {
  return <section data-output-module="CodeOutput"><strong>{artifact?.title ?? "CodeOutput"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

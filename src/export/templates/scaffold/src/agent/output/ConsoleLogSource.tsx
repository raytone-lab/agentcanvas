export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function ConsoleLogSource({ artifact }: OutputModuleProps) {
  return <section data-output-module="ConsoleLogSource"><strong>{artifact?.title ?? "ConsoleLogSource"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

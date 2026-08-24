export type OutputModuleProps = { artifact?: { title?: string; content?: string; data?: unknown } };

export function LatestArtifactSource({ artifact }: OutputModuleProps) {
  return <section data-output-module="LatestArtifactSource"><strong>{artifact?.title ?? "LatestArtifactSource"}</strong><pre>{artifact?.content ?? JSON.stringify(artifact?.data ?? {}, null, 2)}</pre></section>;
}

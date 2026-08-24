import { Download, Files } from "lucide-react";

import type { ScaffoldExportSnapshot } from "../../export/scaffoldManifest";
import { useCopy } from "../../i18n/LocaleContext";

export function ExportFrame({
  snapshot,
  onExport,
}: {
  snapshot?: ScaffoldExportSnapshot;
  onExport: () => void;
}) {
  const copy = useCopy();
  const c = copy.workspace.exportFrame;
  return (
    <section className="utility-card export-frame">
      <header className="utility-header">
        <div>
          <h3>{c.title}</h3>
          <p>{snapshot ? `${snapshot.files.length}${c.scaffoldFilesStagedSuffix}` : c.viteReactScaffold}</p>
        </div>
        <Files size={16} />
      </header>
      {snapshot ? (
        <div className="export-summary" data-ready="true">
          <code>{snapshot.packageJson.name}</code>
          <div className="changed-files">
            {snapshot.files.slice(0, 4).map((file) => (
              <span key={file}>{file}</span>
            ))}
          </div>
        </div>
      ) : (
        <div className="empty-state">{c.emptyGenerate}</div>
      )}
      <button className="primary-button export-inline-button" type="button" onClick={onExport}>
        <Download size={15} />
        {snapshot ? c.regenerateExport : c.generateExport}
      </button>
    </section>
  );
}

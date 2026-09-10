import { Dialog, DialogContent } from "../../components/ui/dialog";
import { translatePresetGroupName } from "../../i18n/presetCopy";
import type { UiCopy, AppLocale } from "../../i18n/uiCopy";
import { presetGroups } from "../../schema/presets";
import type { MissingRequirement } from "../projection/presetRailData";

/**
 * Asked when preview or export is pressed on a project that cannot run yet.
 *
 * The canvas deliberately lets you build in any order and shows exactly what
 * you picked, so an unfinished project is a normal state rather than an error —
 * it only becomes a problem at the point of running or shipping it. So the
 * check lives here, at that point, instead of the canvas refusing to show a
 * half-built agent.
 *
 * Two ways out, and neither is a dead end: fill in what is missing with each
 * group's first option, or go back to building with the rail pointed at the
 * first thing that is missing.
 */
export function IncompleteProjectDialog({
  copy,
  locale,
  missing,
  onFillIn,
  onKeepBuilding,
}: {
  copy: UiCopy;
  locale: AppLocale;
  /** Empty when the project can run; the dialog is closed in that case. */
  missing: readonly MissingRequirement[];
  onFillIn: () => void;
  onKeepBuilding: () => void;
}) {
  const names = missing.map((item) => {
    const group = presetGroups.find((entry) => entry.id === item.groupId);
    return translatePresetGroupName(item.groupId, group?.label ?? item.groupId, locale);
  });
  // Joined with the locale's own separator: an English comma reads wrong in the
  // middle of a Chinese sentence.
  const separator = locale === "en" ? ", " : "、";

  return (
    <Dialog open={missing.length > 0} onOpenChange={(open) => (open ? undefined : onKeepBuilding())}>
      <DialogContent
        title={copy.shell.editor.incompleteTitle}
        description={copy.shell.editor.incompleteBody.replace("{missing}", names.join(separator))}
        width={420}
      >
        <div className="incomplete-dialog-actions">
          <button type="button" className="secondary-button" onClick={onKeepBuilding}>
            {copy.shell.editor.incompleteKeepBuilding}
          </button>
          <button type="button" className="primary-button" onClick={onFillIn}>
            {copy.shell.editor.incompleteFillIn}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

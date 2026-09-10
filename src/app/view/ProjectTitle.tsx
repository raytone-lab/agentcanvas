import { useEffect, useRef, useState } from "react";

/**
 * The project name: a label that turns into a field when clicked.
 *
 * Bound to `project.name`, which the export already uses for the generated
 * package and README — so renaming here is renaming the thing, not relabelling
 * the panel. Blank shows the localised placeholder rather than an empty row.
 *
 * Escape restores the name it had on entry; Enter and blur commit. The draft is
 * local state so a half-typed name never reaches the project — the canvas and
 * the export read `project.name`, and streaming every keystroke into it would
 * put "Coding Ag" in a package name.
 */
export function ProjectTitle({
  name,
  placeholder,
  onRename,
}: {
  name: string;
  placeholder: string;
  onRename: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    // Selected on entry, as in the reference: the common case is replacing the
    // name, not appending to it.
    input.select();
  }, [editing]);

  if (!editing) {
    return (
      <button
        type="button"
        className="layers-panel-title"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
      >
        {name.trim().length > 0 ? name : placeholder}
      </button>
    );
  }

  const commit = () => {
    onRename(draft.trim());
    setEditing(false);
  };

  return (
    <input
      ref={inputRef}
      className="layers-panel-title-input"
      value={draft}
      placeholder={placeholder}
      aria-label={placeholder}
      onChange={(event) => setDraft(event.currentTarget.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commit();
          return;
        }
        if (event.key === "Escape") {
          setDraft(name);
          setEditing(false);
        }
      }}
    />
  );
}

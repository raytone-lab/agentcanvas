import { useRef, useState } from "react";
import type { AgentUXEvent } from "@agent-ux/protocol";

import { importHarnessJsonl } from "../harness/adapters/jsonlImport";
import type { HarnessId } from "../harness/adapters/registry";
import type { AppLocale } from "../i18n/locales";

const en = {
  title: "Import harness output",
  drop: "Drop a .jsonl / .log here, or click to choose",
  hint: "Reads the JSON lines a CLI printed and translates them with the current harness's mapping table.",
  imported: "Imported {file} — {count} events ({harness})",
};

type HarnessImportCopy = Record<keyof typeof en, string>;

const zh: HarnessImportCopy = {
  title: "导入 harness 输出",
  drop: "把 .jsonl / .log 拖到这里，或点击选择",
  hint: "读取 CLI 打到 stdout 的 JSON 行，按项目当前 harness 的映射表翻译成标准事件。",
  imported: "已导入 {file} — {count} 个事件（{harness}）",
};

/** PENDING NATIVE REVIEW — see the note in src/i18n/copy/shell.ts for the conventions used. */
const ja: HarnessImportCopy = {
  title: "harness の出力を取り込む",
  drop: ".jsonl / .log をここにドロップ、またはクリックして選択",
  hint: "CLI が標準出力に書き出した JSON 行を読み取り、プロジェクトの現在の harness のマッピングテーブルで標準イベントに変換します。",
  imported: "{file} を取り込みました — {count} 件のイベント（{harness}）",
};

const copyByLocale = { en, zh, ja } satisfies Record<AppLocale, HarnessImportCopy>;

/**
 * Drop a harness capture into the editor.
 *
 * A harness (Claude Code, Codex, opencode) runs as a process outside the browser, so the
 * browser cannot start one. It can, however, read what one already printed — which is enough
 * to drive the entire chain: transport → mapping table → admission → view model → the existing
 * components. No local server, no bridge, no daemon.
 *
 * Deliberately dev-only and deliberately outside `components/agent-preview/`: this is editor
 * chrome, not part of the composed product, and nothing here may end up in an exported app.
 *
 * The failure path matters as much as the success path. A capture that maps to nothing is
 * reported with the fields it actually contained; it never becomes an empty transcript, which
 * would read as "the agent said nothing" instead of "this table does not fit this file".
 */
export function HarnessImportPanel({
  harness,
  onImported,
  locale,
}: {
  harness: HarnessId;
  onImported: (events: AgentUXEvent[]) => void;
  locale: AppLocale;
}) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const copy = copyByLocale[locale];

  async function ingest(file: File) {
    const text = await file.text();
    const result = importHarnessJsonl(text, harness);
    if (!result.ok) {
      setStatus({ tone: "error", text: result.error });
      return;
    }
    onImported(result.events);
    setStatus({
      tone: "ok",
      text: [
        copy.imported
          .replace("{file}", file.name)
          .replace("{count}", String(result.events.length))
          .replace("{harness}", harness),
        "",
        result.report,
      ].join("\n"),
    });
  }

  return (
    <section
      className="harness-import"
      data-dragging={dragging || undefined}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) void ingest(file);
      }}
    >
      <header className="harness-import-head">
        <span>{copy.title}</span>
        <code>{harness}</code>
      </header>

      <button type="button" className="harness-import-drop" onClick={() => inputRef.current?.click()}>
        {copy.drop}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".jsonl,.json,.log,.txt"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          // Reset so re-picking the same file fires change again.
          event.currentTarget.value = "";
          if (file) void ingest(file);
        }}
      />

      {status ? (
        <pre className="harness-import-status" data-tone={status.tone}>
          {status.text}
        </pre>
      ) : (
        <p className="harness-import-hint">
          {copy.hint}
        </p>
      )}
    </section>
  );
}

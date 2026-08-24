import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

/**
 * The install commands as numbered steps in one bordered row, with a copy button.
 *
 * Replaces the dark terminal block that used to sit under the lede. Two commands in sequence is
 * an ordered pair, not a shell transcript, and numbering them says "two steps, in this order"
 * where `$` prompts only said "this is a terminal". Copying still yields both lines joined by a
 * newline, which is what a shell wants pasted.
 *
 * Falls back to leaving the text on screen and selectable when the clipboard is unavailable
 * (insecure origin, denied permission) — nothing here depends on the copy succeeding.
 */
export function RunSteps({
  steps,
  copyLabel,
  copiedLabel,
}: {
  steps: readonly string[];
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(steps.join("\n"));
      setCopied(true);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked; the commands stay readable and selectable.
    }
  };

  return (
    <div className="lp-runsteps">
      <ol>
        {steps.map((step, index) => (
          <li key={step}>
            <span className="lp-runsteps-index">{String(index + 1).padStart(2, "0")}</span>
            <code>{step}</code>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={copy}
        data-copied={copied ? "true" : undefined}
        aria-label={copied ? copiedLabel : copyLabel}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}

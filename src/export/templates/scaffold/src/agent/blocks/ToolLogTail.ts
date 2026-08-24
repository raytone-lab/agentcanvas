export function tailToolLog(log: string, lineCount = 3): string {
  const lines = log.split(/\r?\n/);
  return lines.length > lineCount ? lines.slice(-lineCount).join("\n") : log;
}

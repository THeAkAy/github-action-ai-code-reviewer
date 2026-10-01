const HUNK_HEADER = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parseHunkHeader(line: string): number | null {
  const match = line.match(HUNK_HEADER);
  if (match === null) {
    return null;
  }

  const newStart = match[1];
  if (newStart === undefined) {
    return null;
  }

  return Number(newStart);
}

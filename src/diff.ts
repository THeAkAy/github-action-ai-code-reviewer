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

const NUMBER_WIDTH = 5;

export function numberDiffLines(diff: string): string {
  const output: string[] = [];
  let lineNumber: number | null = null;
  for (const line of diff.split("\n")) {

    if (line.startsWith("diff --git ")) {
      lineNumber = null;
    }
    const hunkStart = parseHunkHeader(line);
    if (hunkStart !== null) {
      lineNumber = hunkStart;
      output.push(" ".repeat(NUMBER_WIDTH) + " " + line);
      continue;
    }

    if (lineNumber !== null && (line.startsWith(" ") || line.startsWith("+"))) {
      output.push(String(lineNumber).padStart(NUMBER_WIDTH) + " " + line);
      lineNumber = lineNumber + 1;
      continue;
    }
    output.push(" ".repeat(NUMBER_WIDTH) + " " + line);
  }
  return output.join("\n");
}
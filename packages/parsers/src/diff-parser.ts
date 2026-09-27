import type { ChangedArtifact } from '@changeproof/domain';

// ---------------------------------------------------------------------------
// Unified diff parser
// ---------------------------------------------------------------------------

interface Hunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: string[];
}

const DIFF_HEADER_PATTERN = /^diff --git a\/(.+) b\/(.+)$/;
const HUNK_HEADER_PATTERN = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const NEW_FILE_PATTERN = /^new file mode/;
const DELETED_FILE_PATTERN = /^deleted file mode/;
const RENAME_PATTERN = /^similarity index/;

// Patterns for symbol detection in TypeScript/JavaScript
const EXPORT_PATTERN = /^[+-].*\bexport\b.*(function|class|const|interface|type|enum)\s+(\w+)/;
const FUNCTION_PATTERN = /^[+-].*(?:export\s+)?(?:async\s+)?function\s+(\w+)/;
const CLASS_PATTERN = /^[+-].*(?:export\s+)?class\s+(\w+)/;
const CONST_EXPORT_PATTERN = /^[+-].*export\s+const\s+(\w+)/;

function extractSymbolsFromHunkLines(lines: string[]): string[] {
  const symbols = new Set<string>();

  for (const line of lines) {
    if (!line.startsWith('+') && !line.startsWith('-')) continue;

    let match = EXPORT_PATTERN.exec(line);
    if (match?.[2]) symbols.add(match[2]);

    match = FUNCTION_PATTERN.exec(line);
    if (match?.[1]) symbols.add(match[1]);

    match = CLASS_PATTERN.exec(line);
    if (match?.[1]) symbols.add(match[1]);

    match = CONST_EXPORT_PATTERN.exec(line);
    if (match?.[1]) symbols.add(match[1]);
  }

  return [...symbols].sort();
}

function isPublicApiFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('export') ||
    lower.includes('public') ||
    lower.includes('api') ||
    lower.includes('handler') ||
    lower.includes('route') ||
    lower.includes('controller') ||
    lower.includes('service') ||
    lower.endsWith('index.ts') ||
    lower.endsWith('index.js')
  );
}

function isConfigFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return (
    lower.includes('config') ||
    lower.includes('.env') ||
    lower.endsWith('.json') ||
    lower.endsWith('.yaml') ||
    lower.endsWith('.yml') ||
    lower.endsWith('.toml')
  );
}

function isSchemaFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.includes('schema') || lower.includes('types') || lower.includes('model');
}

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes('.test.') ||
    filePath.includes('.spec.') ||
    filePath.includes('/tests/') ||
    filePath.includes('/test/')
  );
}

function isDocumentationFile(filePath: string): boolean {
  const lower = filePath.toLowerCase();
  return lower.endsWith('.md') || lower.includes('/docs/');
}

/** Parse a unified diff and return ChangedArtifact objects */
export function parseDiff(diffContent: string, diffPath: string = 'change.patch'): ParsedDiff {
  const lines = diffContent.split('\n');
  const artifacts: Partial<ChangedArtifact>[] = [];
  let current: Partial<ChangedArtifact> | null = null;
  let currentHunk: Hunk | null = null;
  let addedLines = 0;
  let deletedLines = 0;
  let artifactIndex = 0;

  function flushHunk(): void {
    if (currentHunk && current) {
      if (!current.hunks) current.hunks = [];
      current.hunks.push(currentHunk);
      currentHunk = null;
    }
  }

  function flushCurrent(): void {
    flushHunk();
    if (!current) return;

    const allHunkLines = (current.hunks ?? []).flatMap((h) => h.lines);
    const symbols = extractSymbolsFromHunkLines(allHunkLines);

    current.symbols = symbols;
    current.addedLines = addedLines;
    current.deletedLines = deletedLines;
    current.isPublicApi = isPublicApiFile(current.filePath ?? '');
    current.isConfig = isConfigFile(current.filePath ?? '');
    current.isSchema = isSchemaFile(current.filePath ?? '');
    current.isTest = isTestFile(current.filePath ?? '');
    current.isDocumentation = isDocumentationFile(current.filePath ?? '');

    artifacts.push(current);
    addedLines = 0;
    deletedLines = 0;
  }

  for (const line of lines) {
    const headerMatch = DIFF_HEADER_PATTERN.exec(line);
    if (headerMatch) {
      flushCurrent();
      const filePath = (headerMatch[2] ?? headerMatch[1] ?? '').replace(/^[ab]\//, '');
      artifactIndex++;
      current = {
        id: `artifact-${artifactIndex}`,
        filePath,
        changeType: 'modified',
        hunks: [],
      };
      continue;
    }

    if (!current) continue;

    if (NEW_FILE_PATTERN.test(line)) {
      current.changeType = 'added';
      continue;
    }
    if (DELETED_FILE_PATTERN.test(line)) {
      current.changeType = 'deleted';
      continue;
    }
    if (RENAME_PATTERN.test(line)) {
      current.changeType = 'renamed';
      continue;
    }

    const hunkMatch = HUNK_HEADER_PATTERN.exec(line);
    if (hunkMatch) {
      flushHunk();
      currentHunk = {
        oldStart: parseInt(hunkMatch[1] ?? '0', 10),
        oldCount: parseInt(hunkMatch[2] ?? '1', 10),
        newStart: parseInt(hunkMatch[3] ?? '0', 10),
        newCount: parseInt(hunkMatch[4] ?? '1', 10),
        lines: [],
      };
      continue;
    }

    if (currentHunk) {
      currentHunk.lines.push(line);
      if (line.startsWith('+') && !line.startsWith('+++')) addedLines++;
      if (line.startsWith('-') && !line.startsWith('---')) deletedLines++;
    }
  }

  flushCurrent();

  return {
    artifacts: artifacts as ChangedArtifact[],
    sourcePath: diffPath,
  };
}

export interface ParsedDiff {
  artifacts: ChangedArtifact[];
  sourcePath: string;
}

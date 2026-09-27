import type { TestArtifact } from '@changeproof/domain';
import { extractRequirementIds } from './requirements-parser.js';

// ---------------------------------------------------------------------------
// Test file parser
// ---------------------------------------------------------------------------

// Matches: describe('name', ...) or describe("name", ...)
const DESCRIBE_PATTERN = /\bdescribe\s*\(\s*['"`](.+?)['"`]/g;
// Matches: it('name', ...) or test('name', ...) or it.each...
const IT_PATTERN = /\b(?:it|test)\s*\(\s*['"`](.+?)['"`]/g;
// Matches: import { Foo } from '...' or import Foo from '...'
const IMPORT_SYMBOL_PATTERN = /import\s+(?:type\s+)?\{([^}]+)\}|import\s+(\w+)\s+from/g;

export interface ParsedTestFile {
  filePath: string;
  tests: TestArtifact[];
}

/**
 * Parse a test file (TypeScript/JavaScript test using Vitest/Jest patterns).
 * Conservative: extracts describe/it/test names, imports, and req ID references.
 */
export function parseTestFile(content: string, filePath: string): ParsedTestFile {
  const reqIds = extractRequirementIds(content);
  const tests: TestArtifact[] = [];
  const importedSymbols = extractImportedSymbols(content);

  // Extract describe blocks for grouping
  const describeNames: string[] = [];
  for (const match of content.matchAll(DESCRIBE_PATTERN)) {
    if (match[1]) describeNames.push(match[1]);
  }

  // Extract it/test names and create TestArtifact for each
  let testIndex = 0;
  for (const match of content.matchAll(IT_PATTERN)) {
    testIndex++;
    const testName = match[1] ?? `test-${testIndex}`;
    const fullName = describeNames.length > 0 ? `${describeNames[0]} > ${testName}` : testName;

    // Extract req IDs mentioned near this test
    const testReqIds = extractRequirementIds(testName);

    tests.push({
      id: `test-${filePath}-${testIndex}`,
      filePath,
      testName: fullName,
      referencedSymbols: importedSymbols,
      referencedRequirementIds: [...new Set([...reqIds, ...testReqIds])].sort(),
    });
  }

  // If no it/test blocks found but file looks like a test, add a file-level entry
  if (tests.length === 0 && isTestFile(filePath)) {
    tests.push({
      id: `test-${filePath}-file`,
      filePath,
      testName: describeNames[0] ?? filePath,
      referencedSymbols: importedSymbols,
      referencedRequirementIds: reqIds,
    });
  }

  return { filePath, tests };
}

function extractImportedSymbols(content: string): string[] {
  const symbols = new Set<string>();

  for (const match of content.matchAll(IMPORT_SYMBOL_PATTERN)) {
    if (match[1]) {
      // Named imports: { Foo, Bar }
      for (const sym of match[1].split(',')) {
        const cleaned = sym.trim().replace(/\s+as\s+\w+/, '');
        if (cleaned) symbols.add(cleaned);
      }
    }
    if (match[2]) {
      // Default import
      symbols.add(match[2]);
    }
  }

  return [...symbols].sort();
}

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes('.test.') ||
    filePath.includes('.spec.') ||
    filePath.includes('/tests/') ||
    filePath.includes('/test/')
  );
}

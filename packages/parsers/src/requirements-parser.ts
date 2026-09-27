import type { Requirement, AcceptanceCriterion } from '@changeproof/domain';

// ---------------------------------------------------------------------------
// Requirements Markdown parser
// ---------------------------------------------------------------------------

// Matches REQ-NNN style IDs (case-insensitive scan)
const REQ_ID_PATTERN = /\bREQ-\d+\b/g;
// Matches acceptance criterion lines: - AC-NNN-N: text
const AC_LINE_PATTERN = /^\s*-\s*(AC-[\d]+-[\d]+):\s*(.+)$/;
// Matches a heading with a requirement ID: ## REQ-001 — Title
const REQ_HEADING_PATTERN = /^#{1,3}\s+(REQ-\d+)\s*[—–-]+?\s*(.+)$/;
// Alternative: ## REQ-001 Title (no separator)
const REQ_HEADING_ALT_PATTERN = /^#{1,3}\s+(REQ-\d+)\s+(.+)$/;

export interface ParsedRequirement extends Requirement {
  // Additional parser-level fields
  rawText: string;
}

/**
 * Parse a requirements Markdown file into structured Requirement objects.
 * Conservative: extracts only what can be reliably identified.
 */
export function parseRequirementsMarkdown(
  content: string,
  filePath: string = 'requirements.md',
): ParsedRequirement[] {
  const lines = content.split('\n');
  const requirements: ParsedRequirement[] = [];
  let currentReq: Partial<ParsedRequirement> | null = null;
  let currentBody: string[] = [];
  let currentACs: AcceptanceCriterion[] = [];
  let lineNumber = 0;

  function flushCurrent(): void {
    if (!currentReq?.id) return;

    const body = currentBody.join('\n').trim();
    const req: ParsedRequirement = {
      id: currentReq.id,
      title: currentReq.title ?? currentReq.id,
      body,
      acceptanceCriteria: currentACs,
      rawText: body,
      tags: [],
      sourceLocation: {
        filePath,
        startLine: currentReq.sourceLocation?.startLine,
      },
    };
    requirements.push(req);
  }

  for (const line of lines) {
    lineNumber++;

    // Check for requirement heading
    let headingMatch = REQ_HEADING_PATTERN.exec(line);
    if (!headingMatch) {
      headingMatch = REQ_HEADING_ALT_PATTERN.exec(line);
    }

    if (headingMatch) {
      // Flush previous requirement
      flushCurrent();

      const reqId = headingMatch[1] as string;
      const title = (headingMatch[2] as string).trim();

      currentReq = {
        id: reqId,
        title,
        sourceLocation: { filePath, startLine: lineNumber },
      };
      currentBody = [];
      currentACs = [];
      continue;
    }

    if (currentReq) {
      // Check for acceptance criterion line
      const acMatch = AC_LINE_PATTERN.exec(line);
      if (acMatch) {
        const acId = acMatch[1] as string;
        const acText = (acMatch[2] as string).trim();
        currentACs.push({
          id: acId,
          requirementId: currentReq.id ?? '',
          text: acText,
          sourceLocation: { filePath, startLine: lineNumber },
        });
        currentBody.push(line);
      } else {
        currentBody.push(line);
      }
    }
  }

  // Flush last requirement
  flushCurrent();

  return requirements;
}

/**
 * Extract all requirement IDs mentioned in arbitrary text.
 * Used for cross-referencing source files.
 */
export function extractRequirementIds(text: string): string[] {
  const matches = text.matchAll(REQ_ID_PATTERN);
  const ids = new Set<string>();
  for (const match of matches) {
    if (match[0]) ids.add(match[0].toUpperCase());
  }
  return [...ids].sort();
}

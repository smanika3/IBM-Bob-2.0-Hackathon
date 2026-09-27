import { extractRequirementIds } from './requirements-parser.js';

// ---------------------------------------------------------------------------
// Documentation / Architecture Markdown parser
// ---------------------------------------------------------------------------

const ROUTE_PATTERN = /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[\w/:?{}[\].-]+)/g;
const CONFIG_FIELD_PATTERN = /^[-*]\s+`?(\w[\w.[.\]-]*)`?\s*(?:\([^)]*\))?\s*[-:—]/gm;
const HEADING_PATTERN = /^#{1,4}\s+(.+)$/gm;
const API_SECTION_PATTERN = /^#{1,3}\s+(?:API|Routes?|Endpoints?|Configuration|Config|Schema)/im;

export interface ParsedDocumentation {
  filePath: string;
  routes: string[];
  configFields: string[];
  headings: string[];
  referencedRequirementIds: string[];
  hasApiSection: boolean;
  hasTaxCalculatorSection: boolean;
}

/**
 * Parse a documentation or architecture Markdown file.
 * Extracts routes, config field names, headings, and requirement references.
 */
export function parseDocumentation(content: string, filePath: string): ParsedDocumentation {
  const routes: string[] = [];
  const configFields: string[] = [];
  const headings: string[] = [];

  for (const match of content.matchAll(ROUTE_PATTERN)) {
    if (match[1]) routes.push(match[1]);
  }

  for (const match of content.matchAll(CONFIG_FIELD_PATTERN)) {
    if (match[1]) configFields.push(match[1]);
  }

  for (const match of content.matchAll(HEADING_PATTERN)) {
    if (match[1]) headings.push(match[1].trim());
  }

  const reqIds = extractRequirementIds(content);

  return {
    filePath,
    routes: [...new Set(routes)].sort(),
    configFields: [...new Set(configFields)].sort(),
    headings,
    referencedRequirementIds: reqIds,
    hasApiSection: API_SECTION_PATTERN.test(content),
    hasTaxCalculatorSection: content.includes('TaxCalculator') || content.includes('tax calculat'),
  };
}

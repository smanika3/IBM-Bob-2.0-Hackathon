import { extractRequirementIds } from './requirements-parser.js';

// ---------------------------------------------------------------------------
// TypeScript source file parser (conservative, regex-based)
// ---------------------------------------------------------------------------
// Using regex rather than ts-morph for now to avoid heavyweight dependency.
// ts-morph can be added in a future enhancement.

const EXPORT_FUNC_PATTERN = /export\s+(?:async\s+)?function\s+(\w+)/g;
const EXPORT_CLASS_PATTERN = /export\s+(?:abstract\s+)?class\s+(\w+)/g;
const EXPORT_CONST_PATTERN = /export\s+const\s+(\w+)/g;
const EXPORT_INTERFACE_PATTERN = /export\s+interface\s+(\w+)/g;
const EXPORT_TYPE_PATTERN = /export\s+type\s+(\w+)/g;
const EXPORT_ENUM_PATTERN = /export\s+enum\s+(\w+)/g;
const EXPORT_DEFAULT_PATTERN = /export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))/g;
const IMPORT_FROM_PATTERN = /import\s+(?:type\s+)?(?:\{[^}]+\}|\w+)\s+from\s+['"]([^'"]+)['"]/g;

export interface ParsedSourceFile {
  filePath: string;
  exports: string[];
  imports: string[];
  referencedRequirementIds: string[];
  hasRoutes: boolean;
  hasPublicExports: boolean;
  isConfigFile: boolean;
}

export function parseTypeScriptSource(content: string, filePath: string): ParsedSourceFile {
  const exports: string[] = [];
  const imports: string[] = [];

  // Extract exports
  for (const m of content.matchAll(EXPORT_FUNC_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_CLASS_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_CONST_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_INTERFACE_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_TYPE_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_ENUM_PATTERN)) {
    if (m[1]) exports.push(m[1]);
  }
  for (const m of content.matchAll(EXPORT_DEFAULT_PATTERN)) {
    const sym = m[1] ?? m[2] ?? m[3];
    if (sym) exports.push(sym);
  }

  // Extract imports
  for (const m of content.matchAll(IMPORT_FROM_PATTERN)) {
    if (m[1]) imports.push(m[1]);
  }

  const reqIds = extractRequirementIds(content);

  const hasRoutes =
    content.includes('.get(') ||
    content.includes('.post(') ||
    content.includes('.put(') ||
    content.includes('.delete(') ||
    content.includes('.patch(') ||
    content.includes('Router') ||
    content.includes('app.register');

  const isConfig =
    filePath.toLowerCase().includes('config') ||
    filePath.toLowerCase().includes('.config.') ||
    filePath.endsWith('.json') ||
    filePath.endsWith('.yaml') ||
    filePath.endsWith('.yml');

  return {
    filePath,
    exports: [...new Set(exports)].sort(),
    imports: [...new Set(imports)].sort(),
    referencedRequirementIds: reqIds,
    hasRoutes,
    hasPublicExports: exports.length > 0,
    isConfigFile: isConfig,
  };
}

/** Extract keywords from text for matching (normalized, deduped) */
export function extractKeywords(text: string): string[] {
  // Split camelCase and extract words >= 3 chars
  const camelSplit = text.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  const words = camelSplit
    .split(/[\s_\-.,;:'"()[\]{}|<>!?@#$%^&*+=~`\\]+/)
    .filter((w) => w.length >= 3)
    .filter((w) => !STOP_WORDS.has(w));
  return [...new Set(words)].sort();
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'are',
  'but',
  'not',
  'you',
  'all',
  'can',
  'her',
  'was',
  'one',
  'our',
  'out',
  'day',
  'get',
  'has',
  'him',
  'his',
  'how',
  'man',
  'new',
  'now',
  'old',
  'see',
  'two',
  'way',
  'who',
  'boy',
  'did',
  'its',
  'let',
  'put',
  'say',
  'she',
  'too',
  'use',
  'via',
  'from',
  'that',
  'this',
  'with',
  'will',
  'then',
  'than',
  'when',
  'each',
  'just',
  'more',
  'must',
  'over',
  'such',
  'very',
  'well',
  'only',
  'into',
  'also',
  'like',
  'what',
  'have',
  'been',
  'were',
  'they',
  'them',
  'some',
  'time',
  'made',
  'long',
  'down',
  'here',
  'take',
  'know',
  'even',
  'back',
  'give',
  'most',
  'does',
  'else',
  'both',
  'last',
  'make',
  'many',
  'same',
  'tell',
  'type',
  'should',
  'could',
  'would',
  'there',
  'which',
  'after',
  'other',
  'these',
  'those',
  'where',
  'while',
  'again',
  'about',
  'above',
  'below',
  'being',
  'every',
  'first',
  'great',
  'never',
  'still',
  'under',
  'until',
  'using',
  'value',
]);

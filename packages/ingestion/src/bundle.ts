import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileEntry {
  /** POSIX-style relative path */
  path: string;
  content: string;
}

export interface ChangeBundle {
  id: string;
  name: string;
  files: FileEntry[];
  /** SHA-256 fingerprint of sorted file paths + contents */
  fingerprint: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_FILE_COUNT = 500;
const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB per file
const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB total

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.pnpm',
  'dist',
  'build',
  'coverage',
  '.cache',
  '.temp',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.md',
  '.json',
  '.yaml',
  '.yml',
  '.txt',
  '.patch',
  '.diff',
  '.toml',
  '.env.example',
]);

const BLOCKED_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'id_rsa',
  'id_ed25519',
  'private.key',
]);

// ---------------------------------------------------------------------------
// Path safety
// ---------------------------------------------------------------------------

/** Normalize to POSIX-style relative path and reject traversal attempts */
export function normalizePath(rawPath: string, basePath: string): string {
  // Resolve relative to base to detect traversal
  const resolved = path.resolve(basePath, rawPath);
  const base = path.resolve(basePath);

  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    throw new Error(`Path traversal rejected: ${rawPath}`);
  }

  // Return relative portion, POSIX-style
  return path.relative(base, resolved).split(path.sep).join('/');
}

export function isPathSafe(filePath: string): boolean {
  // Reject absolute paths
  if (path.isAbsolute(filePath)) return false;
  // Reject traversal sequences
  if (filePath.includes('..')) return false;
  // Reject null bytes
  if (filePath.includes('\0')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Content fingerprint
// ---------------------------------------------------------------------------

export function computeFingerprint(files: FileEntry[]): string {
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));
  const hash = crypto.createHash('sha256');
  for (const f of sorted) {
    hash.update(`${f.path}:${f.content.length}:`);
    hash.update(f.content);
  }
  return hash.digest('hex');
}

// ---------------------------------------------------------------------------
// Local filesystem adapter
// ---------------------------------------------------------------------------

function shouldIgnoreDir(dirName: string): boolean {
  return IGNORED_DIRS.has(dirName);
}

function isAllowedFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  if (BLOCKED_FILENAMES.has(basename)) return false;

  const ext = path.extname(filePath).toLowerCase();
  if (!ext && ALLOWED_EXTENSIONS.has('.patch') && basename.endsWith('.patch')) return true;

  return ALLOWED_EXTENSIONS.has(ext);
}

function collectFiles(
  dirPath: string,
  basePath: string,
  result: FileEntry[],
  totalSize: { value: number },
): void {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldIgnoreDir(entry.name)) continue;
      collectFiles(path.join(dirPath, entry.name), basePath, result, totalSize);
    } else if (entry.isFile()) {
      const fullPath = path.join(dirPath, entry.name);
      if (!isAllowedFile(fullPath)) continue;

      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.size > MAX_FILE_SIZE_BYTES) continue;
      if (result.length >= MAX_FILE_COUNT) continue;

      totalSize.value += stat.size;
      if (totalSize.value > MAX_TOTAL_SIZE_BYTES) continue;

      let content: string;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch {
        continue;
      }

      const relativePath = normalizePath(fullPath, basePath);
      result.push({ path: relativePath, content });
    }
  }
}

/** Load a change bundle from a local directory (safe, no code execution) */
export function loadBundleFromDirectory(
  dirPath: string,
  bundleId: string,
  name: string,
): ChangeBundle {
  const resolvedDir = path.resolve(dirPath);

  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Bundle directory not found: ${dirPath}`);
  }

  const stat = fs.statSync(resolvedDir);
  if (!stat.isDirectory()) {
    throw new Error(`Bundle path is not a directory: ${dirPath}`);
  }

  const files: FileEntry[] = [];
  const totalSize = { value: 0 };
  collectFiles(resolvedDir, resolvedDir, files, totalSize);

  const fingerprint = computeFingerprint(files);

  return { id: bundleId, name, files, fingerprint };
}

/** Build a bundle from an in-memory file map (API / browser demo use) */
export function buildBundleFromMap(
  fileMap: Record<string, string>,
  bundleId: string,
  name: string,
): ChangeBundle {
  const files: FileEntry[] = [];

  for (const [rawPath, content] of Object.entries(fileMap)) {
    if (!isPathSafe(rawPath)) {
      throw new Error(`Unsafe path rejected: ${rawPath}`);
    }
    if (content.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File too large: ${rawPath}`);
    }
    files.push({ path: rawPath, content });

    if (files.length > MAX_FILE_COUNT) {
      throw new Error(`Bundle exceeds maximum file count of ${MAX_FILE_COUNT}`);
    }
  }

  const fingerprint = computeFingerprint(files);
  return { id: bundleId, name, files, fingerprint };
}

import { describe, it, expect } from 'vitest';
import {
  normalizePath,
  isPathSafe,
  computeFingerprint,
  buildBundleFromMap,
  loadBundleFromDirectory,
} from '../bundle.js';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

describe('isPathSafe', () => {
  it('accepts safe relative paths', () => {
    expect(isPathSafe('src/orders/order.service.ts')).toBe(true);
    expect(isPathSafe('requirements.md')).toBe(true);
    expect(isPathSafe('docs/api.md')).toBe(true);
  });

  it('rejects absolute paths', () => {
    expect(isPathSafe('/etc/passwd')).toBe(false);
    expect(isPathSafe('/Users/user/secrets')).toBe(false);
  });

  it('rejects traversal sequences', () => {
    expect(isPathSafe('../../../etc/passwd')).toBe(false);
    expect(isPathSafe('src/../../../etc/passwd')).toBe(false);
  });

  it('rejects null bytes', () => {
    expect(isPathSafe('src/file\0name.ts')).toBe(false);
  });
});

describe('normalizePath', () => {
  it('rejects path traversal', () => {
    const tmpDir = os.tmpdir();
    expect(() => normalizePath('../../../etc/passwd', tmpDir)).toThrow('Path traversal rejected');
  });

  it('returns POSIX-style relative path', () => {
    const tmpDir = os.tmpdir();
    const result = normalizePath(path.join(tmpDir, 'src/orders/order.ts'), tmpDir);
    expect(result).not.toContain(path.sep === '\\' ? '\\' : '\0');
  });
});

describe('computeFingerprint', () => {
  it('produces a 64-char hex fingerprint', () => {
    const fp = computeFingerprint([
      { path: 'a.ts', content: 'const a = 1;' },
      { path: 'b.ts', content: 'const b = 2;' },
    ]);
    expect(fp).toHaveLength(64);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('produces the same fingerprint regardless of file order', () => {
    const fp1 = computeFingerprint([
      { path: 'a.ts', content: 'x' },
      { path: 'b.ts', content: 'y' },
    ]);
    const fp2 = computeFingerprint([
      { path: 'b.ts', content: 'y' },
      { path: 'a.ts', content: 'x' },
    ]);
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different content', () => {
    const fp1 = computeFingerprint([{ path: 'a.ts', content: 'v1' }]);
    const fp2 = computeFingerprint([{ path: 'a.ts', content: 'v2' }]);
    expect(fp1).not.toBe(fp2);
  });
});

describe('buildBundleFromMap', () => {
  it('builds a valid bundle from a file map', () => {
    const bundle = buildBundleFromMap(
      { 'src/orders/service.ts': 'export function foo() {}', 'requirements.md': '# REQ-001' },
      'test-bundle',
      'Test Bundle',
    );
    expect(bundle.id).toBe('test-bundle');
    expect(bundle.files).toHaveLength(2);
    expect(bundle.fingerprint).toHaveLength(64);
  });

  it('rejects path traversal in file map', () => {
    expect(() => buildBundleFromMap({ '../../../etc/passwd': 'content' }, 'b', 'b')).toThrow(
      'Unsafe path rejected',
    );
  });

  it('rejects absolute paths in file map', () => {
    expect(() => buildBundleFromMap({ '/etc/passwd': 'content' }, 'b', 'b')).toThrow(
      'Unsafe path rejected',
    );
  });

  it('produces a stable fingerprint on repeated calls', () => {
    const map = { 'a.ts': 'content-a', 'b.ts': 'content-b' };
    const b1 = buildBundleFromMap(map, 'b', 'b');
    const b2 = buildBundleFromMap(map, 'b', 'b');
    expect(b1.fingerprint).toBe(b2.fingerprint);
  });
});

describe('loadBundleFromDirectory (filesystem)', () => {
  it('loads the sample fixture directory', () => {
    // Locate the sample fixture relative to this test
    const fixtureDir = new URL('../../../../fixtures/sample-checkout', import.meta.url).pathname;
    if (!fs.existsSync(fixtureDir)) {
      // Skip if fixture not present (CI environments without full repo)
      return;
    }
    const bundle = loadBundleFromDirectory(fixtureDir, 'sample', 'Sample Checkout');
    expect(bundle.files.length).toBeGreaterThan(5);
    expect(bundle.fingerprint).toHaveLength(64);
    // Deterministic: same fingerprint on second load
    const bundle2 = loadBundleFromDirectory(fixtureDir, 'sample', 'Sample Checkout');
    expect(bundle.fingerprint).toBe(bundle2.fingerprint);
  });
});

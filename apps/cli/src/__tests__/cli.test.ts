import { describe, it, expect, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../../dist/cli.js');
let testDbPath: string | null = null;

afterEach(() => {
  if (testDbPath) {
    try {
      fs.unlinkSync(testDbPath);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(testDbPath + '-shm');
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(testDbPath + '-wal');
    } catch {
      /* ignore */
    }
    testDbPath = null;
  }
});

describe('CLI acceptance tests', () => {
  it('displays help when invoked with --help', () => {
    const output = execSync(`node "${CLI_PATH}" --help`, { encoding: 'utf8' });
    expect(output).toContain('ChangeProof v0.1.0');
    expect(output).toContain('analyze');
    expect(output).toContain('export');
  });

  it('displays version when invoked with --version', () => {
    const output = execSync(`node "${CLI_PATH}" --version`, { encoding: 'utf8' });
    expect(output.trim()).toBe('changeproof/0.1.0');
  });

  it('runs analysis on the sample fixture and exports results', () => {
    testDbPath = path.join(os.tmpdir(), `cp-cli-test-${Date.now()}.db`);
    const env = { ...process.env, DATABASE_PATH: testDbPath };

    // Run analysis
    const analyzeOutput = execSync(`node "${CLI_PATH}" analyze --fixture sample`, {
      encoding: 'utf8',
      env,
    });
    expect(analyzeOutput).toContain('[ChangeProof] Analysis complete.');
    expect(analyzeOutput).toContain('Requirements:   5');

    // Extract run ID
    const runIdMatch = /Run ID:\s+([a-f0-9-]+)/.exec(analyzeOutput);
    expect(runIdMatch).not.toBeNull();
    const runId = runIdMatch![1];

    // Export markdown
    const mdOutput = execSync(`node "${CLI_PATH}" export --run ${runId} --format markdown`, {
      encoding: 'utf8',
      env,
    });
    expect(mdOutput).toContain('# ChangeProof Evidence Report');
    expect(mdOutput).toContain(runId);

    // Export json
    const jsonOutput = execSync(`node "${CLI_PATH}" export --run ${runId} --format json`, {
      encoding: 'utf8',
      env,
    });
    const parsed = JSON.parse(jsonOutput) as {
      schemaVersion: string;
      run: { id: string };
      findings: unknown[];
    };
    expect(parsed.schemaVersion).toBe('1.0.0');
    expect(parsed.run.id).toBe(runId);
    expect(parsed.findings.length).toBeGreaterThan(0);
  });
});

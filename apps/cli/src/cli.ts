#!/usr/bin/env node
import { analyzeBundle } from '@changeproof/analysis';
import { loadBundleFromDirectory } from '@changeproof/ingestion';
import { createStore } from '@changeproof/storage';
import { generateMarkdownReport, generateJsonReport } from '@changeproof/reporting';
import * as path from 'node:path';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = path.resolve(__dirname, '../../../fixtures');
const FIXTURE_MAP: Record<string, { dir: string; name: string }> = {
  sample: {
    dir: path.join(FIXTURES_ROOT, 'sample-checkout'),
    name: 'Sample Checkout',
  },
  auth: {
    dir: path.join(FIXTURES_ROOT, 'sample-auth'),
    name: 'Auth & Session Service',
  },
  payments: {
    dir: path.join(FIXTURES_ROOT, 'sample-payments'),
    name: 'Payment Gateway & Webhook Service',
  },
};
const DB_PATH = process.env['DATABASE_PATH'] ?? path.join(process.cwd(), 'changeproof.db');

const VERSION = '0.1.0';

const HELP = `
ChangeProof v${VERSION}
Evidence-first change-readiness workbench.

USAGE
  changeproof <command> [options]

COMMANDS
  analyze     Run analysis on a change bundle
  export      Export analysis results

analyze OPTIONS
  --fixture sample|auth|payments   Use a bundled synthetic fixture
  --path <dir>                     Use a local change-bundle directory

export OPTIONS
  --run <run-id>            ID of the analysis run to export
  --format markdown|json    Output format (default: markdown)

EXAMPLES
  changeproof analyze --fixture sample
  changeproof analyze --fixture auth
  changeproof analyze --fixture payments
  changeproof analyze --path ./my-change-bundle
  changeproof export --run abc123 --format json

No external API, tokens, or credentials are required.
`.trim();

function parseArgs(argv: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith('--') && argv[i + 1] && !argv[i + 1]?.startsWith('--')) {
      result[arg.slice(2)] = argv[i + 1] ?? '';
      i++;
    } else if (arg?.startsWith('--')) {
      result[arg.slice(2)] = 'true';
    }
  }
  return result;
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP);
    return;
  }

  if (args[0] === '--version' || args[0] === '-v') {
    console.log(`changeproof/${VERSION}`);
    return;
  }

  const command = args[0];
  const opts = parseArgs(args.slice(1));

  if (command === 'analyze') {
    runAnalyze(opts);
    return;
  }

  if (command === 'export') {
    runExport(opts);
    return;
  }

  console.error(`[ChangeProof] Unknown command: ${command}`);
  console.error('Run "changeproof --help" for usage.');
  process.exit(1);
}

function runAnalyze(opts: Record<string, string>): void {
  let bundleDir: string;
  let bundleId = 'sample';
  let bundleName = 'Sample Checkout';

  if (opts['fixture']) {
    const fixture = FIXTURE_MAP[opts['fixture']];
    if (fixture) {
      bundleDir = fixture.dir;
      bundleId = opts['fixture'];
      bundleName = fixture.name;
      console.log(`[ChangeProof] Loading bundled fixture: ${opts['fixture']} (${fixture.name})...`);
    } else {
      console.error(
        `[ChangeProof] Error: Unknown fixture "${opts['fixture']}". Supported: sample, auth, payments.`,
      );
      process.exit(1);
      return;
    }
  } else if (opts['path']) {
    bundleDir = path.resolve(opts['path']);
    bundleId = path.basename(bundleDir);
    bundleName = bundleId;
    console.log(`[ChangeProof] Loading bundle from: ${bundleDir}`);
  } else {
    console.error(
      '[ChangeProof] Error: --fixture sample|auth|payments or --path <dir> is required.',
    );
    process.exit(1);
    return;
  }

  if (!fs.existsSync(bundleDir)) {
    console.error(`[ChangeProof] Error: Bundle directory not found: ${bundleDir}`);
    process.exit(1);
    return;
  }

  const bundle = loadBundleFromDirectory(bundleDir, bundleId, bundleName);
  const runId = crypto.randomUUID();
  const result = analyzeBundle(bundle, runId, 'CLI Analysis');

  console.log(`[ChangeProof] Analysis complete.`);
  console.log(`  Run ID:         ${runId}`);
  console.log(`  Fingerprint:    ${bundle.fingerprint}`);
  console.log(`  Requirements:   ${result.summary.totalRequirements}`);
  console.log(`  Changed files:  ${result.summary.totalChangedArtifacts}`);
  console.log(`  Test artifacts: ${result.summary.totalTestArtifacts}`);
  console.log(`  Evidence links: ${result.summary.totalEvidenceLinks}`);
  console.log(`  Findings:       ${result.summary.totalFindings}`);
  console.log(`    Critical: ${result.summary.findingsBySeverity['critical'] ?? 0}`);
  console.log(`    High:     ${result.summary.findingsBySeverity['high'] ?? 0}`);
  console.log(`    Medium:   ${result.summary.findingsBySeverity['medium'] ?? 0}`);
  console.log(`    Low:      ${result.summary.findingsBySeverity['low'] ?? 0}`);
  console.log(`    Info:     ${result.summary.findingsBySeverity['informational'] ?? 0}`);

  // Persist to database
  const store = createStore(DB_PATH);
  store.runs.save(result.runMetadata);
  store.requirements.saveAll(result.requirements, runId);
  store.changedArtifacts.saveAll(result.changedArtifacts, runId);
  store.testArtifacts.saveAll(result.testArtifacts, runId);
  store.evidenceLinks.saveAll(result.evidenceLinks, runId);
  store.findings.saveAll(result.findings, runId);
  store.db.close();

  console.log(`\n[ChangeProof] Run persisted to database: ${DB_PATH}`);
  console.log(`[ChangeProof] Export: changeproof export --run ${runId} --format markdown`);
}

function runExport(opts: Record<string, string>): void {
  if (!opts['run']) {
    console.error('[ChangeProof] Error: --run <run-id> is required.');
    process.exit(1);
    return;
  }

  const store = createStore(DB_PATH);
  const run = store.runs.findById(opts['run']);

  if (!run) {
    console.error(`[ChangeProof] Error: Run not found: ${opts['run']}`);
    store.db.close();
    process.exit(1);
    return;
  }

  const result = {
    runMetadata: run,
    requirements: store.requirements.findByRunId(opts['run']),
    changedArtifacts: store.changedArtifacts.findByRunId(opts['run']),
    testArtifacts: store.testArtifacts.findByRunId(opts['run']),
    evidenceLinks: store.evidenceLinks.findByRunId(opts['run']),
    findings: store.findings.findByRunId(opts['run']),
    summary: run.summary!,
  };
  const decisions = store.decisions.findByRunId(opts['run']);
  store.db.close();

  const format = opts['format'] ?? 'markdown';

  if (format === 'json') {
    const report = generateJsonReport(result, decisions);
    console.log(JSON.stringify(report, null, 2));
  } else {
    const report = generateMarkdownReport(result, decisions);
    console.log(report);
  }
}

main();

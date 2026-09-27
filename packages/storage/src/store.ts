import Database from 'better-sqlite3';
import type {
  AnalysisRun,
  Requirement,
  ChangedArtifact,
  TestArtifact,
  EvidenceLink,
  Finding,
  ReviewDecision,
} from '@changeproof/domain';

// ---------------------------------------------------------------------------
// Database initialization
// ---------------------------------------------------------------------------

export function openDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  initializeSchema(db);
  return db;
}

function initializeSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_runs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL,
      content_fingerprint TEXT NOT NULL,
      bundle_id TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      summary_json TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT NOT NULL,
      run_id TEXT NOT NULL REFERENCES analysis_runs(id),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      acceptance_criteria_json TEXT NOT NULL DEFAULT '[]',
      source_location_json TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]',
      PRIMARY KEY (id, run_id)
    );

    CREATE TABLE IF NOT EXISTS changed_artifacts (
      id TEXT NOT NULL,
      run_id TEXT NOT NULL REFERENCES analysis_runs(id),
      file_path TEXT NOT NULL,
      change_type TEXT NOT NULL,
      symbols_json TEXT NOT NULL DEFAULT '[]',
      added_lines INTEGER NOT NULL DEFAULT 0,
      deleted_lines INTEGER NOT NULL DEFAULT 0,
      hunks_json TEXT NOT NULL DEFAULT '[]',
      is_public_api INTEGER NOT NULL DEFAULT 0,
      is_config INTEGER NOT NULL DEFAULT 0,
      is_schema INTEGER NOT NULL DEFAULT 0,
      is_test INTEGER NOT NULL DEFAULT 0,
      is_documentation INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (id, run_id)
    );

    CREATE TABLE IF NOT EXISTS test_artifacts (
      id TEXT NOT NULL,
      run_id TEXT NOT NULL REFERENCES analysis_runs(id),
      file_path TEXT NOT NULL,
      test_name TEXT NOT NULL,
      referenced_symbols_json TEXT NOT NULL DEFAULT '[]',
      referenced_req_ids_json TEXT NOT NULL DEFAULT '[]',
      source_location_json TEXT,
      PRIMARY KEY (id, run_id)
    );

    CREATE TABLE IF NOT EXISTS evidence_links (
      id TEXT NOT NULL,
      run_id TEXT NOT NULL REFERENCES analysis_runs(id),
      from_type TEXT NOT NULL,
      from_id TEXT NOT NULL,
      to_type TEXT NOT NULL,
      to_id TEXT NOT NULL,
      method TEXT NOT NULL,
      strength TEXT NOT NULL,
      explanation TEXT NOT NULL,
      source_location_json TEXT,
      PRIMARY KEY (id, run_id)
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT NOT NULL,
      run_id TEXT NOT NULL REFERENCES analysis_runs(id),
      rule_id TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      explanation TEXT NOT NULL,
      requirement_ids_json TEXT NOT NULL DEFAULT '[]',
      changed_artifact_ids_json TEXT NOT NULL DEFAULT '[]',
      test_artifact_ids_json TEXT NOT NULL DEFAULT '[]',
      evidence_link_ids_json TEXT NOT NULL DEFAULT '[]',
      match_strength TEXT NOT NULL,
      recommended_action TEXT NOT NULL,
      PRIMARY KEY (id, run_id)
    );

    CREATE TABLE IF NOT EXISTS review_decisions (
      id TEXT PRIMARY KEY,
      finding_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      rationale TEXT,
      decided_by TEXT,
      decided_at TEXT NOT NULL
    );
  `);
}

// ---------------------------------------------------------------------------
// Run repository
// ---------------------------------------------------------------------------

export class RunRepository {
  constructor(private readonly db: Database.Database) {}

  save(run: AnalysisRun): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO analysis_runs
        (id, name, status, content_fingerprint, bundle_id, created_at, completed_at, summary_json, error_message)
      VALUES
        (@id, @name, @status, @contentFingerprint, @bundleId, @createdAt, @completedAt, @summaryJson, @errorMessage)
    `);
    stmt.run({
      id: run.id,
      name: run.name,
      status: run.status,
      contentFingerprint: run.contentFingerprint,
      bundleId: run.bundleId ?? null,
      createdAt: run.createdAt,
      completedAt: run.completedAt ?? null,
      summaryJson: run.summary ? JSON.stringify(run.summary) : null,
      errorMessage: run.errorMessage ?? null,
    });
  }

  findById(id: string): AnalysisRun | null {
    const row = this.db.prepare('SELECT * FROM analysis_runs WHERE id = ?').get(id) as
      Record<string, unknown> | undefined;
    if (!row) return null;
    return this.rowToRun(row);
  }

  findAll(): AnalysisRun[] {
    const rows = this.db
      .prepare('SELECT * FROM analysis_runs ORDER BY created_at DESC')
      .all() as Record<string, unknown>[];
    return rows.map((r) => this.rowToRun(r));
  }

  private rowToRun(row: Record<string, unknown>): AnalysisRun {
    const bundleId = row['bundle_id'];
    const completedAt = row['completed_at'];
    const summaryJson = row['summary_json'];
    const errorMessage = row['error_message'];
    return {
      id: String(row['id']),
      name: String(row['name']),
      status: row['status'] as AnalysisRun['status'],
      contentFingerprint: String(row['content_fingerprint']),
      bundleId: typeof bundleId === 'string' ? bundleId : undefined,
      createdAt: String(row['created_at']),
      completedAt: typeof completedAt === 'string' ? completedAt : undefined,
      summary:
        typeof summaryJson === 'string'
          ? (JSON.parse(summaryJson) as AnalysisRun['summary'])
          : undefined,
      errorMessage: typeof errorMessage === 'string' ? errorMessage : undefined,
    };
  }
}

// ---------------------------------------------------------------------------
// Requirements repository
// ---------------------------------------------------------------------------

export class RequirementsRepository {
  constructor(private readonly db: Database.Database) {}

  saveAll(requirements: Requirement[], runId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO requirements
        (id, run_id, title, body, acceptance_criteria_json, source_location_json, tags_json)
      VALUES (@id, @runId, @title, @body, @acJson, @sourceJson, @tagsJson)
    `);
    const tx = this.db.transaction((reqs: Requirement[]) => {
      for (const r of reqs) {
        stmt.run({
          id: r.id,
          runId,
          title: r.title,
          body: r.body,
          acJson: JSON.stringify(r.acceptanceCriteria),
          sourceJson: r.sourceLocation ? JSON.stringify(r.sourceLocation) : null,
          tagsJson: JSON.stringify(r.tags),
        });
      }
    });
    tx(requirements);
  }

  findByRunId(runId: string): Requirement[] {
    const rows = this.db
      .prepare('SELECT * FROM requirements WHERE run_id = ? ORDER BY id')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => {
      const srcJson = r['source_location_json'];
      return {
        id: String(r['id']),
        title: String(r['title']),
        body: String(r['body']),
        acceptanceCriteria: JSON.parse(
          String(r['acceptance_criteria_json']),
        ) as Requirement['acceptanceCriteria'],
        sourceLocation:
          typeof srcJson === 'string'
            ? (JSON.parse(srcJson) as Requirement['sourceLocation'])
            : undefined,
        tags: JSON.parse(String(r['tags_json'])) as string[],
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Changed Artifacts repository
// ---------------------------------------------------------------------------

export class ChangedArtifactsRepository {
  constructor(private readonly db: Database.Database) {}

  saveAll(artifacts: ChangedArtifact[], runId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO changed_artifacts
        (id, run_id, file_path, change_type, symbols_json, added_lines, deleted_lines,
         hunks_json, is_public_api, is_config, is_schema, is_test, is_documentation)
      VALUES (@id, @runId, @filePath, @changeType, @symbolsJson, @addedLines, @deletedLines,
              @hunksJson, @isPublicApi, @isConfig, @isSchema, @isTest, @isDocumentation)
    `);
    const tx = this.db.transaction((arts: ChangedArtifact[]) => {
      for (const a of arts) {
        stmt.run({
          id: a.id,
          runId,
          filePath: a.filePath,
          changeType: a.changeType,
          symbolsJson: JSON.stringify(a.symbols ?? []),
          addedLines: a.addedLines ?? 0,
          deletedLines: a.deletedLines ?? 0,
          hunksJson: JSON.stringify(a.hunks ?? []),
          isPublicApi: a.isPublicApi ? 1 : 0,
          isConfig: a.isConfig ? 1 : 0,
          isSchema: a.isSchema ? 1 : 0,
          isTest: a.isTest ? 1 : 0,
          isDocumentation: a.isDocumentation ? 1 : 0,
        });
      }
    });
    tx(artifacts);
  }

  findByRunId(runId: string): ChangedArtifact[] {
    const rows = this.db
      .prepare('SELECT * FROM changed_artifacts WHERE run_id = ? ORDER BY id')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r['id']),
      filePath: String(r['file_path']),
      changeType: r['change_type'] as ChangedArtifact['changeType'],
      symbols: JSON.parse(String(r['symbols_json'])) as string[],
      addedLines: Number(r['added_lines']),
      deletedLines: Number(r['deleted_lines']),
      hunks: JSON.parse(String(r['hunks_json'])) as ChangedArtifact['hunks'],
      isPublicApi: Boolean(r['is_public_api']),
      isConfig: Boolean(r['is_config']),
      isSchema: Boolean(r['is_schema']),
      isTest: Boolean(r['is_test']),
      isDocumentation: Boolean(r['is_documentation']),
    }));
  }
}

// ---------------------------------------------------------------------------
// Test artifacts repository
// ---------------------------------------------------------------------------

export class TestArtifactsRepository {
  constructor(private readonly db: Database.Database) {}

  saveAll(tests: TestArtifact[], runId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO test_artifacts
        (id, run_id, file_path, test_name, referenced_symbols_json, referenced_req_ids_json, source_location_json)
      VALUES (@id, @runId, @filePath, @testName, @symbolsJson, @reqIdsJson, @sourceJson)
    `);
    const tx = this.db.transaction((tests_: TestArtifact[]) => {
      for (const t of tests_) {
        stmt.run({
          id: t.id,
          runId,
          filePath: t.filePath,
          testName: t.testName,
          symbolsJson: JSON.stringify(t.referencedSymbols ?? []),
          reqIdsJson: JSON.stringify(t.referencedRequirementIds ?? []),
          sourceJson: t.sourceLocation ? JSON.stringify(t.sourceLocation) : null,
        });
      }
    });
    tx(tests);
  }

  findByRunId(runId: string): TestArtifact[] {
    const rows = this.db
      .prepare('SELECT * FROM test_artifacts WHERE run_id = ? ORDER BY id')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => {
      const srcJson = r['source_location_json'];
      return {
        id: String(r['id']),
        filePath: String(r['file_path']),
        testName: String(r['test_name']),
        referencedSymbols: JSON.parse(String(r['referenced_symbols_json'])) as string[],
        referencedRequirementIds: JSON.parse(String(r['referenced_req_ids_json'])) as string[],
        sourceLocation:
          typeof srcJson === 'string'
            ? (JSON.parse(srcJson) as TestArtifact['sourceLocation'])
            : undefined,
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Evidence links repository
// ---------------------------------------------------------------------------

export class EvidenceLinksRepository {
  constructor(private readonly db: Database.Database) {}

  saveAll(links: EvidenceLink[], runId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO evidence_links
        (id, run_id, from_type, from_id, to_type, to_id, method, strength, explanation, source_location_json)
      VALUES (@id, @runId, @fromType, @fromId, @toType, @toId, @method, @strength, @explanation, @sourceJson)
    `);
    const tx = this.db.transaction((ls: EvidenceLink[]) => {
      for (const l of ls) {
        stmt.run({
          id: l.id,
          runId,
          fromType: l.fromType,
          fromId: l.fromId,
          toType: l.toType,
          toId: l.toId,
          method: l.method,
          strength: l.strength,
          explanation: l.explanation,
          sourceJson: l.sourceLocation ? JSON.stringify(l.sourceLocation) : null,
        });
      }
    });
    tx(links);
  }

  findByRunId(runId: string): EvidenceLink[] {
    const rows = this.db
      .prepare('SELECT * FROM evidence_links WHERE run_id = ? ORDER BY id')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => {
      const srcJson = r['source_location_json'];
      return {
        id: String(r['id']),
        fromType: r['from_type'] as EvidenceLink['fromType'],
        fromId: String(r['from_id']),
        toType: r['to_type'] as EvidenceLink['toType'],
        toId: String(r['to_id']),
        method: r['method'] as EvidenceLink['method'],
        strength: r['strength'] as EvidenceLink['strength'],
        explanation: String(r['explanation']),
        sourceLocation:
          typeof srcJson === 'string'
            ? (JSON.parse(srcJson) as EvidenceLink['sourceLocation'])
            : undefined,
      };
    });
  }
}

// ---------------------------------------------------------------------------
// Findings repository
// ---------------------------------------------------------------------------

export class FindingsRepository {
  constructor(private readonly db: Database.Database) {}

  saveAll(findings: Finding[], runId: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO findings
        (id, run_id, rule_id, severity, status, title, explanation,
         requirement_ids_json, changed_artifact_ids_json, test_artifact_ids_json,
         evidence_link_ids_json, match_strength, recommended_action)
      VALUES (@id, @runId, @ruleId, @severity, @status, @title, @explanation,
              @reqIdsJson, @artifactIdsJson, @testIdsJson, @linkIdsJson, @matchStrength, @recommendedAction)
    `);
    const tx = this.db.transaction((fs: Finding[]) => {
      for (const f of fs) {
        stmt.run({
          id: f.id,
          runId,
          ruleId: f.ruleId,
          severity: f.severity,
          status: f.status,
          title: f.title,
          explanation: f.explanation,
          reqIdsJson: JSON.stringify(f.requirementIds),
          artifactIdsJson: JSON.stringify(f.changedArtifactIds),
          testIdsJson: JSON.stringify(f.testArtifactIds),
          linkIdsJson: JSON.stringify(f.evidenceLinkIds),
          matchStrength: f.matchStrength,
          recommendedAction: f.recommendedAction,
        });
      }
    });
    tx(findings);
  }

  findByRunId(runId: string): Finding[] {
    const rows = this.db
      .prepare('SELECT * FROM findings WHERE run_id = ? ORDER BY id')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: String(r['id']),
      ruleId: r['rule_id'] as Finding['ruleId'],
      severity: r['severity'] as Finding['severity'],
      status: r['status'] as Finding['status'],
      title: String(r['title']),
      explanation: String(r['explanation']),
      requirementIds: JSON.parse(String(r['requirement_ids_json'])) as string[],
      changedArtifactIds: JSON.parse(String(r['changed_artifact_ids_json'])) as string[],
      testArtifactIds: JSON.parse(String(r['test_artifact_ids_json'])) as string[],
      evidenceLinkIds: JSON.parse(String(r['evidence_link_ids_json'])) as string[],
      matchStrength: r['match_strength'] as Finding['matchStrength'],
      recommendedAction: String(r['recommended_action']),
    }));
  }
}

// ---------------------------------------------------------------------------
// Review decisions repository
// ---------------------------------------------------------------------------

export class ReviewDecisionsRepository {
  constructor(private readonly db: Database.Database) {}

  save(decision: ReviewDecision): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO review_decisions
        (id, finding_id, run_id, decision, rationale, decided_by, decided_at)
      VALUES (@id, @findingId, @runId, @decision, @rationale, @decidedBy, @decidedAt)
    `);
    stmt.run({
      id: decision.id,
      findingId: decision.findingId,
      runId: decision.runId,
      decision: decision.decision,
      rationale: decision.rationale ?? null,
      decidedBy: decision.decidedBy ?? null,
      decidedAt: decision.decidedAt,
    });
  }

  findByRunId(runId: string): ReviewDecision[] {
    const rows = this.db
      .prepare('SELECT * FROM review_decisions WHERE run_id = ? ORDER BY decided_at')
      .all(runId) as Record<string, unknown>[];
    return rows.map((r) => {
      const rationale = r['rationale'];
      const decidedBy = r['decided_by'];
      return {
        id: String(r['id']),
        findingId: String(r['finding_id']),
        runId: String(r['run_id']),
        decision: r['decision'] as ReviewDecision['decision'],
        rationale: typeof rationale === 'string' ? rationale : undefined,
        decidedBy: typeof decidedBy === 'string' ? decidedBy : undefined,
        decidedAt: String(r['decided_at']),
      };
    });
  }

  findByFindingId(findingId: string): ReviewDecision | null {
    const row = this.db
      .prepare(
        'SELECT * FROM review_decisions WHERE finding_id = ? ORDER BY decided_at DESC LIMIT 1',
      )
      .get(findingId) as Record<string, unknown> | undefined;
    if (!row) return null;
    const rationale = row['rationale'];
    const decidedBy = row['decided_by'];
    return {
      id: String(row['id']),
      findingId: String(row['finding_id']),
      runId: String(row['run_id']),
      decision: row['decision'] as ReviewDecision['decision'],
      rationale: typeof rationale === 'string' ? rationale : undefined,
      decidedBy: typeof decidedBy === 'string' ? decidedBy : undefined,
      decidedAt: String(row['decided_at']),
    };
  }
}

// ---------------------------------------------------------------------------
// Composed store
// ---------------------------------------------------------------------------

export interface ChangeProofStore {
  runs: RunRepository;
  requirements: RequirementsRepository;
  changedArtifacts: ChangedArtifactsRepository;
  testArtifacts: TestArtifactsRepository;
  evidenceLinks: EvidenceLinksRepository;
  findings: FindingsRepository;
  decisions: ReviewDecisionsRepository;
  db: Database.Database;
}

export function createStore(dbPath: string): ChangeProofStore {
  const db = openDatabase(dbPath);
  return {
    runs: new RunRepository(db),
    requirements: new RequirementsRepository(db),
    changedArtifacts: new ChangedArtifactsRepository(db),
    testArtifacts: new TestArtifactsRepository(db),
    evidenceLinks: new EvidenceLinksRepository(db),
    findings: new FindingsRepository(db),
    decisions: new ReviewDecisionsRepository(db),
    db,
  };
}
